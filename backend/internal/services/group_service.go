package services

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

var (
	ErrAlreadyMember      = errors.New("user is already a member")
	ErrNotMember          = errors.New("user is not a member")
	ErrGroupNotFound      = errors.New("group not found or inactive")
	ErrCreatorCannotLeave = errors.New("group creator cannot leave the group without transfer")
)

// GroupService provides group membership operations
type GroupService struct {
	db *sql.DB
}

// NewGroupService creates a new GroupService
func NewGroupService(db *sql.DB) *GroupService { return &GroupService{db: db} }

// IsMember returns true if the user is a member of the group
func (s *GroupService) IsMember(ctx context.Context, userID, groupID uuid.UUID) (bool, error) {
	var exists int
	err := s.db.QueryRowContext(ctx,
		`SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ? LIMIT 1`,
		groupID.String(), userID.String(),
	).Scan(&exists)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

// JoinGroup adds a user to a group. It is idempotent and returns ErrAlreadyMember if already joined.
func (s *GroupService) JoinGroup(ctx context.Context, userID, groupID uuid.UUID) error {
	// Verify group exists and is active
	var isActive int
	err := s.db.QueryRowContext(ctx, `SELECT is_active FROM groups WHERE id = ? LIMIT 1`, groupID.String()).Scan(&isActive)
	if err == sql.ErrNoRows {
		return ErrGroupNotFound
	}
	if err != nil {
		return err
	}
	if isActive == 0 {
		return ErrGroupNotFound
	}

	// Idempotent: check membership
	member, err := s.IsMember(ctx, userID, groupID)
	if err != nil {
		return err
	}
	if member {
		return ErrAlreadyMember
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx,
		`INSERT INTO group_members (id, group_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)`,
		uuid.NewString(), groupID.String(), userID.String(), "member", time.Now().UTC().Format(time.RFC3339),
	)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			return ErrAlreadyMember
		}
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	return nil
}

// LeaveGroup removes a user from a group.
func (s *GroupService) LeaveGroup(ctx context.Context, userID, groupID uuid.UUID) error {
	// Check membership first
	member, err := s.IsMember(ctx, userID, groupID)
	if err != nil {
		return err
	}
	if !member {
		return ErrNotMember
	}

	// Prevent creator from leaving without transferring ownership
	var creatorID string
	err = s.db.QueryRowContext(ctx, `SELECT creator_id FROM groups WHERE id = ? LIMIT 1`, groupID.String()).Scan(&creatorID)
	if err == sql.ErrNoRows {
		return ErrGroupNotFound
	}
	if err != nil {
		return err
	}
	if creatorID == userID.String() {
		return ErrCreatorCannotLeave
	}

	res, err := s.db.ExecContext(ctx, `DELETE FROM group_members WHERE group_id = ? AND user_id = ?`, groupID.String(), userID.String())
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err == nil && rows == 0 {
		return ErrNotMember
	}
	return nil
}
