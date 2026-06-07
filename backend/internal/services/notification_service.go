package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"social-network/backend/internal/models"
)

// NotificationService handles notification related operations
type NotificationService struct {
	db *sqlx.DB
}

// NewNotificationService creates a new NotificationService instance
func NewNotificationService(db *sqlx.DB) *NotificationService {
	return &NotificationService{db: db}
}

// CreateNotification creates a new notification
func (s *NotificationService) CreateNotification(ctx context.Context, notification *models.Notification) error {
	// Validate input
	if notification.RecipientID == uuid.Nil {
		return fmt.Errorf("recipient ID is required")
	}
	if notification.Type == "" {
		return fmt.Errorf("notification type is required")
	}
	if notification.Message == "" {
		return fmt.Errorf("notification message is required")
	}

	// Prepare notification for insertion
	notification.ID = uuid.New()
	notification.CreatedAt = time.Now().UTC()
	if notification.InitiatorID == nil {
		notification.InitiatorID = &notification.RecipientID // Self-notification fallback
	}

	query := `
		INSERT INTO notifications (id, recipient_id, initiator_id, type, reference_id, message, is_read, created_at)
		VALUES (:id, :recipient_id, :initiator_id, :type, :reference_id, :message, :is_read, :created_at)
	`

	_, err := s.db.NamedExecContext(ctx, query, notification)
	if err != nil {
		return fmt.Errorf("failed to create notification: %w", err)
	}

	return nil
}

// CreateNotifications creates multiple notifications in a transaction
func (s *NotificationService) CreateNotifications(ctx context.Context, notifications []*models.Notification) error {
	if len(notifications) == 0 {
		return nil
	}

	// Start transaction
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer func() {
		if err != nil {
			tx.Rollback() //nolint:errcheck
			return
		}
		err = tx.Commit()
	}()

	// Prepare notifications for insertion
	now := time.Now().UTC()
	for i := range notifications {
		n := notifications[i]
		if n.RecipientID == uuid.Nil {
			return fmt.Errorf("recipient ID is required for notification %d", i)
		}
		if n.Type == "" {
			return fmt.Errorf("notification type is required for notification %d", i)
		}
		if n.Message == "" {
			return fmt.Errorf("notification message is required for notification %d", i)
		}

		n.ID = uuid.New()
		n.CreatedAt = now
		if n.InitiatorID == nil {
			n.InitiatorID = &n.RecipientID // Self-notification fallback
		}
	}

	// Insert all notifications
	query := `
		INSERT INTO notifications (id, recipient_id, initiator_id, type, reference_id, message, is_read, created_at)
		VALUES (:id, :recipient_id, :initiator_id, :type, :reference_id, :message, :is_read, :created_at)
	`
	if _, err = tx.NamedExecContext(ctx, query, notifications); err != nil {
		return fmt.Errorf("failed to create notifications: %w", err)
	}

	return nil
}

// GetNotificationByID retrieves a notification by its ID
func (s *NotificationService) GetNotificationByID(ctx context.Context, notificationID uuid.UUID) (*models.Notification, error) {
	query := `
		SELECT id, recipient_id, initiator_id, type, reference_id, message, is_read, created_at
		FROM notifications
		WHERE id = :id
	`
	var notification models.Notification
	err := s.db.GetContext(ctx, &notification, query, map[string]interface{}{"id": notificationID})
	if err != nil {
		return nil, err
	}
	return &notification, nil
}

// GetNotificationsByRecipient retrieves notifications for a specific user
func (s *NotificationService) GetNotificationsByRecipient(ctx context.Context, recipientID uuid.UUID, limit, offset int) ([]*models.Notification, int64, error) {
	// Count total notifications
	countQuery := `
		SELECT COUNT(*)
		FROM notifications
		WHERE recipient_id = :recipient_id
	`
	var total int64
	err := s.db.GetContext(ctx, &total, countQuery, map[string]interface{}{"recipient_id": recipientID})
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count notifications: %w", err)
	}

	// Get notifications with pagination
	query := `
		SELECT id, recipient_id, initiator_id, type, reference_id, message, is_read, created_at
		FROM notifications
		WHERE recipient_id = :recipient_id
		ORDER BY created_at DESC
		LIMIT :limit OFFSET :offset
	`
	var notifications []*models.Notification
	args := map[string]interface{}{
		"recipient_id": recipientID,
		"limit":        limit,
		"offset":       offset,
	}
	err = s.db.SelectContext(ctx, &notifications, query, args)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get notifications: %w", err)
	}

	return notifications, total, nil
}

// MarkNotificationAsRead marks a notification as read
func (s *NotificationService) MarkNotificationAsRead(ctx context.Context, notificationID uuid.UUID) error {
	query := `
		UPDATE notifications
		SET is_read = true
		WHERE id = :id
	`
	result, err := s.db.NamedExecContext(ctx, query, map[string]interface{}{"id": notificationID})
	if err != nil {
		return fmt.Errorf("failed to mark notification as read: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check update result: %w", err)
	}
	if rowsAffected == 0 {
		return fmt.Errorf("notification not found")
	}

	return nil
}

// MarkAllNotificationsAsRead marks all notifications as read for a user
func (s *NotificationService) MarkAllNotificationsAsRead(ctx context.Context, recipientID uuid.UUID) error {
	query := `
		UPDATE notifications
		SET is_read = true
		WHERE recipient_id = :recipient_id AND is_read = false
	`
	result, err := s.db.NamedExecContext(ctx, query, map[string]interface{}{"recipient_id": recipientID})
	if err != nil {
		return fmt.Errorf("failed to mark all notifications as read: %w", err)
	}

	_, err = result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check update result: %w", err)
	}

	return nil
}
