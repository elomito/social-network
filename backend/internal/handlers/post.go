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
