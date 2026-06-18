package handlers

import (
	"encoding/json"
	"net/http"
	"backend/internal/models"
	"backend/internal/services"
	"time"

	"github.com/google/uuid"
)

// EventHandler handles HTTP requests for events
type EventHandler struct {
	eventService *services.EventService
}

// NewEventHandler creates a new event handler
func NewEventHandler(eventService *services.EventService) *EventHandler {
	return &EventHandler{eventService: eventService}
}

// CreateEventRequest represents the request body for creating an event
type CreateEventRequest struct {
	GroupID     string `json:"group_id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	DateTime    string `json:"date_time"` // ISO 8601 format
}

// UpdateEventRequest represents the request body for updating an event
type UpdateEventRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	DateTime    string `json:"date_time"`
}

// CreateEventResponseRequest represents the request body for creating an event response
type CreateEventResponseRequest struct {
	Response string `json:"response"` // "going", "not_going", "maybe"
}

// CreateEvent handles POST /events
func (h *EventHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	var req CreateEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	groupID, err := uuid.Parse(req.GroupID)
	if err != nil {
		http.Error(w, "invalid group_id", http.StatusBadRequest)
		return
	}

	dateTime, err := time.Parse(time.RFC3339, req.DateTime)
	if err != nil {
		http.Error(w, "invalid date_time format", http.StatusBadRequest)
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, ok := r.Context().Value("userID").(uuid.UUID)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	event := &models.Event{
		GroupID:     groupID,
		Title:       req.Title,
		Description: req.Description,
		DateTime:    dateTime,
		CreatedBy:   userID,
	}

	if err := h.eventService.CreateEvent(r.Context(), event); err != nil {
		http.Error(w, "failed to create event", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(event)
}

// GetEvent handles GET /events/{id}
func (h *EventHandler) GetEvent(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid event id", http.StatusBadRequest)
		return
	}

	event, err := h.eventService.GetEvent(r.Context(), id)
	if err != nil {
		http.Error(w, "event not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(event)
}

// ListGroupEvents handles GET /groups/{id}/events
func (h *EventHandler) ListGroupEvents(w http.ResponseWriter, r *http.Request) {
	groupID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid group id", http.StatusBadRequest)
		return
	}

	events, err := h.eventService.ListGroupEvents(r.Context(), groupID)
	if err != nil {
		http.Error(w, "failed to list events", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

// UpdateEvent handles PUT /events/{id}
func (h *EventHandler) UpdateEvent(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid event id", http.StatusBadRequest)
		return
	}

	var req UpdateEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	dateTime, err := time.Parse(time.RFC3339, req.DateTime)
	if err != nil {
		http.Error(w, "invalid date_time format", http.StatusBadRequest)
		return
	}

	event := &models.Event{
		ID:          id,
		Title:       req.Title,
		Description: req.Description,
		DateTime:    dateTime,
	}

	if err := h.eventService.UpdateEvent(r.Context(), event); err != nil {
		http.Error(w, "failed to update event", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(event)
}

// DeleteEvent handles DELETE /events/{id}
func (h *EventHandler) DeleteEvent(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid event id", http.StatusBadRequest)
		return
	}

	if err := h.eventService.DeleteEvent(r.Context(), id); err != nil {
		http.Error(w, "failed to delete event", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// CreateEventResponse handles POST /events/{id}/responses
func (h *EventHandler) CreateEventResponse(w http.ResponseWriter, r *http.Request) {
	eventID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid event id", http.StatusBadRequest)
		return
	}

	var req CreateEventResponseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Validate response value
	if req.Response != "going" && req.Response != "not_going" && req.Response != "maybe" {
		http.Error(w, "invalid response value (must be: going, not_going, or maybe)", http.StatusBadRequest)
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, ok := r.Context().Value("userID").(uuid.UUID)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	response := &models.EventResponse{
		EventID:  eventID,
		UserID:   userID,
		Response: req.Response,
	}

	if err := h.eventService.CreateEventResponse(r.Context(), response); err != nil {
		http.Error(w, "failed to create event response", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// GetEventResponses handles GET /events/{id}/responses
func (h *EventHandler) GetEventResponses(w http.ResponseWriter, r *http.Request) {
	eventID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid event id", http.StatusBadRequest)
		return
	}

	responses, err := h.eventService.GetEventResponses(r.Context(), eventID)
	if err != nil {
		http.Error(w, "failed to get event responses", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(responses)
}

// DeleteEventResponse handles DELETE /events/{id}/responses
func (h *EventHandler) DeleteEventResponse(w http.ResponseWriter, r *http.Request) {
	eventID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid event id", http.StatusBadRequest)
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, ok := r.Context().Value("userID").(uuid.UUID)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if err := h.eventService.DeleteEventResponse(r.Context(), userID, eventID); err != nil {
		http.Error(w, "failed to delete event response", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}