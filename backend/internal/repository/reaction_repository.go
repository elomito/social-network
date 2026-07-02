package repository

import (
	"context"
	"database/sql"

	"backend/internal/models"

	"github.com/google/uuid"
)

// sqliteReactionRepository implements the interface for SQLite
type sqliteReactionRepository struct {
	db *sql.DB
}

// NewReactionRepository creates a new reaction repository
func NewReactionRepository(db *sql.DB) ReactionRepository {
	return &sqliteReactionRepository{db: db}
}

func (r *sqliteReactionRepository) CreatePostReaction(ctx context.Context, reaction *models.PostReaction) error {
	query := `INSERT INTO post_reactions (user_id, post_id, reaction_type) 
		VALUES (?, ?, ?) 
		ON CONFLICT(user_id, post_id) DO UPDATE SET reaction_type = excluded.reaction_type`
	_, err := r.db.ExecContext(ctx, query,
		reaction.UserID,
		reaction.PostID,
		reaction.ReactionType,
	)
	return err
}

func (r *sqliteReactionRepository) GetPostReaction(ctx context.Context, userID, postID uuid.UUID) (*models.PostReaction, error) {
	query := `SELECT user_id, post_id, reaction_type FROM post_reactions WHERE user_id = ? AND post_id = ?`
	reaction := &models.PostReaction{}
	err := r.db.QueryRowContext(ctx, query, userID, postID).Scan(
		&reaction.UserID,
		&reaction.PostID,
		&reaction.ReactionType,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return reaction, nil
}

func (r *sqliteReactionRepository) UpdatePostReaction(ctx context.Context, reaction *models.PostReaction) error {
	query := `UPDATE post_reactions SET reaction_type = ? WHERE user_id = ? AND post_id = ?`
	_, err := r.db.ExecContext(ctx, query,
		reaction.ReactionType,
		reaction.UserID,
		reaction.PostID,
	)
	return err
}

func (r *sqliteReactionRepository) DeletePostReaction(ctx context.Context, userID, postID uuid.UUID) error {
	query := `DELETE FROM post_reactions WHERE user_id = ? AND post_id = ?`
	_, err := r.db.ExecContext(ctx, query, userID, postID)
	return err
}

func (r *sqliteReactionRepository) GetPostReactions(ctx context.Context, postID uuid.UUID) ([]models.PostReaction, error) {
	query := `SELECT user_id, post_id, reaction_type FROM post_reactions WHERE post_id = ?`
	rows, err := r.db.QueryContext(ctx, query, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reactions []models.PostReaction
	for rows.Next() {
		reaction := models.PostReaction{}
		if err := rows.Scan(
			&reaction.UserID,
			&reaction.PostID,
			&reaction.ReactionType,
		); err != nil {
			return nil, err
		}
		reactions = append(reactions, reaction)
	}
	return reactions, nil
}

func (r *sqliteReactionRepository) CreateCommentReaction(ctx context.Context, reaction *models.CommentReaction) error {
	query := `INSERT INTO comment_reactions (user_id, comment_id, reaction_type) 
		VALUES (?, ?, ?) 
		ON CONFLICT(user_id, comment_id) DO UPDATE SET reaction_type = excluded.reaction_type`
	_, err := r.db.ExecContext(ctx, query,
		reaction.UserID,
		reaction.CommentID,
		reaction.ReactionType,
	)
	return err
}

func (r *sqliteReactionRepository) GetCommentReaction(ctx context.Context, userID, commentID uuid.UUID) (*models.CommentReaction, error) {
	query := `SELECT user_id, comment_id, reaction_type FROM comment_reactions WHERE user_id = ? AND comment_id = ?`
	reaction := &models.CommentReaction{}
	err := r.db.QueryRowContext(ctx, query, userID, commentID).Scan(
		&reaction.UserID,
		&reaction.CommentID,
		&reaction.ReactionType,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return reaction, nil
}

func (r *sqliteReactionRepository) UpdateCommentReaction(ctx context.Context, reaction *models.CommentReaction) error {
	query := `UPDATE comment_reactions SET reaction_type = ? WHERE user_id = ? AND comment_id = ?`
	_, err := r.db.ExecContext(ctx, query,
		reaction.ReactionType,
		reaction.UserID,
		reaction.CommentID,
	)
	return err
}

func (r *sqliteReactionRepository) DeleteCommentReaction(ctx context.Context, userID, commentID uuid.UUID) error {
	query := `DELETE FROM comment_reactions WHERE user_id = ? AND comment_id = ?`
	_, err := r.db.ExecContext(ctx, query, userID, commentID)
	return err
}
