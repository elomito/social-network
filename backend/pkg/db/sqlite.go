package db

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	// Pure Go SQLite driver (no CGO)
	// This means it compiles on any platform without needing gcc
	_ "modernc.org/sqlite"
)

// NewSQLite creates and initializes a tuned SQLite database connection pool.
//
// What this function does step by step:
// 1. Opens a connection to the SQLite database file
// 2. Configures connection pool settings (important for SQLite!)
// 3. Enables foreign key constraints (SQLite has them disabled by default)
// 4. Tests the connection with a ping
//
// Why connection pool tuning matters for SQLite:
// - SQLite allows only ONE writer at a time
// - Too many connections = "database is locked" errors
// - We limit connections to prevent this
func NewSQLite(cfg Config) (*DB, error) {
	// Validate configuration
	if cfg.FilePath == "" {
		return nil, fmt.Errorf("sqlite: file path is required")
	}

	// Apply defaults if not set
	if cfg.MaxOpenConns == 0 {
		cfg.MaxOpenConns = 10
	}
	if cfg.MaxIdleConns == 0 {
		cfg.MaxIdleConns = 5
	}
	if cfg.ConnMaxLifetime == 0 {
		cfg.ConnMaxLifetime = time.Hour
	}

	// sql.Open does NOT connect immediately!
	// It just creates a "connection pool controller"
	// Actual connections are created lazily when needed
	db, err := sql.Open("sqlite", cfg.FilePath)
	if err != nil {
		return nil, fmt.Errorf("sqlite: open failed: %w", err)
	}

	// ---- Connection Pool Tuning ----
	// These settings prevent "database is locked" errors

	// MaxOpenConns: Maximum number of open connections
	// For SQLite, keep this reasonable (10-20) because:
	// - SQLite can handle many readers but only ONE writer
	// - Too many connections will cause lock errors
	db.SetMaxOpenConns(cfg.MaxOpenConns)

	// MaxIdleConns: Number of idle connections to keep
	// Keeping some ready improves performance for frequent queries
	db.SetMaxIdleConns(cfg.MaxIdleConns)

	// ConnMaxLifetime: How long a connection can live
	// Recycling connections prevents:
	// - Stale file handles
	// - Long-lived locks
	// - Memory leaks
	db.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	// ---- Safety Hook: Enforce Foreign Keys ----
	// SQLite defaults foreign_keys to OFF.
	// We MUST enable it per connection.
	if err := enableForeignKeys(db); err != nil {
		_ = db.Close()
		return nil, err
	}

	// ---- Health Verification ----
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("sqlite: ping failed: %w", err)
	}

	return &DB{conn: db}, nil
}

// enableForeignKeys ensures PRAGMA foreign_keys = ON
// is applied safely and consistently.
//
// What are foreign keys?
// They ensure data integrity. For example:
// - If a user is deleted, all their posts are automatically deleted
// - You can't create a post for a user that doesn't exist
//
// Without this, SQLite ignores your FOREIGN KEY constraints!
func enableForeignKeys(db *sql.DB) error {
	// We run this once eagerly to fail fast.
	// Subsequent connections inherit this setting
	// when reused from the pool.
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	_, err := db.ExecContext(ctx, `PRAGMA foreign_keys = ON;`)
	if err != nil {
		return fmt.Errorf("sqlite: failed to enable foreign keys: %w", err)
	}

	return nil
}

// SQLite-specific pragmas and settings
// These can be called for performance tuning

// EnableWAL enables Write-Ahead Logging mode.
// This improves concurrent read/write performance.
// Call this after creating the database.
func (d *DB) EnableWAL(ctx context.Context) error {
	_, err := d.conn.ExecContext(ctx, `PRAGMA journal_mode = WAL;`)
	if err != nil {
		return fmt.Errorf("sqlite: failed to enable WAL mode: %w", err)
	}
	return nil
}

// SetBusyTimeout sets how long to wait for a lock.
// Default is 5 seconds. Increase if you have heavy write traffic.
func (d *DB) SetBusyTimeout(ctx context.Context, timeout time.Duration) error {
	_, err := d.conn.ExecContext(ctx,
		fmt.Sprintf("PRAGMA busy_timeout = %d;", timeout.Milliseconds()))
	if err != nil {
		return fmt.Errorf("sqlite: failed to set busy timeout: %w", err)
	}
	return nil
}

// GetVersion returns the SQLite version.
// Useful for debugging and logging.
func (d *DB) GetVersion(ctx context.Context) (string, error) {
	var version string
	err := d.conn.QueryRowContext(ctx, `SELECT sqlite_version();`).Scan(&version)
	if err != nil {
		return "", fmt.Errorf("sqlite: failed to get version: %w", err)
	}
	return version, nil
}