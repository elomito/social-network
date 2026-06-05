package main

import (
	"database/sql"
	"log"
	"net/http"

	// Replace "social-network" with your exact module name from your go.mod file
	"social-network/pkg/db"

	// The driver that allows Go to interact with SQLite files
	_ "github.com/mattn/go-sqlite3"
)

func main() {
	log.Println("--- Launching Social Network Core Application ---")

	// 1. Open your project's SQLite database file
	sqliteConn, err := sql.Open("sqlite3", "./social_network.db")
	if err != nil {
		log.Fatalf("❌ BOOT ERROR: Could not open database connection: %v", err)
	}
	defer sqliteConn.Close()