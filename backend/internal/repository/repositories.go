package repository

import (
	"context"

	"backend/internal/models"

	"github.com/google/uuid"
)

// PostRepository defines all post database operations
type PostRepository interface {
	Create(ctx context.Context, post *models.Post) error
	GetByID(ctx context.Context, postID uuid.UUID) (*models.Post, error)
	GetMany(ctx context.Context, filter PostFilter) ([]models.Post, error)
	Update(ctx context.Context, post *models.Post) error
	Delete(ctx context.Context, postID uuid.UUID) error
	AddRecipient(ctx context.Context, recipient *models.PostRecipient) error
	GetRecipients(ctx context.Context, postID uuid.UUID) ([]models.PostRecipient, error)
	GetFeedPosts(ctx context.Context, userIDs []uuid.UUID, limit, offset int) ([]models.Post, error)
	GetGroupPosts(ctx context.Context, groupID uuid.UUID, limit, offset int) ([]models.Post, error)
	GetProfilePosts(ctx context.Context, userID, viewerID uuid.UUID, limit, offset int) ([]models.Post, error)
	CountComments(ctx context.Context, postID uuid.UUID) (int, error)
	GetAuthor(ctx context.Context, userID uuid.UUID) (models.User, error)
	GetUserReaction(ctx context.Context, userID, postID uuid.UUID) (*models.PostReaction, error)
	CountLikes(ctx context.Context, postID uuid.UUID) (int, error)
}

// PostFilter represents filters for querying posts
type PostFilter struct {
	UserID  *uuid.UUID
	GroupID *uuid.UUID
	Limit   int
	Offset  int
}

// ReactionRepository defines all reaction database operations
type ReactionRepository interface {
	CreatePostReaction(ctx context.Context, reaction *models.PostReaction) error
	GetPostReaction(ctx context.Context, userID, postID uuid.UUID) (*models.PostReaction, error)
	UpdatePostReaction(ctx context.Context, reaction *models.PostReaction) error
	DeletePostReaction(ctx context.Context, userID, postID uuid.UUID) error
	GetPostReactions(ctx context.Context, postID uuid.UUID) ([]models.PostReaction, error)
	CreateCommentReaction(ctx context.Context, reaction *models.CommentReaction) error
	GetCommentReaction(ctx context.Context, userID, commentID uuid.UUID) (*models.CommentReaction, error)
	UpdateCommentReaction(ctx context.Context, reaction *models.CommentReaction) error
	DeleteCommentReaction(ctx context.Context, userID, commentID uuid.UUID) error
}

// UserRepository defines user database operations
type UserRepository interface {
	GetByID(ctx context.Context, userID uuid.UUID) (models.User, error)
	GetFollowRelationship(ctx context.Context, userID, targetID uuid.UUID) (*models.Follow, error)
	GetFollowing(ctx context.Context, userID uuid.UUID) ([]models.Follow, error)
}

// ImageRepository defines image database operations
type ImageRepository interface {
	GetByID(ctx context.Context, imageID uuid.UUID) (*models.Image, error)
}

// GroupRepository defines group database operations
type GroupRepository interface {
	IsMember(ctx context.Context, groupID, userID uuid.UUID) (bool, error)
}

// CommentRepository defines all comment database operations
type CommentRepository interface {
	Create(ctx context.Context, comment *models.Comment) error
	GetByPostID(ctx context.Context, postID uuid.UUID, limit, offset int) ([]models.Comment, error)
	GetByID(ctx context.Context, commentID uuid.UUID) (*models.Comment, error)
	GetReaction(ctx context.Context, userID, commentID uuid.UUID) (*models.CommentReaction, error)
	CreateReaction(ctx context.Context, reaction *models.CommentReaction) error
	UpdateReaction(ctx context.Context, reaction *models.CommentReaction) error
	DeleteReaction(ctx context.Context, userID, commentID uuid.UUID) error
	GetAuthor(ctx context.Context, userID uuid.UUID) (models.User, error)
	CountLikes(ctx context.Context, commentID uuid.UUID) (int, error)
	CountDislikes(ctx context.Context, commentID uuid.UUID) (int, error)
}
