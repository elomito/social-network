package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"backend/internal/models"

	"github.com/google/uuid"
)

var ErrUserNotFound = errors.New("user not found")

// UpdateProfilePayload contains fields that may be updated on a user profile.
// Pointer fields are used so we can tell which values were provided.
type UpdateProfilePayload struct {
	FirstName     *string    `json:"first_name"`
	LastName      *string    `json:"last_name"`
	Nickname      *string    `json:"nickname"`
	DateOfBirth   *time.Time `json:"date_of_birth"`
	AvatarImageID *uuid.UUID `json:"avatar_image_id"`
	AboutMe       *string    `json:"about_me"`
	IsPublic      *bool      `json:"is_public"`
}

// UserService manages user profiles
type UserService struct {
	db *sql.DB
}

func NewUserService(db *sql.DB) *UserService { return &UserService{db: db} }

// GetByID returns a user's profile by id
func (s *UserService) GetByID(ctx context.Context, id uuid.UUID) (models.User, error) {
	var u models.User
	var (
		idStr, email, passwordHash, firstName, lastName string
		nickname, dobStr, avatarImageID, aboutMe        sql.NullString
		isPublicInt                                     sql.NullInt64
		createdAtStr, updatedAtStr, lastActiveStr       sql.NullString
		deletedAtStr                                    sql.NullString
	)

	query := `SELECT id, email, password_hash, first_name, last_name, nickname, date_of_birth, avatar_image_id, about_me, is_public, created_at, updated_at, last_active_at, deleted_at FROM users WHERE id = ? LIMIT 1`
	err := s.db.QueryRowContext(ctx, query, id.String()).Scan(
		&idStr, &email, &passwordHash, &firstName, &lastName,
		&nickname, &dobStr, &avatarImageID, &aboutMe,
		&isPublicInt, &createdAtStr, &updatedAtStr, &lastActiveStr, &deletedAtStr,
	)
	if err == sql.ErrNoRows {
		return u, ErrUserNotFound
	}
	if err != nil {
		return u, err
	}

	// parse and populate model
	u.ID, _ = uuid.Parse(idStr)
	u.Email = email
	u.PasswordHash = passwordHash
	u.FirstName = firstName
	u.LastName = lastName
	if nickname.Valid {
		u.Nickname = &nickname.String
	}
	if dobStr.Valid {
		if t, err := time.Parse(time.RFC3339, dobStr.String); err == nil {
			u.DateOfBirth = t
		}
	}
	if avatarImageID.Valid {
		if aid, err := uuid.Parse(avatarImageID.String); err == nil {
			u.AvatarImageID = &aid
		}
	}
	if aboutMe.Valid {
		u.AboutMe = &aboutMe.String
	}
	if isPublicInt.Valid && isPublicInt.Int64 == 0 {
		u.IsPublic = false
	} else {
		u.IsPublic = true
	}
	if createdAtStr.Valid {
		if t, err := time.Parse(time.RFC3339, createdAtStr.String); err == nil {
			u.CreatedAt = t
		}
	}
	if updatedAtStr.Valid {
		if t, err := time.Parse(time.RFC3339, updatedAtStr.String); err == nil {
			u.UpdatedAt = t
		}
	}
	if lastActiveStr.Valid {
		if t, err := time.Parse(time.RFC3339, lastActiveStr.String); err == nil {
			u.LastActiveAt = t
		}
	}
	if deletedAtStr.Valid {
		if t, err := time.Parse(time.RFC3339, deletedAtStr.String); err == nil {
			u.DeletedAt = &t
		}
	}

	return u, nil
}

// GetFollowRelationship returns the follow relationship between two users
func (s *UserService) GetFollowRelationship(ctx context.Context, userID, targetID uuid.UUID) (*models.Follow, error) {
	var follow models.Follow
	err := s.db.QueryRowContext(ctx, `
		SELECT follower_id, following_id, created_at
		FROM follows
		WHERE follower_id = ? AND following_id = ?
	`, userID.String(), targetID.String()).Scan(
		&follow.FollowerID,
		&follow.FollowingID,
		&follow.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &follow, nil
}

// GetFollowing returns all users that the given user is following
func (s *UserService) GetFollowing(ctx context.Context, userID uuid.UUID) ([]models.Follow, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT follower_id, following_id, created_at
		FROM follows
		WHERE follower_id = ?
	`, userID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var following []models.Follow
	for rows.Next() {
		var follow models.Follow
		if err := rows.Scan(
			&follow.FollowerID,
			&follow.FollowingID,
			&follow.CreatedAt,
		); err != nil {
			return nil, err
		}
		following = append(following, follow)
	}
	return following, nil
}

// UpdateProfile updates provided fields on the user's profile
func (s *UserService) UpdateProfile(ctx context.Context, id uuid.UUID, p UpdateProfilePayload) error {
	sets := make([]string, 0)
	args := make([]interface{}, 0)

	if p.FirstName != nil {
		sets = append(sets, "first_name = ?")
		args = append(args, *p.FirstName)
	}
	if p.LastName != nil {
		sets = append(sets, "last_name = ?")
		args = append(args, *p.LastName)
	}
	if p.Nickname != nil {
		sets = append(sets, "nickname = ?")
		args = append(args, sql.NullString{String: *p.Nickname, Valid: *p.Nickname != ""})
	}
	if p.DateOfBirth != nil {
		sets = append(sets, "date_of_birth = ?")
		args = append(args, p.DateOfBirth.Format(time.RFC3339))
	}
	if p.AvatarImageID != nil {
		sets = append(sets, "avatar_image_id = ?")
		args = append(args, p.AvatarImageID.String())
	}
	if p.AboutMe != nil {
		sets = append(sets, "about_me = ?")
		args = append(args, *p.AboutMe)
	}
	if p.IsPublic != nil {
		sets = append(sets, "is_public = ?")
		if *p.IsPublic {
			args = append(args, 1)
		} else {
			args = append(args, 0)
		}
	}

	if len(sets) == 0 {
		return nil // nothing to do
	}

	// always update updated_at
	sets = append(sets, "updated_at = ?")
	args = append(args, time.Now().UTC().Format(time.RFC3339))

	query := fmt.Sprintf("UPDATE users SET %s WHERE id = ?", strings.Join(sets, ", "))
	args = append(args, id.String())

	res, err := s.db.ExecContext(ctx, query, args...)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err == nil && rows == 0 {
		return ErrUserNotFound
	}
	return nil
}
