package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"

	"backend/internal/middleware"
	"backend/internal/services"
)

// followRequestPayload is used to accept a target user id when not provided in the URL.
type followRequestPayload struct {
	TargetID uuid.UUID `json:"target_id"`
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
	// ProfileHandler returns public profile information for a user.
		}
