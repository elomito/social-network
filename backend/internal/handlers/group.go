package handlers

import (
    "encoding/json"
    "net/http"

    "github.com/google/uuid"

    "social-network/backend/internal/middleware"
    "social-network/backend/internal/services"
)

// createGroupRequest represents the expected payload for creating a group.
type createGroupRequest struct {
    Title       string `json:"title"`
    Description string `json:"description"`
}

// CreateGroupHandler returns an HTTP handler that creates groups using the provided service.
func CreateGroupHandler(svc *services.GroupService) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
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

        var req createGroupRequest
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
            http.Error(w, "invalid payload", http.StatusBadRequest)
            return
        }

        if req.Title == "" {
            http.Error(w, "title is required", http.StatusBadRequest)
            return
        }

        group, err := svc.CreateGroup(userID, req.Title, req.Description)
        if err != nil {
            http.Error(w, "failed to create group", http.StatusInternalServerError)
            return
        }

        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusCreated)
        json.NewEncoder(w).Encode(group)
    }
}
