package services

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"backend/internal/models"
)

// NotificationService manages notifications
type NotificationService struct {
	db *sql.DB
}

func NewNotificationService(db *sql.DB) *NotificationService { return &NotificationService{db: db} }

// Create inserts a new notification and returns its ID
func (s *NotificationService) Create(ctx context.Context, n models.Notification) (uuid.UUID, error) {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	if n.CreatedAt.IsZero() {
		n.CreatedAt = time.Now().UTC()
	}
	query := `INSERT INTO notifications (id, recipient_id, initiator_id, type, reference_id, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.ExecContext(ctx, query, n.ID.String(), n.RecipientID.String(), nullableUUIDString(n.InitiatorID), n.Type, n.ReferenceID, n.Message, boolToInt(n.IsRead), n.CreatedAt.Format(time.RFC3339))
	if err != nil {
		return uuid.Nil, err
	}
	return n.ID, nil
}

// MarkRead marks a notification as read
func (s *NotificationService) MarkRead(ctx context.Context, id uuid.UUID) error {
	_, err := s.db.ExecContext(ctx, `UPDATE notifications SET is_read = 1 WHERE id = ?`, id.String())
	return err
}

// ListForUser returns notifications for a recipient ordered by newest first
func (s *NotificationService) ListForUser(ctx context.Context, recipientID uuid.UUID, limit int) ([]models.Notification, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.db.QueryContext(ctx, `SELECT id, recipient_id, initiator_id, type, reference_id, message, is_read, created_at FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT ?`, recipientID.String(), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ret := make([]models.Notification, 0)
	for rows.Next() {
		var (
			idStr, recipientStr, ntype, createdAtStr string
			initiatorStr, referenceIDStr, messageStr sql.NullString
			isReadInt                                int
		)
		if err := rows.Scan(&idStr, &recipientStr, &initiatorStr, &ntype, &referenceIDStr, &messageStr, &isReadInt, &createdAtStr); err != nil {
			return nil, err
		}
		id, _ := uuid.Parse(idStr)
		recipient, _ := uuid.Parse(recipientStr)
		var initiator *uuid.UUID
		if initiatorStr.Valid && initiatorStr.String != "" {
			if uid, err := uuid.Parse(initiatorStr.String); err == nil {
				initiator = &uid
			}
		}
		createdAt, _ := time.Parse(time.RFC3339, createdAtStr)
		if createdAt.IsZero() {
			createdAt, _ = time.Parse("2006-01-02 15:04:05", createdAtStr)
		}

		var refID, msg string
		if referenceIDStr.Valid {
			refID = referenceIDStr.String
		}
		if messageStr.Valid {
			msg = messageStr.String
		}

		ret = append(ret, models.Notification{
			ID:          id,
			RecipientID: recipient,
			InitiatorID: initiator,
			Type:        ntype,
			ReferenceID: refID,
			Message:     msg,
			IsRead:      isReadInt != 0,
			CreatedAt:   createdAt,
		})
	}
	return ret, nil
}

func nullableUUIDString(u *uuid.UUID) interface{} {
	if u == nil {
		return nil
	}
	return u.String()
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
