package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"social-network/backend/internal/services"
)

// typed context key to avoid collisions
type ctxKey string

const CtxUserID ctxKey = "user_id"

// ErrMissingGroupID indicates no group id was found in request
var ErrMissingGroupID = errors.New("missing group id")

func getUserIDFromContext(r *http.Request) (uuid.UUID, bool) {
	val := r.Context().Value(CtxUserID)
	if val == nil {
		return uuid.Nil, false
	}
	switch v := val.(type) {
	case uuid.UUID:
		return v, true
	case string:
		uid, err := uuid.Parse(v)
		if err != nil {
			return uuid.Nil, false
		}
		return uid, true
	default:
		return uuid.Nil, false
	}
}

// parse group id from query param `group_id` or from any path segment that is a UUID
func parseGroupIDFromRequest(r *http.Request) (uuid.UUID, error) {
	// prefer explicit query param
	if groupIDStr := r.URL.Query().Get("group_id"); groupIDStr != "" {
		return uuid.Parse(groupIDStr)
	}

	// scan path segments for a UUID (handles routes like /groups/{id}/join)
	p := strings.Trim(r.URL.Path, "/")
	parts := strings.Split(p, "/")
	for _, part := range parts {
		if part == "" {
			continue
		}
		if uid, err := uuid.Parse(part); err == nil {
			return uid, nil
		}
	}

	return uuid.Nil, ErrMissingGroupID
}

// writeJSON helper sets content-type and writes the value
func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// JoinGroupHandler handles joining a group
func JoinGroupHandler(svc *services.GroupService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := getUserIDFromContext(r)
		if !ok {
			http.Error(w, "unauthenticated", http.StatusUnauthorized)
			return
		}

		gid, err := parseGroupIDFromRequest(r)
		if err != nil {
			http.Error(w, "invalid or missing group id", http.StatusBadRequest)
			return
		}

		err = svc.JoinGroup(r.Context(), userID, gid)
		if err == services.ErrAlreadyMember {
			writeJSON(w, http.StatusOK, map[string]string{"status": "already_member"})
			return
		}
		if err == services.ErrGroupNotFound {
			http.Error(w, "group not found", http.StatusNotFound)
			return
		}
		if err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		writeJSON(w, http.StatusCreated, map[string]string{"status": "joined"})
	}
}

// LeaveGroupHandler handles leaving a group
func LeaveGroupHandler(svc *services.GroupService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := getUserIDFromContext(r)
		if !ok {
			http.Error(w, "unauthenticated", http.StatusUnauthorized)
			return
		}

		gid, err := parseGroupIDFromRequest(r)
		if err != nil {
			http.Error(w, "invalid or missing group id", http.StatusBadRequest)
			return
		}

		err = svc.LeaveGroup(r.Context(), userID, gid)
		if err == services.ErrNotMember {
			http.Error(w, "not a member", http.StatusBadRequest)
			return
		}
		if err == services.ErrCreatorCannotLeave {
			http.Error(w, "creator cannot leave without transfer", http.StatusBadRequest)
			return
		}
		if err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"status": "left"})
	}
}
