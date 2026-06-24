package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"
	"unicode"

	"backend/internal/models"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"github.com/golang-jwt/jwt/v4"
)

var (
	ErrEmailAlreadyExists = errors.New("email already exists")
	ErrInvalidInput       = errors.New("invalid input")
)

type RegisterUserInput struct {
	Email       string
	Password    string
	FirstName   string
	LastName    string
	DateOfBirth time.Time
	Nickname    string
	AboutMe     string
	IsPublic    bool
}

func ValidatePassword(password string) []string {
	var issues []string
	if len(password) < 8 {
		issues = append(issues, "Password must be at least 8 characters.")
	}

	var hasUpper, hasLower, hasDigit bool
	for _, r := range password {
		switch {
		case unicode.IsUpper(r):
			hasUpper = true
		case unicode.IsLower(r):
			hasLower = true
		case unicode.IsDigit(r):
			hasDigit = true
		}
	}

	if !hasUpper {
		issues = append(issues, "Password must include an uppercase letter.")
	}
	if !hasLower {
		issues = append(issues, "Password must include a lowercase letter.")
	}
	if !hasDigit {
		issues = append(issues, "Password must include a number.")
	}

	return issues
}

func ValidateRegisterInput(input RegisterUserInput) map[string]string {
	fieldErrors := make(map[string]string)

	if _, err := mail.ParseAddress(input.Email); err != nil {
		fieldErrors["email"] = "Enter a valid email address."
	}
	if strings.TrimSpace(input.FirstName) == "" {
		fieldErrors["first_name"] = "First name is required."
	}
	if strings.TrimSpace(input.LastName) == "" {
		fieldErrors["last_name"] = "Last name is required."
	}
	if input.DateOfBirth.IsZero() {
		fieldErrors["date_of_birth"] = "Date of birth is required."
	} else if input.DateOfBirth.After(time.Now().AddDate(-13, 0, 0)) {
		fieldErrors["date_of_birth"] = "You must be at least 13 years old to register."
	}
	if passwordIssues := ValidatePassword(input.Password); len(passwordIssues) > 0 {
		fieldErrors["password"] = strings.Join(passwordIssues, " ")
	}

	return fieldErrors
}

func RegisterUser(ctx context.Context, db *sql.DB, input RegisterUserInput) (models.User, error) {
	user := models.User{}
	input.Email = strings.TrimSpace(strings.ToLower(input.Email))
	input.FirstName = strings.TrimSpace(input.FirstName)
	input.LastName = strings.TrimSpace(input.LastName)
	input.Nickname = strings.TrimSpace(input.Nickname)
	input.AboutMe = strings.TrimSpace(input.AboutMe)

	if fieldErrors := ValidateRegisterInput(input); len(fieldErrors) > 0 {
		return user, fmt.Errorf("%w", ErrInvalidInput)
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return user, err
	}

	now := time.Now().UTC()
	user = models.User{
		ID:           uuid.New(),
		Email:        input.Email,
		PasswordHash: string(hashedPassword),
		FirstName:    input.FirstName,
		LastName:     input.LastName,
		DateOfBirth:  input.DateOfBirth,
		IsPublic:     input.IsPublic,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if input.Nickname != "" {
		user.Nickname = &input.Nickname
	}
	if input.AboutMe != "" {
		user.AboutMe = &input.AboutMe
	}

	_, err = db.ExecContext(
		ctx,
		`INSERT INTO users (
			id, email, password_hash, first_name, last_name, nickname, date_of_birth,
			about_me, is_public, created_at, updated_at, last_active_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		user.ID.String(),
		user.Email,
		user.PasswordHash,
		user.FirstName,
		user.LastName,
		nullableString(user.Nickname),
		user.DateOfBirth.Format(time.RFC3339),
		nullableString(user.AboutMe),
		authBoolToInt(user.IsPublic),
		user.CreatedAt.Format(time.RFC3339),
		user.UpdatedAt.Format(time.RFC3339),
		now.Format(time.RFC3339),
	)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			return models.User{}, ErrEmailAlreadyExists
		}
		return models.User{}, err
	}

	return user, nil
}

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

func GenerateJWT(userID uuid.UUID) (string, error) {
	secret := []byte("your-secret-key") // TODO: move to config
	claims := jwt.MapClaims{
		"sub": userID.String(),
		"exp": time.Now().Add(7 * 24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

func StartSession(db *sql.DB, userID string) (models.Session, error) {
	session := models.Session{
		ID:        uuid.New(),
		ExpiresAt: time.Now().UTC().Add(7 * 24 * time.Hour),
		CreatedAt: time.Now().UTC(),
	}

	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return session, err
	}
	session.UserID = parsedUserID

	_, err = db.Exec(
		`INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`,
		session.ID.String(),
		session.UserID.String(),
		session.ExpiresAt.Format(time.RFC3339),
		session.CreatedAt.Format(time.RFC3339),
	)
	if err != nil {
		return session, err
	}

	return session, nil
}
}

func GetSessionFromDB(db *sql.DB, sessionID string) (models.Session, error) {
	var session models.Session
	var id, userID, expiresAt, createdAt string

	err := db.QueryRow(
		`SELECT id, user_id, expires_at, created_at FROM sessions WHERE id = ?`,
		sessionID,
	).Scan(&id, &userID, &expiresAt, &createdAt)
	if err != nil {
		return session, err
	}

	session.ID, err = uuid.Parse(id)
	if err != nil {
		return session, err
	}
	session.UserID, err = uuid.Parse(userID)
	if err != nil {
		return session, err
	}
	session.ExpiresAt, err = time.Parse(time.RFC3339, expiresAt)
	if err != nil {
		return session, err
	}
	session.CreatedAt, err = time.Parse(time.RFC3339, createdAt)
	if err != nil {
		return session, err
	}

	return session, nil
}

func KillSession(db *sql.DB, sessionID string) error {
	_, err := db.Exec(`DELETE FROM sessions WHERE id = ?`, sessionID)
	return err
}

func nullableString(value *string) sql.NullString {
	if value == nil || strings.TrimSpace(*value) == "" {
		return sql.NullString{}
	}

	return sql.NullString{String: *value, Valid: true}
}

func authBoolToInt(value bool) int {
	if value {
		return 1
	}

	return 0
}
