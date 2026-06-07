package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"social-network/backend/internal/models"
)

// GroupService handles group related operations
type GroupService struct {
	db *sqlx.DB
}

// NewGroupService creates a new GroupService instance
func NewGroupService(db *sqlx.DB) *GroupService {
	return &GroupService{db: db}
}

// CreateGroup creates a new group with the creator as admin member
func (s *GroupService) CreateGroup(ctx context.Context, group *models.Group) error {
	// Validate input
	if group.Title == "" {
		return fmt.Errorf("group title cannot be empty")
	}
	if group.CreatorID == uuid.Nil {
		return fmt.Errorf("creator ID is required")
	}

	// Start transaction
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer func() {
		if err != nil {
			tx.Rollback() //nolint:errcheck
			return
		}
		err = tx.Commit()
	}()

	// Prepare group for insertion
	group.ID = uuid.New()
	now := time.Now().UTC()
	group.CreatedAt = now
	group.UpdatedAt = now

	// Insert group
	query := `
		INSERT INTO groups (id, title, description, creator_id, cover_image_id, created_at, updated_at, is_active)
		VALUES (:id, :title, :description, :creator_id, :cover_image_id, :created_at, :updated_at, :is_active)
	`
	if _, err = tx.NamedExecContext(ctx, query, group); err != nil {
		return fmt.Errorf("failed to create group: %w", err)
	}

	// Add creator as admin member
	member := &models.GroupMember{
		ID:       uuid.New(),
		GroupID:  group.ID,
		UserID:   group.CreatorID,
		Role:     "admin",
		JoinedAt: now,
	}

	memberQuery := `
		INSERT INTO group_members (id, group_id, user_id, role, joined_at)
		VALUES (:id, :group_id, :user_id, :role, :joined_at)
	`
	if _, err = tx.NamedExecContext(ctx, memberQuery, member); err != nil {
		return fmt.Errorf("failed to add creator as group member: %w", err)
	}

	return nil
}

// GetGroupByID retrieves a group by its ID
func (s *GroupService) GetGroupByID(ctx context.Context, groupID uuid.UUID) (*models.Group, error) {
	query := `
		SELECT id, title, description, creator_id, cover_image_id, created_at, updated_at, is_active, deleted_at
		FROM groups
		WHERE id = :id AND deleted_at IS NULL
	`
	var group models.Group
	err := s.db.GetContext(ctx, &group, query, map[string]interface{}{"id": groupID})
	if err != nil {
		return nil, err
	}
	return &group, nil
}