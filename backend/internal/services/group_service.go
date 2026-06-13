package services

import (
    "time"

    "github.com/google/uuid"

    "social-network/backend/internal/models"
)

// GroupService provides minimal in-memory group persistence.
type GroupService struct {
    storage map[string]models.Group // map[groupID]Group
}

// NewGroupService creates a GroupService instance.
func NewGroupService() *GroupService {
    return &GroupService{storage: make(map[string]models.Group)}
}

// CreateGroup creates a new Group and stores it in memory.
func (s *GroupService) CreateGroup(creatorID uuid.UUID, title, description string) (models.Group, error) {
    now := time.Now()
    g := models.Group{
        ID:          uuid.New(),
        Title:       title,
        Description: description,
        CreatorID:   creatorID,
        CreatedAt:   now,
        UpdatedAt:   now,
        IsActive:    true,
    }
    s.storage[g.ID.String()] = g
    return g, nil
}

// GetGroup retrieves a group by id.
func (s *GroupService) GetGroup(id uuid.UUID) (models.Group, bool) {
    g, ok := s.storage[id.String()]
    return g, ok
}
