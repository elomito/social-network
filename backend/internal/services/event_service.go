package services

import (
	"context"
	"errors"
	"backend/internal/models"
	"backend/internal/repository"
	"time"

	"github.com/google/uuid"
)

// EventService handles event business logic
type EventService struct {
	eventRepo         repository.EventRepository
	eventResponseRepo repository.EventResponseRepository
}

// NewEventService creates a new event service
func NewEventService(eventRepo repository.EventRepository, eventResponseRepo repository.EventResponseRepository) *EventService {
	return &EventService{
		eventRepo:         eventRepo,
		eventResponseRepo: eventResponseRepo,
	}
}

// CreateEvent creates a new event
func (s *EventService) CreateEvent(ctx context.Context, event *models.Event) error {
	event.ID = uuid.New()
	event.CreatedAt = time.Now()
	event.UpdatedAt = time.Now()
	return s.eventRepo.Create(ctx, event)
}

// GetEvent retrieves an event by ID
func (s *EventService) GetEvent(ctx context.Context, id uuid.UUID) (*models.Event, error) {
	return s.eventRepo.FindByID(ctx, id)
}

// ListGroupEvents retrieves all events for a group
func (s *EventService) ListGroupEvents(ctx context.Context, groupID uuid.UUID) ([]*models.Event, error) {
	return s.eventRepo.FindByGroupID(ctx, groupID)
}

// UpdateEvent updates an existing event
func (s *EventService) UpdateEvent(ctx context.Context, event *models.Event) error {
	existing, err := s.eventRepo.FindByID(ctx, event.ID)
	if err != nil {
		return err
	}
	if existing == nil {
		return errors.New("event not found")
	}
	event.UpdatedAt = time.Now()
	return s.eventRepo.Update(ctx, event)
}

// DeleteEvent deletes an event
func (s *EventService) DeleteEvent(ctx context.Context, id uuid.UUID) error {
	// First delete all responses to this event
	if err := s.eventResponseRepo.DeleteByEventID(ctx, id); err != nil {
		return err
	}
	return s.eventRepo.Delete(ctx, id)
}

// CreateEventResponse creates an RSVP response for an event
func (s *EventService) CreateEventResponse(ctx context.Context, response *models.EventResponse) error {
	// Check if user already has a response
	existing, err := s.eventResponseRepo.FindByUserIDAndEventID(ctx, response.UserID, response.EventID)
	if err == nil && existing != nil {
		// Update existing response
		response.ID = existing.ID
		response.UpdatedAt = time.Now()
		return s.eventResponseRepo.Update(ctx, response)
	}
	
	response.ID = uuid.New()
	response.CreatedAt = time.Now()
	response.UpdatedAt = time.Now()
	return s.eventResponseRepo.Create(ctx, response)
}

// GetEventResponses retrieves all responses for an event
func (s *EventService) GetEventResponses(ctx context.Context, eventID uuid.UUID) ([]*models.EventResponse, error) {
	return s.eventResponseRepo.FindByEventID(ctx, eventID)
}

// UpdateEventResponse updates an existing event response
func (s *EventService) UpdateEventResponse(ctx context.Context, response *models.EventResponse) error {
	existing, err := s.eventResponseRepo.FindByUserIDAndEventID(ctx, response.UserID, response.EventID)
	if err != nil {
		return err
	}
	if existing == nil {
		return errors.New("event response not found")
	}
	response.ID = existing.ID
	response.UpdatedAt = time.Now()
	return s.eventResponseRepo.Update(ctx, response)
}

// DeleteEventResponse deletes a user's event response
func (s *EventService) DeleteEventResponse(ctx context.Context, userID, eventID uuid.UUID) error {
	response, err := s.eventResponseRepo.FindByUserIDAndEventID(ctx, userID, eventID)
	if err != nil {
		return err
	}
	if response == nil {
		return errors.New("event response not found")
	}
	return s.eventResponseRepo.Delete(ctx, response.ID)
}
