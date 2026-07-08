package models

import (
    "errors"
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
    Privacy      string     `json:"privacy" db:"privacy"`
    CreatedAt    time.Time  `json:"created_at" db:"created_at"`
    UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
    IsActive     bool       `json:"is_active" db:"is_active"`
    DeletedAt    *time.Time `json:"-" db:"deleted_at"`
}

// GroupMember represents a user's membership in a group
type GroupMember struct {
    ID       uuid.UUID `json:"id" db:"id" validate:"required"`
    GroupID  uuid.UUID `json:"group_id" db:"group_id" validate:"required"`
    UserID   uuid.UUID `json:"user_id" db:"user_id" validate:"required"`
    Role     string    `json:"role" db:"role" validate:"required,oneof=admin member moderator"`
    JoinedAt time.Time `json:"joined_at" db:"joined_at"`
}

// GroupInvitation represents an invitation sent to a user to join a group
type GroupInvitation struct {
    ID        uuid.UUID `json:"id" db:"id" validate:"required"`
    GroupID   uuid.UUID `json:"group_id" db:"group_id" validate:"required"`
    InviterID uuid.UUID `json:"inviter_id" db:"inviter_id" validate:"required"`
    InviteeID uuid.UUID `json:"invitee_id" db:"invitee_id" validate:"required"`
    Status    string    `json:"status" db:"status" validate:"required,oneof=pending accepted declined"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
    UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// GroupJoinRequest represents a user's request to join a group
type GroupJoinRequest struct {
    ID        uuid.UUID `json:"id" db:"id" validate:"required"`
    GroupID   uuid.UUID `json:"group_id" db:"group_id" validate:"required"`
    UserID    uuid.UUID `json:"user_id" db:"user_id" validate:"required"`
    Status    string    `json:"status" db:"status" validate:"required,oneof=pending approved rejected"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
    UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// NewGroup constructs a Group with sensible defaults.
func NewGroup(creatorID uuid.UUID, title, description string) (Group, error) {
    g := Group{
        ID:          uuid.New(),
        Title:       title,
        Description: description,
        CreatorID:   creatorID,
        Privacy:     "public",
        CreatedAt:   time.Now(),
        UpdatedAt:   time.Now(),
        IsActive:    true,
    }
    if err := g.Validate(); err != nil {
        return Group{}, err
    }
    return g, nil
}

// Validate checks minimal invariants for a Group.
func (g *Group) Validate() error {
    if g.Title == "" {
        return errors.New("title is required")
    }
    if len(g.Title) > 200 {
        return errors.New("title is too long")
    }
    if len(g.Description) > 2000 {
        return errors.New("description is too long")
    }
    return nil
}