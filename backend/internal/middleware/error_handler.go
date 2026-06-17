package middleware

import (
	"log"
	"net/http"
)

// ErrorHandler is a middleware that recovers from panics and handles central errors
func ErrorHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("Panic recovered: %v", err)
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			}
		}()

		// Pass control to the next handler/middleware in the chain
		next.ServeHTTP(w, r)
	})
}