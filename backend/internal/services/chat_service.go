package services

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"social-network/backend/internal/models"
	ws "social-network/backend/internal/websocket"
)

// ChatService provides minimal in-memory chat persistence and uses the websocket Hub
type ChatService struct {
	hub     *ws.Hub
	storage map[string][]models.GroupMessage // map[groupID]messages
}

// NewChatService creates a ChatService bound to a Hub
func NewChatService(hub *ws.Hub) *ChatService {
	return &ChatService{hub: hub, storage: make(map[string][]models.GroupMessage)}
}

// SendGroupMessage creates and stores a GroupMessage and broadcasts it via the hub
func (s *ChatService) SendGroupMessage(senderID uuid.UUID, groupID uuid.UUID, content string) (models.GroupMessage, error) {
	m := models.GroupMessage{
		ID:        uuid.New(),
		GroupID:   groupID,
		SenderID:  senderID,
		Content:   content,
		CreatedAt: time.Now(),
	}
	// store in-memory
	key := groupID.String()
	s.storage[key] = append(s.storage[key], m)

	// broadcast via websocket hub
	payload := ws.WSMessage{
		Type:     "group_message",
		SenderID: senderID.String(),
		GroupID:  groupID.String(),
		Content:  content,
		CreatedAt: m.CreatedAt,
	}
	b, _ := json.Marshal(payload)
	s.hub.BroadcastToRoom(key, b)

	return m, nil
}

// GetGroupMessages returns stored messages for a group
func (s *ChatService) GetGroupMessages(groupID uuid.UUID) []models.GroupMessage {
	return s.storage[groupID.String()]
}
