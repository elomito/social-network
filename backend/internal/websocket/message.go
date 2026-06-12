package websocket

import "time"

// WSMessage is the JSON payload exchanged over the socket.
type WSMessage struct {
	Type      string    `json:"type"`
	SenderID  string    `json:"sender_id"`
	GroupID   string    `json:"group_id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at,omitempty"`
}
