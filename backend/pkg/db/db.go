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

	// 2. Point to the exact directory where your raw .sql files live
	migrationFolder := "file://pkg/db/migrations/sqlite"

	// 3. Initialize the migration engine wrapper
	migrator, err := migrate.NewWithDatabaseInstance(migrationFolder, "sqlite3", driver)
	if err != nil {
		return fmt.Errorf("failed to initialize migrator engine: %w", err)
	}

	// 4. Execute all pending upgrade schemas (.up.sql) sequentially
	log.Println("🚀 [MIGRATION] Applying structural table updates...")
	if err := migrator.Up(); err != nil {
		// If there are no new changes to apply, it's NOT an error. We handle it safely.
		if errors.Is(err, migrate.ErrNoChange) {
			log.Println("✅ [MIGRATION] Database is already completely up to date! No changes needed.")
			return nil
		}