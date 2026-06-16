package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"

	"backend/internal/websocket"
	"backend/pkg/db"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
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
		log.Fatalf("BOOT ERROR: Could not open database connection: %v", err)
	}
	defer sqliteConn.Close()

	// 4. Calls your automated script to read SQL files and build tables BEFORE the server turns on
	if err := db.RunMigrations(sqliteConn); err != nil {
		log.Fatalf("BOOT ERROR: Database migration pipeline failed: %v", err)
	}

	log.Println("System online! Database verification completely successful.")

	serverAddr := ":8080"

	mux := http.NewServeMux()
	hub := websocket.NewHub()
	go hub.Run()
	mux.HandleFunc("/ws", handleWebSocket(hub))

	fmt.Printf("Starting server on http://localhost%s\n", serverAddr)
	fmt.Printf("WebSocket endpoint: ws://localhost%s/ws\n", serverAddr)
	if err := http.ListenAndServe(serverAddr, mux); err != nil {
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
