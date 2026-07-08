package handlers

import (
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"backend/internal/middleware"

	"github.com/google/uuid"
)

// UploadImageHandler returns an HTTP handler for uploading images
func UploadImageHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userIDStr := middleware.GetUserID(r)
		if userIDStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// Parse multipart form (max 10MB)
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			http.Error(w, "failed to parse form: "+err.Error(), http.StatusBadRequest)
			return
		}

		file, fileHeader, err := r.FormFile("image")
		if err != nil {
			http.Error(w, "image file is required", http.StatusBadRequest)
			return
		}
		defer file.Close()

		// Read file content
		buffer, err := io.ReadAll(file)
		if err != nil {
			http.Error(w, "failed to read image: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Generate image ID
		imageID := uuid.New().String()
		now := time.Now().UTC()

		// Store image as base64 data URL
		// In a production app, you would save the file to disk or cloud storage
		contentType := fileHeader.Header.Get("Content-Type")
		imageDataURL := "data:" + contentType + ";base64," + encodeBase64(buffer)

		_, err = db.ExecContext(r.Context(), `
			INSERT INTO images (id, user_id, image_url, created_at)
			VALUES (?, ?, ?, ?)
		`, imageID, userID.String(), imageDataURL, now)
		if err != nil {
			http.Error(w, "failed to save image: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{
			"id":        imageID,
			"image_url": imageDataURL,
		})
	}
}

// encodeBase64 encodes a byte slice to base64 string
func encodeBase64(data []byte) string {
	const base64Table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
	
	var result []byte
	var bits uint32
	var bitCount int
	
	for _, b := range data {
		bits = (bits << 8) | uint32(b)
		bitCount += 8
		for bitCount >= 6 {
			bitCount -= 6
			result = append(result, base64Table[(bits>>bitCount)&0x3F])
		}
	}
	
	if bitCount > 0 {
		bits <<= 6 - bitCount
		result = append(result, base64Table[bits&0x3F])
	}
	
	// Add padding
	for len(result)%4 != 0 {
		result = append(result, '=')
	}
	
	return string(result)
}
