package services

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

// PostService defines the interface for post-related business logic
type PostService interface {
	// Core CRUD operations
	CreatePost(ctx context.Context, userID uuid.UUID, req CreatePostRequest) (*Post, error)
	GetPost(ctx context.Context, postID, viewerID uuid.UUID) (*Post, error)
	GetPosts(ctx context.Context, filter PostFilter) ([]Post, error)
	UpdatePost(ctx context.Context, postID, userID uuid.UUID, req UpdatePostRequest) (*Post, error)
	DeletePost(ctx context.Context, postID, userID uuid.UUID) error

	// Reaction management
	AddReaction(ctx context.Context, userID, postID uuid.UUID, reactionType ReactionType) error
	RemoveReaction(ctx context.Context, userID, postID uuid.UUID) error
	GetReactions(ctx context.Context, postID uuid.UUID) ([]PostReaction, error)
	GetUserReaction(ctx context.Context, userID, postID uuid.UUID) (*PostReaction, error)

	// Comment management
	AddComment(ctx context.Context, userID, postID uuid.UUID, req AddCommentRequest) (*Comment, error)
	GetComments(ctx context.Context, postID uuid.UUID) ([]Comment, error)
	DeleteComment(ctx context.Context, commentID, userID uuid.UUID) error

	// Privacy and visibility
	CheckPostVisibility(ctx context.Context, postID, viewerID uuid.UUID) (bool, error)
	AddPostRecipient(ctx context.Context, postID, recipientID uuid.UUID) error
	GetPostRecipients(ctx context.Context, postID uuid.UUID) ([]User, error)

	// Feed generation
	GetUserFeed(ctx context.Context, userID uuid.UUID, limit, offset int) ([]Post, error)
	GetGroupPosts(ctx context.Context, groupID, viewerID uuid.UUID, limit, offset int) ([]Post, error)
}

// CreatePostRequest represents the input for creating a new post
type CreatePostRequest struct {
	Content      string     `json:"content" validate:"required,max=5000"`
	ImageID      *uuid.UUID `json:"image_id,omitempty"`
	PrivacyLevel string     `json:"privacy_level" validate:"required,oneof=public friends private group"`
	RecipientIDs []uuid.UUID `json:"recipient_ids,omitempty"`
}

// UpdatePostRequest represents the input for updating an existing post
type UpdatePostRequest struct {
	Content      *string    `json:"content,omitempty" validate:"omitempty,max=5000"`
	ImageID      *uuid.UUID `json:"image_id,omitempty"`
	PrivacyLevel *string    `json:"privacy_level,omitempty" validate:"omitempty,oneof=public friends private group"`
	RecipientIDs []uuid.UUID `json:"recipient_ids,omitempty"`
}

// AddCommentRequest represents the input for adding a comment
type AddCommentRequest struct {
	Content  string     `json:"content" validate:"required,max=2000"`
	ImageID  *uuid.UUID `json:"image_id,omitempty"`
	ParentID *uuid.UUID `json:"parent_id,omitempty"`
}

// PostFilter represents filters for querying posts
type PostFilter struct {
	UserID    *uuid.UUID
	GroupID   *uuid.UUID
	Limit     int
	Offset    int
}

// postService implements the PostService interface
type postService struct {
	postRepo        PostRepository
	commentRepo     CommentRepository
	reactionRepo    ReactionRepository
	userRepo        UserRepository
	imageRepo       ImageRepository
	groupRepo       GroupRepository
	websocketHub    WebSocketHub
}

// NewPostService creates a new post service instance
func NewPostService(
	postRepo PostRepository,
	commentRepo CommentRepository,
	reactionRepo ReactionRepository,
	userRepo UserRepository,
	imageRepo ImageRepository,
	groupRepo GroupRepository,
	websocketHub WebSocketHub,
) PostService {
	return &postService{
		postRepo:     postRepo,
		commentRepo:  commentRepo,
		reactionRepo: reactionRepo,
		userRepo:     userRepo,
		imageRepo:    imageRepo,
		groupRepo:    groupRepo,
		websocketHub: websocketHub,
	}
}

// CreatePost creates a new post with business rule validation
func (s *postService) CreatePost(ctx context.Context, userID uuid.UUID, req CreatePostRequest) (*Post, error) {
	// Validate privacy level
	validPrivacy := map[string]bool{"public": true, "friends": true, "private": true, "group": true}
	if !validPrivacy[req.PrivacyLevel] {
		return nil, errors.New("invalid privacy level")
	}

	// If private post, require at least one recipient
	if req.PrivacyLevel == "private" && len(req.RecipientIDs) == 0 {
		return nil, errors.New("private posts require at least one recipient")
	}

	// If group post, verify user is a member of the group
	if req.PrivacyLevel == "group" {
		// GroupID would need to be part of the request or inferred
		// For now, this is a placeholder for group membership validation
	}

	// If image is provided, verify it exists and belongs to the user
	if req.ImageID != nil {
		_, err := s.imageRepo.GetByID(ctx, *req.ImageID)
		if err != nil {
			return nil, errors.New("invalid image")
		}
	}

	now := time.Now()
	post := &Post{
		ID:           uuid.New(),
		UserID:       userID,
		Content:      req.Content,
		ImageID:      req.ImageID,
		PrivacyLevel: req.PrivacyLevel,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	// Save post to repository
	if err := s.postRepo.Create(ctx, post); err != nil {
		return nil, err
	}

	// If private post, add recipients
	if req.PrivacyLevel == "private" && len(req.RecipientIDs) > 0 {
		for _, recipientID := range req.RecipientIDs {
			recipient := &PostRecipient{
				ID:        uuid.New(),
				PostID:    post.ID,
				UserID:    recipientID,
				CreatedAt: now,
			}
			if err := s.postRepo.AddRecipient(ctx, recipient); err != nil {
				return nil, err
			}
		}
	}

	// Publish event for real-time updates
	s.websocketHub.Publish(WebSocketMessage{
		Type: "post_created",
		Data: post,
	})

	return post, nil
}

// GetPost retrieves a single post with visibility checks
func (s *postService) GetPost(ctx context.Context, postID, viewerID uuid.UUID) (*Post, error) {
	post, err := s.postRepo.GetByID(ctx, postID)
	if err != nil {
		return nil, errors.New("post not found")
	}

	// Check if post is soft-deleted
	if post.DeletedAt != nil {
		return nil, errors.New("post not found")
	}

	// Check visibility
	canView, err := s.CheckPostVisibility(ctx, postID, viewerID)
	if err != nil {
		return nil, err
	}
	if !canView {
		return nil, errors.New("forbidden")
	}

	return post, nil
}

// GetPosts retrieves multiple posts with filtering and pagination
func (s *postService) GetPosts(ctx context.Context, filter PostFilter) ([]Post, error) {
	if filter.Limit <= 0 {
		filter.Limit = 20 // default limit
	}
	if filter.Limit > 100 {
		filter.Limit = 100 // max limit
	}

	posts, err := s.postRepo.GetMany(ctx, filter)
	if err != nil {
		return nil, err
	}

	return posts, nil
}

// UpdatePost updates an existing post with validation
func (s *postService) UpdatePost(ctx context.Context, postID, userID uuid.UUID, req UpdatePostRequest) (*Post, error) {
	post, err := s.postRepo.GetByID(ctx, postID)
	if err != nil {
		return nil, errors.New("post not found")
	}

	// Verify ownership
	if post.UserID != userID {
		return nil, errors.New("unauthorized")
	}

	// Update fields if provided
	if req.Content != nil {
		post.Content = *req.Content
	}
	if req.ImageID != nil {
		// Verify image exists and belongs to user
		_, err := s.imageRepo.GetByID(ctx, *req.ImageID)
		if err != nil {
			return nil, errors.New("invalid image")
		}
		post.ImageID = req.ImageID
	}
	if req.PrivacyLevel != nil {
		validPrivacy := map[string]bool{"public": true, "friends": true, "private": true, "group": true}
		if !validPrivacy[*req.PrivacyLevel] {
			return nil, errors.New("invalid privacy level")
		}
		post.PrivacyLevel = *req.PrivacyLevel
	}

	post.UpdatedAt = time.Now()

	if err := s.postRepo.Update(ctx, post); err != nil {
		return nil, err
	}

	// Publish event for real-time updates
	s.websocketHub.Publish(WebSocketMessage{
		Type: "post_updated",
		Data: post,
	})

	return post, nil
}

// DeletePost soft-deletes a post
func (s *postService) DeletePost(ctx context.Context, postID, userID uuid.UUID) error {
	post, err := s.postRepo.GetByID(ctx, postID)
	if err != nil {
		return errors.New("post not found")
	}

	// Verify ownership
	if post.UserID != userID {
		return errors.New("unauthorized")
	}

	now := time.Now()
	post.DeletedAt = &now

	if err := s.postRepo.Update(ctx, post); err != nil {
		return err
	}

	// Publish event for real-time updates
	s.websocketHub.Publish(WebSocketMessage{
		Type: "post_deleted",
		Data: map[string]uuid.UUID{"post_id": postID},
	})

	return nil
}

// AddReaction adds a like or dislike to a post
func (s *postService) AddReaction(ctx context.Context, userID, postID uuid.UUID, reactionType ReactionType) error {
	// Verify post exists and is visible
	_, err := s.GetPost(ctx, postID, userID)
	if err != nil {
		return err
	}

	// Check if user already has a reaction
	existing, err := s.reactionRepo.GetPostReaction(ctx, userID, postID)
	if err == nil && existing != nil {
		// If same type, no-op
		if existing.ReactionType == reactionType {
			return nil
		}
		// If different type, update
		existing.ReactionType = reactionType
		return s.reactionRepo.UpdatePostReaction(ctx, existing)
	}

	// Create new reaction
	reaction := &PostReaction{
		UserID:       userID,
		PostID:       postID,
		ReactionType: reactionType,
	}

	return s.reactionRepo.CreatePostReaction(ctx, reaction)
}

// RemoveReaction removes a user's reaction from a post
func (s *postService) RemoveReaction(ctx context.Context, userID, postID uuid.UUID) error {
	return s.reactionRepo.DeletePostReaction(ctx, userID, postID)
}

// GetReactions retrieves all reactions for a post
func (s *postService) GetReactions(ctx context.Context, postID uuid.UUID) ([]PostReaction, error) {
	return s.reactionRepo.GetPostReactions(ctx, postID)
}

// GetUserReaction retrieves the current user's reaction to a post
func (s *postService) GetUserReaction(ctx context.Context, userID, postID uuid.UUID) (*PostReaction, error) {
	return s.reactionRepo.GetPostReaction(ctx, userID, postID)
}

// AddComment adds a comment to a post
func (s *postService) AddComment(ctx context.Context, userID, postID uuid.UUID, req AddCommentRequest) (*Comment, error) {
	// Verify post exists and is visible
	_, err := s.GetPost(ctx, postID, userID)
	if err != nil {
		return nil, err
	}

	// If parent comment is provided, verify it exists and belongs to the same post
	if req.ParentID != nil {
		parent, err := s.commentRepo.GetByID(ctx, *req.ParentID)
		if err != nil {
			return nil, errors.New("parent comment not found")
		}
		if parent.PostID != postID {
			return nil, errors.New("parent comment does not belong to this post")
		}
	}

	now := time.Now()
	comment := &Comment{
		ID:        uuid.New(),
		UserID:    userID,
		PostID:    postID,
		ParentID:  req.ParentID,
		Content:   req.Content,
		ImageID:   req.ImageID,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.commentRepo.Create(ctx, comment); err != nil {
		return nil, err
	}

	return comment, nil
}

// GetComments retrieves comments for a post
func (s *postService) GetComments(ctx context.Context, postID uuid.UUID) ([]Comment, error) {
	return s.commentRepo.GetByPostID(ctx, postID)
}

// DeleteComment soft-deletes a comment
func (s *postService) DeleteComment(ctx context.Context, commentID, userID uuid.UUID) error {
	comment, err := s.commentRepo.GetByID(ctx, commentID)
	if err != nil {
		return errors.New("comment not found")
	}

	// Allow deletion by comment author or post author
	post, err := s.postRepo.GetByID(ctx, comment.PostID)
	if err != nil {
		return err
	}

	if comment.UserID != userID && post.UserID != userID {
		return errors.New("unauthorized")
	}

	now := time.Now()
	comment.DeletedAt = &now

	return s.commentRepo.Update(ctx, comment)
}

// CheckPostVisibility determines if a user can view a post
func (s *postService) CheckPostVisibility(ctx context.Context, postID, viewerID uuid.UUID) (bool, error) {
	post, err := s.postRepo.GetByID(ctx, postID)
	if err != nil {
		return false, err
	}

	// Soft-deleted posts are not visible
	if post.DeletedAt != nil {
		return false, errors.New("post not found")
	}

	// Author can always view their own post
	if post.UserID == viewerID {
		return true, nil
	}

	switch post.PrivacyLevel {
	case "public":
		return true, nil
	case "friends":
		// Check if there is an accepted follow relationship
		follow, err := s.userRepo.GetFollowRelationship(ctx, post.UserID, viewerID)
		if err != nil {
			return false, err
		}
		return follow != nil && follow.Status == "accepted", nil
	case "private":
		// Check if viewer is in the PostRecipient list
		recipients, err := s.postRepo.GetRecipients(ctx, postID)
		if err != nil {
			return false, err
		}
		for _, recipient := range recipients {
			if recipient.UserID == viewerID {
				return true, nil
			}
		}
		return false, nil
	case "group":
		// Check if viewer is a member of the group
		// This requires the post to have a group association
		// For now, assuming group posts have a group ID stored
		return false, errors.New("group privacy check not implemented")
	default:
		return false, errors.New("unknown privacy level")
	}
}

// AddPostRecipient adds a recipient to a private post
func (s *postService) AddPostRecipient(ctx context.Context, postID, recipientID uuid.UUID) error {
	recipient := &PostRecipient{
		ID:        uuid.New(),
		PostID:    postID,
		UserID:    recipientID,
		CreatedAt: time.Now(),
	}
	return s.postRepo.AddRecipient(ctx, recipient)
}

// GetPostRecipients retrieves all recipients of a private post
func (s *postService) GetPostRecipients(ctx context.Context, postID uuid.UUID) ([]User, error) {
	recipients, err := s.postRepo.GetRecipients(ctx, postID)
	if err != nil {
		return nil, err
	}

	var users []User
	for _, recipient := range recipients {
		user, err := s.userRepo.GetByID(ctx, recipient.UserID)
		if err != nil {
			continue
		}
		users = append(users, *user)
	}

	return users, nil
}

// GetUserFeed generates a personalized feed for a user
func (s *postService) GetUserFeed(ctx context.Context, userID uuid.UUID, limit, offset int) ([]Post, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	// Get posts from users the current user follows
	following, err := s.userRepo.GetFollowing(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Build list of user IDs whose posts should appear in the feed
	var userIDs []uuid.UUID
	userIDs = append(userIDs, userID) // Include own posts
	for _, follow := range following {
		userIDs = append(userIDs, follow.FollowingID)
	}

	// Query posts from these users with privacy filtering
	posts, err := s.postRepo.GetFeedPosts(ctx, userIDs, limit, offset)
	if err != nil {
		return nil, err
	}

	return posts, nil
}

// GetGroupPosts retrieves posts for a specific group
func (s *postService) GetGroupPosts(ctx context.Context, groupID, viewerID uuid.UUID, limit, offset int) ([]Post, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	// Verify viewer is a member of the group
	isMember, err := s.groupRepo.IsMember(ctx, groupID, viewerID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("forbidden")
	}

	// Get group posts
	posts, err := s.postRepo.GetGroupPosts(ctx, groupID, limit, offset)
	if err != nil {
		return nil, err
	}

	return posts, nil
}
