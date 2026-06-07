package utils

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

// Allowed image MIME types
var allowedMimeTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/gif":  true,
}

// Allowed image extensions
var allowedExtensions = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".gif":  true,
}

// Maximum image size (5MB)
const MaxImageSize = 5 * 1024 * 1024

// ValidateImage validates an image file from an io.Reader
// Returns the image MIME type, dimensions, and size if valid
func ValidateImage(reader io.Reader, maxSize int64) (string, int, int, int64, error) {
	// Decode image to get dimensions and verify it's a valid image
	img, format, err := image.DecodeConfig(reader)
	if err != nil {
		return "", 0, 0, 0, fmt.Errorf("invalid image: %w", err)
	}

	// Check format
	switch format {
	case "jpeg", "png", "gif":
		// Valid formats
	default:
		return "", 0, 0, 0, fmt.Errorf("unsupported image format: %s", format)
	}

	// Get MIME type
	mimeType := mime.TypeByExtension("." + format)
	if mimeType == "" {
		return "", 0, 0, 0, fmt.Errorf("could not determine MIME type for format: %s", format)
	}

	// Check if MIME type is allowed
	if !allowedMimeTypes[mimeType] {
		return "", 0, 0, 0, fmt.Errorf("MIME type not allowed: %s", mimeType)
	}

	// Check size if we have a reader that supports seeking
	if seeker, ok := reader.(io.Seeker); ok {
		currentPos, err := seeker.Seek(0, io.SeekCurrent)
		if err != nil {
			return "", 0, 0, 0, fmt.Errorf("could not get current position: %w", err)
		}

		size, err := seeker.Seek(0, io.SeekEnd)
		if err != nil {
			return "", 0, 0, 0, fmt.Errorf("could not get size: %w", err)
		}

		// Reset to original position
		if _, err := seeker.Seek(currentPos, io.SeekStart); err != nil {
			return "", 0, 0, 0, fmt.Errorf("could not reset position: %w", err)
		}

		if maxSize > 0 && size > maxSize {
			return "", 0, 0, 0, fmt.Errorf("image size %d exceeds maximum allowed size %d", size, maxSize)
		}

		return mimeType, img.Width, img.Height, size, nil
	}

	// If we can't seek, we can't check size without reading the whole file
	return mimeType, img.Width, img.Height, 0, nil
}

// ValidateImageFromFile validates an image file from disk
func ValidateImageFromFile(filePath string) (string, int, int, int64, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", 0, 0, 0, fmt.Errorf("could not open file: %w", err)
	}
	defer file.Close()

	return ValidateImage(file, MaxImageSize)
}

// ValidateImageFromBytes validates an image from a byte slice
func ValidateImageFromBytes(data []byte) (string, int, int, int64, error) {
	return ValidateImage(bytes.NewReader(data), MaxImageSize)
}

// ValidateImageFromHTTP validates an image from an HTTP request (e.g., multipart upload)
func ValidateImageFromHTTP(fileHeader *multipart.FileHeader) (string, int, int, int64, error) {
	// Check file size
	if fileHeader.Size > MaxImageSize {
		return "", 0, 0, 0, fmt.Errorf("image size %d exceeds maximum allowed size %d", fileHeader.Size, MaxImageSize)
	}

	// Open the file
	file, err := fileHeader.Open()
	if err != nil {
		return "", 0, 0, 0, fmt.Errorf("could not open uploaded file: %w", err)
	}
	defer file.Close()

	return ValidateImage(file, MaxImageSize)
}

// GenerateFileName generates a unique filename for an image
func GenerateFileName(originalName string) string {
	// Extract extension
	ext := strings.ToLower(filepath.Ext(originalName))
	if ext == "" {
		ext = ".jpg" // default extension
	}

	// Generate UUID-based filename
	id := uuid.New()
	return fmt.Sprintf("%s%s", id.String(), ext)
}

// GetStoragePath generates a storage path for an image based on entity type and ID
func GetStoragePath(entityType string, entityID uuid.UUID, filename string) string {
	// Create path like: uploads/{entityType}/{entityID}/{filename}
	return fmt.Sprintf("uploads/%s/%s/%s", entityType, entityID.String(), filename)
}

// GetImageURL generates a URL for accessing an image
func GetImageURL(baseURL, storagePath string) string {
	// Ensure baseURL doesn't end with slash
	baseURL = strings.TrimSuffix(baseURL, "/")
	// Ensure storagePath doesn't start with slash
	storagePath = strings.TrimPrefix(storagePath, "/")
	return fmt.Sprintf("%s/%s", baseURL, storagePath)
}

// DetectMIMEType detects the MIME type from file content
func DetectMIMEType(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", fmt.Errorf("could not open file: %w", err)
	}
	defer file.Close()

	// Read first 512 bytes for detection
	buffer := make([]byte, 512)
	_, err = file.Read(buffer)
	if err != nil {
		return "", fmt.Errorf("could not read file: %w", err)
	}

	// Reset file position
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", fmt.Errorf("could not reset file position: %w", err)
	}

	// Detect MIME type
	mimeType := http.DetectContentType(buffer)
	return mimeType, nil
}

// IsValidImageExtension checks if a file extension is allowed for images
func IsValidImageExtension(ext string) bool {
	ext = strings.ToLower(ext)
	return allowedExtensions[ext]
}

// IsValidMIMEType checks if a MIME type is allowed for images
func IsValidMIMEType(mimeType string) bool {
	return allowedMimeTypes[mimeType]
}

// CreateThumbnail creates a thumbnail of an image
// This is a placeholder - actual implementation would use an imaging library
func CreateThumbnail(srcPath, dstPath string, width, height int) error {
	// Placeholder implementation
	// In a real application, you would use a library like:
	// - github.com/disintegration/imaging
	// - golang.org/x/image
	// For now, we'll just copy the file
	
	source, err := os.Open(srcPath)
	if err != nil {
		return fmt.Errorf("could not open source image: %w", err)
	}
	defer source.Close()

	destination, err := os.Create(dstPath)
	if err != nil {
		return fmt.Errorf("could not create destination: %w", err)
	}
	defer destination.Close()

	_, err = io.Copy(destination, source)
	if err != nil {
		return fmt.Errorf("could not copy image: %w", err)
	}

	return nil
}