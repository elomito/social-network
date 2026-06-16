package db

import (
<<<<<<< HEAD
	"context"
=======
>>>>>>> origin/Development
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

var legacySchemaColumns = []schemaColumn{
	{table: "images", name: "user_id", definition: "user_id INTEGER NOT NULL"},
	{table: "images", name: "image_url", definition: "image_url TEXT NOT NULL"},
	{table: "images", name: "created_at", definition: "created_at DATETIME DEFAULT CURRENT_TIMESTAMP"},

	{table: "sessions", name: "user_id", definition: "user_id TEXT NOT NULL"},
	{table: "sessions", name: "expires_at", definition: "expires_at TEXT NOT NULL"},
	{table: "sessions", name: "created_at", definition: "created_at TEXT NOT NULL DEFAULT (datetime('now'))"},

	{table: "follows", name: "follower_id", definition: "follower_id TEXT NOT NULL"},
	{table: "follows", name: "following_id", definition: "following_id TEXT NOT NULL"},
	{table: "follows", name: "created_at", definition: "created_at TEXT NOT NULL DEFAULT (datetime('now'))"},

	{table: "follow_requests", name: "follower_id", definition: "follower_id TEXT NOT NULL"},
	{table: "follow_requests", name: "following_id", definition: "following_id TEXT NOT NULL"},
	{table: "follow_requests", name: "status", definition: "status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined'))"},
	{table: "follow_requests", name: "created_at", definition: "created_at TEXT NOT NULL DEFAULT (datetime('now'))"},
	{table: "follow_requests", name: "updated_at", definition: "updated_at TEXT NOT NULL DEFAULT (datetime('now'))"},

	{table: "posts", name: "author_id", definition: "author_id TEXT NOT NULL"},
	{table: "posts", name: "content", definition: "content TEXT NOT NULL"},
	{table: "posts", name: "image_path", definition: "image_path TEXT"},
	{table: "posts", name: "privacy_setting", definition: "privacy_setting TEXT NOT NULL DEFAULT 'public' CHECK (privacy_setting IN ('public','almost_private','private'))"},
	{table: "posts", name: "created_at", definition: "created_at DATETIME DEFAULT CURRENT_TIMESTAMP"},
	{table: "posts", name: "updated_at", definition: "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP"},

	{table: "comments", name: "post_id", definition: "post_id TEXT NOT NULL"},
	{table: "comments", name: "author_id", definition: "author_id TEXT NOT NULL"},
	{table: "comments", name: "content", definition: "content TEXT NOT NULL"},
	{table: "comments", name: "image_path", definition: "image_path TEXT"},
	{table: "comments", name: "created_at", definition: "created_at DATETIME DEFAULT CURRENT_TIMESTAMP"},
	{table: "comments", name: "updated_at", definition: "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP"},

	{table: "groups", name: "title", definition: "title TEXT NOT NULL"},
	{table: "groups", name: "description", definition: "description TEXT NOT NULL"},
	{table: "groups", name: "creator_id", definition: "creator_id TEXT NOT NULL"},
	{table: "groups", name: "cover_image_id", definition: "cover_image_id TEXT"},
	{table: "groups", name: "created_at", definition: "created_at TEXT NOT NULL DEFAULT (datetime('now'))"},
	{table: "groups", name: "updated_at", definition: "updated_at TEXT NOT NULL DEFAULT (datetime('now'))"},
	{table: "groups", name: "is_active", definition: "is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))"},
	{table: "groups", name: "deleted_at", definition: "deleted_at TEXT"},

	{table: "group_members", name: "group_id", definition: "group_id TEXT NOT NULL"},
	{table: "group_members", name: "user_id", definition: "user_id TEXT NOT NULL"},
	{table: "group_members", name: "role", definition: "role TEXT NOT NULL DEFAULT 'member'"},
	{table: "group_members", name: "joined_at", definition: "joined_at TEXT NOT NULL DEFAULT (datetime('now'))"},

	{table: "group_invitations", name: "group_id", definition: "group_id TEXT NOT NULL"},
	{table: "group_invitations", name: "inviter_id", definition: "inviter_id TEXT NOT NULL"},
	{table: "group_invitations", name: "invitee_id", definition: "invitee_id TEXT NOT NULL"},
	{table: "group_invitations", name: "status", definition: "status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined'))"},
	{table: "group_invitations", name: "created_at", definition: "created_at TEXT NOT NULL DEFAULT (datetime('now'))"},
	{table: "group_invitations", name: "updated_at", definition: "updated_at TEXT NOT NULL DEFAULT (datetime('now'))"},

	{table: "events", name: "group_id", definition: "group_id TEXT NOT NULL"},
	{table: "events", name: "creator_id", definition: "creator_id TEXT NOT NULL"},
	{table: "events", name: "title", definition: "title TEXT NOT NULL"},
	{table: "events", name: "description", definition: "description TEXT NOT NULL"},
	{table: "events", name: "event_time", definition: "event_time DATETIME NOT NULL"},
	{table: "events", name: "created_at", definition: "created_at DATETIME DEFAULT CURRENT_TIMESTAMP"},

	{table: "event_responses", name: "event_id", definition: "event_id TEXT NOT NULL"},
	{table: "event_responses", name: "user_id", definition: "user_id TEXT NOT NULL"},
	{table: "event_responses", name: "status", definition: "status TEXT NOT NULL DEFAULT 'not_going' CHECK (status IN ('going','not_going'))"},
	{table: "event_responses", name: "responded_at", definition: "responded_at DATETIME DEFAULT CURRENT_TIMESTAMP"},

	{table: "private_messages", name: "sender_id", definition: "sender_id TEXT NOT NULL"},
	{table: "private_messages", name: "recipient_id", definition: "recipient_id TEXT NOT NULL"},
	{table: "private_messages", name: "content", definition: "content TEXT NOT NULL"},
	{table: "private_messages", name: "image_path", definition: "image_path TEXT"},
	{table: "private_messages", name: "is_read", definition: "is_read BOOLEAN DEFAULT FALSE"},
	{table: "private_messages", name: "created_at", definition: "created_at DATETIME DEFAULT CURRENT_TIMESTAMP"},

	{table: "group_messages", name: "group_id", definition: "group_id TEXT NOT NULL"},
	{table: "group_messages", name: "sender_id", definition: "sender_id TEXT NOT NULL"},
	{table: "group_messages", name: "content", definition: "content TEXT NOT NULL"},
	{table: "group_messages", name: "image_path", definition: "image_path TEXT"},
	{table: "group_messages", name: "created_at", definition: "created_at DATETIME DEFAULT CURRENT_TIMESTAMP"},

	{table: "notifications", name: "recipient_id", definition: "recipient_id TEXT NOT NULL"},
	{table: "notifications", name: "initiator_id", definition: "initiator_id TEXT"},
	{table: "notifications", name: "type", definition: "type TEXT NOT NULL"},
	{table: "notifications", name: "reference_id", definition: "reference_id TEXT"},
	{table: "notifications", name: "message", definition: "message TEXT"},
	{table: "notifications", name: "is_read", definition: "is_read BOOLEAN DEFAULT FALSE"},
	{table: "notifications", name: "created_at", definition: "created_at DATETIME DEFAULT CURRENT_TIMESTAMP"},
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

func ensureLegacyColumns(db *sql.DB, columns []schemaColumn) error {
	for _, column := range columns {
		tableName := column.table
		exists, err := tableExists(db, tableName)
		if err != nil {
			return fmt.Errorf("failed to check %s table existence: %w", tableName, err)
		}
		if !exists {
			continue
		}

		exists, err = columnExists(db, tableName, column.name)
		if err != nil {
			return fmt.Errorf("failed to check %s.%s column: %w", tableName, column.name, err)
		}
		if exists {
			continue
		}

		log.Printf("🔧 [MIGRATION] Ensuring legacy column %s.%s exists before applying migration...", tableName, column.name)
		if _, err := db.Exec("ALTER TABLE " + tableName + " ADD COLUMN " + column.definition); err != nil {
			return fmt.Errorf("failed to add legacy column %s.%s: %w", tableName, column.name, err)
		}
	}

	return nil
}

func ensureLegacyUsersColumns(db *sql.DB) error {
	return ensureLegacyColumns(db, legacyUsersColumns)
}

func ensureLegacySchemaColumns(db *sql.DB) error {
	return ensureLegacyColumns(db, legacySchemaColumns)
}

// runs in terminal to know it has been connection has been enabled succsesfuly
func RunMigrations(db *sql.DB) error {
	log.Println("🔄 [MIGRATION] Starting automatic schema checks...")

	if err := ensureLegacyUsersColumns(db); err != nil {
		return fmt.Errorf("failed to ensure legacy users schema: %w", err)
	}
	if err := ensureLegacySchemaColumns(db); err != nil {
		return fmt.Errorf("failed to ensure legacy schema columns: %w", err)
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
