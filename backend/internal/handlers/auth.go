package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"backend/pkg/services"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}