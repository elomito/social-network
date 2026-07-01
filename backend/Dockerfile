# Build stage
FROM golang:1.21 AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Install dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application (CGO required for mattne/sqlite3)
RUN go build -o /server ./cmd/server

# Final stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /root/

# Copy the binary from builder
COPY --from=builder /server .

# Copy migrations
COPY --from=builder /app/pkg/db/migrations ./pkg/db/migrations

EXPOSE 8080

CMD ["./server"]