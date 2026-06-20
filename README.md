# Social Network

A full-stack social network application built with Go (backend) and Next.js (frontend).

## Project Structure

```
social-network/
├── backend/           # Go backend server
│   ├── cmd/server/    # Main application entry point
│   ├── internal/      # Internal packages
│   │   ├── handlers/  # HTTP request handlers
│   │   ├── models/    # Data models
│   │   ├── repository/ # Database operations
│   │   ├── services/  # Business logic
│   │   └── websocket/ # Real-time communication
│   └── pkg/db/        # Database utilities and migrations
├── frontend/          # Next.js frontend
│   ├── public/        # Static assets
│   └── src/           # Source code
└── docs/              # Documentation
```

## Backend (Go)

### Prerequisites
- Go 1.21+
- SQLite3

### Running the Backend

```bash
cd backend
go run cmd/server/main.go
```

The server will start on `http://localhost:8080`

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

#### Events
- `POST /api/events` - Create a new event
- `GET /api/events/{id}` - Get event details
- `PUT /api/events/{id}` - Update event
- `DELETE /api/events/{id}` - Delete event
- `GET /api/groups/{id}/events` - Get all events for a group
- `POST /api/events/{id}/responses` - RSVP to an event (going, not_going, maybe)
- `GET /api/events/{id}/responses` - Get all RSVP responses for an event
- `DELETE /api/events/{id}/responses` - Remove your RSVP from an event

## Frontend (Next.js)

### Prerequisites
- Node.js 18+
- npm or yarn

### Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:3000`

## Resources

### Go Backend
- [Go Documentation](https://go.dev/doc/)
- [Gin Web Framework](https://gin-gonic.com/docs/) - HTTP web framework
- [GORM](https://gorm.io/docs/) - ORM for Go
- [golang-migrate](https://github.com/golang-migrate/migrate) - Database migrations
- [SQLite Driver](https://github.com/mattn/go-sqlite3) - SQLite driver for Go

### Next.js Frontend
- [Next.js Documentation](https://nextjs.org/docs) - React framework
- [React Documentation](https://react.dev/learn) - UI library
- [Tailwind CSS](https://tailwindcss.com/docs) - CSS framework
- [Axios](https://axios-http.com/docs) - HTTP client

### Database
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [SQL Tutorial](https://www.sqlitetutorial.net/)

### WebSocket
- [WebSocket Protocol](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Gorilla WebSocket](https://github.com/gorilla/websocket)

## Development

### Running with Docker

```bash
docker-compose up
```

### Database Migrations

Migrations are automatically run on server startup. To create a new migration:

```bash
# Create new migration file
touch backend/pkg/db/migrations/sqlite/000014_description.up.sql
touch backend/pkg/db/migrations/sqlite/000014_description.down.sql
```

## License

MIT