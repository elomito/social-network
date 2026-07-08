package repository

import (
	"context"
	"database/sql"

	"backend/internal/models"

	"github.com/google/uuid"
)

// sqlitePostRepository implements the interface for SQLite
type sqlitePostRepository struct {
	db *sql.DB
}

// NewPostRepository creates a new post repository
func NewPostRepository(db *sql.DB) PostRepository {
	return &sqlitePostRepository{db: db}
}

func (r *sqlitePostRepository) Create(ctx context.Context, post *models.Post) error {
	query := `INSERT INTO posts (id, author_id, content, image_path, privacy_setting, group_id, created_at, updated_at) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := r.db.ExecContext(ctx, query,
		post.ID,
		post.UserID,
		post.Content,
		post.ImagePath,
		post.PrivacyLevel,
		post.GroupID,
		post.CreatedAt,
		post.UpdatedAt,
	)
	return err
}

func (r *sqlitePostRepository) GetByID(ctx context.Context, postID uuid.UUID) (*models.Post, error) {
	query := `SELECT id, author_id, content, image_path, privacy_setting, group_id, created_at, updated_at, deleted_at
		FROM posts WHERE id = ?`
	post := &models.Post{}
	err := r.db.QueryRowContext(ctx, query, postID).Scan(
		&post.ID,
		&post.UserID,
		&post.Content,
		&post.ImagePath,
		&post.PrivacyLevel,
		&post.GroupID,
		&post.CreatedAt,
		&post.UpdatedAt,
		&post.DeletedAt,
	)
	if err != nil {
		return nil, err
	}
	return post, nil
}

func (r *sqlitePostRepository) GetMany(ctx context.Context, filter PostFilter) ([]models.Post, error) {
	query := `SELECT id, author_id, content, image_path, privacy_setting, group_id, created_at, updated_at, deleted_at
		FROM posts WHERE 1=1`
	args := []interface{}{}

	if filter.GroupID != nil {
		query += " AND group_id = ?"
		args = append(args, *filter.GroupID)
	} else if filter.UserID != nil {
		query += " AND author_id = ? AND group_id IS NULL"
		args = append(args, *filter.UserID)
	} else {
		query += " AND group_id IS NULL"
	}

	query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
	args = append(args, filter.Limit, filter.Offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		post := models.Post{}
		if err := rows.Scan(
			&post.ID,
			&post.UserID,
			&post.Content,
			&post.ImagePath,
			&post.PrivacyLevel,
			&post.GroupID,
			&post.CreatedAt,
			&post.UpdatedAt,
			&post.DeletedAt,
		); err != nil {
			return nil, err
		}
		posts = append(posts, post)
	}
	return posts, nil
}

func (r *sqlitePostRepository) Update(ctx context.Context, post *models.Post) error {
	query := `UPDATE posts SET content = ?, image_path = ?, privacy_setting = ?, updated_at = ?, deleted_at = ? WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query,
		post.Content,
		post.ImagePath,
		post.PrivacyLevel,
		post.UpdatedAt,
		post.DeletedAt,
		post.ID,
	)
	return err
}

func (r *sqlitePostRepository) Delete(ctx context.Context, postID uuid.UUID) error {
	query := `DELETE FROM posts WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, postID)
	return err
}

func (r *sqlitePostRepository) AddRecipient(ctx context.Context, recipient *models.PostRecipient) error {
	query := `INSERT INTO post_recipients (id, post_id, user_id, created_at) VALUES (?, ?, ?, ?)`
	_, err := r.db.ExecContext(ctx, query,
		recipient.ID,
		recipient.PostID,
		recipient.UserID,
		recipient.CreatedAt,
	)
	return err
}

func (r *sqlitePostRepository) GetRecipients(ctx context.Context, postID uuid.UUID) ([]models.PostRecipient, error) {
	query := `SELECT id, post_id, user_id, created_at FROM post_recipients WHERE post_id = ?`
	rows, err := r.db.QueryContext(ctx, query, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var recipients []models.PostRecipient
	for rows.Next() {
		recipient := models.PostRecipient{}
		if err := rows.Scan(
			&recipient.ID,
			&recipient.PostID,
			&recipient.UserID,
			&recipient.CreatedAt,
		); err != nil {
			return nil, err
		}
		recipients = append(recipients, recipient)
	}
	return recipients, nil
}

func (r *sqlitePostRepository) GetFeedPosts(ctx context.Context, userIDs []uuid.UUID, limit, offset int) ([]models.Post, error) {
	if len(userIDs) == 0 {
		return []models.Post{}, nil
	}

	placeholders := ""
	args := []interface{}{}
	for i, id := range userIDs {
		if i > 0 {
			placeholders += ","
		}
		placeholders += "?"
		args = append(args, id)
	}

	query := `SELECT id, author_id, content, image_path, privacy_setting, group_id, created_at, updated_at, deleted_at
		FROM posts
		WHERE group_id IS NULL
		AND author_id IN (` + placeholders + `)
		AND (
			privacy_setting = 'public'
			OR privacy_setting = 'almost_private'
			OR privacy_setting = 'private'
		)
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?`
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		post := models.Post{}
		if err := rows.Scan(
			&post.ID,
			&post.UserID,
			&post.Content,
			&post.ImagePath,
			&post.PrivacyLevel,
			&post.GroupID,
			&post.CreatedAt,
			&post.UpdatedAt,
			&post.DeletedAt,
		); err != nil {
			return nil, err
		}
		posts = append(posts, post)
	}
	return posts, nil
}

func (r *sqlitePostRepository) GetGroupPosts(ctx context.Context, groupID uuid.UUID, limit, offset int) ([]models.Post, error) {
	query := `SELECT id, author_id, content, image_path, privacy_setting, group_id, created_at, updated_at, deleted_at
		FROM posts
		WHERE group_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?`
	rows, err := r.db.QueryContext(ctx, query, groupID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		post := models.Post{}
		if err := rows.Scan(
			&post.ID,
			&post.UserID,
			&post.Content,
			&post.ImagePath,
			&post.PrivacyLevel,
			&post.GroupID,
			&post.CreatedAt,
			&post.UpdatedAt,
			&post.DeletedAt,
		); err != nil {
			return nil, err
		}
		posts = append(posts, post)
	}
	return posts, nil
}

func (r *sqlitePostRepository) GetProfilePosts(ctx context.Context, userID, viewerID uuid.UUID, limit, offset int) ([]models.Post, error) {
	query := `SELECT id, author_id, content, image_path, privacy_setting, group_id, created_at, updated_at, deleted_at
		FROM posts
		WHERE author_id = ? AND group_id IS NULL
		AND (
			(SELECT is_public FROM users WHERE id = ?) = 1
			OR author_id = ?
			OR ? IN (SELECT follower_id FROM follows WHERE following_id = ?)
		)
		AND (
			privacy_setting = 'public'
			OR author_id = ?
			OR (privacy_setting = 'almost_private' AND author_id IN (SELECT following_id FROM follows WHERE follower_id = ?))
		)
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?`
	rows, err := r.db.QueryContext(ctx, query, userID, userID, viewerID, viewerID, userID, viewerID, viewerID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		post := models.Post{}
		if err := rows.Scan(
			&post.ID,
			&post.UserID,
			&post.Content,
			&post.ImagePath,
			&post.PrivacyLevel,
			&post.GroupID,
			&post.CreatedAt,
			&post.UpdatedAt,
			&post.DeletedAt,
		); err != nil {
			return nil, err
		}
		posts = append(posts, post)
	}
	return posts, nil
}

func (r *sqlitePostRepository) CountComments(ctx context.Context, postID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM comments WHERE post_id = ?", postID).Scan(&count)
	return count, err
}

func (r *sqlitePostRepository) GetAuthor(ctx context.Context, userID uuid.UUID) (models.User, error) {
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

func (r *sqlitePostRepository) GetUserReaction(ctx context.Context, userID, postID uuid.UUID) (*models.PostReaction, error) {
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

func (r *sqlitePostRepository) CountLikes(ctx context.Context, postID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND reaction_type = 'like'", postID).Scan(&count)
	return count, err
}
