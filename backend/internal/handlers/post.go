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
