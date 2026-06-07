package models

import (
    "time"
    "github.com/google/uuid"
)

// Group represents a user-created group
type Group struct {
    ID           uuid.UUID  `json:"id" db:"id" validate:"required"`
    Title        string     `json:"title" db:"title" validate:"required,min=3,max=100"`
    Description  string     `json:"description" db:"description" validate:"max=500"`
    CreatorID    uuid.UUID  `json:"creator_id" db:"creator_id" validate:"required"`
    CoverImageID *uuid.UUID `json:"cover_image_id,omitempty" db:"cover_image_id"`
    CreatedAt    time.Time  `json:"created_at" db:"created_at"`
    UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
    IsActive     bool       `json:"is_active" db:"is_active"`
    DeletedAt    *time.Time `json:"-" db:"deleted_at"`
}

// GroupMember represents a user's membership in a group
type GroupMember struct {
    ID       uuid.UUID `json:"id" db:"id"`
    GroupID  uuid.UUID `json:"group_id" db:"group_id"`
    UserID   uuid.UUID `json:"user_id" db:"user_id"`
    Role     string    `json:"role" db:"role"`
    JoinedAt time.Time `json:"joined_at" db:"joined_at"`
}

// GroupInvitation represents an invitation sent to a user to join a group
type GroupInvitation struct {
    ID        uuid.UUID `json:"id" db:"id"`
    GroupID   uuid.UUID `json:"group_id" db:"group_id"`
    InviterID uuid.UUID `json:"inviter_id" db:"inviter_id"`
    InviteeID uuid.UUID `json:"invitee_id" db:"invitee_id"`
    Status    string    `json:"status" db:"status"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
    UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// GroupJoinRequest represents a user's request to join a group
type GroupJoinRequest struct {
    ID        uuid.UUID `json:"id" db:"id"`
    GroupID   uuid.UUID `json:"group_id" db:"group_id"`
    UserID    uuid.UUID `json:"user_id" db:"user_id"`
    Status    string    `json:"status" db:"status"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
    UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}