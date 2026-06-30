package services

import (
	"database/sql"
	"log"

	"github.com/google/uuid"
)

// FollowService manages follow relationships in SQLite database.
type FollowService struct {
	db *sql.DB
}

// NewFollowService creates a FollowService.
func NewFollowService(db *sql.DB) *FollowService {
	return &FollowService{
		db: db,
	}
}

// Follow creates a follow relationship. Idempotent.
func (s *FollowService) Follow(follower, following uuid.UUID) error {
	if follower == following {
		return nil
	}
	_, err := s.db.Exec(`
		INSERT OR IGNORE INTO follows (follower_id, following_id, created_at)
		VALUES (?, ?, datetime('now'))
	`, follower.String(), following.String())
	return err
}

// Unfollow removes a follow relationship. Idempotent.
func (s *FollowService) Unfollow(follower, following uuid.UUID) error {
	_, err := s.db.Exec(`
		DELETE FROM follows WHERE follower_id = ? AND following_id = ?
	`, follower.String(), following.String())
	return err
}

// IsFollowing returns true when follower follows following.
func (s *FollowService) IsFollowing(follower, following uuid.UUID) bool {
	var count int
	err := s.db.QueryRow(`
		SELECT COUNT(1) FROM follows WHERE follower_id = ? AND following_id = ?
	`, follower.String(), following.String()).Scan(&count)
	if err != nil {
		return false
	}
	return count > 0
}

// GetFollowers returns follower IDs for a given user.
func (s *FollowService) GetFollowers(user uuid.UUID) []uuid.UUID {
	rows, err := s.db.Query(`
		SELECT follower_id FROM follows WHERE following_id = ?
	`, user.String())
	if err != nil {
		log.Printf("GetFollowers query error: %v", err)
		return nil
	}
	defer rows.Close()

	var followers []uuid.UUID
	for rows.Next() {
		var idStr string
		if err := rows.Scan(&idStr); err == nil {
			if id, err := uuid.Parse(idStr); err == nil {
				followers = append(followers, id)
			}
		}
	}
	return followers
}

// GetFollowing returns IDs that the user is following.
func (s *FollowService) GetFollowing(user uuid.UUID) []uuid.UUID {
	rows, err := s.db.Query(`
		SELECT following_id FROM follows WHERE follower_id = ?
	`, user.String())
	if err != nil {
		log.Printf("GetFollowing query error: %v", err)
		return nil
	}
	defer rows.Close()

	var following []uuid.UUID
	for rows.Next() {
		var idStr string
		if err := rows.Scan(&idStr); err == nil {
			if id, err := uuid.Parse(idStr); err == nil {
				following = append(following, id)
			}
		}
	}
	return following
}
