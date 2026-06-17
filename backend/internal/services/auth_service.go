package services
import (
	"database/sql"
	"errors"
	"time"

	"backend/pkg/models"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// AuthenticateUser verifies email and password against the database
func AuthenticateUser(db *sql.DB, email, password string) (string, error) {
	var userID, passwordHash string
	query := `SELECT id, password_hash FROM users WHERE email = ? COLLATE NOCASE`

	err := db.QueryRow(query, email).Scan(&userID, &passwordHash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", errors.New("invalid email or password")
		}
		return "", err
	}

	err = bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password))
	if err != nil {
		return "", errors.New("invalid email or password")
	}

	return userID, nil
}
// StartSession creates a session entry in the database using the team's struct
func StartSession(db *sql.DB, userIDStr string) (*models.Session, error) {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}

	sessionID, err := uuid.NewRandom()
	if err != nil {
		return nil, err
	}

	session := &models.Session{
		ID:        sessionID,
		UserID:    userID,
		ExpiresAt: time.Now().Add(24 * time.Hour),
		CreatedAt: time.Now(),
	}

	query := `INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`
	_, err = db.Exec(query, session.ID.String(), session.UserID.String(), session.ExpiresAt, session.CreatedAt)
	if err != nil {
		return nil, err
	}

	return session, nil
}
// GetSessionFromDB retrieves a session from the DB for validation
func GetSessionFromDB(db *sql.DB, idStr string) (*models.Session, error) {
	query := `SELECT id, user_id, expires_at, created_at FROM sessions WHERE id = ?`
	row := db.QueryRow(query, idStr)

	var s models.Session
	var id, userID string
	err := row.Scan(&id, &userID, &s.ExpiresAt, &s.CreatedAt)
	if err != nil {
		return nil, err
	}

	s.ID, err = uuid.Parse(id)
	if err != nil {
		return nil, err
	}
	s.UserID, err = uuid.Parse(userID)
	if err != nil {
		return nil, err
	}

	return &s, nil
}
