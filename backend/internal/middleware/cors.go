package middleware

import (
	"net/http"
)

// CORS returns a middleware that sets common CORS headers.
// Provide a list of allowed origins. If the list contains "*",
// all origins are allowed.
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	allowAll := false
	origins := map[string]struct{}{}
	for _, o := range allowedOrigins {
		if o == "*" {
			allowAll = true
			break
		}
		origins[o] = struct{}{}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if allowAll {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			} else if origin != "" {
				if _, ok := origins[origin]; ok {
					w.Header().Set("Access-Control-Allow-Origin", origin)
				}
			}

			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization")
			w.Header().Set("Access-Control-Allow-Credentials", "true")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// DefaultCORS is a convenience that allows all origins.
func DefaultCORS(next http.Handler) http.Handler {
	return CORS([]string{"*"})(next)
}
