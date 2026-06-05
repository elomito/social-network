package db

import (
	"context"
	"database/sql"
	"time"
)

// Config defines database-level configuration.
// This keeps tuning explicit and testable.
type Config struct {
	// FilePath is the path to the SQLite .db file
	FilePath string

	// MaxOpenConns limits concurrent SQLite connections
	// Critical for avoiding "database is locked" errors
	// SQLite handles concurrent reads well, but only one writer at a time
	MaxOpenConns int

	// MaxIdleConns controls how many idle connections
	// are kept ready for reuse
	MaxIdleConns int

	// ConnMaxLifetime ensures connections are recycled
	// to prevent stale locks and file handles
	ConnMaxLifetime time.Duration
}

// DefaultConfig returns sensible defaults for SQLite.
// These values work well for most applications.
func DefaultConfig(filePath string) Config {
	return Config{
		FilePath:        filePath,
		MaxOpenConns:    10, // Good balance for SQLite
		MaxIdleConns:    5,  // Keep some connections ready
		ConnMaxLifetime: time.Hour,
	}
}

// HealthChecker defines a minimal contract
// used by health probes, readiness checks, etc.
type HealthChecker interface {
	HealthCheck(ctx context.Context) error
}

// DB wraps sql.DB to expose only what the app needs.
// This avoids passing raw *sql.DB everywhere.
type DB struct {
	conn *sql.DB
}

// Conn returns the underlying sql.DB when needed
func (d *DB) Conn() *sql.DB {
	return d.conn
}

// HealthCheck verifies the database is reachable
// and able to respond within the provided context.
func (d *DB) HealthCheck(ctx context.Context) error {
	return d.conn.PingContext(ctx)
}

// Close cleanly shuts down all connections.
// Always call this when your application shuts down
// to release file handles and prevent "database is locked" errors.
func (d *DB) Close() error {
	return d.conn.Close()
}

// NewDB creates a DB wrapper around an existing sql.DB.
// This is useful for testing or when you need more control.
func NewDB(conn *sql.DB) *DB {
	return &DB{conn: conn}
}

// WithContext runs a function with a context for timeout control.
// This is a convenience method for operations that need timeouts.
func (d *DB) WithContext(ctx context.Context, fn func(ctx context.Context) error) error {
	return fn(ctx)
}

// Transaction runs a function within a database transaction.
// If the function returns an error, the transaction is rolled back.
// If it succeeds, the transaction is committed.
//
// Example usage:
//
//	err := database.Transaction(ctx, func(ctx context.Context, tx *sql.Tx) error {
//	    _, err := tx.ExecContext(ctx, "INSERT INTO users ...")
//	    return err
//	})
func (d *DB) Transaction(ctx context.Context, fn func(ctx context.Context, tx *sql.Tx) error) error {
	tx, err := d.conn.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	if err := fn(ctx, tx); err != nil {
		_ = tx.Rollback()
		return err
	}

	return tx.Commit()
}