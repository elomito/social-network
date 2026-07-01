package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"backend/internal/middleware"

	"github.com/google/uuid"
)

type CommentResponse struct {
	ID           string `json:"id"`
	PostID       string `json:"post_id"`
	AuthorID     string `json:"author_id"`
	AuthorName   string `json:"authorName"`
	AuthorAvatar string `json:"authorAvatar,omitempty"`
	CreatedAt    string `json:"createdAt"`
	Content      string `json:"content"`
	ImageUrl     string `json:"imageUrl,omitempty"`
}

// GetCommentsHandler returns an HTTP handler for getting comments
func GetCommentsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		postID := r.PathValue("id")

		rows, err := db.QueryContext(r.Context(), `
			SELECT c.id, c.post_id, c.author_id, c.content, c.image_path, c.created_at,
			       u.first_name, u.last_name, u.nickname
			FROM comments c
			JOIN users u ON c.author_id = u.id
			WHERE c.post_id = ?
			ORDER BY c.created_at ASC
		`, postID)
		if err != nil {
			http.Error(w, "database query error: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		comments := []CommentResponse{}
		for rows.Next() {
			var comment CommentResponse
			var imagePath sql.NullString
			var firstName, lastName, nickname string
			var createdAt time.Time

			err := rows.Scan(
				&comment.ID, &comment.PostID, &comment.AuthorID, &comment.Content, &imagePath, &createdAt,
				&firstName, &lastName, &nickname,
			)
			if err != nil {
				http.Error(w, "row scanning error", http.StatusInternalServerError)
				return
			}

			authorName := firstName + " " + lastName
			if nickname != "" {
				authorName = nickname
			}
			comment.AuthorName = authorName
			comment.CreatedAt = createdAt.Format(time.RFC3339)
			if imagePath.Valid {
				comment.ImageUrl = imagePath.String
			}

			comments = append(comments, comment)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(comments)
	}
}

// AddCommentHandler returns an HTTP handler for adding comments
func AddCommentHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		postID := r.PathValue("id")
		userIDStr := middleware.GetUserID(r)
		if userIDStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var req struct {
			Content  string `json:"content"`
			ImageURL string `json:"image_url"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}

		commentID := uuid.New().String()
		now := time.Now().UTC()

		var imagePath sql.NullString
		if req.ImageURL != "" {
			imagePath = sql.NullString{String: req.ImageURL, Valid: true}
		}

		_, err := db.ExecContext(r.Context(), `
			INSERT INTO comments (id, post_id, author_id, content, image_path, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`, commentID, postID, userIDStr, req.Content, imagePath, now, now)
		if err != nil {
			http.Error(w, "failed to insert comment", http.StatusInternalServerError)
			return
		}

		// Fetch author details
		var firstName, lastName, nickname string
		_ = db.QueryRowContext(r.Context(), "SELECT first_name, last_name, nickname FROM users WHERE id = ?", userIDStr).
			Scan(&firstName, &lastName, &nickname)

		authorName := firstName + " " + lastName
		if nickname != "" {
			authorName = nickname
		}

		comment := CommentResponse{
			ID:         commentID,
			PostID:     postID,
			AuthorID:   userIDStr,
			AuthorName: authorName,
			CreatedAt:  now.Format(time.RFC3339),
			Content:    req.Content,
			ImageUrl:   req.ImageURL,
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(comment)
	}
}
