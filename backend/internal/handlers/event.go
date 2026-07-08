package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"backend/internal/middleware"
	"backend/internal/models"
	"backend/internal/services"

	"github.com/google/uuid"
)

// EventHandler handles HTTP requests for events
type EventHandler struct {
	eventService *services.EventService
	db           *sql.DB
}

// NewEventHandler creates a new event handler
func NewEventHandler(eventService *services.EventService, db *sql.DB) *EventHandler {
	return &EventHandler{
		eventService: eventService,
		db:           db,
	}
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
	Response string `json:"response"`
	Status   string `json:"status"`
}

// CreateEvent handles POST /events
func (h *EventHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

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

	dateTime, err := parseEventDateTime(req.DateTime)
	if err != nil {
		http.Error(w, "invalid date_time format: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Get user ID from context (set by auth middleware)
	userIDStr := middleware.GetUserID(r)
	if userIDStr == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "invalid user id", http.StatusBadRequest)
		return
	}

	// Check if user is creator or has member/admin role in group
	var creatorID string
	err = h.db.QueryRowContext(r.Context(), "SELECT creator_id FROM groups WHERE id = ?", groupID.String()).Scan(&creatorID)
	if err != nil {
		http.Error(w, "group not found", http.StatusNotFound)
		return
	}

	var role string
	_ = h.db.QueryRowContext(r.Context(), "SELECT role FROM group_members WHERE group_id = ? AND user_id = ?", groupID.String(), userIDStr).Scan(&role)

	isMember := (creatorID == userIDStr) || (role != "")
	if !isMember {
		http.Error(w, "forbidden: only group members can create events", http.StatusForbidden)
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
		encodeError(w, err)
		return
	}

	// Notify all other members of the group about the new event
	rows, err := h.db.QueryContext(r.Context(), `
		SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?
	`, groupID.String(), userIDStr)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var memberID string
			if err := rows.Scan(&memberID); err == nil {
				notificationID := uuid.New().String()
				notificationMsg := "A new event '" + event.Title + "' has been created in your group."
				_, _ = h.db.ExecContext(r.Context(), `
					INSERT INTO notifications (id, recipient_id, initiator_id, type, reference_id, message, is_read, created_at)
					VALUES (?, ?, ?, 'event_created', ?, ?, 0, datetime('now'))
				`, notificationID, memberID, userIDStr, groupID.String(), notificationMsg)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(h.mapEventToJSON(r.Context(), event, userIDStr))
}

// GetEvent handles GET /events/{id}
func (h *EventHandler) GetEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id, err := uuid.Parse(pathParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid event id", http.StatusBadRequest)
		return
	}

	event, err := h.eventService.GetEvent(r.Context(), id)
	if err != nil {
		encodeError(w, err)
		return
	}

	userIDStr := middleware.GetUserID(r)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(h.mapEventToJSON(r.Context(), event, userIDStr))
}

// ListGroupEvents handles GET /groups/{id}/events
func (h *EventHandler) ListGroupEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	groupID, err := uuid.Parse(pathParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid group id", http.StatusBadRequest)
		return
	}

	events, err := h.eventService.ListGroupEvents(r.Context(), groupID)
	if err != nil {
		encodeError(w, err)
		return
	}

	userIDStr := middleware.GetUserID(r)
	var mappedEvents []map[string]any
	for _, e := range events {
		mappedEvents = append(mappedEvents, h.mapEventToJSON(r.Context(), e, userIDStr))
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(mappedEvents)
}

func (h *EventHandler) mapEventToJSON(ctx context.Context, e *models.Event, userIDStr string) map[string]any {
	var goingCount int
	var notGoingCount int
	var userResponse string

	_ = h.db.QueryRowContext(ctx, "SELECT count(*) FROM event_responses WHERE event_id = ? AND response = 'going'", e.ID.String()).Scan(&goingCount)
	_ = h.db.QueryRowContext(ctx, "SELECT count(*) FROM event_responses WHERE event_id = ? AND response = 'not_going'", e.ID.String()).Scan(&notGoingCount)

	if userIDStr != "" {
		_ = h.db.QueryRowContext(ctx, "SELECT response FROM event_responses WHERE event_id = ? AND user_id = ?", e.ID.String(), userIDStr).Scan(&userResponse)
	}

	return map[string]any{
		"id":              e.ID.String(),
		"group_id":        e.GroupID.String(),
		"title":           e.Title,
		"description":     e.Description,
		"date_time":       e.DateTime.Format(time.RFC3339),
		"start_time":      e.DateTime.Format(time.RFC3339),
		"created_by":      e.CreatedBy.String(),
		"going_count":     goingCount,
		"not_going_count": notGoingCount,
		"user_response":   userResponse,
	}
}

// UpdateEvent handles PUT /events/{id}
func (h *EventHandler) UpdateEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id, err := uuid.Parse(pathParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid event id", http.StatusBadRequest)
		return
	}

	var req UpdateEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	var groupIDStr string
	err = h.db.QueryRowContext(r.Context(), "SELECT group_id FROM events WHERE id = ?", id.String()).Scan(&groupIDStr)
	if err != nil {
		http.Error(w, "event not found", http.StatusNotFound)
		return
	}

	userIDStr := middleware.GetUserID(r)
	if userIDStr == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Check if user is creator or has admin role in group
	var creatorID string
	err = h.db.QueryRowContext(r.Context(), "SELECT creator_id FROM groups WHERE id = ?", groupIDStr).Scan(&creatorID)
	if err != nil {
		http.Error(w, "group not found", http.StatusNotFound)
		return
	}

	var role string
	_ = h.db.QueryRowContext(r.Context(), "SELECT role FROM group_members WHERE group_id = ? AND user_id = ?", groupIDStr, userIDStr).Scan(&role)

	isAdmin := (creatorID == userIDStr) || (role == "admin")
	if !isAdmin {
		http.Error(w, "forbidden: only group admins can update events", http.StatusForbidden)
		return
	}

	dateTime, err := parseEventDateTime(req.DateTime)
	if err != nil {
		http.Error(w, "invalid date_time format: "+err.Error(), http.StatusBadRequest)
		return
	}

	event := &models.Event{
		ID:          id,
		Title:       req.Title,
		Description: req.Description,
		DateTime:    dateTime,
	}

	if err := h.eventService.UpdateEvent(r.Context(), event); err != nil {
		encodeError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(event)
}

// DeleteEvent handles DELETE /events/{id}
func (h *EventHandler) DeleteEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id, err := uuid.Parse(pathParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid event id", http.StatusBadRequest)
		return
	}

	var groupIDStr string
	err = h.db.QueryRowContext(r.Context(), "SELECT group_id FROM events WHERE id = ?", id.String()).Scan(&groupIDStr)
	if err != nil {
		http.Error(w, "event not found", http.StatusNotFound)
		return
	}

	userIDStr := middleware.GetUserID(r)
	if userIDStr == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Check if user is creator or has admin role in group
	var creatorID string
	err = h.db.QueryRowContext(r.Context(), "SELECT creator_id FROM groups WHERE id = ?", groupIDStr).Scan(&creatorID)
	if err != nil {
		http.Error(w, "group not found", http.StatusNotFound)
		return
	}

	var role string
	_ = h.db.QueryRowContext(r.Context(), "SELECT role FROM group_members WHERE group_id = ? AND user_id = ?", groupIDStr, userIDStr).Scan(&role)

	isAdmin := (creatorID == userIDStr) || (role == "admin")
	if !isAdmin {
		http.Error(w, "forbidden: only group admins can delete events", http.StatusForbidden)
		return
	}

	if err := h.eventService.DeleteEvent(r.Context(), id); err != nil {
		encodeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// CreateEventResponse handles POST /events/{id}/responses
func (h *EventHandler) CreateEventResponse(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	eventID, err := uuid.Parse(pathParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid event id", http.StatusBadRequest)
		return
	}

	var req CreateEventResponseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	responseVal := req.Response
	if responseVal == "" && req.Status != "" {
		responseVal = req.Status
	}

	// Validate response value
	if responseVal != "going" && responseVal != "not_going" && responseVal != "maybe" {
		http.Error(w, "invalid response value (must be: going, not_going, or maybe)", http.StatusBadRequest)
		return
	}

	// Get user ID from context (set by auth middleware)
	userIDStr := middleware.GetUserID(r)
	if userIDStr == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "invalid user id", http.StatusBadRequest)
		return
	}

	response := &models.EventResponse{
		EventID:  eventID,
		UserID:   userID,
		Response: responseVal,
	}

	if err := h.eventService.CreateEventResponse(r.Context(), response); err != nil {
		encodeError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(response)
}

// GetEventResponses handles GET /events/{id}/responses
func (h *EventHandler) GetEventResponses(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	eventID, err := uuid.Parse(pathParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid event id", http.StatusBadRequest)
		return
	}

	responses, err := h.eventService.GetEventResponses(r.Context(), eventID)
	if err != nil {
		encodeError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(responses)
}

// DeleteEventResponse handles DELETE /events/{id}/responses
func (h *EventHandler) DeleteEventResponse(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	eventID, err := uuid.Parse(pathParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid event id", http.StatusBadRequest)
		return
	}

	// Get user ID from context (set by auth middleware)
	userIDStr := middleware.GetUserID(r)
	if userIDStr == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "invalid user id", http.StatusBadRequest)
		return
	}

	if err := h.eventService.DeleteEventResponse(r.Context(), userID, eventID); err != nil {
		encodeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func parseEventDateTime(val string) (time.Time, error) {
	// Try RFC3339
	if t, err := time.Parse(time.RFC3339, val); err == nil {
		return t, nil
	}
	// Try standard HTML5 input value formats
	formats := []string{
		"2006-01-02T15:04",
		"2006-01-02T15:04:05",
		"2006-01-02 15:04",
		"2006-01-02 15:04:05",
	}
	for _, layout := range formats {
		if t, err := time.Parse(layout, val); err == nil {
			return t, nil
		}
		// Try parsing as UTC
		if t, err := time.ParseInLocation(layout, val, time.UTC); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("invalid date_time format: %s", val)
}
