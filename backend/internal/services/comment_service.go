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

// CommentService defines the interface for comment-related business logic
type CommentService interface {
	GetComments(ctx context.Context, postID, userID uuid.UUID, limit, offset int) ([]models.CommentResponse, error)
	CreateComment(ctx context.Context, postID, userID uuid.UUID, req CreateCommentRequest) (*models.CommentResponse, error)
	AddReaction(ctx context.Context, userID, commentID uuid.UUID, reactionType models.ReactionType) error
	RemoveReaction(ctx context.Context, userID, commentID uuid.UUID) error
}

// CreateCommentRequest represents the input for creating a new comment
type CreateCommentRequest struct {
	Content  string     `json:"content" validate:"required,max=5000"`
	ImageURL string     `json:"image_url"`
	ParentID *uuid.UUID `json:"parent_id,omitempty"`
}

// commentService implements the CommentService interface
type commentService struct {
	commentRepo  repository.CommentRepository
	reactionRepo repository.ReactionRepository
	userRepo     repository.UserRepository
	postRepo     repository.PostRepository
	websocketHub websocket.WebSocketHub
}

// NewCommentService creates a new comment service instance
func NewCommentService(
	commentRepo repository.CommentRepository,
	reactionRepo repository.ReactionRepository,
	userRepo repository.UserRepository,
	postRepo repository.PostRepository,
	websocketHub websocket.WebSocketHub,
) CommentService {
	return &commentService{
		commentRepo:  commentRepo,
		reactionRepo: reactionRepo,
		userRepo:     userRepo,
		postRepo:     postRepo,
		websocketHub: websocketHub,
	}
}

// GetComments retrieves comments for a post with enrichment
func (s *commentService) GetComments(ctx context.Context, postID, userID uuid.UUID, limit, offset int) ([]models.CommentResponse, error) {
	comments, err := s.commentRepo.GetByPostID(ctx, postID, limit, offset)
	if err != nil {
		return nil, err
	}

	var responses []models.CommentResponse
	for _, comment := range comments {
		resp, err := s.enrichComment(ctx, comment, userID)
		if err != nil {
			return nil, err
		}
		responses = append(responses, *resp)
	}
	return responses, nil
}

// CreateComment creates a new comment with validation
func (s *commentService) CreateComment(ctx context.Context, postID, userID uuid.UUID, req CreateCommentRequest) (*models.CommentResponse, error) {
	// Validate parent_id if provided
	if req.ParentID != nil {
		parent, err := s.commentRepo.GetByID(ctx, *req.ParentID)
		if err != nil {
			if err == context.DeadlineExceeded {
				return nil, errors.New("parent comment not found")
			}
			return nil, err
		}
		// Ensure parent comment belongs to the same post
		if parent.PostID != postID {
			return nil, errors.New("parent comment does not belong to this post")
		}
		// Enforce depth limit of 1: parent comment must not already be a reply
		if parent.ParentID != nil {
			return nil, errors.New("cannot reply to a reply")
		}
	}

	var imagePath *string
	if req.ImageURL != "" {
		imagePath = &req.ImageURL
	}

	now := time.Now()
	comment := &models.Comment{
		ID:        uuid.New(),
		PostID:    postID,
		UserID:    userID,
		Content:   req.Content,
		ImagePath: imagePath,
		ParentID:  req.ParentID,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.commentRepo.Create(ctx, comment); err != nil {
		return nil, err
	}

	// Publish event for real-time updates
	s.websocketHub.Publish(websocket.WebSocketMessage{
		Type: "comment_created",
		Data: comment,
	})

	resp, err := s.enrichComment(ctx, *comment, userID)
	if err != nil {
		return nil, err
	}
	return resp, nil
}

// AddReaction adds a like or dislike to a comment
func (s *commentService) AddReaction(ctx context.Context, userID, commentID uuid.UUID, reactionType models.ReactionType) error {
	// Verify comment exists
	_, err := s.commentRepo.GetByID(ctx, commentID)
	if err != nil {
		return err
	}

	// Check if user already has a reaction
	existing, err := s.reactionRepo.GetCommentReaction(ctx, userID, commentID)
	if err == nil && existing != nil {
		// If same type, no-op
		if existing.ReactionType == reactionType {
			return nil
		}
		// If different type, update
		existing.ReactionType = reactionType
		return s.reactionRepo.UpdateCommentReaction(ctx, existing)
	}

	// Create new reaction
	reaction := &models.CommentReaction{
		UserID:       userID,
		CommentID:    commentID,
		ReactionType: reactionType,
	}

	return s.reactionRepo.CreateCommentReaction(ctx, reaction)
}

// RemoveReaction removes a user's reaction from a comment
func (s *commentService) RemoveReaction(ctx context.Context, userID, commentID uuid.UUID) error {
	return s.reactionRepo.DeleteCommentReaction(ctx, userID, commentID)
}

// enrichComment enriches a comment with author info, counts, and user reaction
func (s *commentService) enrichComment(ctx context.Context, comment models.Comment, userID uuid.UUID) (*models.CommentResponse, error) {
	author, err := s.userRepo.GetByID(ctx, comment.UserID)
	if err != nil {
		return nil, err
	}

	authorName := author.FirstName + " " + author.LastName
	if author.Nickname != nil && *author.Nickname != "" {
		authorName = *author.Nickname
	}

	likesCount, err := s.commentRepo.CountLikes(ctx, comment.ID)
	if err != nil {
		return nil, err
	}

	dislikesCount, err := s.commentRepo.CountDislikes(ctx, comment.ID)
	if err != nil {
		return nil, err
	}

	reaction, err := s.reactionRepo.GetCommentReaction(ctx, userID, comment.ID)
	if err != nil {
		return nil, err
	}

	var userReaction string
	if reaction != nil {
		userReaction = string(reaction.ReactionType)
	}

	var imageUrl string
	if comment.ImagePath != nil {
		imageUrl = *comment.ImagePath
	}

	var parentID *string
	if comment.ParentID != nil {
		pid := comment.ParentID.String()
		parentID = &pid
	}

	return &models.CommentResponse{
		ID:            comment.ID.String(),
		PostID:        comment.PostID.String(),
		AuthorID:      comment.UserID.String(),
		AuthorName:    authorName,
		CreatedAt:     comment.CreatedAt.Format(time.RFC3339),
		Content:       comment.Content,
		ImageUrl:      imageUrl,
		ParentID:      parentID,
		LikesCount:    likesCount,
		DislikesCount: dislikesCount,
		UserReaction:  userReaction,
	}, nil
}
