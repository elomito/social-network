package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"

	_ "github.com/mattn/go-sqlite3"

	"backend/internal/models"
	ws "backend/internal/websocket"
)

type rateLimitEntry struct {
	count     int
	resetTime time.Time
}

type ChatService struct {
	db           *sql.DB
	hub          *ws.Hub
	rateLimiter  map[uuid.UUID]*rateLimitEntry
	rateMu       sync.Mutex
	rateInterval time.Duration
	rateLimit    int
}

func NewChatService(db *sql.DB, hub *ws.Hub) *ChatService {
	return &ChatService{
		db:           db,
		hub:          hub,
		rateLimiter:  make(map[uuid.UUID]*rateLimitEntry),
		rateInterval: time.Minute,
		rateLimit:    30,
	}
}

//
// -------------------------
// SQLITE HELPER (EXISTS)
// -------------------------
//

func (s *ChatService) exists(ctx context.Context, query string, args ...any) (bool, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx, query, args...).Scan(&exists)
	if err != nil {
		return false, err
	}
	return exists, nil
}

//
// -------------------------
// RATE LIMIT
// -------------------------
//

func (s *ChatService) checkRateLimit(userID uuid.UUID) bool {
	s.rateMu.Lock()
	defer s.rateMu.Unlock()

	now := time.Now()
	entry, ok := s.rateLimiter[userID]

	if !ok || now.After(entry.resetTime) {
		s.rateLimiter[userID] = &rateLimitEntry{
			count:     1,
			resetTime: now.Add(s.rateInterval),
		}
		return true
	}

	if entry.count >= s.rateLimit {
		return false
	}

	entry.count++
	return true
}

//
// -------------------------
// VALIDATION
// -------------------------
//

func (s *ChatService) validateUserExists(ctx context.Context, userID uuid.UUID) error {
	ok, err := s.exists(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM users
			WHERE id = ? AND deleted_at IS NULL
		)
	`, userID)

	if err != nil {
		return fmt.Errorf("failed to validate user: %w", err)
	}
	if !ok {
		return errors.New("user not found")
	}
	return nil
}

func (s *ChatService) validateGroupMembership(ctx context.Context, userID, groupID uuid.UUID) error {
	ok, err := s.exists(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM group_members gm
			JOIN groups g ON gm.group_id = g.id
			WHERE gm.user_id = ?
			AND gm.group_id = ?
			AND g.deleted_at IS NULL
			AND g.is_active = 1
		)
	`, userID, groupID)

	if err != nil {
		return fmt.Errorf("failed to validate group membership: %w", err)
	}
	if !ok {
		return errors.New("user is not a member of this group")
	}
	return nil
}

//
// -------------------------
// PRIVATE MESSAGE
// -------------------------
//

func (s *ChatService) SendPrivateMessage(
	ctx context.Context,
	senderID, recipientID uuid.UUID,
	content string,
) (*models.PrivateMessage, error) {

	if content == "" {
		return nil, errors.New("message content cannot be empty")
	}

	if senderID == recipientID {
		return nil, errors.New("cannot send message to yourself")
	}

	if !s.checkRateLimit(senderID) {
		return nil, errors.New("rate limit exceeded: max 30 messages per minute")
	}

	if err := s.validateUserExists(ctx, recipientID); err != nil {
		return nil, err
	}

	msg := &models.PrivateMessage{
		ID:          uuid.New(),
		SenderID:    senderID,
		RecipientID: recipientID,
		Content:     content,
		IsRead:      false,
		CreatedAt:   time.Now().UTC(),
	}

	_, err := s.db.ExecContext(ctx, `
		INSERT INTO private_messages
		(id, sender_id, recipient_id, content, is_read, created_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`,
		msg.ID,
		msg.SenderID,
		msg.RecipientID,
		msg.Content,
		msg.IsRead,
		msg.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to send private message: %w", err)
	}

	return msg, nil
}

//
// -------------------------
// GROUP MESSAGE
// -------------------------
//

func (s *ChatService) SendGroupMessage(
	ctx context.Context,
	senderID, groupID uuid.UUID,
	content string,
) (*models.GroupMessage, error) {

	if content == "" {
		return nil, errors.New("message content cannot be empty")
	}

	if !s.checkRateLimit(senderID) {
		return nil, errors.New("rate limit exceeded: max 30 messages per minute")
	}

	if err := s.validateGroupMembership(ctx, senderID, groupID); err != nil {
		return nil, err
	}

	msg := &models.GroupMessage{
		ID:        uuid.New(),
		GroupID:   groupID,
		SenderID:  senderID,
		Content:   content,
		CreatedAt: time.Now().UTC(),
	}

	_, err := s.db.ExecContext(ctx, `
		INSERT INTO group_messages
		(id, group_id, sender_id, content, created_at)
		VALUES (?, ?, ?, ?, ?)
	`,
		msg.ID,
		msg.GroupID,
		msg.SenderID,
		msg.Content,
		msg.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to send group message: %w", err)
	}

	// WebSocket broadcast
	if s.hub != nil {
		payload := ws.WSMessage{
			Type:      "group_message",
			SenderID:  senderID,
			GroupID:   groupID,
			Content:   content,
			CreatedAt: msg.CreatedAt,
		}

		b, _ := json.Marshal(payload)
		s.hub.BroadcastToRoom(groupID.String(), b)
	}

	return msg, nil
}

//
// -------------------------
// HISTORY (SQLite-safe ordering)
// -------------------------
//

func (s *ChatService) GetGroupMessageHistory(
	ctx context.Context,
	groupID uuid.UUID,
	limit, offset int,
) ([]*models.GroupMessage, error) {

	rows, err := s.db.QueryContext(ctx, `
		SELECT id, group_id, sender_id, content, created_at
		FROM group_messages
		WHERE group_id = ?
		ORDER BY datetime(created_at) ASC, id ASC
		LIMIT ? OFFSET ?
	`, groupID, limit, offset)

	if err != nil {
		return nil, fmt.Errorf("failed to get group message history: %w", err)
	}
	defer rows.Close()

	var messages []*models.GroupMessage

	for rows.Next() {
		var m models.GroupMessage

		if err := rows.Scan(
			&m.ID,
			&m.GroupID,
			&m.SenderID,
			&m.Content,
			&m.CreatedAt,
		); err != nil {
			return nil, err
		}

		messages = append(messages, &m)
	}

	return messages, nil
}
