package repository

import (
	"context"
	"database/sql"
	"backend/internal/models"

	"github.com/google/uuid"
)

// EventRepository defines all event database operations
type EventRepository interface {
	Create(ctx context.Context, event *models.Event) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.Event, error)
	FindByGroupID(ctx context.Context, groupID uuid.UUID) ([]*models.Event, error)
	Update(ctx context.Context, event *models.Event) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// sqliteEventRepository implements the interface for SQLite
type sqliteEventRepository struct {
	db *sql.DB
}

// NewEventRepository creates a new event repository
func NewEventRepository(db *sql.DB) EventRepository {
	return &sqliteEventRepository{db: db}
}

func (r *sqliteEventRepository) Create(ctx context.Context, event *models.Event) error {
	query := `INSERT INTO events (id, group_id, title, description, date_time, created_by, created_at, updated_at) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := r.db.ExecContext(ctx, query,
		event.ID,
		event.GroupID,
		event.Title,
		event.Description,
		event.DateTime,
		event.CreatedBy,
		event.CreatedAt,
		event.UpdatedAt,
	)
	return err
}

func (r *sqliteEventRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.Event, error) {
	query := `SELECT id, group_id, title, description, date_time, created_by, created_at, updated_at FROM events WHERE id = ?`
	
	event := &models.Event{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&event.ID,
		&event.GroupID,
		&event.Title,
		&event.Description,
		&event.DateTime,
		&event.CreatedBy,
		&event.CreatedAt,
		&event.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return event, nil
}

func (r *sqliteEventRepository) FindByGroupID(ctx context.Context, groupID uuid.UUID) ([]*models.Event, error) {
	query := `SELECT id, group_id, title, description, date_time, created_by, created_at, updated_at FROM events WHERE group_id = ? ORDER BY date_time ASC`
	
	rows, err := r.db.QueryContext(ctx, query, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*models.Event
	for rows.Next() {
		event := &models.Event{}
		if err := rows.Scan(
			&event.ID,
			&event.GroupID,
			&event.Title,
			&event.Description,
			&event.DateTime,
			&event.CreatedBy,
			&event.CreatedAt,
			&event.UpdatedAt,
		); err != nil {
			return nil, err
		}
		events = append(events, event)
	}
	return events, nil
}

func (r *sqliteEventRepository) Update(ctx context.Context, event *models.Event) error {
	query := `UPDATE events SET title = ?, description = ?, date_time = ?, updated_at = ? WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query,
		event.Title,
		event.Description,
		event.DateTime,
		event.UpdatedAt,
		event.ID,
	)
	return err
}

func (r *sqliteEventRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM events WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}