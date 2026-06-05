package main

import (
	"log"
	"net/http"

	"backend/internal/handlers"
	"backend/internal/repository"
	"backend/internal/services"
	"backend/pkg/db"
)

func main() {
	// -----------------------------
	// Application configuration
	// -----------------------------

	dbConfig := db.DefaultConfig("data/app.db")
	serverAddr := ":8080"

	// -----------------------------
	// Initialize database
	// -----------------------------

	database, err := db.NewSQLite(dbConfig)
	if err != nil {
		log.Fatalf("failed to initialize database: %v", err)
	}
	defer database.Close()

	log.Println("database connected")

	// -----------------------------
	// Initialize repositories
	// -----------------------------

	eventRepo := repository.NewEventRepository(database.Conn())
	eventResponseRepo := repository.NewEventResponseRepository(database.Conn())

	// -----------------------------
	// Initialize services
	// -----------------------------

	eventService := services.NewEventService(eventRepo, eventResponseRepo)

	// -----------------------------
	// Initialize handlers
	// -----------------------------

	eventHandler := handlers.NewEventHandler(eventService)

	// -----------------------------
	// Set up routes
	// -----------------------------

	mux := http.NewServeMux()

	// Event routes
	mux.HandleFunc("POST /events", eventHandler.CreateEvent)
	mux.HandleFunc("GET /events/{id}", eventHandler.GetEvent)
	mux.HandleFunc("GET /groups/{id}/events", eventHandler.ListGroupEvents)
	mux.HandleFunc("PUT /events/{id}", eventHandler.UpdateEvent)
	mux.HandleFunc("DELETE /events/{id}", eventHandler.DeleteEvent)
	mux.HandleFunc("POST /events/{id}/responses", eventHandler.CreateEventResponse)
	mux.HandleFunc("GET /events/{id}/responses", eventHandler.GetEventResponses)
	mux.HandleFunc("DELETE /events/{id}/responses", eventHandler.DeleteEventResponse)

	// -----------------------------
	// Start server
	// -----------------------------

	log.Printf("server starting on %s", serverAddr)
	if err := http.ListenAndServe(serverAddr, mux); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}