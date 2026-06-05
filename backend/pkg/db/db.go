ackage db

import (
	"database/sql"
	"errors"
	"fmt"
	"log"

	// migration tool downloaded
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// runs in terminal to know it has been connection has been enabled succsesfuly
func RunMigrations(db *sql.DB) error {
	log.Println("🔄 [MIGRATION] Starting automatic schema checks...")

	// tels migaratin engine to accept our sqlite we  are using
	driver, err := sqlite3.WithInstance(db, &sqlite3.Config{})
	if err != nil {
		return fmt.Errorf("failed to create sqlite3 migration driver: %w", err)
	}