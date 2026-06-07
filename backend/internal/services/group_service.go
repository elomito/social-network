package services

import (
	"context"
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

// CreateGroup creates a new group
func (s *GroupService) CreateGroup(ctx context.Context, group *models.Group) error {
	query := `
		INSERT INTO groups (id, title, description, creator_id, cover_image_id, created_at, updated_at, is_active)
		VALUES (:id, :title, :description, :creator_id, :cover_image_id, :created_at, :updated_at, :is_active)
	`
	group.ID = uuid.New()
	group.CreatedAt = time.Now().UTC()
	group.UpdatedAt = group.CreatedAt

	_, err := s.db.NamedExecContext(ctx, query, group)
	if err != nil {
		return err
	}

	// Add creator as admin member
	member := &models.GroupMember{
		ID:      uuid.New(),
		GroupID: group.ID,
		UserID:  group.CreatorID,
		Role:    "admin",
		JoinedAt: time.Now().UTC(),
	}

	memberQuery := `
		INSERT INTO group_members (id, group_id, user_id, role, joined_at)
		VALUES (:id, :group_id, :user_id, :role, :joined_at)
	`
	_, err = s.db.NamedExecContext(ctx, memberQuery, member)
	return err
}