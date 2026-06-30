package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"backend/internal/middleware"
	"backend/internal/models"
	"backend/internal/services"

	"github.com/google/uuid"
)

// CreateNotificationHandler expects JSON body with recipient_id, type, reference_id, message, optional initiator_id
func CreateNotificationHandler(svc *services.NotificationService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload struct {
			RecipientID string `json:"recipient_id"`
			InitiatorID string `json:"initiator_id"`
			Type        string `json:"type"`
			ReferenceID string `json:"reference_id"`
			Message     string `json:"message"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		rec, err := uuid.Parse(payload.RecipientID)
		if err != nil {
			http.Error(w, "invalid recipient", http.StatusBadRequest)
			return
		}
		var initiator *uuid.UUID
		if payload.InitiatorID != "" {
			if uid, err := uuid.Parse(payload.InitiatorID); err == nil {
				initiator = &uid
			}
		}
		n := models.Notification{
			RecipientID: rec,
			InitiatorID: initiator,
			Type:        payload.Type,
			ReferenceID: payload.ReferenceID,
			Message:     payload.Message,
			IsRead:      false,
		}
		id, err := svc.Create(r.Context(), n)
		if err != nil {
			http.Error(w, "failed to create", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"id": id.String()})
	}
}

// ListNotificationsHandler lists notifications for the authenticated user
func ListNotificationsHandler(svc *services.NotificationService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uidStr := middleware.GetUserID(r)
		if uidStr == "" {
			http.Error(w, "unauthenticated", http.StatusUnauthorized)
			return
		}
		userID, err := uuid.Parse(uidStr)
		if err != nil {
			http.Error(w, "invalid user", http.StatusBadRequest)
			return
		}

		limit := 50
		if lstr := r.URL.Query().Get("limit"); lstr != "" {
			if l, err := strconv.Atoi(lstr); err == nil {
				limit = l
			}
		}
		notifs, err := svc.ListForUser(r.Context(), userID, limit)
		if err != nil {
			http.Error(w, "failed to list", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(notifs)
	}
}

// MarkNotificationReadHandler marks a notification as read
func MarkNotificationReadHandler(svc *services.NotificationService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.URL.Query().Get("id")
		if idStr == "" {
			http.Error(w, "missing id", http.StatusBadRequest)
			return
		}
		id, err := uuid.Parse(idStr)
		if err != nil {
			http.Error(w, "invalid id", http.StatusBadRequest)
			return
		}
		if err := svc.MarkRead(r.Context(), id); err != nil {
			http.Error(w, "failed", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

// MarkAllNotificationsReadHandler marks all notifications for the user as read
func MarkAllNotificationsReadHandler(svc *services.NotificationService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uidStr := middleware.GetUserID(r)
		if uidStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		userID, err := uuid.Parse(uidStr)
		if err != nil {
			http.Error(w, "invalid user", http.StatusBadRequest)
			return
		}
		if err := svc.MarkAllRead(r.Context(), userID); err != nil {
			http.Error(w, "failed", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
