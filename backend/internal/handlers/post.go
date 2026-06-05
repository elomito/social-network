package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
)

// postHandler handles HTTP requests for post-related operations
type postHandler struct {
	postService PostService
}

// NewPostHandler creates a new post handler instance
func NewPostHandler(postService PostService) *postHandler {
	return &postHandler{
		postService: postService,
	}
}

// CreatePost handles POST /posts requests
func (h *postHandler) CreatePost(w http.ResponseWriter, r *http.Request) {
	// Extract authenticated user ID from context
	userID, ok := r.Context().Value("user_id").(uuid.UUID)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse request body
	var req CreatePostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Create post via service
	post, err := h.postService.CreatePost(r.Context(), userID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Return created post
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(post)
}

// GetPost handles GET /posts/:id requests
func (h *postHandler) GetPost(w http.ResponseWriter, r *http.Request) {
	// Extract post ID from URL path
	postID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid post id", http.StatusBadRequest)
		return
	}

	// Extract viewer ID from context
	viewerID, ok := r.Context().Value("user_id").(uuid.UUID)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Get post via service
	post, err := h.postService.GetPost(r.Context(), postID, viewerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	// Return post
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(post)
}

// GetPosts handles GET /posts requests with filtering and pagination
func (h *postHandler) GetPosts(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	limit := r.URL.Query().Get("limit")
	offset := r.URL.Query().Get("offset")
	userIDStr := r.URL.Query().Get("user_id")
	groupIDStr := r.URL.Query().Get("group_id")

	// Build filter
	filter := PostFilter{
		Limit:  20, // default
		Offset: 0,  // default
	}

	// Parse limit
	if limit != "" {
		// parse limit
	}
	// Parse offset
	if offset != "" {
		// parse offset
	}

	// Parse user filter
	if userIDStr != "" {
		userID, err := uuid.Parse(userIDStr)
		if err == nil {
			filter.UserID = &userID
		}
	}

	// Parse group filter
	if groupIDStr != "" {
		groupID, err := uuid.Parse(groupIDStr)
		if err == nil {
			filter.GroupID = &groupID
		}
	}

	// Get posts via service
	posts, err := h.postService.GetPosts(r.Context(), filter)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Return posts
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// UpdatePost handles PUT /posts/:id requests
func (h *postHandler) UpdatePost(w http.ResponseWriter, r *http.Request) {
	// Extract post ID from URL
	postID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid post id", http.StatusBadRequest)
		return
	}

	// Extract user ID from context
	userID, ok := r.Context().Value("user_id").(uuid.UUID)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse request body
	var req UpdatePostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Update post via service
	post, err := h.postService.UpdatePost(r.Context(), postID, userID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Return updated post
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(post)
}

// DeletePost handles DELETE /posts/:id requests
func (h *postHandler) DeletePost(w http.ResponseWriter, r *http.Request) {
	// Extract post ID from URL
	postID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid post id", http.StatusBadRequest)
		return
	}

	// Extract user ID from context
	userID, ok := r.Context().Value("user_id").(uuid.UUID)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Delete post via service
	err = h.postService.DeletePost(r.Context(), postID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Return no content
	w.WriteHeader(http.StatusNoContent)
}

// AddReaction handles POST /posts/:id/reactions requests
func (h *postHandler) AddReaction(w http.ResponseWriter, r *http.Request) {
	// Extract post ID from URL
	postID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid post id", http.StatusBadRequest)
		return
	}

	// Extract user ID from context
	userID, ok := r.Context().Value("user_id").(uuid.UUID)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse reaction type from request body
	var req struct {
		ReactionType string `json:"reaction_type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Validate reaction type
	if req.ReactionType != "like" && req.ReactionType != "dislike" {
		http.Error(w, "invalid reaction type", http.StatusBadRequest)
		return
	}

	// Add reaction via service
	err = h.postService.AddReaction(r.Context(), userID, postID, ReactionType(req.ReactionType))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Return success
	w.WriteHeader(http.StatusOK)
}

// RemoveReaction handles DELETE /posts/:id/reactions requests
func (h *postHandler) RemoveReaction(w http.ResponseWriter, r *http.Request) {
	// Extract post ID from URL
	postID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid post id", http.StatusBadRequest)
		return
	}

	// Extract user ID from context
	userID, ok := r.Context().Value("user_id").(uuid.UUID)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Remove reaction via service
	err = h.postService.RemoveReaction(r.Context(), userID, postID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Return no content
	w.WriteHeader(http.StatusNoContent)
}
