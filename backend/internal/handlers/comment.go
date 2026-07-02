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

// CommentHandler handles all comment-related HTTP requests
type CommentHandler struct {
	commentService services.CommentService
}

// NewCommentHandler creates a new comment handler with dependency injection
func NewCommentHandler(commentService services.CommentService) *CommentHandler {
	return &CommentHandler{
		commentService: commentService,
	}
}

// GetCommentsHandler returns an HTTP handler for getting comments
func (h *CommentHandler) GetComments(w http.ResponseWriter, r *http.Request) {
	postID := r.PathValue("id")
	userIDStr := middleware.GetUserID(r)

	// Parse pagination parameters
	limit := 20 // default limit
	offset := 0 // default offset

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 100 {
			limit = parsedLimit
		}
	}

	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	postIDUUID, err := uuid.Parse(postID)
	if err != nil {
		http.Error(w, "invalid post id", http.StatusBadRequest)
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	comments, err := h.commentService.GetComments(r.Context(), postIDUUID, userID, limit, offset)
	if err != nil {
		http.Error(w, "database query error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comments)
}

// AddCommentHandler returns an HTTP handler for adding comments
func (h *CommentHandler) AddComment(w http.ResponseWriter, r *http.Request) {
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
		Content  string  `json:"content"`
		ImageURL string  `json:"image_url"`
		ParentID *string `json:"parent_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	var parentID *uuid.UUID
	if req.ParentID != nil && *req.ParentID != "" {
		parsedParentID, err := uuid.Parse(*req.ParentID)
		if err != nil {
			http.Error(w, "invalid parent_id", http.StatusBadRequest)
			return
		}
		parentID = &parsedParentID
	}

	serviceReq := services.CreateCommentRequest{
		Content:  req.Content,
		ImageURL: req.ImageURL,
		ParentID: parentID,
	}

	comment, err := h.commentService.CreateComment(r.Context(), postIDUUID, userID, serviceReq)
	if err != nil {
		if err.Error() == "parent comment not found" {
			http.Error(w, "parent comment not found", http.StatusNotFound)
		} else if err.Error() == "parent comment does not belong to this post" {
			http.Error(w, "parent comment does not belong to this post", http.StatusBadRequest)
		} else if err.Error() == "cannot reply to a reply" {
			http.Error(w, "cannot reply to a reply", http.StatusBadRequest)
		} else {
			http.Error(w, "failed to insert comment", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(comment)
}

// AddCommentReactionHandler returns an HTTP handler for adding reactions to comments
func (h *CommentHandler) AddCommentReaction(w http.ResponseWriter, r *http.Request) {
	commentID := r.PathValue("id")
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

	commentIDUUID, err := uuid.Parse(commentID)
	if err != nil {
		http.Error(w, "invalid comment id", http.StatusBadRequest)
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

	err = h.commentService.AddReaction(r.Context(), userID, commentIDUUID, models.ReactionType(req.ReactionType))
	if err != nil {
		http.Error(w, "failed to record reaction: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "reaction registered"})
}

// RemoveCommentReactionHandler returns an HTTP handler for removing reactions from comments
func (h *CommentHandler) RemoveCommentReaction(w http.ResponseWriter, r *http.Request) {
	commentID := r.PathValue("id")
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

	commentIDUUID, err := uuid.Parse(commentID)
	if err != nil {
		http.Error(w, "invalid comment id", http.StatusBadRequest)
		return
	}

	err = h.commentService.RemoveReaction(r.Context(), userID, commentIDUUID)
	if err != nil {
		http.Error(w, "failed to remove reaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
