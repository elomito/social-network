package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/jmoiron/sqlx"
	"social-network/backend/internal/models"
	"social-network/backend/internal/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type WebSocketHandler struct {
	hub *websocket.Hub
	db  *sqlx.DB
}

func NewWebSocketHandler(hub *websocket.Hub, db *sqlx.DB) *WebSocketHandler {
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
	err = h.db.GetContext(r.Context(), &session,
		"SELECT id, user_id, expires_at, created_at FROM sessions WHERE id = ?", req.Token)
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

	client := &websocket.Client{
		Hub:    h.hub,
		Conn:   conn,
		Send:   make(chan websocket.Message, 256),
		UserID: userID,
	}

	h.hub.Register(client)

	go client.WritePump()
	go client.ReadPump()
}