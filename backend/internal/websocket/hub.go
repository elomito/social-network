package websocket

import (
	"log"
	"sync"
)

// Subscription associates a client with a room
type Subscription struct {
	Client *Client
	Room   string
}

// Broadcast holds a message destined for a room
type Broadcast struct {
	Room    string
	Message []byte
}

// Hub maintains active rooms and broadcasts messages to room members.
type Hub struct {
	mu         sync.RWMutex
	rooms      map[string]map[*Client]bool
	register   chan *Subscription
	unregister chan *Subscription
	broadcast  chan *Broadcast
}

// NewHub creates and returns a Hub instance
func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[string]map[*Client]bool),
		register:   make(chan *Subscription),
		unregister: make(chan *Subscription),
		broadcast:  make(chan *Broadcast),
	}
}

// Run starts the hub loop. Call it as a goroutine.
func (h *Hub) Run() {
	for {
		select {
		case s := <-h.register:
			h.mu.Lock()
			if _, ok := h.rooms[s.Room]; !ok {
				h.rooms[s.Room] = make(map[*Client]bool)
			}
			h.rooms[s.Room][s.Client] = true
			h.mu.Unlock()
		case s := <-h.unregister:
			h.mu.Lock()
			if conns, ok := h.rooms[s.Room]; ok {
				if _, ok2 := conns[s.Client]; ok2 {
					delete(conns, s.Client)
					if len(conns) == 0 {
						delete(h.rooms, s.Room)
					}
				}
			}
			h.mu.Unlock()
		case b := <-h.broadcast:
			h.mu.RLock()
			conns, ok := h.rooms[b.Room]
			h.mu.RUnlock()
			if !ok {
				log.Printf("no clients in room %s", b.Room)
				continue
			}
			for c := range conns {
				select {
				case c.send <- b.Message:
				default:
					// slow client; unregister
					go func(c *Client, room string) {
						h.unregister <- &Subscription{Client: c, Room: room}
					}(c, b.Room)
				}
			}
		}
	}
}

// Register subscribes a client to a room
func (h *Hub) Register(c *Client, room string) {
	h.register <- &Subscription{Client: c, Room: room}
}

// Unregister removes a client from a room
func (h *Hub) Unregister(c *Client, room string) {
	h.unregister <- &Subscription{Client: c, Room: room}
}

// BroadcastToRoom sends a raw message to all clients in a room
func (h *Hub) BroadcastToRoom(room string, msg []byte) {
	h.broadcast <- &Broadcast{Room: room, Message: msg}
}
