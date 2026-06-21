package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"

	"backend/internal/handlers"
	"backend/internal/middleware"
	"backend/internal/repository"
	"backend/internal/services"
	"backend/internal/websocket"
	"backend/pkg/db"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

func main() {
	log.Println("--- Launching Social Network Core Application ---")

	// 3. Opens or creates our local database file.
	sqliteConn, err := sql.Open("sqlite3", "./social_network.db")
	if err != nil {
		log.Fatalf("BOOT ERROR: Could not open database connection: %v", err)
	}
	defer sqliteConn.Close()

	// 4. Calls your automated script to read SQL files and build tables BEFORE the server turns on
	if err := db.RunMigrations(sqliteConn); err != nil {
		log.Fatalf("BOOT ERROR: Database migration pipeline failed: %v", err)
	}

	log.Println("System online! Database verification completely successful.")

	serverAddr := ":8080"

	// Initialize repositories
	eventRepo := repository.NewEventRepository(sqliteConn)
	eventResponseRepo := repository.NewEventResponseRepository(sqliteConn)

	// Initialize user service
	userService := services.NewUserService(sqliteConn)

	// Initialize services
	eventService := services.NewEventService(eventRepo, eventResponseRepo)

	// Initialize handlers
	eventHandler := handlers.NewEventHandler(eventService)

	mux := http.NewServeMux()
	hub := websocket.NewHub()
	go hub.Run()
	mux.HandleFunc("/ws", handleWebSocket(hub))
	mux.HandleFunc("/api/auth/register", handlers.RegisterHandler(sqliteConn))
	mux.HandleFunc("/api/auth/login", handlers.LoginHandler(sqliteConn))
	mux.HandleFunc("/api/auth/logout", handlers.LogoutHandler(sqliteConn))
	mux.HandleFunc("/api/auth/me", handlers.MeHandler(sqliteConn))

	// Public user profile
	mux.HandleFunc("/api/users", handlers.ProfileHandler(userService))

	// Event routes
	mux.Handle("/api/events", middleware.Auth(sqliteConn)(http.HandlerFunc(eventHandler.CreateEvent)))
	mux.Handle("/api/events/", middleware.Auth(sqliteConn)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			eventHandler.GetEvent(w, r)
		case http.MethodPut:
			eventHandler.UpdateEvent(w, r)
		case http.MethodDelete:
			eventHandler.DeleteEvent(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})))
	mux.Handle("/api/groups/{id}/events", middleware.Auth(sqliteConn)(http.HandlerFunc(eventHandler.ListGroupEvents)))
	mux.Handle("/api/events/{id}/responses", middleware.Auth(sqliteConn)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			eventHandler.GetEventResponses(w, r)
		case http.MethodPost:
			eventHandler.CreateEventResponse(w, r)
		case http.MethodDelete:
			eventHandler.DeleteEventResponse(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})))

	mux.Handle("/", http.FileServer(http.Dir("../frontend/public")))

	fmt.Printf("Starting server on http://localhost%s\n", serverAddr)
	fmt.Printf("WebSocket endpoint: ws://localhost%s/ws\n", serverAddr)
	if err := http.ListenAndServe(serverAddr, middleware.DefaultCORS(mux)); err != nil {
		log.Fatal("Error: Failed to initialise server.")
	}
}

func handleWebSocket(hub *websocket.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := uuid.Nil
		if rawUserID := r.URL.Query().Get("user_id"); rawUserID != "" {
			parsedUserID, err := uuid.Parse(rawUserID)
			if err != nil {
				http.Error(w, "invalid user_id query parameter", http.StatusBadRequest)
				return
			}

			userID = parsedUserID
		}

		websocket.ServeWS(hub, w, r, userID)
	}
}
