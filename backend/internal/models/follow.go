package models

import (
    "time"
    "errors"

    "github.com/google/uuid"
)

// Follow represents an active follow relationship between users
type Follow struct {
    FollowerID  uuid.UUID `json:"follower_id" db:"follower_id"`
    FollowingID uuid.UUID `json:"following_id" db:"following_id"`
    CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// FollowRequest represents a pending follow request (for private profiles only)
type FollowRequest struct {
    ID          uuid.UUID `json:"id" db:"id"`
    FollowerID  uuid.UUID `json:"follower_id" db:"follower_id"`
    FollowingID uuid.UUID `json:"following_id" db:"following_id"`
    Status      string    `json:"status" db:"status"`
    CreatedAt   time.Time `json:"created_at" db:"created_at"`
    UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// NewFollow constructs a Follow relationship with the current timestamp.
func NewFollow(followerID, followingID uuid.UUID) (Follow, error) {
    if followerID == followingID {
        return Follow{}, errors.New("cannot follow yourself")
    }
    return Follow{
        FollowerID:  followerID,
        FollowingID: followingID,
        CreatedAt:   time.Now(),
    }, nil
}