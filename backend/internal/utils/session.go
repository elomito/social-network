package utils

import (
	"github.com/google/uuid"
)

// GenerateSessionToken creates a cryptographically secure random UUID object
func GenerateSessionToken() uuid.UUID {
	// NewRandom generates a high-entropy version 4 UUID object
	return uuid.New()
}
