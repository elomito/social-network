package models

import (
	"time"

	"github.com/google/uuid"
)

type PrivateMessage struct {
	ID          uuid.UUID `json:"id" db:"id"`
	SenderID    uuid.UUID `json:"sender_id" db:"sender_id"`
	RecipientID uuid.UUID `json:"recipient_id" db:"recipient_id"`
	Content     string    `json:"content" db:"content"`
	IsRead      bool      `json:"is_read" db:"is_read"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

type GroupMessage struct {
	ID        uuid.UUID `json:"id" db:"id"`
	GroupID   uuid.UUID `json:"group_id" db:"group_id"`
	SenderID  uuid.UUID `json:"sender_id" db:"sender_id"`
	Content   string    `json:"content" db:"content"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type MessageType string

const (
	MessageTypePrivate MessageType = "private"
	MessageTypeGroup   MessageType = "group"
)

type WSPayload struct {
	Type    MessageType `json:"type"`
	Content string      `json:"content,omitempty"`
	GroupID *uuid.UUID  `json:"group_id,omitempty"`
}

type WSMessage struct {
	Type      string         `json:"type"`
	Payload   WSPayload      `json:"payload,omitempty"`
	Message   *PrivateMessage `json:"message,omitempty"`
	GroupMsg  *GroupMessage   `json:"group_message,omitempty"`
	TargetID  *uuid.UUID    `json:"target_id,omitempty"`
	SenderID  uuid.UUID      `json:"sender_id"`
	Timestamp time.Time      `json:"timestamp"`
}