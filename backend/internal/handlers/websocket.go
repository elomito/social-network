package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"backend/internal/models"
	"backend/internal/websocket"

	"github.com/google/uuid"
	gorillaWS "github.com/gorilla/websocket"
)

var upgrader = gorillaWS.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type WebSocketHandler struct {
	hub *websocket.Hub
	db  *sql.DB
}

func NewWebSocketHandler(hub *websocket.Hub, db *sql.DB) *WebSocketHandler {
	return &WebSocketHandler{
		hub: hub,
		db:  db,
	}
}

type WSConnectRequest struct {
	UserID string `json:"user_id"`
	Token  string `json:"token"`
}

func (h *WebSocketHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "could not upgrade connection", http.StatusBadRequest)
		return
	}

	var req WSConnectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UserID == "" {
		conn.Close()
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		conn.Close()
		http.Error(w, "invalid user ID", http.StatusBadRequest)
		return
	}

	if req.Token == "" {
		conn.Close()
		http.Error(w, "token required", http.StatusUnauthorized)
		return
	}

	var session models.Session
	err = h.db.QueryRowContext(r.Context(),
		"SELECT id, user_id, expires_at, created_at FROM sessions WHERE id = ?", req.Token).
		Scan(&session.ID, &session.UserID, &session.ExpiresAt, &session.CreatedAt)
	if err != nil {
		conn.Close()
		http.Error(w, "invalid session", http.StatusUnauthorized)
		return
	}

	if session.UserID != userID || time.Now().After(session.ExpiresAt) {
		conn.Close()
		http.Error(w, "session expired or invalid", http.StatusUnauthorized)
		return
	}

	client := websocket.NewClient(h.hub, conn, userID)

	h.hub.Register(client, userID)

	go client.WritePump()
	go client.ReadPump()
}
