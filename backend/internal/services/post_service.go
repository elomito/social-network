package services

import (
	"context"
	"errors"
	"time"

	"backend/internal/models"
	"backend/internal/repository"
	"backend/internal/websocket"

	"github.com/google/uuid"
)

// PostService defines the interface for post-related business logic
type PostService interface {
	// Core CRUD operations
	CreatePost(ctx context.Context, userID uuid.UUID, req CreatePostRequest) (*models.PostResponse, error)
	GetPost(ctx context.Context, postID, viewerID uuid.UUID) (*models.PostResponse, error)
	GetPosts(ctx context.Context, viewerID uuid.UUID, filter PostFilter) ([]models.PostResponse, error)
	UpdatePost(ctx context.Context, postID, userID uuid.UUID, req UpdatePostRequest) (*models.PostResponse, error)
	DeletePost(ctx context.Context, postID, userID uuid.UUID) error

	// Reaction management
	AddReaction(ctx context.Context, userID, postID uuid.UUID, reactionType models.ReactionType) error
	RemoveReaction(ctx context.Context, userID, postID uuid.UUID) error
	GetReactions(ctx context.Context, postID uuid.UUID) ([]models.PostReaction, error)
	GetUserReaction(ctx context.Context, userID, postID uuid.UUID) (*models.PostReaction, error)

	// Privacy and visibility
	CheckPostVisibility(ctx context.Context, postID, viewerID uuid.UUID) (bool, error)
	AddPostRecipient(ctx context.Context, postID, recipientID uuid.UUID) error
	GetPostRecipients(ctx context.Context, postID uuid.UUID) ([]models.User, error)

	// Feed generation
	GetUserFeed(ctx context.Context, userID uuid.UUID, limit, offset int) ([]models.Post, error)
	GetGroupPosts(ctx context.Context, groupID, viewerID uuid.UUID, limit, offset int) ([]models.Post, error)
	GetProfilePosts(ctx context.Context, userID, viewerID uuid.UUID, limit, offset int) ([]models.Post, error)
}

// CreatePostRequest represents the input for creating a new post
type CreatePostRequest struct {
	Content      string      `json:"content" validate:"required,max=5000"`
	ImageURL     string      `json:"image_url"`
	PrivacyLevel string      `json:"privacy_level" validate:"required,oneof=public friends private group"`
	RecipientIDs []uuid.UUID `json:"recipient_ids,omitempty"`
}

// UpdatePostRequest represents the input for updating an existing post
type UpdatePostRequest struct {
	Content      *string     `json:"content,omitempty" validate:"omitempty,max=5000"`
	ImageURL     *string     `json:"image_url,omitempty"`
	PrivacyLevel *string     `json:"privacy_level,omitempty" validate:"omitempty,oneof=public friends private group"`
	RecipientIDs []uuid.UUID `json:"recipient_ids,omitempty"`
}

// PostFilter represents filters for querying posts
type PostFilter struct {
	UserID  *uuid.UUID
	GroupID *uuid.UUID
	Limit   int
	Offset  int
}

// postService implements the PostService interface
type postService struct {
	postRepo     repository.PostRepository
	reactionRepo repository.ReactionRepository
	userRepo     repository.UserRepository
	imageRepo    repository.ImageRepository
	groupRepo    repository.GroupRepository
	websocketHub websocket.WebSocketHub
}

// NewPostService creates a new post service instance
func NewPostService(
	postRepo repository.PostRepository,
	reactionRepo repository.ReactionRepository,
	userRepo repository.UserRepository,
	imageRepo repository.ImageRepository,
	groupRepo repository.GroupRepository,
	websocketHub websocket.WebSocketHub,
) PostService {
	return &postService{
		postRepo:     postRepo,
		reactionRepo: reactionRepo,
		userRepo:     userRepo,
		imageRepo:    imageRepo,
		groupRepo:    groupRepo,
		websocketHub: websocketHub,
	}
}

// CreatePost creates a new post with business rule validation
func (s *postService) CreatePost(ctx context.Context, userID uuid.UUID, req CreatePostRequest) (*models.PostResponse, error) {
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

	now := time.Now()
	var imagePath *string
	if req.ImageURL != "" {
		imagePath = &req.ImageURL
	}

	post := &models.Post{
		ID:           uuid.New(),
		UserID:       userID,
		Content:      req.Content,
		ImagePath:    imagePath,
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
			recipient := &models.PostRecipient{
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
	s.websocketHub.Publish(websocket.WebSocketMessage{
		Type: "post_created",
		Data: post,
	})

	// Build response
	resp := &models.PostResponse{
		ID:            post.ID.String(),
		AuthorID:      post.UserID.String(),
		CreatedAt:     post.CreatedAt.Format(time.RFC3339),
		Content:       post.Content,
		Privacy:       req.PrivacyLevel,
		LikesCount:    0,
		CommentsCount: 0,
	}
	if post.ImagePath != nil {
		resp.ImageUrl = *post.ImagePath
	}

	return resp, nil
}

// GetPost retrieves a single post with visibility checks and enrichment
func (s *postService) GetPost(ctx context.Context, postID, viewerID uuid.UUID) (*models.PostResponse, error) {
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

	return s.enrichPost(ctx, *post, viewerID)
}

// GetPosts retrieves multiple posts with filtering and pagination
func (s *postService) GetPosts(ctx context.Context, viewerID uuid.UUID, filter PostFilter) ([]models.PostResponse, error) {
	if filter.Limit <= 0 {
		filter.Limit = 20 // default limit
	}
	if filter.Limit > 100 {
		filter.Limit = 100 // max limit
	}

	var posts []models.Post
	var err error

	if filter.GroupID != nil {
		posts, err = s.postRepo.GetGroupPosts(ctx, *filter.GroupID, filter.Limit, filter.Offset)
	} else if filter.UserID != nil {
		posts, err = s.postRepo.GetProfilePosts(ctx, *filter.UserID, viewerID, filter.Limit, filter.Offset)
	} else {
		posts, err = s.GetUserFeed(ctx, viewerID, filter.Limit, filter.Offset)
	}

	if err != nil {
		return nil, err
	}

	var responses []models.PostResponse
	for _, post := range posts {
		if post.DeletedAt != nil {
			continue
		}
		resp, err := s.enrichPost(ctx, post, viewerID)
		if err != nil {
			return nil, err
		}
		responses = append(responses, *resp)
	}

	return responses, nil
}

// UpdatePost updates an existing post with validation
func (s *postService) UpdatePost(ctx context.Context, postID, userID uuid.UUID, req UpdatePostRequest) (*models.PostResponse, error) {
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
	if req.ImageURL != nil {
		imagePath := *req.ImageURL
		post.ImagePath = &imagePath
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
	s.websocketHub.Publish(websocket.WebSocketMessage{
		Type: "post_updated",
		Data: post,
	})

	return s.enrichPost(ctx, *post, userID)
}

// DeletePost deletes a post and all associated comments
func (s *postService) DeletePost(ctx context.Context, postID, userID uuid.UUID) error {
	post, err := s.postRepo.GetByID(ctx, postID)
	if err != nil {
		return errors.New("post not found")
	}

	if post.UserID != userID {
		return errors.New("unauthorized")
	}

	if err := s.postRepo.Delete(ctx, postID); err != nil {
		return err
	}

	s.websocketHub.Publish(websocket.WebSocketMessage{
		Type: "post_deleted",
		Data: map[string]uuid.UUID{"post_id": postID},
	})

	return nil
}

// AddReaction adds a like or dislike to a post
func (s *postService) AddReaction(ctx context.Context, userID, postID uuid.UUID, reactionType models.ReactionType) error {
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
	reaction := &models.PostReaction{
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
func (s *postService) GetReactions(ctx context.Context, postID uuid.UUID) ([]models.PostReaction, error) {
	return s.reactionRepo.GetPostReactions(ctx, postID)
}

// GetUserReaction retrieves the current user's reaction to a post
func (s *postService) GetUserReaction(ctx context.Context, userID, postID uuid.UUID) (*models.PostReaction, error) {
	return s.reactionRepo.GetPostReaction(ctx, userID, postID)
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
		return follow != nil, nil
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
	recipient := &models.PostRecipient{
		ID:        uuid.New(),
		PostID:    postID,
		UserID:    recipientID,
		CreatedAt: time.Now(),
	}
	return s.postRepo.AddRecipient(ctx, recipient)
}

// GetPostRecipients retrieves all recipients of a private post
func (s *postService) GetPostRecipients(ctx context.Context, postID uuid.UUID) ([]models.User, error) {
	recipients, err := s.postRepo.GetRecipients(ctx, postID)
	if err != nil {
		return nil, err
	}

	var users []models.User
	for _, recipient := range recipients {
		user, err := s.userRepo.GetByID(ctx, recipient.UserID)
		if err != nil {
			continue
		}
		users = append(users, user)
	}

	return users, nil
}

// GetUserFeed generates a personalized feed for a user
func (s *postService) GetUserFeed(ctx context.Context, userID uuid.UUID, limit, offset int) ([]models.Post, error) {
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
func (s *postService) GetGroupPosts(ctx context.Context, groupID, viewerID uuid.UUID, limit, offset int) ([]models.Post, error) {
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

// GetProfilePosts retrieves posts for a specific user profile
func (s *postService) GetProfilePosts(ctx context.Context, userID, viewerID uuid.UUID, limit, offset int) ([]models.Post, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	return s.postRepo.GetProfilePosts(ctx, userID, viewerID, limit, offset)
}

// enrichPost enriches a post with author info, counts, and user reaction
func (s *postService) enrichPost(ctx context.Context, post models.Post, viewerID uuid.UUID) (*models.PostResponse, error) {
	author, err := s.userRepo.GetByID(ctx, post.UserID)
	if err != nil {
		return nil, err
	}

	authorName := author.FirstName + " " + author.LastName
	if author.Nickname != nil && *author.Nickname != "" {
		authorName = *author.Nickname
	}

	likesCount, err := s.postRepo.CountLikes(ctx, post.ID)
	if err != nil {
		return nil, err
	}

	commentsCount, err := s.postRepo.CountComments(ctx, post.ID)
	if err != nil {
		return nil, err
	}

	reaction, err := s.reactionRepo.GetPostReaction(ctx, viewerID, post.ID)
	if err != nil {
		return nil, err
	}

	var userReaction string
	if reaction != nil {
		userReaction = string(reaction.ReactionType)
	}

	privacy := "public"
	if post.PrivacyLevel == "almost_private" {
		privacy = "friends"
	} else if post.PrivacyLevel == "private" {
		privacy = "private"
	}

	var imageUrl string
	if post.ImagePath != nil {
		imageUrl = *post.ImagePath
	}

	var groupID string
	if post.GroupID != nil {
		groupID = post.GroupID.String()
	}

	return &models.PostResponse{
		ID:            post.ID.String(),
		AuthorID:      post.UserID.String(),
		AuthorName:    authorName,
		CreatedAt:     post.CreatedAt.Format(time.RFC3339),
		Content:       post.Content,
		ImageUrl:      imageUrl,
		Privacy:       privacy,
		GroupID:       groupID,
		LikesCount:    likesCount,
		CommentsCount: commentsCount,
		UserReaction:  userReaction,
	}, nil
}
