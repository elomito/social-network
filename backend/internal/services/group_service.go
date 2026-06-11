package services

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"

	"social-network/backend/internal/models"
)

var (
	ErrGroupNotFound      = errors.New("group not found or inactive")
	ErrAlreadyMember      = errors.New("user is already a member")
	ErrNotMember          = errors.New("user is not a member")
	ErrCreatorCannotLeave = errors.New("group creator cannot leave the group without transfer")
)

type GroupService struct {
	db *sql.DB
}

func NewGroupService(db *sql.DB) *GroupService {
	return &GroupService{db: db}
}

// -------------------------
// CREATE GROUP
// -------------------------
func (s *GroupService) CreateGroup(ctx context.Context, group *models.Group) error {
	if group.Title == "" {
		return errors.New("group title cannot be empty")
	}
	if group.CreatorID == uuid.Nil {
		return errors.New("creator ID is required")
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	group.ID = uuid.New()
	now := time.Now().UTC()
	group.CreatedAt = now
	group.UpdatedAt = now

	var coverImageID interface{}
	if group.CoverImageID != nil {
		coverImageID = group.CoverImageID.String()
	}

	// Insert group
	_, err = tx.ExecContext(ctx, `
		INSERT INTO groups (
			id, title, description, creator_id, cover_image_id,
			created_at, updated_at, is_active
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`,
		group.ID.String(),
		group.Title,
		group.Description,
		group.CreatorID.String(),
		coverImageID,
		group.CreatedAt,
		group.UpdatedAt,
		group.IsActive,
	)
	if err != nil {
		return err
	}

	// Creator becomes admin
	_, err = tx.ExecContext(ctx, `
		INSERT INTO group_members (
			id, group_id, user_id, role, joined_at
		)
		VALUES (?, ?, ?, ?, ?)
	`,
		uuid.New().String(),
		group.ID.String(),
		group.CreatorID.String(),
		"admin",
		now,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// -------------------------
// GET GROUP
// -------------------------
func (s *GroupService) GetGroupByID(ctx context.Context, groupID uuid.UUID) (*models.Group, error) {
	if groupID == uuid.Nil {
		return nil, errors.New("group ID is required")
	}

	var group models.Group
	var coverImageID sql.NullString
	var isActive bool

	err := s.db.QueryRowContext(ctx, `
		SELECT id, title, description, creator_id, cover_image_id,
		       created_at, updated_at, is_active
		FROM groups
		WHERE id = ? AND deleted_at IS NULL
		LIMIT 1
	`, groupID.String()).Scan(
		&group.ID,
		&group.Title,
		&group.Description,
		&group.CreatorID,
		&coverImageID,
		&group.CreatedAt,
		&group.UpdatedAt,
		&isActive,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrGroupNotFound
		}
		return nil, err
	}

	group.IsActive = isActive

	if coverImageID.Valid {
		uid, err := uuid.Parse(coverImageID.String)
		if err == nil {
			group.CoverImageID = &uid
		}
	}

	return &group, nil
}

// -------------------------
// UPDATE GROUP
// -------------------------
func (s *GroupService) UpdateGroup(ctx context.Context, group *models.Group) error {
	if group.ID == uuid.Nil {
		return errors.New("group ID is required")
	}
	if group.Title == "" {
		return errors.New("group title cannot be empty")
	}

	now := time.Now().UTC()

	var coverImageID interface{}
	if group.CoverImageID != nil {
		coverImageID = group.CoverImageID.String()
	}

	res, err := s.db.ExecContext(ctx, `
		UPDATE groups
		SET title = ?, description = ?, cover_image_id = ?, updated_at = ?
		WHERE id = ? AND deleted_at IS NULL
	`,
		group.Title,
		group.Description,
		coverImageID,
		now,
		group.ID.String(),
	)
	if err != nil {
		return err
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrGroupNotFound
	}

	return nil
}

// -------------------------
// DELETE GROUP (soft)
// -------------------------
func (s *GroupService) DeleteGroup(ctx context.Context, groupID uuid.UUID) error {
	if groupID == uuid.Nil {
		return errors.New("group ID is required")
	}

	res, err := s.db.ExecContext(ctx, `
		UPDATE groups
		SET deleted_at = ?
		WHERE id = ? AND deleted_at IS NULL
	`,
		time.Now().UTC(),
		groupID.String(),
	)
	if err != nil {
		return err
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrGroupNotFound
	}

	return nil
}

// -------------------------
// MEMBERSHIP CHECK
// -------------------------
func (s *GroupService) IsMember(ctx context.Context, userID, groupID uuid.UUID) (bool, error) {
	var count int

	err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(1)
		FROM group_members
		WHERE group_id = ? AND user_id = ?
	`, groupID.String(), userID.String()).Scan(&count)

	if err != nil {
		return false, err
	}

	return count > 0, nil
}

// -------------------------
// JOIN GROUP
// -------------------------
func (s *GroupService) JoinGroup(ctx context.Context, userID, groupID uuid.UUID) error {
	var isActive bool

	err := s.db.QueryRowContext(ctx, `
		SELECT is_active
		FROM groups
		WHERE id = ?
		LIMIT 1
	`, groupID.String()).Scan(&isActive)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrGroupNotFound
		}
		return err
	}

	if !isActive {
		return ErrGroupNotFound
	}

	// rely on UNIQUE constraint (recommended)
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO group_members (
			id, group_id, user_id, role, joined_at
		)
		VALUES (?, ?, ?, ?, ?)
	`,
		uuid.New().String(),
		groupID.String(),
		userID.String(),
		"member",
		time.Now().UTC(),
	)

	if err != nil {
		return ErrAlreadyMember
	}

	return nil
}

// -------------------------
// LEAVE GROUP
// -------------------------
func (s *GroupService) LeaveGroup(ctx context.Context, userID, groupID uuid.UUID) error {
	var creatorID string

	err := s.db.QueryRowContext(ctx, `
		SELECT creator_id
		FROM groups
		WHERE id = ?
		LIMIT 1
	`, groupID.String()).Scan(&creatorID)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrGroupNotFound
		}
		return err
	}

	if creatorID == userID.String() {
		return ErrCreatorCannotLeave
	}

	res, err := s.db.ExecContext(ctx, `
		DELETE FROM group_members
		WHERE group_id = ? AND user_id = ?
	`, groupID.String(), userID.String())

	if err != nil {
		return err
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return ErrNotMember
	}

	return nil
}