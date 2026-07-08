package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"backend/internal/middleware"
	"backend/internal/websocket"

	"github.com/google/uuid"
)

type ConversationResponse struct {
	ID          string               `json:"id"` // peer_id
	Peer        ConversationPeer     `json:"peer"`
	LastMessage *ConversationMessage `json:"last_message,omitempty"`
	UnreadCount int                  `json:"unread_count"`
}

type ConversationPeer struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type ConversationMessage struct {
	ID        string `json:"id"`
	Content   string `json:"content"`
	Text      string `json:"text"`
	SenderID  string `json:"sender_id"`
	CreatedAt string `json:"created_at"`
}

type MessageResponse struct {
	ID          string `json:"id"`
	SenderID    string `json:"sender_id"`
	RecipientID string `json:"recipient_id"`
	Content     string `json:"content"`
	Text        string `json:"text"`
	Self        bool   `json:"self"`
	CreatedAt   string `json:"created_at"`
}

// GetConversationsHandler lists all conversation threads for the user
func GetConversationsHandler(db *sql.DB, hub *websocket.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userIDStr := middleware.GetUserID(r)
		if userIDStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// Query all unique peer IDs we have messaged
		rows, err := db.QueryContext(r.Context(), `
			SELECT DISTINCT
				CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END AS peer_id
			FROM private_messages
			WHERE sender_id = ? OR recipient_id = ?
		`, userIDStr, userIDStr, userIDStr)
		if err != nil {
			http.Error(w, "database query error: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		conversations := []ConversationResponse{}
		for rows.Next() {
			var peerID string
			if err := rows.Scan(&peerID); err != nil {
				continue
			}

			// Get peer details
			var firstName, lastName string
			var nickname *string
			err = db.QueryRowContext(r.Context(), `
				SELECT first_name, last_name, nickname FROM users WHERE id = ?
			`, peerID).Scan(&firstName, &lastName, &nickname)
			if err != nil {
				continue
			}

			name := firstName + " " + lastName
			if nickname != nil && *nickname != "" {
				name = *nickname
			}

			// Get last message
			var lastMsg ConversationMessage
			var lastMsgCreatedAt time.Time
			err = db.QueryRowContext(r.Context(), `
				SELECT id, content, sender_id, created_at
				FROM private_messages
				WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
				ORDER BY created_at DESC
				LIMIT 1
			`, userIDStr, peerID, peerID, userIDStr).Scan(
				&lastMsg.ID, &lastMsg.Content, &lastMsg.SenderID, &lastMsgCreatedAt,
			)

			// Get unread count for this peer
			var unreadCount int
			_ = db.QueryRowContext(r.Context(), `
				SELECT COUNT(*)
				FROM private_messages
				WHERE recipient_id = ? AND sender_id = ? AND is_read = 0
			`, userIDStr, peerID).Scan(&unreadCount)

			conv := ConversationResponse{
				ID: peerID,
				Peer: ConversationPeer{
					ID:   peerID,
					Name: name,
				},
				UnreadCount: unreadCount,
			}

			if err == nil {
				lastMsg.Text = lastMsg.Content
				lastMsg.CreatedAt = lastMsgCreatedAt.Format(time.RFC3339)
				conv.LastMessage = &lastMsg
			}

			conversations = append(conversations, conv)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(conversations)
	}
}

// GetConversationMessagesHandler lists all messages in a conversation
func GetConversationMessagesHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userIDStr := middleware.GetUserID(r)
		if userIDStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		peerID := r.PathValue("id")
		if _, err := uuid.Parse(peerID); err != nil {
			http.Error(w, "invalid conversation/peer id", http.StatusBadRequest)
			return
		}

		// Mark private messages as read
		_, _ = db.ExecContext(r.Context(), `
			UPDATE private_messages
			SET is_read = 1
			WHERE recipient_id = ? AND sender_id = ? AND is_read = 0
		`, userIDStr, peerID)

		limit := 50
		if lstr := r.URL.Query().Get("limit"); lstr != "" {
			if l, err := strconv.Atoi(lstr); err == nil {
				limit = l
			}
		}
		offset := 0
		if ostr := r.URL.Query().Get("offset"); ostr != "" {
			if o, err := strconv.Atoi(ostr); err == nil {
				offset = o
			}
		}

		rows, err := db.QueryContext(r.Context(), `
			SELECT id, sender_id, recipient_id, content, created_at
			FROM private_messages
			WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
			ORDER BY created_at ASC
			LIMIT ? OFFSET ?
		`, userIDStr, peerID, peerID, userIDStr, limit, offset)
		if err != nil {
			http.Error(w, "database query error: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		messages := []MessageResponse{}
		for rows.Next() {
			var msg MessageResponse
			var createdAt time.Time
			err := rows.Scan(&msg.ID, &msg.SenderID, &msg.RecipientID, &msg.Content, &createdAt)
			if err != nil {
				continue
			}

			msg.Text = msg.Content
			msg.Self = (msg.SenderID == userIDStr)
			msg.CreatedAt = createdAt.Format(time.RFC3339)
			messages = append(messages, msg)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(messages)
	}
}

// SendPrivateMessageHandler sends a private message and broadcasts it over WebSocket
func SendPrivateMessageHandler(db *sql.DB, hub *websocket.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userIDStr := middleware.GetUserID(r)
		if userIDStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		peerID := r.PathValue("id")
		if _, err := uuid.Parse(peerID); err != nil {
			http.Error(w, "invalid conversation/peer id", http.StatusBadRequest)
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

		_, err := db.ExecContext(r.Context(), `
			INSERT INTO private_messages (id, sender_id, recipient_id, content, created_at)
			VALUES (?, ?, ?, ?, ?)
		`, msgID, userIDStr, peerID, req.Content, now)
		if err != nil {
			http.Error(w, "failed to send message: "+err.Error(), http.StatusInternalServerError)
			return
		}

		msg := MessageResponse{
			ID:          msgID,
			SenderID:    userIDStr,
			RecipientID: peerID,
			Content:     req.Content,
			Text:        req.Content,
			CreatedAt:   now.Format(time.RFC3339),
		}

		// Broadcast to sender (self = true)
		msgSelf := msg
		msgSelf.Self = true
		payloadSelf, _ := json.Marshal(map[string]interface{}{
			"type":            "private_message",
			"conversation_id": peerID,
			"message":         msgSelf,
		})
		if hub != nil {
			if senderUUID, err := uuid.Parse(userIDStr); err == nil {
				hub.BroadcastToRoom(senderUUID, payloadSelf)
			}
		}

		// Broadcast to recipient (self = false)
		msgOther := msg
		msgOther.Self = false
		payloadOther, _ := json.Marshal(map[string]interface{}{
			"type":            "private_message",
			"conversation_id": userIDStr,
			"message":         msgOther,
		})
		if hub != nil {
			if recipientUUID, err := uuid.Parse(peerID); err == nil {
				hub.BroadcastToRoom(recipientUUID, payloadOther)
			}
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(msgSelf)
	}
}

// GetOrCreateConversationHandler gets details for starting/finding a chat thread
func GetOrCreateConversationHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userIDStr := middleware.GetUserID(r)
		if userIDStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		peerID := r.URL.Query().Get("peerId")
		if _, err := uuid.Parse(peerID); err != nil {
			http.Error(w, "invalid peer id", http.StatusBadRequest)
			return
		}

		var firstName, lastName string
		var nickname *string
		err := db.QueryRowContext(r.Context(), `
			SELECT first_name, last_name, nickname FROM users WHERE id = ?
		`, peerID).Scan(&firstName, &lastName, &nickname)
		if err != nil {
			if err == sql.ErrNoRows {
				http.Error(w, "peer user not found", http.StatusNotFound)
			} else {
				http.Error(w, "database error", http.StatusInternalServerError)
			}
			return
		}

		name := firstName + " " + lastName
		if nickname != nil && *nickname != "" {
			name = *nickname
		}

		conv := ConversationResponse{
			ID: peerID,
			Peer: ConversationPeer{
				ID:   peerID,
				Name: name,
			},
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(conv)
	}
}

// GetUnreadMessageCountsHandler returns the total number of unread private and group messages
func GetUnreadMessageCountsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userIDStr := middleware.GetUserID(r)
		if userIDStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var privateUnread int
		err := db.QueryRowContext(r.Context(), `
			SELECT COUNT(*)
			FROM private_messages
			WHERE recipient_id = ? AND is_read = 0
		`, userIDStr).Scan(&privateUnread)
		if err != nil {
			http.Error(w, "failed to count private unread messages: "+err.Error(), http.StatusInternalServerError)
			return
		}

		var groupUnread int
		err = db.QueryRowContext(r.Context(), `
			SELECT COUNT(*)
			FROM group_messages gm
			JOIN group_members gmb ON gm.group_id = gmb.group_id
			WHERE gmb.user_id = ? AND gm.sender_id != ? AND gm.created_at > gmb.last_read_at
		`, userIDStr, userIDStr).Scan(&groupUnread)
		if err != nil {
			http.Error(w, "failed to count group unread messages: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]int{
			"private_unread": privateUnread,
			"group_unread":   groupUnread,
		})
	}
}

