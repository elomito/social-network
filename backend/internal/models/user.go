package models

import (
    "time"
    "github.com/google/uuid"
)

// User represents a registered user in the social network
type User struct {
    ID            uuid.UUID  `json:"id" db:"id"`
    Email         string     `json:"email" db:"email"`
    PasswordHash  string     `json:"-" db:"password_hash"`
    FirstName     string     `json:"first_name" db:"first_name"`
    LastName      string     `json:"last_name" db:"last_name"`
    Nickname      *string    `json:"nickname,omitempty" db:"nickname"`
    DateOfBirth   time.Time  `json:"date_of_birth" db:"date_of_birth"`
    AvatarImageID *uuid.UUID `json:"avatar_image_id,omitempty" db:"avatar_image_id"`
    CoverImageID  *uuid.UUID `json:"cover_image_id,omitempty" db:"cover_image_id"`
    AboutMe       *string    `json:"about_me,omitempty" db:"about_me"`
    IsPublic      bool       `json:"is_public" db:"is_public"`
    CreatedAt     time.Time  `json:"created_at" db:"created_at"`
    UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
    LastActiveAt  time.Time  `json:"last_active_at" db:"last_active_at"`
    DeletedAt     *time.Time `json:"-" db:"deleted_at"`
}