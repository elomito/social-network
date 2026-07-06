package middleware

import (
	"context"
	"database/sql"
	"net/http"
	"time"

	"backend/internal/services" // Matches your internal structure
)

type ctxKey string

const userIDCtxKey ctxKey = "userID"

// CtxUserID is the context key for storing the authenticated user ID.
const CtxUserID ctxKey = "userID"

func Auth(db *sql.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			c, err := r.Cookie("session_id")
			if err != nil || c.Value == "" {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			session, err := services.GetSessionFromDB(db, c.Value)
			if err != nil {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			if time.Now().After(session.ExpiresAt) {
				_ = services.KillSession(db, c.Value)
				http.Error(w, "session expired", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), CtxUserID, session.UserID.String())
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserID(r *http.Request) string {
	for _, key := range []any{CtxUserID, userIDCtxKey} {
		v := r.Context().Value(key)
		if v == nil {
			continue
		}
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}
