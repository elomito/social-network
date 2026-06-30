package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 5120
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	userID uuid.UUID

	// rooms this client has joined
	rooms map[uuid.UUID]bool
}

// NewClient creates a new websocket client without starting pumps.
func NewClient(hub *Hub, conn *websocket.Conn, userID uuid.UUID) *Client {
	return &Client{
		hub:    hub,
		conn:   conn,
		send:   make(chan []byte, 256),
		userID: userID,
		rooms:  make(map[uuid.UUID]bool),
	}
}

// ServeWS upgrades the connection and starts websocket pumps.
func ServeWS(
	hub *Hub,
	w http.ResponseWriter,
	r *http.Request,
	userID uuid.UUID,
) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("websocket upgrade failed: %v", err)
		return
	}

	client := NewClient(hub, conn, userID)

	go client.WritePump()
	go client.ReadPump()
}

// ReadPump pumps messages from the websocket connection to the hub.
func (c *Client) ReadPump() {
	defer func() {
		// remove client from all joined rooms
		for roomID := range c.rooms {
			c.hub.Unregister(c, roomID)
		}

		close(c.send)
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))

	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, data, err := c.conn.ReadMessage()
		if err != nil {

			if websocket.IsUnexpectedCloseError(
				err,
				websocket.CloseGoingAway,
				websocket.CloseAbnormalClosure,
			) {
				log.Printf("websocket read error: %v", err)
			}

			break
		}

		var msg WSMessage

		if err := json.Unmarshal(data, &msg); err != nil {
			log.Printf("invalid websocket payload: %v", err)
			continue
		}

		switch msg.Type {

		case "join_group":

			if msg.GroupID == uuid.Nil {
				continue
			}

			if !c.rooms[msg.GroupID] {
				c.hub.Register(c, msg.GroupID)
				c.rooms[msg.GroupID] = true
			}

		case "leave_group":

			if msg.GroupID == uuid.Nil {
				continue
			}

			if c.rooms[msg.GroupID] {
				c.hub.Unregister(c, msg.GroupID)
				delete(c.rooms, msg.GroupID)
			}

		case "group_message":

			if msg.GroupID == uuid.Nil {
				continue
			}

			msg.SenderID = c.userID
			msg.CreatedAt = time.Now()

			payload, err := json.Marshal(msg)
			if err != nil {
				log.Printf("marshal error: %v", err)
				continue
			}

			c.hub.BroadcastToRoom(msg.GroupID, payload)

		default:
			log.Printf("unknown websocket message type: %s", msg.Type)
		}
	}
}

// WritePump pumps messages from the hub to the websocket connection.
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {

		case message, ok := <-c.send:

			c.conn.SetWriteDeadline(time.Now().Add(writeWait))

			if !ok {
				_ = c.conn.WriteMessage(
					websocket.CloseMessage,
					[]byte{},
				)
				return
			}

			if err := c.conn.WriteMessage(
				websocket.TextMessage,
				message,
			); err != nil {
				return
			}

		case <-ticker.C:

			c.conn.SetWriteDeadline(time.Now().Add(writeWait))

			if err := c.conn.WriteMessage(
				websocket.PingMessage,
				nil,
			); err != nil {
				return
			}
		}
	}
}
