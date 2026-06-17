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
