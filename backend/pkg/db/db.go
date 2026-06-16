package db

import (
	"context"
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
	log.Println("[MIGRATION] Starting automatic schema checks...")

	// tels migaratin engine to accept our sqlite we  are using
	driver, err := sqlite3.WithInstance(db, &sqlite3.Config{})
	if err != nil {
		return fmt.Errorf("failed to create sqlite3 migration driver: %w", err)
	}

	// 2. string a file where a db can be applied changes and done awy with changes
	migrationFolder := "file://pkg/db/migrations/sqlite"

	// 3. started our migrator engine
	migrator, err := migrate.NewWithDatabaseInstance(migrationFolder, "sqlite3", driver)
	if err != nil {
		return fmt.Errorf("failed to initialize migrator engine: %w", err)
	}

	// 4. migration up is called scans all tables and sees what needs to be updated
	log.Println("[MIGRATION] Applying structural table updates...")
	if err := migrator.Up(); err != nil {
		// It can be hundled safely because no changes to apply
		if errors.Is(err, migrate.ErrNoChange) {
			log.Println("[MIGRATION] Database is already completely up to date! No changes needed.")
			return nil
		}

		return fmt.Errorf("migration execution failed: %w", err)
	}

	log.Println("[MIGRATION] Success! All tables built and verified sequentially.")
	return nil
}