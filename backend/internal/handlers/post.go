package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"backend/internal/middleware"
	"backend/internal/models"
	"backend/internal/services"

	"github.com/google/uuid"
)

// PostHandler handles all post-related HTTP requests
type PostHandler struct {
	postService services.PostService
}

// NewPostHandler creates a new post handler with dependency injection
func NewPostHandler(postService services.PostService) *PostHandler {
	return &PostHandler{
		postService: postService,
	}
}

// CreatePostHandler returns an HTTP handler for creating posts
func (h *PostHandler) CreatePost(w http.ResponseWriter, r *http.Request) {
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
		ImageURL       string  `json:"image_url"`
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

	var groupID *uuid.UUID
	if req.GroupID != nil && *req.GroupID != "" {
		parsedGroupID, err := uuid.Parse(*req.GroupID)
		if err == nil {
			groupID = &parsedGroupID
		}
	}

	serviceReq := services.CreatePostRequest{
		Content:      req.Content,
		ImageURL:     req.ImageURL,
		PrivacyLevel: privacy,
	}

	post, err := h.postService.CreatePost(r.Context(), userID, serviceReq)
	if err != nil {
		http.Error(w, "failed to create post: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if groupID != nil {
		post.GroupID = groupID.String()
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(post)
}

// GetPostHandler returns an HTTP handler for getting a single post
func (h *PostHandler) GetPost(w http.ResponseWriter, r *http.Request) {
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

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	postIDUUID, err := uuid.Parse(postID)
	if err != nil {
		http.Error(w, "invalid post id", http.StatusBadRequest)
		return
	}

	post, err := h.postService.GetPost(r.Context(), postIDUUID, userID)
	if err != nil {
		if err.Error() == "post not found" {
			http.Error(w, "post not found", http.StatusNotFound)
		} else if err.Error() == "forbidden" {
			http.Error(w, "forbidden", http.StatusForbidden)
		} else {
			http.Error(w, "database error: "+err.Error(), http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(post)
}

// GetPostsHandler returns an HTTP handler for getting posts (feed or specific filters)
func (h *PostHandler) GetPosts(w http.ResponseWriter, r *http.Request) {
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

	filter := services.PostFilter{
		Limit:  limit,
		Offset: offset,
	}

	if groupIDStr != "" {
		groupID, err := uuid.Parse(groupIDStr)
		if err == nil {
			filter.GroupID = &groupID
		}
	} else if profileUserIDStr != "" {
		profileUserID, err := uuid.Parse(profileUserIDStr)
		if err == nil {
			filter.UserID = &profileUserID
		}
	}

	posts, err := h.postService.GetPosts(r.Context(), userID, filter)
	if err != nil {
		http.Error(w, "database query error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// UpdatePostHandler returns an HTTP handler for updating posts
func (h *PostHandler) UpdatePost(w http.ResponseWriter, r *http.Request) {
	postID := r.PathValue("id")
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

	postIDUUID, err := uuid.Parse(postID)
	if err != nil {
		http.Error(w, "invalid post id", http.StatusBadRequest)
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

	serviceReq := services.UpdatePostRequest{
		Content:      &req.Content,
		PrivacyLevel: &privacy,
	}

	_, err = h.postService.UpdatePost(r.Context(), postIDUUID, userID, serviceReq)
	if err != nil {
		if err.Error() == "post not found" {
			http.Error(w, "post not found", http.StatusNotFound)
		} else if err.Error() == "unauthorized" {
			http.Error(w, "forbidden", http.StatusForbidden)
		} else {
			http.Error(w, "failed to update post", http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "post updated successfully"})
}

// DeletePostHandler returns an HTTP handler for deleting posts
func (h *PostHandler) DeletePost(w http.ResponseWriter, r *http.Request) {
	postID := r.PathValue("id")
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

	postIDUUID, err := uuid.Parse(postID)
	if err != nil {
		http.Error(w, "invalid post id", http.StatusBadRequest)
		return
	}

	err = h.postService.DeletePost(r.Context(), postIDUUID, userID)
	if err != nil {
		if err.Error() == "post not found" {
			http.Error(w, "post not found", http.StatusNotFound)
		} else if err.Error() == "unauthorized" {
			http.Error(w, "forbidden", http.StatusForbidden)
		} else {
			http.Error(w, "failed to delete post", http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// AddReactionHandler returns an HTTP handler for adding reactions
func (h *PostHandler) AddReaction(w http.ResponseWriter, r *http.Request) {
	postID := r.PathValue("id")
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

	postIDUUID, err := uuid.Parse(postID)
	if err != nil {
		http.Error(w, "invalid post id", http.StatusBadRequest)
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

	err = h.postService.AddReaction(r.Context(), userID, postIDUUID, models.ReactionType(req.ReactionType))
	if err != nil {
		http.Error(w, "failed to record reaction: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "reaction registered"})
}

// RemoveReactionHandler returns an HTTP handler for removing reactions
func (h *PostHandler) RemoveReaction(w http.ResponseWriter, r *http.Request) {
	postID := r.PathValue("id")
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

	postIDUUID, err := uuid.Parse(postID)
	if err != nil {
		http.Error(w, "invalid post id", http.StatusBadRequest)
		return
	}

	err = h.postService.RemoveReaction(r.Context(), userID, postIDUUID)
	if err != nil {
		http.Error(w, "failed to remove reaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
