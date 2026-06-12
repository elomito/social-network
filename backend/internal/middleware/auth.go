package middleware

import (
	"context"
	"net/http"
)

type ctxKey string

const userIDCtxKey ctxKey = "userID"

// Auth is a simple session-cookie based authentication middleware.
// It checks for a cookie named `session_id` and, when present, stores
// its value in the request context as the user identifier. Handlers
// can retrieve it via `GetUserID`.
func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := r.Cookie("session_id")
		if err != nil || c.Value == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), userIDCtxKey, c.Value)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetUserID returns the user identifier (as stored by `Auth`) or
// an empty string when unauthenticated.
func GetUserID(r *http.Request) string {
	v := r.Context().Value(userIDCtxKey)
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}
