package models

import (
	"time"

	"github.com/google/uuid"
)

// Post represents a post created by a user
type Post struct {
	ID           uuid.UUID  `json:"id" db:"id"`
	UserID       uuid.UUID  `json:"user_id" db:"user_id"`
	Content      string     `json:"content" db:"content"`
	ImagePath    *string    `json:"image_path,omitempty" db:"image_path"`
	PrivacyLevel string     `json:"privacy_level" db:"privacy_level"`
	GroupID      *uuid.UUID `json:"group_id,omitempty" db:"group_id"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt    *time.Time `json:"-" db:"deleted_at"`
}

// PostRecipient specifies which specific users can see a "private" post
type PostRecipient struct {
	ID        uuid.UUID `json:"id" db:"id"`
	PostID    uuid.UUID `json:"post_id" db:"post_id"`
	UserID    uuid.UUID `json:"user_id" db:"user_id"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// PostResponse represents an enriched post response for the API
type PostResponse struct {
	ID            string `json:"id"`
	AuthorID      string `json:"author_id"`
	AuthorName    string `json:"authorName"`
	AuthorAvatar  string `json:"authorAvatar,omitempty"`
	CreatedAt     string `json:"createdAt"`
	Content       string `json:"content"`
	ImageUrl      string `json:"imageUrl,omitempty"`
	Privacy       string `json:"privacy"`
	GroupID       string `json:"group_id,omitempty"`
	LikesCount    int    `json:"likesCount"`
	CommentsCount int    `json:"commentsCount"`
	UserReaction  string `json:"userReaction,omitempty"`
}
