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
	ID            string  `json:"id"`
	PostID        string  `json:"post_id"`
	AuthorID      string  `json:"author_id"`
	AuthorName    string  `json:"authorName"`
	AuthorAvatar  string  `json:"authorAvatar,omitempty"`
	CreatedAt     string  `json:"createdAt"`
	Content       string  `json:"content"`
	ImageUrl      string  `json:"imageUrl,omitempty"`
	ParentID      *string `json:"parent_id,omitempty"`
	LikesCount    int     `json:"likesCount"`
	DislikesCount int     `json:"dislikesCount"`
	UserReaction  string  `json:"userReaction,omitempty"`
}

// GetCommentsHandler returns an HTTP handler for getting comments
func GetCommentsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		postID := r.PathValue("id")
		userIDStr := middleware.GetUserID(r)

		rows, err := db.QueryContext(r.Context(), `
			SELECT c.id, c.post_id, c.author_id, c.content, c.image_path, c.created_at, c.parent_id,
			       u.first_name, u.last_name, u.nickname,
			       (SELECT count(*) FROM comment_reactions cr WHERE cr.comment_id = c.id AND cr.reaction_type = 'like') as likes_count,
			       (SELECT count(*) FROM comment_reactions cr WHERE cr.comment_id = c.id AND cr.reaction_type = 'dislike') as dislikes_count,
			       (SELECT reaction_type FROM comment_reactions cr WHERE cr.comment_id = c.id AND cr.user_id = ?) as user_reaction
			FROM comments c
			JOIN users u ON c.author_id = u.id
			WHERE c.post_id = ?
			ORDER BY c.created_at ASC
		`, userIDStr, postID)
		if err != nil {
			http.Error(w, "database query error: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		// Check for query iteration errors
		if err := rows.Err(); err != nil {
			http.Error(w, "database query iteration error: "+err.Error(), http.StatusInternalServerError)
			return
		}

		comments := []CommentResponse{}
		for rows.Next() {
			var comment CommentResponse
			var imagePath sql.NullString
			var parentID sql.NullString
			var firstName, lastName, nickname string
			var likesCount, dislikesCount int
			var userReaction sql.NullString
			var createdAt time.Time

			err := rows.Scan(
				&comment.ID, &comment.PostID, &comment.AuthorID, &comment.Content, &imagePath, &createdAt, &parentID,
				&firstName, &lastName, &nickname, &likesCount, &dislikesCount, &userReaction,
			)
			if err != nil {
				http.Error(w, "row scanning error: "+err.Error(), http.StatusInternalServerError)
				return
			}

			authorName := firstName + " " + lastName
			if nickname != "" {
				authorName = nickname
			}
			comment.AuthorName = authorName
			comment.CreatedAt = createdAt.Format(time.RFC3339)
			comment.LikesCount = likesCount
			comment.DislikesCount = dislikesCount
			if userReaction.Valid {
				comment.UserReaction = userReaction.String
			}
			if imagePath.Valid {
				comment.ImageUrl = imagePath.String
			}
			if parentID.Valid {
				pid := parentID.String
				comment.ParentID = &pid
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
			Content  string  `json:"content"`
			ImageURL string  `json:"image_url"`
			ParentID *string `json:"parent_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}

		// Validate parent_id if provided
		var parentIDVal sql.NullString
		if req.ParentID != nil && *req.ParentID != "" {
			// Validate parent_id is a valid UUID
			parentUUID, err := uuid.Parse(*req.ParentID)
			if err != nil {
				http.Error(w, "invalid parent_id", http.StatusBadRequest)
				return
			}

			// Check parent comment exists and belongs to the same post
			var parentPostID string
			var parentParentID sql.NullString
			err = db.QueryRowContext(r.Context(), `
				SELECT post_id, parent_id FROM comments WHERE id = ?
			`, parentUUID.String()).Scan(&parentPostID, &parentParentID)
			if err != nil {
				if err == sql.ErrNoRows {
					http.Error(w, "parent comment not found", http.StatusNotFound)
				} else {
					http.Error(w, "database error: "+err.Error(), http.StatusInternalServerError)
				}
				return
			}

			// Ensure parent comment belongs to the same post
			if parentPostID != postID {
				http.Error(w, "parent comment does not belong to this post", http.StatusBadRequest)
				return
			}

			// Enforce depth limit of 1: parent comment must not already be a reply
			if parentParentID.Valid {
				http.Error(w, "cannot reply to a reply", http.StatusBadRequest)
				return
			}

			parentIDVal = sql.NullString{String: parentUUID.String(), Valid: true}
		}

		commentID := uuid.New().String()
		now := time.Now().UTC()

		var imagePath sql.NullString
		if req.ImageURL != "" {
			imagePath = sql.NullString{String: req.ImageURL, Valid: true}
		}

		_, err := db.ExecContext(r.Context(), `
			INSERT INTO comments (id, post_id, author_id, content, image_path, parent_id, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`, commentID, postID, userIDStr, req.Content, imagePath, parentIDVal, now, now)
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
			ID:            commentID,
			PostID:        postID,
			AuthorID:      userIDStr,
			AuthorName:    authorName,
			CreatedAt:     now.Format(time.RFC3339),
			Content:       req.Content,
			ImageUrl:      req.ImageURL,
			LikesCount:    0,
			DislikesCount: 0,
		}
		if parentIDVal.Valid {
			pid := parentIDVal.String
			comment.ParentID = &pid
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(comment)
	}
}

// AddCommentReactionHandler returns an HTTP handler for adding reactions to comments
func AddCommentReactionHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		commentID := r.PathValue("id")
		userIDStr := middleware.GetUserID(r)
		if userIDStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var req struct {
			ReactionType string `json:"reaction_type"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}

		if req.ReactionType != "like" && req.ReactionType != "dislike" {
			http.Error(w, "invalid reaction type", http.StatusBadRequest)
			return
		}

		_, err := db.ExecContext(r.Context(), `
			INSERT INTO comment_reactions (user_id, comment_id, reaction_type)
			VALUES (?, ?, ?)
			ON CONFLICT(user_id, comment_id) DO UPDATE SET reaction_type = excluded.reaction_type
		`, userIDStr, commentID, req.ReactionType)
		if err != nil {
			http.Error(w, "failed to record reaction: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "reaction registered"})
	}
}

// RemoveCommentReactionHandler returns an HTTP handler for removing reactions from comments
func RemoveCommentReactionHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		commentID := r.PathValue("id")
		userIDStr := middleware.GetUserID(r)
		if userIDStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		_, err := db.ExecContext(r.Context(), `
			DELETE FROM comment_reactions WHERE user_id = ? AND comment_id = ?
		`, userIDStr, commentID)
		if err != nil {
			http.Error(w, "failed to remove reaction", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}
