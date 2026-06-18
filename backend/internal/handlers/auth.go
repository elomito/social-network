package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"backend/internal/services" // Matches your internal structure
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	DateOfBirth string `json:"date_of_birth"`
	Nickname    string `json:"nickname"`
	AboutMe     string `json:"about_me"`
	IsPublic    *bool  `json:"is_public"`
}

type errorResponse struct {
	Message string            `json:"message"`
	Errors  map[string]string `json:"errors,omitempty"`
}

func RegisterHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Message: "Method not allowed"})
			return
		}

		var req RegisterRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Message: "Bad request"})
			return
		}

		fieldErrors := make(map[string]string)
		dateOfBirth, err := time.Parse("2006-01-02", req.DateOfBirth)
		if err != nil {
			fieldErrors["date_of_birth"] = "Enter a valid date of birth."
		}

		isPublic := true
		if req.IsPublic != nil {
			isPublic = *req.IsPublic
		}

		input := services.RegisterUserInput{
			Email:       req.Email,
			Password:    req.Password,
			FirstName:   req.FirstName,
			LastName:    req.LastName,
			DateOfBirth: dateOfBirth,
			Nickname:    req.Nickname,
			AboutMe:     req.AboutMe,
			IsPublic:    isPublic,
		}
		for field, message := range services.ValidateRegisterInput(input) {
			fieldErrors[field] = message
		}
		if len(fieldErrors) > 0 {
			writeJSON(w, http.StatusBadRequest, errorResponse{
				Message: "Please fix the highlighted fields.",
				Errors:  fieldErrors,
			})
			return
		}

		user, err := services.RegisterUser(r.Context(), db, input)
		if err != nil {
			if errors.Is(err, services.ErrEmailAlreadyExists) {
				writeJSON(w, http.StatusConflict, errorResponse{
					Message: "An account already exists for this email.",
					Errors: map[string]string{
						"email": "An account already exists for this email.",
					},
				})
				return
			}

			writeJSON(w, http.StatusInternalServerError, errorResponse{Message: "Internal server error"})
			return
		}

		writeJSON(w, http.StatusCreated, map[string]string{
			"message": "Registration successful",
			"user_id": user.ID.String(),
		})
	}
}

func LoginHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Message: "Method not allowed"})
			return
		}

		var req LoginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Message: "Bad request"})
			return
		}

		userID, err := services.AuthenticateUser(db, req.Email, req.Password)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Message: err.Error()})
			return
		}

		session, err := services.StartSession(db, userID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Message: "Internal server error"})
			return
		}

		http.SetCookie(w, &http.Cookie{
			Name:     "session_id",
			Value:    session.ID.String(),
			Expires:  session.ExpiresAt,
			HttpOnly: true,
			Path:     "/",
			SameSite: http.SameSiteLaxMode,
		})

		writeJSON(w, http.StatusOK, map[string]string{"message": "Login successful"})
	}
}

func LogoutHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("session_id")
		if err == nil {
			_ = services.KillSession(db, cookie.Value)
		}

		http.SetCookie(w, &http.Cookie{
			Name:     "session_id",
			Value:    "",
			Expires:  time.Now().Add(-1 * time.Hour),
			HttpOnly: true,
			Path:     "/",
			SameSite: http.SameSiteLaxMode,
		})

		writeJSON(w, http.StatusOK, map[string]string{"message": "Logout successful"})
	}
}

func MeHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("session_id")
		if err != nil || cookie.Value == "" {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Message: "unauthorized"})
			return
		}

		session, err := services.GetSessionFromDB(db, cookie.Value)
		if err != nil || time.Now().After(session.ExpiresAt) {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Message: "unauthorized"})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"user_id": session.UserID.String()})
	}
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
