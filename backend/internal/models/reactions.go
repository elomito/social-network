package models

import (
    // "time"
    "github.com/google/uuid"
)

type ReactionType string

const (
	Like    ReactionType = "like"
	Dislike ReactionType = "dislike"
)

type PostReaction struct {
	UserID       uuid.UUID    `db:"user_id" json:"user_id"`
	PostID       uuid.UUID    `db:"post_id" json:"post_id"`
	ReactionType ReactionType `db:"reaction_type" json:"reaction_type"`
}

type CommentReaction struct {
	UserID       uuid.UUID    `db:"user_id" json:"user_id"`
	CommentID    uuid.UUID    `db:"comment_id" json:"comment_id"`
	ReactionType ReactionType `db:"reaction_type" json:"reaction_type"`
}