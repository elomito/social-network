package services

import (
	"context"

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