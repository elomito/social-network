package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"backend/internal/middleware"
	"backend/internal/services"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

func TestProfileHandlerUpdateProfile(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}
	defer db.Close()

	_, err = db.Exec(`
		CREATE TABLE users (
			id TEXT PRIMARY KEY,
			email TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			first_name TEXT NOT NULL,
			last_name TEXT NOT NULL,
			nickname TEXT,
			date_of_birth TEXT,
			avatar_image_id TEXT,
			about_me TEXT,
			is_public INTEGER NOT NULL,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			last_active_at TEXT,
			deleted_at TEXT
		)
	`)
	if err != nil {
		t.Fatalf("create users table: %v", err)
	}

	actorID := uuid.New()
	now := time.Now().UTC().Format(time.RFC3339)
	_, err = db.Exec(`
		INSERT INTO users (
			id, email, password_hash, first_name, last_name, nickname, about_me, is_public, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, actorID.String(), "test@example.com", "hash", "John", "Doe", nil, nil, 1, now, now)
	if err != nil {
		t.Fatalf("insert user: %v", err)
	}

	svc := services.NewUserService(db)
	handler := ProfileHandler(db, svc, nil)

	payload := `{"first_name":"Jane","last_name":"Smith","nickname":"J","about_me":"Hello world","is_public":false}`
	req := httptest.NewRequest(http.MethodPut, "/api/users", strings.NewReader(payload))
	req = req.WithContext(context.WithValue(req.Context(), middleware.CtxUserID, actorID.String()))
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var response map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if response["first_name"] != "Jane" {
		t.Fatalf("expected first_name to update, got %#v", response["first_name"])
	}

	var storedFirstName string
	err = db.QueryRow(`SELECT first_name FROM users WHERE id = ?`, actorID.String()).Scan(&storedFirstName)
	if err != nil {
		t.Fatalf("query stored profile: %v", err)
	}
	if storedFirstName != "Jane" {
		t.Fatalf("expected updated first_name persisted, got %q", storedFirstName)
	}
}
