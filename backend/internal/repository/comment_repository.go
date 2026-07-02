package repository

import (
	"context"
	"database/sql"

	"backend/internal/models"

	"github.com/google/uuid"
)

// sqliteCommentRepository implements the interface for SQLite
type sqliteCommentRepository struct {
	db *sql.DB
}

// NewCommentRepository creates a new comment repository
func NewCommentRepository(db *sql.DB) CommentRepository {
	return &sqliteCommentRepository{db: db}
}

func (r *sqliteCommentRepository) Create(ctx context.Context, comment *models.Comment) error {
	query := `INSERT INTO comments (id, post_id, author_id, content, image_path, parent_id, created_at, updated_at) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := r.db.ExecContext(ctx, query,
		comment.ID,
		comment.PostID,
		comment.UserID,
		comment.Content,
		comment.ImagePath,
		comment.ParentID,
		comment.CreatedAt,
		comment.UpdatedAt,
	)
	return err
}

func (r *sqliteCommentRepository) GetByPostID(ctx context.Context, postID uuid.UUID, limit, offset int) ([]models.Comment, error) {
	query := `SELECT id, post_id, author_id, content, image_path, parent_id, created_at, updated_at, deleted_at 
		FROM comments 
		WHERE post_id = ? 
		ORDER BY created_at ASC 
		LIMIT ? OFFSET ?`
	rows, err := r.db.QueryContext(ctx, query, postID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []models.Comment
	for rows.Next() {
		comment := models.Comment{}
		if err := rows.Scan(
			&comment.ID,
			&comment.PostID,
			&comment.UserID,
			&comment.Content,
			&comment.ImagePath,
			&comment.ParentID,
			&comment.CreatedAt,
			&comment.UpdatedAt,
			&comment.DeletedAt,
		); err != nil {
			return nil, err
		}
		comments = append(comments, comment)
	}
	return comments, nil
}

func (r *sqliteCommentRepository) GetByID(ctx context.Context, commentID uuid.UUID) (*models.Comment, error) {
	query := `SELECT id, post_id, author_id, content, image_path, parent_id, created_at, updated_at, deleted_at 
		FROM comments WHERE id = ?`
	comment := &models.Comment{}
	err := r.db.QueryRowContext(ctx, query, commentID).Scan(
		&comment.ID,
		&comment.PostID,
		&comment.UserID,
		&comment.Content,
		&comment.ImagePath,
		&comment.ParentID,
		&comment.CreatedAt,
		&comment.UpdatedAt,
		&comment.DeletedAt,
	)
	if err != nil {
		return nil, err
	}
	return comment, nil
}

func (r *sqliteCommentRepository) GetReaction(ctx context.Context, userID, commentID uuid.UUID) (*models.CommentReaction, error) {
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

func (r *sqliteCommentRepository) CreateReaction(ctx context.Context, reaction *models.CommentReaction) error {
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

func (r *sqliteCommentRepository) UpdateReaction(ctx context.Context, reaction *models.CommentReaction) error {
	query := `UPDATE comment_reactions SET reaction_type = ? WHERE user_id = ? AND comment_id = ?`
	_, err := r.db.ExecContext(ctx, query,
		reaction.ReactionType,
		reaction.UserID,
		reaction.CommentID,
	)
	return err
}

func (r *sqliteCommentRepository) DeleteReaction(ctx context.Context, userID, commentID uuid.UUID) error {
	query := `DELETE FROM comment_reactions WHERE user_id = ? AND comment_id = ?`
	_, err := r.db.ExecContext(ctx, query, userID, commentID)
	return err
}

func (r *sqliteCommentRepository) GetAuthor(ctx context.Context, userID uuid.UUID) (models.User, error) {
	query := `SELECT id, email, password_hash, first_name, last_name, nickname, date_of_birth, avatar_image_id, about_me, is_public, created_at, updated_at, last_active_at, deleted_at
		FROM users WHERE id = ?`
	user := models.User{}
	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FirstName,
		&user.LastName,
		&user.Nickname,
		&user.DateOfBirth,
		&user.AvatarImageID,
		&user.AboutMe,
		&user.IsPublic,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastActiveAt,
		&user.DeletedAt,
	)
	if err != nil {
		return user, err
	}
	return user, nil
}

func (r *sqliteCommentRepository) CountLikes(ctx context.Context, commentID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM comment_reactions WHERE comment_id = ? AND reaction_type = 'like'", commentID).Scan(&count)
	return count, err
}

func (r *sqliteCommentRepository) CountDislikes(ctx context.Context, commentID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM comment_reactions WHERE comment_id = ? AND reaction_type = 'dislike'", commentID).Scan(&count)
	return count, err
}
