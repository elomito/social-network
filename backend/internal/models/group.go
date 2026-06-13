package models

import (
    "errors"
    "time"

    "github.com/google/uuid"
)

// Group represents a user-created group
type Group struct {
    ID           uuid.UUID  `json:"id" db:"id"`
    Title        string     `json:"title" db:"title"`
    Description  string     `json:"description" db:"description"`
    CreatorID    uuid.UUID  `json:"creator_id" db:"creator_id"`
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

// NewGroup constructs a Group with sensible defaults.
func NewGroup(creatorID uuid.UUID, title, description string) (Group, error) {
    g := Group{
        ID:          uuid.New(),
        Title:       title,
        Description: description,
        CreatorID:   creatorID,
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