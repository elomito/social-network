package handlers

import (
    "encoding/json"
    "net/http"

    "github.com/google/uuid"

    "social-network/backend/internal/middleware"
    "social-network/backend/internal/services"
)

// followRequestPayload is used to accept a target user id when not provided in the URL.
type followRequestPayload struct {
    TargetID string `json:"target_id"`
}

// FollowHandler returns an HTTP handler to follow a user.
// Expects either `?id=<target>` query param or JSON {"target_id":"..."}.
func FollowHandler(svc *services.FollowService) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        actorStr := middleware.GetUserID(r)
        if actorStr == "" {
            http.Error(w, "unauthorized", http.StatusUnauthorized)
            return
        }
        actorID, err := uuid.Parse(actorStr)
        if err != nil {
            http.Error(w, "invalid user id", http.StatusBadRequest)
            return
        }

        // Try query param first
        targetStr := r.URL.Query().Get("id")
        if targetStr == "" {
            var p followRequestPayload
            if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
                http.Error(w, "missing target id", http.StatusBadRequest)
                return
            }
            targetStr = p.TargetID
        }

        targetID, err := uuid.Parse(targetStr)
        if err != nil {
            http.Error(w, "invalid target id", http.StatusBadRequest)
            return
        }

        if err := svc.Follow(actorID, targetID); err != nil {
            http.Error(w, "failed to follow", http.StatusInternalServerError)
            return
        }

        w.WriteHeader(http.StatusNoContent)
    }
}

// UnfollowHandler returns an HTTP handler to unfollow a user.
func UnfollowHandler(svc *services.FollowService) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        actorStr := middleware.GetUserID(r)
        if actorStr == "" {
            http.Error(w, "unauthorized", http.StatusUnauthorized)
            return
        }
        actorID, err := uuid.Parse(actorStr)
        if err != nil {
            http.Error(w, "invalid user id", http.StatusBadRequest)
            return
        }

        targetStr := r.URL.Query().Get("id")
        if targetStr == "" {
            var p followRequestPayload
            if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
                http.Error(w, "missing target id", http.StatusBadRequest)
                return
            }
            targetStr = p.TargetID
        }

        targetID, err := uuid.Parse(targetStr)
        if err != nil {
            http.Error(w, "invalid target id", http.StatusBadRequest)
            return
        }

        if err := svc.Unfollow(actorID, targetID); err != nil {
            http.Error(w, "failed to unfollow", http.StatusInternalServerError)
            return
        }

        w.WriteHeader(http.StatusNoContent)
    }
}
