package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"

	"backend/internal/middleware"
	"backend/internal/services"

	"github.com/google/uuid"
)

// followRequestPayload is used to accept a target user id when not provided in the URL.
type followRequestPayload struct {
	TargetID uuid.UUID `json:"target_id"`
}

type updateProfileRequestPayload struct {
	FirstName     *string `json:"first_name"`
	LastName      *string `json:"last_name"`
	Nickname      *string `json:"nickname"`
	AvatarImageID *string `json:"avatar_image_id"`
	CoverImageID  *string `json:"cover_image_id"`
	AboutMe       *string `json:"about_me"`
	IsPublic      *bool   `json:"is_public"`
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
func ProfileHandler(db *sql.DB, svc *services.UserService, followSvc *services.FollowService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
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
				actorID    uuid.UUID
				isOwner    bool
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
				"email":           user.Email,
				"date_of_birth":   user.DateOfBirth.Format("2006-01-02"),
				"avatar_image_id": nil,
				"avatar_url":      nil,
				"cover_image_id":  nil,
				"cover_url":       nil,
				"about_me":        user.AboutMe,
				"is_public":       user.IsPublic,
				"created_at":      user.CreatedAt,
				"is_owner":        isOwner,
				"is_follower":     isFollower,
			}
			var followersCount, followingCount int
			_ = db.QueryRowContext(r.Context(), "SELECT COUNT(1) FROM follows WHERE following_id = ?", user.ID.String()).Scan(&followersCount)
			_ = db.QueryRowContext(r.Context(), "SELECT COUNT(1) FROM follows WHERE follower_id = ?", user.ID.String()).Scan(&followingCount)
			resp["followersCount"] = followersCount
			resp["followingCount"] = followingCount

			if user.AvatarImageID != nil {
				resp["avatar_image_id"] = user.AvatarImageID.String()
				var imageURL sql.NullString
				err := db.QueryRowContext(r.Context(), "SELECT image_url FROM images WHERE id = ? LIMIT 1", user.AvatarImageID.String()).Scan(&imageURL)
				if err == nil && imageURL.Valid {
					resp["avatar_url"] = imageURL.String
				}
			}

			if user.CoverImageID != nil {
				resp["cover_image_id"] = user.CoverImageID.String()
				var imageURL sql.NullString
				err := db.QueryRowContext(r.Context(), "SELECT image_url FROM images WHERE id = ? LIMIT 1", user.CoverImageID.String()).Scan(&imageURL)
				if err == nil && imageURL.Valid {
					resp["cover_url"] = imageURL.String
				}
			}

			writeJSON(w, http.StatusOK, resp)
		case http.MethodPut:
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

			var payload updateProfileRequestPayload
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"message": "invalid payload"})
				return
			}

			upd := services.UpdateProfilePayload{}
			if payload.FirstName != nil {
				upd.FirstName = payload.FirstName
			}
			if payload.LastName != nil {
				upd.LastName = payload.LastName
			}
			if payload.Nickname != nil {
				upd.Nickname = payload.Nickname
			}
			if payload.AboutMe != nil {
				upd.AboutMe = payload.AboutMe
			}
			if payload.IsPublic != nil {
				upd.IsPublic = payload.IsPublic
			}
			if payload.AvatarImageID != nil {
				if *payload.AvatarImageID == "" {
					// handle empty string if needed
				} else if aid, err := uuid.Parse(*payload.AvatarImageID); err == nil {
					upd.AvatarImageID = &aid
				} else {
					writeJSON(w, http.StatusBadRequest, map[string]string{"message": "invalid avatar image id"})
					return
				}
			}
			if payload.CoverImageID != nil {
				if *payload.CoverImageID == "" {
					// handle empty string if needed
				} else if cid, err := uuid.Parse(*payload.CoverImageID); err == nil {
					upd.CoverImageID = &cid
				} else {
					writeJSON(w, http.StatusBadRequest, map[string]string{"message": "invalid cover image id"})
					return
				}
			}

			if err := svc.UpdateProfile(r.Context(), actorID, upd); err != nil {
				if errors.Is(err, services.ErrUserNotFound) {
					writeJSON(w, http.StatusNotFound, map[string]string{"message": "user not found"})
					return
				}
				writeJSON(w, http.StatusInternalServerError, map[string]string{"message": "failed to update profile"})
				return
			}

			resp := map[string]interface{}{"message": "profile updated"}
			if payload.FirstName != nil {
				resp["first_name"] = *payload.FirstName
			}
			if payload.LastName != nil {
				resp["last_name"] = *payload.LastName
			}
			if payload.Nickname != nil {
				resp["nickname"] = *payload.Nickname
			}
			if payload.AboutMe != nil {
				resp["about_me"] = *payload.AboutMe
			}
			if payload.IsPublic != nil {
				resp["is_public"] = *payload.IsPublic
			}
			if payload.AvatarImageID != nil {
				resp["avatar_image_id"] = *payload.AvatarImageID
			}
			if payload.CoverImageID != nil {
				resp["cover_image_id"] = *payload.CoverImageID
			}
			writeJSON(w, http.StatusOK, resp)
		default:
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"message": "method not allowed"})
		}
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

// DiscoverUsersHandler searches profiles in the database
func DiscoverUsersHandler(db *sql.DB, followSvc *services.FollowService) http.HandlerFunc {
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

		q := r.URL.Query()
		query := q.Get("query")

		rows, err := db.QueryContext(r.Context(), `
			SELECT id, first_name, last_name, nickname, email, about_me
			FROM users
			WHERE (first_name LIKE ? OR last_name LIKE ? OR nickname LIKE ? OR email LIKE ?)
			  AND id != ?
			LIMIT 100
		`, "%"+query+"%", "%"+query+"%", "%"+query+"%", "%"+query+"%", actorStr)
		if err != nil {
			http.Error(w, "database query error: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type DiscoverUserResponse struct {
			ID             string `json:"id"`
			Username       string `json:"username"`
			FullName       string `json:"fullName"`
			IsFollowing    bool   `json:"isFollowing"`
			FollowersCount int    `json:"followersCount"`
			Bio            string `json:"bio"`
		}

		users := []DiscoverUserResponse{}
		for rows.Next() {
			var id, firstName, lastName, nickname, email, aboutMe sql.NullString
			if err := rows.Scan(&id, &firstName, &lastName, &nickname, &email, &aboutMe); err != nil {
				continue
			}

			userUUID, err := uuid.Parse(id.String)
			if err != nil {
				continue
			}

			username := nickname.String
			if username == "" {
				username = email.String
			}

			// Get follower count
			var followersCount int
			err = db.QueryRowContext(r.Context(), `
				SELECT COUNT(1) FROM follows WHERE following_id = ?
			`, id.String).Scan(&followersCount)
			if err != nil {
				followersCount = 0
			}

			bio := ""
			if aboutMe.Valid {
				bio = aboutMe.String
			}

			users = append(users, DiscoverUserResponse{
				ID:             id.String,
				Username:       username,
				FullName:       firstName.String + " " + lastName.String,
				IsFollowing:    followSvc.IsFollowing(actorID, userUUID),
				FollowersCount: followersCount,
				Bio:            bio,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(users)
	}
}

// GetFollowersHandler returns a list of users who follow a given user (defaults to authenticated user)
func GetFollowersHandler(db *sql.DB, followSvc *services.FollowService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uidStr := r.URL.Query().Get("user_id")
		viewerIDStr := middleware.GetUserID(r)
		if viewerIDStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		if uidStr == "" {
			uidStr = viewerIDStr
		}

		userID, err := uuid.Parse(uidStr)
		if err != nil {
			http.Error(w, "invalid user id", http.StatusBadRequest)
			return
		}

		viewerID, err := uuid.Parse(viewerIDStr)
		if err != nil {
			http.Error(w, "invalid user id", http.StatusBadRequest)
			return
		}

		// Check privacy
		var isPublic bool
		err = db.QueryRowContext(r.Context(), "SELECT is_public FROM users WHERE id = ?", userID.String()).Scan(&isPublic)
		if err != nil {
			http.Error(w, "user not found", http.StatusNotFound)
			return
		}

		isOwner := (viewerID == userID)
		isFollower := false
		if !isOwner && followSvc != nil {
			isFollower = followSvc.IsFollowing(viewerID, userID)
		}

		if !isPublic && !isOwner && !isFollower {
			http.Error(w, "forbidden: profile is private", http.StatusForbidden)
			return
		}

		followerIDs := followSvc.GetFollowers(userID)
		followers := make([]map[string]interface{}, 0, len(followerIDs))
		for _, fid := range followerIDs {
			user, err := services.NewUserService(db).GetByID(r.Context(), fid)
			if err != nil {
				continue
			}
			username := ""
			if user.Nickname != nil && *user.Nickname != "" {
				username = *user.Nickname
			} else {
				username = user.Email
			}
			isFollowing := followSvc.IsFollowing(viewerID, fid)
			followers = append(followers, map[string]interface{}{
				"id":           user.ID.String(),
				"username":     username,
				"first_name":   user.FirstName,
				"last_name":    user.LastName,
				"isFollowing":  isFollowing,
				"is_following": isFollowing,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"followers": followers})
	}
}

// GetFollowingHandler returns a list of users a given user follows (defaults to authenticated user).
func GetFollowingHandler(db *sql.DB, followSvc *services.FollowService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uidStr := r.URL.Query().Get("user_id")
		viewerIDStr := middleware.GetUserID(r)
		if viewerIDStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		if uidStr == "" {
			uidStr = viewerIDStr
		}

		userID, err := uuid.Parse(uidStr)
		if err != nil {
			http.Error(w, "invalid user id", http.StatusBadRequest)
			return
		}

		viewerID, err := uuid.Parse(viewerIDStr)
		if err != nil {
			http.Error(w, "invalid user id", http.StatusBadRequest)
			return
		}

		// Check privacy
		var isPublic bool
		err = db.QueryRowContext(r.Context(), "SELECT is_public FROM users WHERE id = ?", userID.String()).Scan(&isPublic)
		if err != nil {
			http.Error(w, "user not found", http.StatusNotFound)
			return
		}

		isOwner := (viewerID == userID)
		isFollower := false
		if !isOwner && followSvc != nil {
			isFollower = followSvc.IsFollowing(viewerID, userID)
		}

		if !isPublic && !isOwner && !isFollower {
			http.Error(w, "forbidden: profile is private", http.StatusForbidden)
			return
		}

		followingIDs := followSvc.GetFollowing(userID)
		following := make([]map[string]interface{}, 0, len(followingIDs))
		userService := services.NewUserService(db)
		for _, fid := range followingIDs {
			user, err := userService.GetByID(r.Context(), fid)
			if err != nil {
				continue
			}
			username := ""
			if user.Nickname != nil && *user.Nickname != "" {
				username = *user.Nickname
			} else {
				username = user.Email
			}
			isFollowing := followSvc.IsFollowing(viewerID, fid)
			following = append(following, map[string]interface{}{
				"id":           user.ID.String(),
				"username":     username,
				"first_name":   user.FirstName,
				"last_name":    user.LastName,
				"isFollowing":  isFollowing,
				"is_following": isFollowing,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"following": following})
	}
}

// FollowStatusHandler checks if one user is following another
func FollowStatusHandler(svc *services.FollowService) http.HandlerFunc {
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

		isFollowing := svc.IsFollowing(actorID, targetID)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"is_following": isFollowing})
	}
}
