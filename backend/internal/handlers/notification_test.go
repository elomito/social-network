package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"backend/internal/middleware"
	"backend/internal/services"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

func TestUnreadNotificationsHandlerReturnsUnreadCount(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}
	defer db.Close()

	_, err = db.Exec(`
		CREATE TABLE notifications (
			id TEXT PRIMARY KEY,
			recipient_id TEXT NOT NULL,
			initiator_id TEXT,
			type TEXT NOT NULL,
			reference_id TEXT,
			message TEXT,
			is_read INTEGER NOT NULL,
			created_at TEXT NOT NULL
		)
	`)
	if err != nil {
		t.Fatalf("create notifications table: %v", err)
	}

	recipientID := uuid.New()
	now := time.Now().UTC().Format(time.RFC3339)
	_, err = db.Exec(`
		INSERT INTO notifications (id, recipient_id, initiator_id, type, reference_id, message, is_read, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?)
	`,
		uuid.New().String(), recipientID.String(), nil, "follow_request", "ref-1", "Hello", 0, now,
		uuid.New().String(), recipientID.String(), nil, "event_created", "ref-2", "There", 1, now,
	)
	if err != nil {
		t.Fatalf("seed notifications: %v", err)
	}

	svc := services.NewNotificationService(db)
	handler := UnreadNotificationsHandler(svc)

	req := httptest.NewRequest(http.MethodGet, "/api/notifications/unread", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.CtxUserID, recipientID.String()))
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp map[string]any
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if got := resp["count"]; got != float64(1) {
		t.Fatalf("expected unread count 1, got %#v", got)
	}
}
