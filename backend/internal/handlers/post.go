package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"backend/internal/middleware"

	"github.com/google/uuid"
)

type PostResponse struct {
	ID            string `json:"id"`
	AuthorID      string `json:"author_id"`
	AuthorName    string `json:"authorName"`
	AuthorAvatar  string `json:"authorAvatar,omitempty"`
	CreatedAt     string `json:"createdAt"`
	Content       string `json:"content"`
	ImageUrl      string `json:"imageUrl,omitempty"`
	Privacy       string `json:"privacy"`
	GroupID       string `json:"group_id,omitempty"`
	LikesCount    int    `json:"likesCount"`
	CommentsCount int    `json:"commentsCount"`
	UserReaction  string `json:"userReaction,omitempty"`
}

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

// CreatePostHandler returns an HTTP handler for creating posts
func CreatePostHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userIDStr := middleware.GetUserID(r)
		if userIDStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var req struct {
			Content        string  `json:"content"`
			PrivacySetting string  `json:"privacy_level"`
			GroupID        *string `json:"group_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}

		privacy := "public"
		if req.PrivacySetting == "friends" {
			privacy = "almost_private"
		} else if req.PrivacySetting == "private" {
			privacy = "private"
		}

		postID := uuid.New().String()
		now := time.Now().UTC()

		var groupIDVal sql.NullString
		if req.GroupID != nil && *req.GroupID != "" {
			groupIDVal = sql.NullString{String: *req.GroupID, Valid: true}
		}

		_, err = db.ExecContext(r.Context(), `
			INSERT INTO posts (id, author_id, content, privacy_setting, group_id, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`, postID, userID.String(), req.Content, privacy, groupIDVal, now, now)
		if err != nil {
			http.Error(w, "failed to create post: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Fetch author details
		var firstName, lastName, nickname string
		_ = db.QueryRowContext(r.Context(), "SELECT first_name, last_name, nickname FROM users WHERE id = ?", userID.String()).
			Scan(&firstName, &lastName, &nickname)

		authorName := firstName + " " + lastName
		if nickname != "" {
			authorName = nickname
		}

		post := PostResponse{
			ID:            postID,
			AuthorID:      userID.String(),
			AuthorName:    authorName,
			CreatedAt:     now.Format(time.RFC3339),
			Content:       req.Content,
			Privacy:       req.PrivacySetting,
			LikesCount:    0,
			CommentsCount: 0,
		}
		if req.GroupID != nil {
			post.GroupID = *req.GroupID
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(post)
	}
}

// GetPostHandler returns an HTTP handler for getting a single post
func GetPostHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		postID := r.PathValue("id")
		if _, err := uuid.Parse(postID); err != nil {
			http.Error(w, "invalid post id", http.StatusBadRequest)
			return
		}

		userIDStr := middleware.GetUserID(r)
		if userIDStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var post PostResponse
		var groupID sql.NullString
		var imagePath sql.NullString
		var privacySetting string
		var firstName, lastName, nickname string
		var createdAt time.Time

		err := db.QueryRowContext(r.Context(), `
			SELECT p.id, p.author_id, p.content, p.image_path, p.privacy_setting, p.group_id, p.created_at,
			       u.first_name, u.last_name, u.nickname,
			       (SELECT count(*) FROM post_reactions pr WHERE pr.post_id = p.id AND pr.reaction_type = 'like') as likes_count,
			       (SELECT count(*) FROM comments c WHERE c.post_id = p.id) as comments_count,
			       (SELECT reaction_type FROM post_reactions pr WHERE pr.post_id = p.id AND pr.user_id = ?) as user_reaction
			FROM posts p
			JOIN users u ON p.author_id = u.id
			WHERE p.id = ?
		`, userIDStr, postID).Scan(
			&post.ID, &post.AuthorID, &post.Content, &imagePath, &privacySetting, &groupID, &createdAt,
			&firstName, &lastName, &nickname, &post.LikesCount, &post.CommentsCount, &post.UserReaction,
		)
		if err != nil {
			if err == sql.ErrNoRows {
				http.Error(w, "post not found", http.StatusNotFound)
			} else {
				http.Error(w, "database error: "+err.Error(), http.StatusInternalServerError)
			}
			return
		}

		authorName := firstName + " " + lastName
		if nickname != "" {
			authorName = nickname
		}
		post.AuthorName = authorName
		post.CreatedAt = createdAt.Format(time.RFC3339)

		post.Privacy = "public"
		if privacySetting == "almost_private" {
			post.Privacy = "friends"
		} else if privacySetting == "private" {
			post.Privacy = "private"
		}

		if groupID.Valid {
			post.GroupID = groupID.String
		}
		if imagePath.Valid {
			post.ImageUrl = imagePath.String
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(post)
	}
}

// GetPostsHandler returns an HTTP handler for getting posts (feed or specific filters)
func GetPostsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userIDStr := middleware.GetUserID(r)
		if userIDStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		q := r.URL.Query()
		groupIDStr := q.Get("group_id")
		profileUserIDStr := q.Get("user_id")

		limit := 10
		if lstr := q.Get("limit"); lstr != "" {
			if l, err := strconv.Atoi(lstr); err == nil {
				limit = l
			}
		}
		offset := 0
		if ostr := q.Get("offset"); ostr != "" {
			if o, err := strconv.Atoi(ostr); err == nil {
				offset = o
			}
		} else if pageStr := q.Get("page"); pageStr != "" {
			if p, err := strconv.Atoi(pageStr); err == nil && p > 1 {
				offset = (p - 1) * limit
			}
		}

		var rows *sql.Rows
		var err error

		if groupIDStr != "" {
			// Get posts for a group
			rows, err = db.QueryContext(r.Context(), `
				SELECT p.id, p.author_id, p.content, p.image_path, p.privacy_setting, p.group_id, p.created_at,
				       u.first_name, u.last_name, u.nickname,
				       (SELECT count(*) FROM post_reactions pr WHERE pr.post_id = p.id AND pr.reaction_type = 'like') as likes_count,
				       (SELECT count(*) FROM comments c WHERE c.post_id = p.id) as comments_count,
				       (SELECT reaction_type FROM post_reactions pr WHERE pr.post_id = p.id AND pr.user_id = ?) as user_reaction
				FROM posts p
				JOIN users u ON p.author_id = u.id
				WHERE p.group_id = ?
				ORDER BY p.created_at DESC
				LIMIT ? OFFSET ?
			`, userIDStr, groupIDStr, limit, offset)
		} else if profileUserIDStr != "" {
			// Get posts for a specific user profile (only public, friends/almost_private if they follow, private if owner)
			rows, err = db.QueryContext(r.Context(), `
				SELECT p.id, p.author_id, p.content, p.image_path, p.privacy_setting, p.group_id, p.created_at,
				       u.first_name, u.last_name, u.nickname,
				       (SELECT count(*) FROM post_reactions pr WHERE pr.post_id = p.id AND pr.reaction_type = 'like') as likes_count,
				       (SELECT count(*) FROM comments c WHERE c.post_id = p.id) as comments_count,
				       (SELECT reaction_type FROM post_reactions pr WHERE pr.post_id = p.id AND pr.user_id = ?) as user_reaction
				FROM posts p
				JOIN users u ON p.author_id = u.id
				WHERE p.author_id = ? AND p.group_id IS NULL
				  AND (
				      p.privacy_setting = 'public'
				      OR p.author_id = ?
				      OR (p.privacy_setting = 'almost_private' AND p.author_id IN (SELECT following_id FROM follows WHERE follower_id = ?))
				  )
				ORDER BY p.created_at DESC
				LIMIT ? OFFSET ?
			`, userIDStr, profileUserIDStr, userIDStr, userIDStr, limit, offset)
		} else {
			// Main Feed
			rows, err = db.QueryContext(r.Context(), `
				SELECT p.id, p.author_id, p.content, p.image_path, p.privacy_setting, p.group_id, p.created_at,
				       u.first_name, u.last_name, u.nickname,
				       (SELECT count(*) FROM post_reactions pr WHERE pr.post_id = p.id AND pr.reaction_type = 'like') as likes_count,
				       (SELECT count(*) FROM comments c WHERE c.post_id = p.id) as comments_count,
				       (SELECT reaction_type FROM post_reactions pr WHERE pr.post_id = p.id AND pr.user_id = ?) as user_reaction
				FROM posts p
				JOIN users u ON p.author_id = u.id
				WHERE p.group_id IS NULL
				  AND (
				      p.privacy_setting = 'public'
				      OR p.author_id = ?
				      OR (p.privacy_setting = 'almost_private' AND p.author_id IN (SELECT following_id FROM follows WHERE follower_id = ?))
				  )
				ORDER BY p.created_at DESC
				LIMIT ? OFFSET ?
			`, userIDStr, userIDStr, userIDStr, limit, offset)
		}

		if err != nil {
			http.Error(w, "database query error: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		posts := []PostResponse{}
		for rows.Next() {
			var post PostResponse
			var groupID sql.NullString
			var imagePath sql.NullString
			var privacySetting string
			var firstName, lastName, nickname string
			var createdAt time.Time

			err := rows.Scan(
				&post.ID, &post.AuthorID, &post.Content, &imagePath, &privacySetting, &groupID, &createdAt,
				&firstName, &lastName, &nickname, &post.LikesCount, &post.CommentsCount, &post.UserReaction,
			)
			if err != nil {
				http.Error(w, "row scanning error: "+err.Error(), http.StatusInternalServerError)
				return
			}

			authorName := firstName + " " + lastName
			if nickname != "" {
				authorName = nickname
			}
			post.AuthorName = authorName
			post.CreatedAt = createdAt.Format(time.RFC3339)

			post.Privacy = "public"
			if privacySetting == "almost_private" {
				post.Privacy = "friends"
			} else if privacySetting == "private" {
				post.Privacy = "private"
			}

			if groupID.Valid {
				post.GroupID = groupID.String
			}
			if imagePath.Valid {
				post.ImageUrl = imagePath.String
			}

			posts = append(posts, post)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(posts)
	}
}

// UpdatePostHandler returns an HTTP handler for updating posts
func UpdatePostHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		postID := r.PathValue("id")
		userIDStr := middleware.GetUserID(r)
		if userIDStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var req struct {
			Content        string `json:"content"`
			PrivacySetting string `json:"privacy_level"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request", http.StatusBadRequest)
			return
		}

		privacy := "public"
		if req.PrivacySetting == "friends" {
			privacy = "almost_private"
		} else if req.PrivacySetting == "private" {
			privacy = "private"
		}

		// Verify ownership first
		var authorID string
		err := db.QueryRowContext(r.Context(), "SELECT author_id FROM posts WHERE id = ?", postID).Scan(&authorID)
		if err != nil {
			if err == sql.ErrNoRows {
				http.Error(w, "post not found", http.StatusNotFound)
			} else {
				http.Error(w, "database error", http.StatusInternalServerError)
			}
			return
		}

		if authorID != userIDStr {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}

		_, err = db.ExecContext(r.Context(), `
			UPDATE posts
			SET content = ?, privacy_setting = ?, updated_at = datetime('now')
			WHERE id = ?
		`, req.Content, privacy, postID)
		if err != nil {
			http.Error(w, "failed to update post", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "post updated successfully"})
	}
}

// DeletePostHandler returns an HTTP handler for deleting posts
func DeletePostHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		postID := r.PathValue("id")
		userIDStr := middleware.GetUserID(r)
		if userIDStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// Verify ownership first
		var authorID string
		err := db.QueryRowContext(r.Context(), "SELECT author_id FROM posts WHERE id = ?", postID).Scan(&authorID)
		if err != nil {
			if err == sql.ErrNoRows {
				http.Error(w, "post not found", http.StatusNotFound)
			} else {
				http.Error(w, "database error", http.StatusInternalServerError)
			}
			return
		}

		if authorID != userIDStr {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}

		_, err = db.ExecContext(r.Context(), "DELETE FROM posts WHERE id = ?", postID)
		if err != nil {
			http.Error(w, "failed to delete post", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

// AddReactionHandler returns an HTTP handler for adding reactions
func AddReactionHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		postID := r.PathValue("id")
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
			INSERT INTO post_reactions (user_id, post_id, reaction_type)
			VALUES (?, ?, ?)
			ON CONFLICT(user_id, post_id) DO UPDATE SET reaction_type = excluded.reaction_type
		`, userIDStr, postID, req.ReactionType)
		if err != nil {
			http.Error(w, "failed to record reaction: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "reaction registered"})
	}
}

// RemoveReactionHandler returns an HTTP handler for removing reactions
func RemoveReactionHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		postID := r.PathValue("id")
		userIDStr := middleware.GetUserID(r)
		if userIDStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		_, err := db.ExecContext(r.Context(), `
			DELETE FROM post_reactions WHERE user_id = ? AND post_id = ?
		`, userIDStr, postID)
		if err != nil {
			http.Error(w, "failed to remove reaction", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
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
			Content string `json:"content"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}

		commentID := uuid.New().String()
		now := time.Now().UTC()

		_, err := db.ExecContext(r.Context(), `
			INSERT INTO comments (id, post_id, author_id, content, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?)
		`, commentID, postID, userIDStr, req.Content, now, now)
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
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(comment)
	}
}
