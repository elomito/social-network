package websocket

import (
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Message struct {
	Type      string      `json:"type"`
	Payload   interface{} `json:"payload,omitempty"`
	TargetID  *uuid.UUID  `json:"target_id,omitempty"`
	SenderID  uuid.UUID   `json:"sender_id"`
	Timestamp int64       `json:"timestamp"`
}

type Client struct {
	Hub    *Hub
	Conn   *websocket.Conn
	Send   chan Message
	UserID uuid.UUID
}

type Hub struct {
	Clients       map[*Client]bool
	Broadcast     chan Message
	RegisterChan  chan *Client
	UnregisterChan chan *Client
	Mu            sync.RWMutex
	PrivateConns  map[uuid.UUID]map[*Client]bool
	GroupConns    map[uuid.UUID]map[*Client]bool
}

func NewHub() *Hub {
	return &Hub{
		Clients:       make(map[*Client]bool),
		Broadcast:     make(chan Message),
		RegisterChan:  make(chan *Client),
		UnregisterChan: make(chan *Client),
		PrivateConns:  make(map[uuid.UUID]map[*Client]bool),
		GroupConns:    make(map[uuid.UUID]map[*Client]bool),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.RegisterChan:
			h.Mu.Lock()
			h.Clients[client] = true
			h.Mu.Unlock()

		case client := <-h.UnregisterChan:
			h.Mu.Lock()
			delete(h.Clients, client)
			if conns, ok := h.PrivateConns[client.UserID]; ok {
				delete(conns, client)
			}
			h.Mu.Unlock()
			close(client.Send)

		case message := <-h.Broadcast:
			h.Mu.RLock()
			switch message.Type {
			case "private":
				if message.TargetID != nil {
					for client := range h.Clients {
						if client.UserID == *message.TargetID || client.UserID == message.SenderID {
							select {
							case client.Send <- message:
							default:
							}
						}
					}
				}
			case "group":
				if message.TargetID != nil {
					if conns, ok := h.GroupConns[*message.TargetID]; ok {
						for client := range conns {
							select {
							case client.Send <- message:
							default:
							}
						}
					}
				}
			}
			h.Mu.RUnlock()
		}
	}
}

func (h *Hub) JoinGroup(client *Client, groupID uuid.UUID) {
	h.Mu.Lock()
	defer h.Mu.Unlock()
	if _, ok := h.GroupConns[groupID]; !ok {
		h.GroupConns[groupID] = make(map[*Client]bool)
	}
	h.GroupConns[groupID][client] = true
}

func (h *Hub) LeaveGroup(client *Client, groupID uuid.UUID) {
	h.Mu.Lock()
	defer h.Mu.Unlock()
	if conns, ok := h.GroupConns[groupID]; ok {
		delete(conns, client)
		if len(conns) == 0 {
			delete(h.GroupConns, groupID)
		}
	}
}

func (h *Hub) Register(client *Client) {
	h.RegisterChan <- client
}

func (h *Hub) Unregister(client *Client) {
	h.UnregisterChan <- client
}