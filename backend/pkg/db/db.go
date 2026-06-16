package db

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"strings"

	// migration tool downloaded
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

type schemaColumn struct {
	table      string
	name       string
	definition string
}

var legacyUsersColumns = []schemaColumn{
	{table: "users", name: "nickname", definition: "nickname TEXT"},
	{table: "users", name: "avatar_image_id", definition: "avatar_image_id TEXT"},
	{table: "users", name: "about_me", definition: "about_me TEXT"},
	{table: "users", name: "is_public", definition: "is_public INTEGER NOT NULL DEFAULT 1 CHECK (is_public IN (0,1))"},
	{table: "users", name: "created_at", definition: "created_at TEXT NOT NULL DEFAULT (datetime('now'))"},
	{table: "users", name: "updated_at", definition: "updated_at TEXT NOT NULL DEFAULT (datetime('now'))"},
	{table: "users", name: "last_active_at", definition: "last_active_at TEXT"},
	{table: "users", name: "deleted_at", definition: "deleted_at TEXT"},
}

func tableExists(db *sql.DB, tableName string) (bool, error) {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?", tableName).Scan(&count)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func columnExists(db *sql.DB, tableName, columnName string) (bool, error) {
	rows, err := db.Query("PRAGMA table_info(" + tableName + ")")
	if err != nil {
		return false, err
	}
	defer rows.Close()

	for rows.Next() {
		var cid int
		var name string
		var columnType string
		var notNull int
		var defaultValue sql.NullString
		var primaryKey int

		if err := rows.Scan(&cid, &name, &columnType, &notNull, &defaultValue, &primaryKey); err != nil {
			return false, err
		}

		if strings.EqualFold(name, columnName) {
			return true, nil
		}
	}

	return false, rows.Err()
}

func ensureLegacyUsersColumns(db *sql.DB) error {
	exists, err := tableExists(db, "users")
	if err != nil {
		return fmt.Errorf("failed to check users table existence: %w", err)
	}
	if !exists {
		return nil
	}

	for _, column := range legacyUsersColumns {
		exists, err := columnExists(db, column.table, column.name)
		if err != nil {
			return fmt.Errorf("failed to check %s.%s column: %w", column.table, column.name, err)
		}
		if exists {
			continue
		}

		log.Printf("🔧 [MIGRATION] Ensuring legacy column %s.%s exists before applying migration...", column.table, column.name)
		if _, err := db.Exec("ALTER TABLE " + column.table + " ADD COLUMN " + column.definition); err != nil {
			return fmt.Errorf("failed to add legacy column %s.%s: %w", column.table, column.name, err)
		}
	}

	return nil
}

// runs in terminal to know it has been connection has been enabled succsesfuly
func RunMigrations(db *sql.DB) error {
	log.Println("🔄 [MIGRATION] Starting automatic schema checks...")

	if err := ensureLegacyUsersColumns(db); err != nil {
		return fmt.Errorf("failed to ensure legacy users schema: %w", err)
	}

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
