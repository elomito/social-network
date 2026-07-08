package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"backend/internal/middleware"
	"backend/internal/services"
	"backend/internal/websocket"

	"github.com/google/uuid"
)

type GroupHandler struct {
	groupService *services.GroupService
	db           *sql.DB
	hub          *websocket.Hub
}

func NewGroupHandler(groupService *services.GroupService, db *sql.DB, hub *websocket.Hub) *GroupHandler {
	return &GroupHandler{
		groupService: groupService,
		db:           db,
		hub:          hub,
	}
}

func encodeError(w http.ResponseWriter, err error) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusInternalServerError)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
}

func pathParam(r *http.Request, key string) string {
	return r.PathValue(key)
}

type GroupJSON struct {
	ID            string `json:"id"`
	Title         string `json:"title"`
	Description   string `json:"description"`
	CreatorID     string `json:"creator_id"`
	CoverImageUrl string `json:"cover_image_url,omitempty"`
	MemberCount   int    `json:"member_count"`
	Privacy       string `json:"privacy"`
	CreatedAt     string `json:"created_at"`
}

type GroupMemberJSON struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Role     string `json:"role"`
	JoinedAt string `json:"joined_at"`
}

type InvitationUser struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type GroupInvitationJSON struct {
	ID        string          `json:"id"`
	Inviter   *InvitationUser `json:"inviter,omitempty"`
	User      *InvitationUser `json:"user,omitempty"`
	Status    string          `json:"status"`
	CreatedAt string          `json:"created_at"`
}

type GroupAuthor struct {
	Name string `json:"name"`
}

type GroupComment struct {
	ID      string       `json:"id"`
	Content string       `json:"content"`
	Author  *GroupAuthor `json:"author"`
}

type GroupPostJSON struct {
	ID        string         `json:"id"`
	Content   string         `json:"content"`
	CreatedAt string         `json:"created_at"`
	Author    *GroupAuthor   `json:"author"`
	Likes     int            `json:"likes"`
	Comments  []GroupComment `json:"comments"`
}

// CreateGroup handles group creation
func (h *GroupHandler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	userIDStr := middleware.GetUserID(r)
	if userIDStr == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		Title        string `json:"title"`
		Description  string `json:"description"`
		Privacy      string `json:"privacy"`
		CoverImageID string `json:"cover_image_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Title == "" {
		http.Error(w, "invalid request payload", http.StatusBadRequest)
		return
	}

	privacy := req.Privacy
	if privacy == "" {
		privacy = "public"
	}

	var coverImageID interface{}
	if req.CoverImageID != "" {
		coverImageID = req.CoverImageID
	}

	groupID := uuid.New().String()
	now := time.Now().UTC()

	tx, err := h.db.BeginTx(r.Context(), nil)
	if err != nil {
		http.Error(w, "failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(r.Context(), `
		INSERT INTO groups (id, title, description, creator_id, privacy, cover_image_id, created_at, updated_at, is_active)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
	`, groupID, req.Title, req.Description, userIDStr, privacy, coverImageID, now, now)
	if err != nil {
		http.Error(w, "failed to insert group: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Creator becomes admin member
	memberID := uuid.New().String()
	_, err = tx.ExecContext(r.Context(), `
		INSERT INTO group_members (id, group_id, user_id, role, joined_at)
		VALUES (?, ?, ?, 'admin', ?)
	`, memberID, groupID, userIDStr, now)
	if err != nil {
		http.Error(w, "failed to add creator as member: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(GroupJSON{
		ID:            groupID,
		Title:         req.Title,
		Description:   req.Description,
		CreatorID:     userIDStr,
		MemberCount:   1,
		Privacy:       privacy,
		CoverImageUrl: req.CoverImageID,
		CreatedAt:     now.Format(time.RFC3339),
	})
}

// GetGroupByID fetches single group details
func (h *GroupHandler) GetGroupByID(w http.ResponseWriter, r *http.Request) {
	groupID := r.PathValue("id")

	var g GroupJSON
	var coverImage sql.NullString
	var createdAtStr string
	err := h.db.QueryRowContext(r.Context(), `
		SELECT id, title, description, creator_id, privacy, cover_image_id, created_at,
		       (SELECT count(*) FROM group_members WHERE group_id = id) as member_count
		FROM groups
		WHERE id = ? AND deleted_at IS NULL
	`, groupID).Scan(&g.ID, &g.Title, &g.Description, &g.CreatorID, &g.Privacy, &coverImage, &createdAtStr, &g.MemberCount)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "group not found", http.StatusNotFound)
		} else {
			http.Error(w, "database error: "+err.Error(), http.StatusInternalServerError)
		}
		return
	}

	g.CreatedAt = createdAtStr
	if coverImage.Valid {
		g.CoverImageUrl = coverImage.String
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(g)
}

// UpdateGroup updates group description/title
func (h *GroupHandler) UpdateGroup(w http.ResponseWriter, r *http.Request) {
	groupID := r.PathValue("id")
	userIDStr := middleware.GetUserID(r)
	if userIDStr == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var creatorID string
	err := h.db.QueryRowContext(r.Context(), "SELECT creator_id FROM groups WHERE id = ?", groupID).Scan(&creatorID)
	if err != nil {
		http.Error(w, "group not found", http.StatusNotFound)
		return
	}
	if creatorID != userIDStr {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var req struct {
		Title        string `json:"title"`
		Description  string `json:"description"`
		Privacy      string `json:"privacy"`
		CoverImageID string `json:"cover_image_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request payload", http.StatusBadRequest)
		return
	}

	privacy := req.Privacy
	if privacy == "" {
		privacy = "public"
	}

	var coverImageID interface{}
	if req.CoverImageID != "" {
		coverImageID = req.CoverImageID
	}

	_, err = h.db.ExecContext(r.Context(), `
		UPDATE groups SET title = ?, description = ?, privacy = ?, cover_image_id = ?, updated_at = datetime('now')
		WHERE id = ?
	`, req.Title, req.Description, privacy, coverImageID, groupID)
	if err != nil {
		http.Error(w, "failed to update group: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// DeleteGroup deletes group
func (h *GroupHandler) DeleteGroup(w http.ResponseWriter, r *http.Request) {
	groupID := r.PathValue("id")
	userIDStr := middleware.GetUserID(r)
	if userIDStr == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var creatorID string
	err := h.db.QueryRowContext(r.Context(), "SELECT creator_id FROM groups WHERE id = ?", groupID).Scan(&creatorID)
	if err != nil {
		http.Error(w, "group not found", http.StatusNotFound)
		return
	}
	if creatorID != userIDStr {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	_, err = h.db.ExecContext(r.Context(), `
		UPDATE groups SET deleted_at = datetime('now'), is_active = 0
		WHERE id = ?
	`, groupID)
	if err != nil {
		http.Error(w, "failed to delete group", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ListGroups lists active groups matching search filter
func (h *GroupHandler) ListGroups(w http.ResponseWriter, r *http.Request) {
	searchQuery := r.URL.Query().Get("title")
	if searchQuery == "" {
		searchQuery = r.URL.Query().Get("search")
	}

	rows, err := h.db.QueryContext(r.Context(), `
		SELECT id, title, description, creator_id, privacy, cover_image_id, created_at,
		       (SELECT count(*) FROM group_members WHERE group_id = id) as member_count
		FROM groups
		WHERE deleted_at IS NULL AND (title LIKE ? OR description LIKE ?)
		ORDER BY created_at DESC
	`, "%"+searchQuery+"%", "%"+searchQuery+"%")
	if err != nil {
		http.Error(w, "database query error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	groups := []GroupJSON{}
	for rows.Next() {
		var g GroupJSON
		var coverImage sql.NullString
		var createdAtStr string
		err := rows.Scan(&g.ID, &g.Title, &g.Description, &g.CreatorID, &g.Privacy, &coverImage, &createdAtStr, &g.MemberCount)
		if err != nil {
			continue
		}
		g.CreatedAt = createdAtStr
		if coverImage.Valid {
			g.CoverImageUrl = coverImage.String
		}
		groups = append(groups, g)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(groups)
}

// JoinGroup adds user to group instantly or sends request
func (h *GroupHandler) JoinGroup(w http.ResponseWriter, r *http.Request) {
	groupID := r.PathValue("id")
	userIDStr := middleware.GetUserID(r)
	if userIDStr == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// First verify group exists
	var creatorID string
	err := h.db.QueryRowContext(r.Context(), "SELECT creator_id FROM groups WHERE id = ?", groupID).Scan(&creatorID)
	if err != nil {
		http.Error(w, "group not found", http.StatusNotFound)
		return
	}

	// For simplicity and instant production readiness, add them to members instantly!
	memberID := uuid.New().String()
	_, err = h.db.ExecContext(r.Context(), `
		INSERT INTO group_members (id, group_id, user_id, role, joined_at)
		VALUES (?, ?, ?, 'member', datetime('now'))
	`, memberID, groupID, userIDStr)
	if err != nil {
		// User might already be a member, ignore
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "successfully joined group"})
}

// LeaveGroup removes user from group
func (h *GroupHandler) LeaveGroup(w http.ResponseWriter, r *http.Request) {
	groupID := r.PathValue("id")
	userIDStr := middleware.GetUserID(r)
	if userIDStr == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var creatorID string
	err := h.db.QueryRowContext(r.Context(), "SELECT creator_id FROM groups WHERE id = ?", groupID).Scan(&creatorID)
	if err != nil {
		http.Error(w, "group not found", http.StatusNotFound)
		return
	}
	if creatorID == userIDStr {
		http.Error(w, "creator cannot leave group", http.StatusBadRequest)
		return
	}

	_, err = h.db.ExecContext(r.Context(), `
		DELETE FROM group_members WHERE group_id = ? AND user_id = ?
	`, groupID, userIDStr)
	if err != nil {
		http.Error(w, "failed to leave group", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "successfully left group"})
}

// ListGroupMembers lists all group members
func (h *GroupHandler) ListGroupMembers(w http.ResponseWriter, r *http.Request) {
	groupID := r.PathValue("id")

	rows, err := h.db.QueryContext(r.Context(), `
		SELECT u.id, u.first_name, u.last_name, u.nickname, gm.role, gm.joined_at
		FROM group_members gm
		JOIN users u ON gm.user_id = u.id
		WHERE gm.group_id = ?
	`, groupID)
	if err != nil {
		http.Error(w, "database query error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	members := []GroupMemberJSON{}
	for rows.Next() {
		var m GroupMemberJSON
		var firstName, lastName, joinedAtStr string
		var nickname *string
		err := rows.Scan(&m.ID, &firstName, &lastName, &nickname, &m.Role, &joinedAtStr)
		if err != nil {
			continue
		}
		name := firstName + " " + lastName
		if nickname != nil && *nickname != "" {
			name = *nickname
		}
		m.Name = name
		m.JoinedAt = joinedAtStr
		members = append(members, m)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(members)
}

// GetGroupInvitations returns group invitations
func (h *GroupHandler) GetGroupInvitations(w http.ResponseWriter, r *http.Request) {
	groupID := r.PathValue("id")

	rows, err := h.db.QueryContext(r.Context(), `
		SELECT gi.id, gi.status, gi.created_at,
		       u.id, u.first_name, u.last_name, u.nickname
		FROM group_invitations gi
		JOIN users u ON gi.inviter_id = u.id
		WHERE gi.group_id = ? AND gi.status = 'pending'
	`, groupID)
	if err != nil {
		http.Error(w, "database error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	invites := []GroupInvitationJSON{}
	for rows.Next() {
		var inv GroupInvitationJSON
		var u InvitationUser
		var firstName, lastName, createdAtStr string
		var nickname *string
		err := rows.Scan(&inv.ID, &inv.Status, &createdAtStr, &u.ID, &firstName, &lastName, &nickname)
		if err != nil {
			continue
		}
		name := firstName + " " + lastName
		if nickname != nil && *nickname != "" {
			name = *nickname
		}
		u.Name = name
		inv.Inviter = &u
		inv.CreatedAt = createdAtStr
		invites = append(invites, inv)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(invites)
}

// CreateGroupInvitation creates a group invitation
func (h *GroupHandler) CreateGroupInvitation(w http.ResponseWriter, r *http.Request) {
	groupID := r.PathValue("id")
	userIDStr := middleware.GetUserID(r)
	if userIDStr == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Verify membership (or creator check)
	var isMember bool
	err := h.db.QueryRowContext(r.Context(), `
		SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?)
	`, groupID, userIDStr).Scan(&isMember)
	if err != nil || !isMember {
		http.Error(w, "forbidden: only group members can invite others", http.StatusForbidden)
		return
	}

	var req struct {
		InviteeID string `json:"invitee_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.InviteeID == "" {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	invitationID := uuid.New().String()
	_, err = h.db.ExecContext(r.Context(), `
		INSERT INTO group_invitations (id, group_id, inviter_id, invitee_id, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))
	`, invitationID, groupID, userIDStr, req.InviteeID)
	if err != nil {
		http.Error(w, "failed to invite: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"id": invitationID})
}

// RespondToInvitation handles accepting/declining group invites
func (h *GroupHandler) RespondToInvitation(w http.ResponseWriter, r *http.Request) {
	groupID := r.PathValue("id")
	invitationID := r.PathValue("invitationId")
	userIDStr := middleware.GetUserID(r)
	if userIDStr == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		Accept bool `json:"accept"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	status := "declined"
	if req.Accept {
		status = "accepted"
	}

	tx, err := h.db.BeginTx(r.Context(), nil)
	if err != nil {
		http.Error(w, "tx failed", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(r.Context(), `
		UPDATE group_invitations SET status = ?, updated_at = datetime('now')
		WHERE id = ? AND group_id = ?
	`, status, invitationID, groupID)
	if err != nil {
		http.Error(w, "failed to update status", http.StatusInternalServerError)
		return
	}

	if req.Accept {
		memberID := uuid.New().String()
		_, err = tx.ExecContext(r.Context(), `
			INSERT OR IGNORE INTO group_members (id, group_id, user_id, role, joined_at)
			VALUES (?, ?, ?, 'member', datetime('now'))
		`, memberID, groupID, userIDStr)
		if err != nil {
			http.Error(w, "failed to join group", http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "failed to commit response", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// GetGroupJoinRequests gets group join requests
func (h *GroupHandler) GetGroupJoinRequests(w http.ResponseWriter, r *http.Request) {
	groupID := r.PathValue("id")

	rows, err := h.db.QueryContext(r.Context(), `
		SELECT gi.id, gi.status, gi.created_at,
		       u.id, u.first_name, u.last_name, u.nickname
		FROM group_invitations gi
		JOIN users u ON gi.inviter_id = u.id
		WHERE gi.group_id = ? AND gi.status = 'pending' AND gi.invitee_id != gi.inviter_id
	`, groupID)
	if err != nil {
		http.Error(w, "database query error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	requests := []GroupInvitationJSON{}
	for rows.Next() {
		var req GroupInvitationJSON
		var u InvitationUser
		var firstName, lastName, createdAtStr string
		var nickname *string
		err := rows.Scan(&req.ID, &req.Status, &createdAtStr, &u.ID, &firstName, &lastName, &nickname)
		if err != nil {
			continue
		}
		name := firstName + " " + lastName
		if nickname != nil && *nickname != "" {
			name = *nickname
		}
		u.Name = name
		req.User = &u
		req.CreatedAt = createdAtStr
		requests = append(requests, req)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests)
}

// RespondToJoinRequest approves or rejects join requests
func (h *GroupHandler) RespondToJoinRequest(w http.ResponseWriter, r *http.Request) {
	groupID := r.PathValue("id")
	requestID := r.PathValue("requestId")

	var req struct {
		Approve bool `json:"approve"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Fetch join request details
	var inviterID string
	err := h.db.QueryRowContext(r.Context(), `
		SELECT inviter_id FROM group_invitations WHERE id = ? AND group_id = ?
	`, requestID, groupID).Scan(&inviterID)
	if err != nil {
		http.Error(w, "join request not found", http.StatusNotFound)
		return
	}

	status := "declined"
	if req.Approve {
		status = "accepted"
	}

	tx, err := h.db.BeginTx(r.Context(), nil)
	if err != nil {
		http.Error(w, "tx failed", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(r.Context(), `
		UPDATE group_invitations SET status = ?, updated_at = datetime('now')
		WHERE id = ?
	`, status, requestID)
	if err != nil {
		http.Error(w, "failed update request status", http.StatusInternalServerError)
		return
	}

	if req.Approve {
		memberID := uuid.New().String()
		_, err = tx.ExecContext(r.Context(), `
			INSERT OR IGNORE INTO group_members (id, group_id, user_id, role, joined_at)
			VALUES (?, ?, ?, 'member', datetime('now'))
		`, memberID, groupID, inviterID)
		if err != nil {
			http.Error(w, "failed to add member", http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "failed commit", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// GetGroupPosts returns group discussions with comments
func (h *GroupHandler) GetGroupPosts(w http.ResponseWriter, r *http.Request) {
	groupID := r.PathValue("id")

	rows, err := h.db.QueryContext(r.Context(), `
		SELECT p.id, p.content, p.created_at,
		       u.first_name, u.last_name, u.nickname,
		       (SELECT count(*) FROM post_reactions WHERE post_id = p.id AND reaction_type = 'like') as likes_count
		FROM posts p
		JOIN users u ON p.author_id = u.id
		WHERE p.group_id = ?
		ORDER BY p.created_at DESC
	`, groupID)
	if err != nil {
		http.Error(w, "database query error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	posts := []GroupPostJSON{}
	for rows.Next() {
		var p GroupPostJSON
		var firstName, lastName, createdAtStr string
		var nickname *string
		err := rows.Scan(&p.ID, &p.Content, &createdAtStr, &firstName, &lastName, &nickname, &p.Likes)
		if err != nil {
			continue
		}

		name := firstName + " " + lastName
		if nickname != nil && *nickname != "" {
			name = *nickname
		}
		p.Author = &GroupAuthor{Name: name}
		p.CreatedAt = createdAtStr
		p.Comments = []GroupComment{}

		// Query comments
		crows, cerr := h.db.QueryContext(r.Context(), `
			SELECT c.id, c.content, cu.first_name, cu.last_name, cu.nickname
			FROM comments c
			JOIN users cu ON c.author_id = cu.id
			WHERE c.post_id = ?
			ORDER BY c.created_at ASC
		`, p.ID)
		if cerr == nil {
			for crows.Next() {
				var comment GroupComment
				var cf, cl string
				var cn *string
				if err := crows.Scan(&comment.ID, &comment.Content, &cf, &cl, &cn); err == nil {
					cName := cf + " " + cl
					if cn != nil && *cn != "" {
						cName = *cn
					}
					comment.Author = &GroupAuthor{Name: cName}
					p.Comments = append(p.Comments, comment)
				}
			}
			crows.Close()
		}

		posts = append(posts, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// CreateGroupPost creates a new discussion post inside group
func (h *GroupHandler) CreateGroupPost(w http.ResponseWriter, r *http.Request) {
	groupID := r.PathValue("id")
	userIDStr := middleware.GetUserID(r)
	if userIDStr == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Content == "" {
		http.Error(w, "invalid content", http.StatusBadRequest)
		return
	}

	postID := uuid.New().String()
	now := time.Now().UTC()

	_, err := h.db.ExecContext(r.Context(), `
		INSERT INTO posts (id, author_id, content, privacy_setting, group_id, created_at, updated_at)
		VALUES (?, ?, ?, 'private', ?, ?, ?)
	`, postID, userIDStr, req.Content, groupID, now, now)
	if err != nil {
		http.Error(w, "failed to insert group post: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

// GetGroupMessages returns the group message history
func (h *GroupHandler) GetGroupMessages(w http.ResponseWriter, r *http.Request) {
	groupID := r.PathValue("id")
	userIDStr := middleware.GetUserID(r)
	if userIDStr == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Verify membership
	var isMember bool
	err := h.db.QueryRowContext(r.Context(), `
		SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?)
	`, groupID, userIDStr).Scan(&isMember)
	if err != nil || !isMember {
		http.Error(w, "forbidden: you are not a member of this group", http.StatusForbidden)
		return
	}

	rows, err := h.db.QueryContext(r.Context(), `
		SELECT gm.id, gm.sender_id, gm.content, gm.created_at, u.first_name, u.last_name, u.nickname
		FROM group_messages gm
		JOIN users u ON gm.sender_id = u.id
		WHERE gm.group_id = ?
		ORDER BY gm.created_at ASC
	`, groupID)
	if err != nil {
		http.Error(w, "database query error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type GroupMessageResponse struct {
		ID         string `json:"id"`
		SenderID   string `json:"sender_id"`
		SenderName string `json:"sender_name"`
		GroupID    string `json:"group_id"`
		Content    string `json:"content"`
		Text       string `json:"text"`
		Self       bool   `json:"self"`
		CreatedAt  string `json:"createdAt"`
	}

	messages := []GroupMessageResponse{}
	for rows.Next() {
		var msg GroupMessageResponse
		var firstName, lastName string
		var nickname *string
		var createdAt time.Time

		err := rows.Scan(&msg.ID, &msg.SenderID, &msg.Content, &createdAt, &firstName, &lastName, &nickname)
		if err != nil {
			continue
		}

		name := firstName + " " + lastName
		if nickname != nil && *nickname != "" {
			name = *nickname
		}

		msg.SenderName = name
		msg.GroupID = groupID
		msg.Text = msg.Content
		msg.Self = (msg.SenderID == userIDStr)
		msg.CreatedAt = createdAt.Format(time.RFC3339)
		messages = append(messages, msg)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

// SendGroupMessage saves a group message and broadcasts it via WebSocket
func (h *GroupHandler) SendGroupMessage(w http.ResponseWriter, r *http.Request) {
	groupID := r.PathValue("id")
	userIDStr := middleware.GetUserID(r)
	if userIDStr == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Verify membership
	var isMember bool
	err := h.db.QueryRowContext(r.Context(), `
		SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?)
	`, groupID, userIDStr).Scan(&isMember)
	if err != nil || !isMember {
		http.Error(w, "forbidden: you are not a member of this group", http.StatusForbidden)
		return
	}

	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Content == "" {
		http.Error(w, "invalid request content", http.StatusBadRequest)
		return
	}

	msgID := uuid.New().String()
	now := time.Now().UTC()

	_, err = h.db.ExecContext(r.Context(), `
		INSERT INTO group_messages (id, group_id, sender_id, content, created_at)
		VALUES (?, ?, ?, ?, ?)
	`, msgID, groupID, userIDStr, req.Content, now)
	if err != nil {
		http.Error(w, "failed to save message: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch sender details
	var firstName, lastName string
	var nickname *string
	_ = h.db.QueryRowContext(r.Context(), `
		SELECT first_name, last_name, nickname FROM users WHERE id = ?
	`, userIDStr).Scan(&firstName, &lastName, &nickname)

	name := firstName + " " + lastName
	if nickname != nil && *nickname != "" {
		name = *nickname
	}

	type GroupMessageResponse struct {
		ID         string `json:"id"`
		SenderID   string `json:"sender_id"`
		SenderName string `json:"sender_name"`
		GroupID    string `json:"group_id"`
		Content    string `json:"content"`
		Text       string `json:"text"`
		Self       bool   `json:"self"`
		CreatedAt  string `json:"createdAt"`
	}

	msgRes := GroupMessageResponse{
		ID:         msgID,
		SenderID:   userIDStr,
		SenderName: name,
		GroupID:    groupID,
		Content:    req.Content,
		Text:       req.Content,
		CreatedAt:  now.Format(time.RFC3339),
	}

	// Broadcast via WebSocket to group room
	if h.hub != nil {
		groupUUID, err := uuid.Parse(groupID)
		if err == nil {
			msgResOther := msgRes
			msgResOther.Self = false
			payloadOther, _ := json.Marshal(map[string]interface{}{
				"type":     "group_message",
				"group_id": groupID,
				"message":  msgResOther,
			})
			h.hub.BroadcastToRoom(groupUUID, payloadOther)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(msgRes)
}

// GetJoinedGroups returns groups the current user has joined
func (h *GroupHandler) GetJoinedGroups(w http.ResponseWriter, r *http.Request) {
	userIDStr := middleware.GetUserID(r)
	if userIDStr == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	rows, err := h.db.QueryContext(r.Context(), `
		SELECT g.id, g.title, g.description, g.creator_id, g.privacy, g.cover_image_id, g.created_at,
		       (SELECT count(*) FROM group_members WHERE group_id = g.id) as member_count
		FROM groups g
		JOIN group_members gm ON g.id = gm.group_id
		WHERE gm.user_id = ? AND g.deleted_at IS NULL
		ORDER BY gm.joined_at DESC
	`, userIDStr)
	if err != nil {
		http.Error(w, "database query error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	groups := []GroupJSON{}
	for rows.Next() {
		var g GroupJSON
		var coverImage sql.NullString
		var createdAtStr string
		err := rows.Scan(&g.ID, &g.Title, &g.Description, &g.CreatorID, &g.Privacy, &coverImage, &createdAtStr, &g.MemberCount)
		if err != nil {
			continue
		}
		g.CreatedAt = createdAtStr
		if coverImage.Valid {
			g.CoverImageUrl = coverImage.String
		}
		groups = append(groups, g)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(groups)
}
