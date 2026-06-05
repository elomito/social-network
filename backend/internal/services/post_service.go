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
