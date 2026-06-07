package handlers

import (
    "encoding/json"
    "net/http"

    "github.com/google/uuid"
    "social-network/backend/internal/models"
    "social-network/backend/internal/services"
)

type GroupHandler struct {
    groupService *services.GroupService
}

func NewGroupHandler(groupService *services.GroupService) *GroupHandler {
    return &GroupHandler{groupService: groupService}
}

type CreateGroupRequest struct {
    Title       string `json:"title"`
    Description string `json:"description"`
    CreatorID   string `json:"creator_id"`
}

type ErrorResponse struct {
    Error string `json:"error"`
}

func encodeError(w http.ResponseWriter, err error) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusInternalServerError)
    _ = json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
}

func (h *GroupHandler) CreateGroup(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var req CreateGroupRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid request body", http.StatusBadRequest)
        return
    }

    creatorID, err := uuid.Parse(req.CreatorID)
    if err != nil {
        http.Error(w, "invalid creator ID", http.StatusBadRequest)
        return
    }

    group := &models.Group{
        Title:       req.Title,
        Description: req.Description,
        CreatorID:   creatorID,
        IsActive:    true,
    }

    if err := h.groupService.CreateGroup(r.Context(), group); err != nil {
        encodeError(w, err)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(group)
}
