package models

import (
	"time"

	"github.com/google/uuid"
)

// Comment represents a comment on a post
type Comment struct {
	ID        uuid.UUID  `json:"id" db:"id"`
	UserID    uuid.UUID  `json:"user_id" db:"user_id"`
	PostID    uuid.UUID  `json:"post_id" db:"post_id"`
	ParentID  *uuid.UUID `json:"parent_id,omitempty" db:"parent_id"`
	Content   string     `json:"content" db:"content"`
	ImagePath *string    `json:"image_path,omitempty" db:"image_path"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt *time.Time `json:"-" db:"deleted_at"`
}

// CommentResponse represents an enriched comment response for the API
type CommentResponse struct {
	ID            string  `json:"id"`
	PostID        string  `json:"post_id"`
	AuthorID      string  `json:"author_id"`
	AuthorName    string  `json:"authorName"`
	AuthorAvatar  string  `json:"authorAvatar,omitempty"`
	CreatedAt     string  `json:"createdAt"`
	Content       string  `json:"content"`
	ImageUrl      string  `json:"imageUrl,omitempty"`
	ParentID      *string `json:"parent_id,omitempty"`
	LikesCount    int     `json:"likesCount"`
	DislikesCount int     `json:"dislikesCount"`
	UserReaction  string  `json:"userReaction,omitempty"`
}
