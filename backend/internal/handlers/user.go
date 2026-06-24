package handlers

import (
	"encoding/json"
	"errors"
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
			return
		}

		// Try query param first
		targetStr := r.URL.Query().Get("id")
		var targetID uuid.UUID
		if targetStr == "" {
			var p followRequestPayload
			if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
				http.Error(w, "missing target id", http.StatusBadRequest)
				return
			}
			if p.TargetID == uuid.Nil {
				http.Error(w, "missing target id", http.StatusBadRequest)
				return
			}
			targetID = p.TargetID
		} else {
			targetID, err = uuid.Parse(targetStr)
			if err != nil {
				http.Error(w, "invalid target id", http.StatusBadRequest)
				return
			}
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
		var targetID uuid.UUID
		if targetStr == "" {
			var p followRequestPayload
			if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
				http.Error(w, "missing target id", http.StatusBadRequest)
				return
			}
			if p.TargetID == uuid.Nil {
				http.Error(w, "missing target id", http.StatusBadRequest)
				return
			}
			targetID = p.TargetID
		} else {
			targetID, err = uuid.Parse(targetStr)
			if err != nil {
				http.Error(w, "invalid target id", http.StatusBadRequest)
				return
			}
		}

		if err := svc.Unfollow(actorID, targetID); err != nil {
			http.Error(w, "failed to unfollow", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

// ProfileHandler returns public profile information for a user.
// Expects GET /api/users?id=<user-id>
// ProfileHandler returns public profile information for a user.
// If the profile is private and the viewer is not the owner nor a follower,
// the handler returns a limited response with `locked: true` so the frontend
// can show a locked indicator instead of a hard 403.
func ProfileHandler(svc *services.UserService, followSvc *services.FollowService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"message": "method not allowed"})
			return
		}

		idStr := r.URL.Query().Get("id")
		if idStr == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"message": "missing id"})
			return
		}

		id, err := uuid.Parse(idStr)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"message": "invalid id"})
			return
		}

		user, err := svc.GetByID(r.Context(), id)
		if err != nil {
			if errors.Is(err, services.ErrUserNotFound) {
				writeJSON(w, http.StatusNotFound, map[string]string{"message": "user not found"})
				return
			}
			writeJSON(w, http.StatusInternalServerError, map[string]string{"message": "internal server error"})
			return
		}
		// Determine viewer identity (if any)
		actorStr := middleware.GetUserID(r)
		var (
			actorID uuid.UUID
			isOwner bool
			isFollower bool
		)
		if actorStr != "" {
			if aid, err := uuid.Parse(actorStr); err == nil {
				actorID = aid
				isOwner = (actorID == user.ID)
				if !isOwner && followSvc != nil {
					isFollower = followSvc.IsFollowing(actorID, user.ID)
				}
			}
		}

		// If profile is private and viewer is neither owner nor follower,
		// return a limited locked response (frontend shows a locked indicator).
		if !user.IsPublic && !isOwner && !isFollower {
			resp := map[string]interface{}{
				"id":         user.ID.String(),
				"first_name": user.FirstName,
				"last_name":  user.LastName,
				"locked":     true,
				"is_owner":   false,
				"is_public":  user.IsPublic,
			}
			writeJSON(w, http.StatusOK, resp)
			return
		}

		resp := map[string]interface{}{
			"id":              user.ID.String(),
			"first_name":      user.FirstName,
			"last_name":       user.LastName,
			"nickname":        user.Nickname,
			"avatar_image_id": nil,
			"about_me":        user.AboutMe,
			"is_public":       user.IsPublic,
			"created_at":      user.CreatedAt,
			"is_owner":        isOwner,
			"is_follower":     isFollower,
		}
		if user.AvatarImageID != nil {
			resp["avatar_image_id"] = user.AvatarImageID.String()
		}

		writeJSON(w, http.StatusOK, resp)
	}
}

// ToggleVisibilityPayload is used to accept visibility updates from the client.
type ToggleVisibilityPayload struct {
	IsPublic bool `json:"is_public"`
}

// ToggleVisibilityHandler allows an authenticated user to switch their profile visibility.
func ToggleVisibilityHandler(svc *services.UserService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"message": "method not allowed"})
			return
		}

		actorStr := middleware.GetUserID(r)
		if actorStr == "" {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"message": "unauthorized"})
			return
		}
		actorID, err := uuid.Parse(actorStr)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"message": "invalid user id"})
			return
		}

		var p ToggleVisibilityPayload
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"message": "invalid payload"})
			return
		}

		upd := services.UpdateProfilePayload{IsPublic: &p.IsPublic}
		if err := svc.UpdateProfile(r.Context(), actorID, upd); err != nil {
			if errors.Is(err, services.ErrUserNotFound) {
				writeJSON(w, http.StatusNotFound, map[string]string{"message": "user not found"})
				return
			}
			writeJSON(w, http.StatusInternalServerError, map[string]string{"message": "failed to update visibility"})
			return
		}

		writeJSON(w, http.StatusOK, map[string]bool{"is_public": p.IsPublic})
	}
}
