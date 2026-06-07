package services

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"social-network/backend/internal/models"
)

type rateLimitEntry struct {
	count     int
	resetTime time.Time
}

type ChatService struct {
	db           *sqlx.DB
	rateLimiter  map[uuid.UUID]*rateLimitEntry
	rateMu       sync.Mutex
	rateInterval time.Duration
	rateLimit    int
}

func NewChatService(db *sqlx.DB) *ChatService {
	return &ChatService{
		db:           db,
		rateLimiter:  make(map[uuid.UUID]*rateLimitEntry),
		rateInterval: time.Minute,
		rateLimit:    30,
	}
}

func (s *ChatService) checkRateLimit(userID uuid.UUID) bool {
	s.rateMu.Lock()
	defer s.rateMu.Unlock()

	now := time.Now()
	entry, exists := s.rateLimiter[userID]

	if !exists || now.After(entry.resetTime) {
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

func (s *ChatService) validateUserExists(ctx context.Context, userID uuid.UUID) error {
	var exists bool
	err := s.db.GetContext(ctx, &exists, "SELECT COUNT(1) > 0 FROM users WHERE id = ? AND deleted_at IS NULL", userID)
	if err != nil {
		return fmt.Errorf("failed to validate user: %w", err)
	}
	if !exists {
		return errors.New("user not found")
	}
	return nil
}

func (s *ChatService) validateGroupMembership(ctx context.Context, userID, groupID uuid.UUID) error {
	var exists bool
	err := s.db.GetContext(ctx, &exists, `
		SELECT COUNT(1) > 0 
		FROM group_members gm
		JOIN groups g ON gm.group_id = g.id
		WHERE gm.user_id = ? AND gm.group_id = ? AND g.deleted_at IS NULL AND g.is_active = true
	`, userID, groupID)
	if err != nil {
		return fmt.Errorf("failed to validate group membership: %w", err)
	}
	if !exists {
		return errors.New("user is not a member of this group")
	}
	return nil
}

func (s *ChatService) SendPrivateMessage(ctx context.Context, senderID, recipientID uuid.UUID, content string) (*models.PrivateMessage, error) {
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

	query := `
		INSERT INTO private_messages (id, sender_id, recipient_id, content, is_read, created_at)
		VALUES (:id, :sender_id, :recipient_id, :content, :is_read, :created_at)
	`
	if _, err := s.db.NamedExecContext(ctx, query, msg); err != nil {
		return nil, fmt.Errorf("failed to send private message: %w", err)
	}

	return msg, nil
}

func (s *ChatService) SendGroupMessage(ctx context.Context, senderID, groupID uuid.UUID, content string) (*models.GroupMessage, error) {
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

	query := `
		INSERT INTO group_messages (id, group_id, sender_id, content, created_at)
		VALUES (:id, :group_id, :sender_id, :content, :created_at)
	`
	if _, err := s.db.NamedExecContext(ctx, query, msg); err != nil {
		return nil, fmt.Errorf("failed to send group message: %w", err)
	}

	return msg, nil
}

func (s *ChatService) GetPrivateMessageHistory(ctx context.Context, userID1, userID2 uuid.UUID, limit, offset int) ([]*models.PrivateMessage, error) {
	query := `
		SELECT id, sender_id, recipient_id, content, is_read, created_at
		FROM private_messages
		WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`
	var messages []*models.PrivateMessage
	if err := s.db.SelectContext(ctx, &messages, query, userID1, userID2, userID2, userID1, limit, offset); err != nil {
		return nil, fmt.Errorf("failed to get private message history: %w", err)
	}
	return messages, nil
}

func (s *ChatService) GetGroupMessageHistory(ctx context.Context, groupID uuid.UUID, limit, offset int) ([]*models.GroupMessage, error) {
	query := `
		SELECT id, group_id, sender_id, content, created_at
		FROM group_messages
		WHERE group_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`
	var messages []*models.GroupMessage
	if err := s.db.SelectContext(ctx, &messages, query, groupID, limit, offset); err != nil {
		return nil, fmt.Errorf("failed to get group message history: %w", err)
	}
	return messages, nil
}

func (s *ChatService) MarkPrivateMessageAsRead(ctx context.Context, messageID, userID uuid.UUID) error {
	query := `
		UPDATE private_messages
		SET is_read = true
		WHERE id = ? AND recipient_id = ?
	`
	result, err := s.db.ExecContext(ctx, query, messageID, userID)
	if err != nil {
		return fmt.Errorf("failed to mark message as read: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check update result: %w", err)
	}
	if rows == 0 {
		return errors.New("message not found or not authorized to mark as read")
	}

	return nil
}