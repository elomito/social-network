package websocket

import (
	"time"

	"github.com/google/uuid"
)

// WSMessage is the JSON payload exchanged over the socket.
type WSMessage struct {
	Type      string    `json:"type"`
	SenderID  uuid.UUID `json:"sender_id"`
	GroupID   uuid.UUID `json:"group_id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at,omitempty"`
}
