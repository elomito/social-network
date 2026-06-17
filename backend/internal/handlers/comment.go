package handlers

// AddComment handles POST /posts/:id/comments requests

func (h *postHandler) AddComment(w http.ResponseWriter, r *http.Request) {
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
	var req AddCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Add comment via service
	comment, err := h.postService.AddComment(r.Context(), userID, postID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Return created comment
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(comment)
}

// GetComments handles GET /posts/:id/comments requests
func (h *postHandler) GetComments(w http.ResponseWriter, r *http.Request) {
	// Extract post ID from URL
	postID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid post id", http.StatusBadRequest)
		return
	}

	// Get comments via service
	comments, err := h.postService.GetComments(r.Context(), postID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Return comments
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comments)
}

// DeleteComment handles DELETE /comments/:id requests
func (h *postHandler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	// Extract comment ID from URL
	commentID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid comment id", http.StatusBadRequest)
		return
	}

	// Extract user ID from context
	userID, ok := r.Context().Value("user_id").(uuid.UUID)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Delete comment via service
	err = h.postService.DeleteComment(r.Context(), commentID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Return no content
	w.WriteHeader(http.StatusNoContent)
}
