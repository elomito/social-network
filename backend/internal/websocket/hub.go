package websocket

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/google/uuid"
)

// WebSocketMessage represents a message to be published
type WebSocketMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

// WebSocketHub defines the interface for publishing websocket messages
type WebSocketHub interface {
	Publish(msg WebSocketMessage)
}

// Subscription associates a client with a room.
type Subscription struct {
	Client *Client
	Room   uuid.UUID
}

// Broadcast represents a message destined for a room.
type Broadcast struct {
	Room    uuid.UUID
	Message []byte
}

// Hub manages websocket rooms and broadcasts.
type Hub struct {
	mu sync.RWMutex

	rooms map[uuid.UUID]map[*Client]bool

	register   chan *Subscription
	unregister chan *Subscription
	broadcast  chan *Broadcast
}

func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[uuid.UUID]map[*Client]bool),
		register:   make(chan *Subscription),
		unregister: make(chan *Subscription),
		broadcast:  make(chan *Broadcast),
	}
}

func (h *Hub) Run() {
	for {
		select {

		case s := <-h.register:

			h.mu.Lock()

			if _, exists := h.rooms[s.Room]; !exists {
				h.rooms[s.Room] = make(map[*Client]bool)
			}

			h.rooms[s.Room][s.Client] = true

			h.mu.Unlock()

		case s := <-h.unregister:

			h.mu.Lock()

			if clients, exists := h.rooms[s.Room]; exists {

				delete(clients, s.Client)

				if len(clients) == 0 {
					delete(h.rooms, s.Room)
				}
			}

			h.mu.Unlock()

		case b := <-h.broadcast:

			h.mu.RLock()
			clients, exists := h.rooms[b.Room]
			h.mu.RUnlock()

			if !exists {
				log.Printf("room %s has no clients", b.Room)
				continue
			}

			for client := range clients {
				select {

				case client.send <- b.Message:

				default:
					// slow client
					go func(c *Client, room uuid.UUID) {
						h.Unregister(c, room)
					}(client, b.Room)
				}
			}
		}
	}
}

func (h *Hub) Register(c *Client, room uuid.UUID) {
	h.register <- &Subscription{
		Client: c,
		Room:   room,
	}
}

func (h *Hub) Unregister(c *Client, room uuid.UUID) {
	h.unregister <- &Subscription{
		Client: c,
		Room:   room,
	}
}

func (h *Hub) BroadcastToRoom(room uuid.UUID, msg []byte) {
	h.broadcast <- &Broadcast{
		Room:    room,
		Message: msg,
	}
}

// Publish broadcasts a message to all connected clients
func (h *Hub) Publish(msg WebSocketMessage) {
	payload, err := json.Marshal(msg)
	if err != nil {
		log.Printf("websocket marshal error: %v", err)
		return
	}

	h.mu.RLock()
	rooms := make([]uuid.UUID, 0, len(h.rooms))
	for roomID := range h.rooms {
		rooms = append(rooms, roomID)
	}
	h.mu.RUnlock()

	for _, roomID := range rooms {
		h.BroadcastToRoom(roomID, payload)
	}
}
