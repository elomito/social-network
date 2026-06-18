package repository

import (
	"context"
	"database/sql"
	"backend/internal/models"

	"github.com/google/uuid"
)

// EventResponseRepository defines all event response database operations
type EventResponseRepository interface {
	Create(ctx context.Context, response *models.EventResponse) error
	FindByEventID(ctx context.Context, eventID uuid.UUID) ([]*models.EventResponse, error)
	FindByUserIDAndEventID(ctx context.Context, userID, eventID uuid.UUID) (*models.EventResponse, error)
	Update(ctx context.Context, response *models.EventResponse) error
	Delete(ctx context.Context, id uuid.UUID) error
	DeleteByEventID(ctx context.Context, eventID uuid.UUID) error
}

// sqliteEventResponseRepository implements the interface for SQLite
type sqliteEventResponseRepository struct {
	db *sql.DB
}

// NewEventResponseRepository creates a new event response repository
func NewEventResponseRepository(db *sql.DB) EventResponseRepository {
	return &sqliteEventResponseRepository{db: db}
}

func (r *sqliteEventResponseRepository) Create(ctx context.Context, response *models.EventResponse) error {
	query := `INSERT INTO event_responses (id, event_id, user_id, response, created_at, updated_at) 
		VALUES (?, ?, ?, ?, ?, ?)`
	_, err := r.db.ExecContext(ctx, query,
		response.ID,
		response.EventID,
		response.UserID,
		response.Response,
		response.CreatedAt,
		response.UpdatedAt,
	)
	return err
}

func (r *sqliteEventResponseRepository) FindByEventID(ctx context.Context, eventID uuid.UUID) ([]*models.EventResponse, error) {
	query := `SELECT id, event_id, user_id, response, created_at, updated_at FROM event_responses WHERE event_id = ?`
	
	rows, err := r.db.QueryContext(ctx, query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var responses []*models.EventResponse
	for rows.Next() {
		response := &models.EventResponse{}
		if err := rows.Scan(
			&response.ID,
			&response.EventID,
			&response.UserID,
			&response.Response,
			&response.CreatedAt,
			&response.UpdatedAt,
		); err != nil {
			return nil, err
		}
		responses = append(responses, response)
	}
	return responses, nil
}

func (r *sqliteEventResponseRepository) FindByUserIDAndEventID(ctx context.Context, userID, eventID uuid.UUID) (*models.EventResponse, error) {
	query := `SELECT id, event_id, user_id, response, created_at, updated_at FROM event_responses WHERE user_id = ? AND event_id = ?`
	
	response := &models.EventResponse{}
	err := r.db.QueryRowContext(ctx, query, userID, eventID).Scan(
		&response.ID,
		&response.EventID,
		&response.UserID,
		&response.Response,
		&response.CreatedAt,
		&response.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return response, nil
}

func (r *sqliteEventResponseRepository) Update(ctx context.Context, response *models.EventResponse) error {
	query := `UPDATE event_responses SET response = ?, updated_at = ? WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query,
		response.Response,
		response.UpdatedAt,
		response.ID,
	)
	return err
}

func (r *sqliteEventResponseRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM event_responses WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *sqliteEventResponseRepository) DeleteByEventID(ctx context.Context, eventID uuid.UUID) error {
	query := `DELETE FROM event_responses WHERE event_id = ?`
	_, err := r.db.ExecContext(ctx, query, eventID)
	return err
}