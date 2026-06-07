package handlers

import (
    "encoding/json"
    "net/http"
    "time"

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

func pathParam(r *http.Request, key string) string {
    return r.PathValue(key)
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

type GetGroupResponse struct {
    ID          uuid.UUID `json:"id"`
    Title       string    `json:"title"`
    Description string    `json:"description"`
    CreatorID   uuid.UUID `json:"creator_id"`
    CoverImageID *uuid.UUID `json:"cover_image_id,omitempty"`
    CreatedAt   string    `json:"created_at"`
    UpdatedAt   string    `json:"updated_at"`
    IsActive    bool      `json:"is_active"`
}

func (h *GroupHandler) GetGroupByID(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
        return
    }

    groupID, err := uuid.Parse(pathParam(r, "id"))
    if err != nil {
        http.Error(w, "invalid group ID", http.StatusBadRequest)
        return
    }

    group, err := h.groupService.GetGroupByID(r.Context(), groupID)
    if err != nil {
        encodeError(w, err)
        return
    }

    resp := GetGroupResponse{
        ID:          group.ID,
        Title:       group.Title,
        Description: group.Description,
        CreatorID:   group.CreatorID,
        CoverImageID: group.CoverImageID,
        CreatedAt:   group.CreatedAt.Format(time.RFC3339),
        UpdatedAt:   group.UpdatedAt.Format(time.RFC3339),
        IsActive:    group.IsActive,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}

type UpdateGroupRequest struct {
    Title        string  `json:"title"`
    Description  string  `json:"description"`
    CoverImageID *string `json:"cover_image_id"`
}

func (h *GroupHandler) UpdateGroup(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPut {
        http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
        return
    }

    groupID, err := uuid.Parse(pathParam(r, "id"))
    if err != nil {
        http.Error(w, "invalid group ID", http.StatusBadRequest)
        return
    }

    var req UpdateGroupRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid request body", http.StatusBadRequest)
        return
    }

    group := &models.Group{
        ID:          groupID,
        Title:       req.Title,
        Description: req.Description,
        CoverImageID: req.CoverImageID,
    }
    if group.CoverImageID != nil {
        parsed, err := uuid.Parse(*group.CoverImageID)
        if err == nil {
            group.CoverImageID = &parsed
        }
    }

    if err := h.groupService.UpdateGroup(r.Context(), group); err != nil {
        encodeError(w, err)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(group)
}

func (h *GroupHandler) DeleteGroup(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodDelete {
        http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
        return
    }

    groupID, err := uuid.Parse(pathParam(r, "id"))
    if err != nil {
        http.Error(w, "invalid group ID", http.StatusBadRequest)
        return
    }

    if err := h.groupService.DeleteGroup(r.Context(), groupID); err != nil {
        encodeError(w, err)
        return
    }

    w.WriteHeader(http.StatusNoContent)
}

func (h *GroupHandler) ListGroups(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
        return
    }

    query := r.URL.Query()
    title := query.Get("title")
    creatorIDStr := query.Get("creator_id")
    isActiveStr := query.Get("is_active")
    limitStr := query.Get("limit")
    offsetStr := query.Get("offset")

    limit, _ := strconv.Atoi(limitStr)
    if limit <= 0 {
        limit = 20
    }

    offset, _ := strconv.Atoi(offsetStr)
    if offset < 0 {
        offset = 0
    }

    var creatorID uuid.UUID
    if creatorIDStr != "" {
        creatorID, _ = uuid.Parse(creatorIDStr)
    }

    var isActive *bool
    if isActiveStr != "" {
        val := isActiveStr == "true"
        isActive = &val
    }

    groups, total, err := h.groupService.ListGroups(r.Context(), services.GroupFilter{
        Title:     title,
        CreatorID: creatorID,
        IsActive:  isActive,
    }, services.Pagination{
        Limit:  limit,
        Offset: offset,
    })
    if err != nil {
        encodeError(w, err)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "data":  groups,
        "total": total,
    })
}
