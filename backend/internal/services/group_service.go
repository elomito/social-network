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

// GroupFilter contains optional filters for listing groups
type GroupFilter struct {
	Title     string
	CreatorID uuid.UUID
	IsActive  *bool
}

// Pagination contains pagination parameters
type Pagination struct {
	Limit  int
	Offset int
}

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

// UpdateGroup updates an existing group
func (s *GroupService) UpdateGroup(ctx context.Context, group *models.Group) error {
	// Validate input
	if group.ID == uuid.Nil {
		return fmt.Errorf("group ID is required")
	}
	if group.Title == "" {
		return fmt.Errorf("group title cannot be empty")
	}

	// Prepare update
	group.UpdatedAt = time.Now().UTC()

	// Update group
	query := `
		UPDATE groups
		SET title = :title, description = :description, cover_image_id = :cover_image_id, updated_at = :updated_at
		WHERE id = :id AND deleted_at IS NULL
	`
	result, err := s.db.NamedExecContext(ctx, query, group)
	if err != nil {
		return fmt.Errorf("failed to update group: %w", err)
	}

	// Check if any rows were affected
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check update result: %w", err)
	}
	if rowsAffected == 0 {
		return fmt.Errorf("group not found or already deleted")
	}

	return nil
}

// DeleteGroup performs a soft delete of a group by setting deleted_at
func (s *GroupService) DeleteGroup(ctx context.Context, groupID uuid.UUID) error {
	if groupID == uuid.Nil {
		return fmt.Errorf("group ID is required")
	}

	query := `
		UPDATE groups
		SET deleted_at = :deleted_at
		WHERE id = :id AND deleted_at IS NULL
	`
	result, err := s.db.NamedExecContext(ctx, query, map[string]interface{}{
		"id":        groupID,
		"deleted_at": time.Now().UTC(),
	})
	if err != nil {
		return fmt.Errorf("failed to delete group: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check delete result: %w", err)
	}
	if rowsAffected == 0 {
		return fmt.Errorf("group not found or already deleted")
	}

	return nil
}

// ListGroups retrieves groups with optional filtering and pagination
func (s *GroupService) ListGroups(ctx context.Context, filter GroupFilter, pagination Pagination) ([]*models.Group, int64, error) {
	// Build base query
	baseQuery := `
		SELECT id, title, description, creator_id, cover_image_id, created_at, updated_at, is_active, deleted_at
		FROM groups
		WHERE deleted_at IS NULL
	`
	countQuery := `
		SELECT COUNT(*)
		FROM groups
		WHERE deleted_at IS NULL
	`

	// Apply filters
	if filter.Title != "" {
		baseQuery += " AND title ILIKE :title"
		countQuery += " AND title ILIKE :title"
	}
	if filter.CreatorID != uuid.Nil {
		baseQuery += " AND creator_id = :creator_id"
		countQuery += " AND creator_id = :creator_id"
	}
	if filter.IsActive != nil {
		baseQuery += " AND is_active = :is_active"
		countQuery += " AND is_active = :is_active"
	}

	// Apply pagination
	baseQuery += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"

	// Prepare query args
	args := map[string]interface{}{
		"title":   "%" + filter.Title + "%",
		"creator_id": filter.CreatorID,
		"is_active": filter.IsActive,
		"limit":   pagination.Limit,
		"offset":  pagination.Offset,
	}

	// Execute count query
	var total int64
	err := s.db.GetContext(ctx, &total, countQuery, args)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count groups: %w", err)
	}

	// Execute main query
	var groups []*models.Group
	err = s.db.SelectContext(ctx, &groups, baseQuery, args)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list groups: %w", err)
	}

	return groups, total, nil
}