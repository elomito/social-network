package main

import (
	"database/sql"
	"log"

	// 1. Imports our own database package so main.go can use RunMigrations
	"backend/pkg/db"

	// 2. Registers the SQLite3 driver behind the scenes so sql.Open knows how to work
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
}
