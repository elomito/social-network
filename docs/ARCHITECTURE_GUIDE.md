# Social Network Project - Complete Architecture Guide

## Table of Contents
1. [What are Database Migrations?](#what-are-database-migrations)
2. [How Migrations Work](#how-migrations-work)
3. [Migration Files Explained](#migration-files-explained)
4. [Project Architecture Overview](#project-architecture-overview)
5. [The Repository Pattern](#the-repository-pattern)
6. [The Request Flow - Step by Step](#the-request-flow---step-by-step)
7. [Authentication System](#authentication-system)
8. [Middleware Explained](#middleware-explained)
9. [WebSocket Real-time Communication](#websocket-real-time-communication)
10. [Frontend-Backend Communication](#frontend-backend-communication)
11. [Complete API Endpoints](#complete-api-endpoints)
12. [Next.js Frontend Structure](#nextjs-frontend-structure)
13. [Step-by-Step Implementation Plan](#step-by-step-implementation-plan)

---

## What are Database Migrations?

### The Analogy: Database Migrations are Like Version Control for Your Database

Think of database migrations like **Git for your database structure**:

- **Git** tracks changes to your code files
- **Migrations** track changes to your database structure

### Why Do We Need Migrations?

Imagine you're building a house:
1. **Day 1**: You build the foundation (create users table)
2. **Day 2**: You add walls (add email column)
3. **Day 3**: You add a roof (add profile picture column)

Without migrations, you'd have to remember all these changes manually. With migrations, each change is recorded in a file, and you can apply them in order.

### Migration File Structure

```
migrations/
└── sqlite/
    ├── 000001_create_users_table.up.sql     # Create users table
    ├── 000001_create_users_table.down.sql   # Drop users table
    ├── 000002_create_posts_table.up.sql     # Add posts table
    └── 000002_create_posts_table.down.sql   # Remove posts table
```

- **UP file**: Applies the change (creates table)
- **DOWN file**: Reverts the change (drops table)
- **Numbered**: Applied in order (1, 2, 3...)

---

## How Migrations Work

### The Process

```
┌─────────────────┐
│   Application     │
│   Starts Up       │
└────────┬──────────┘
         │
         ▼
┌─────────────────┐
│ Check Migration │
│   Version       │
└────────┬──────────┘
         │
         ▼
┌─────────────────┐
│ Apply Missing   │
│   Migrations    │
└────────┬──────────┘
         │
         ▼
┌─────────────────┐
│ Database is     │
│   Ready!        │
└─────────────────┘
```

### golang-migrate Integration

The `golang-migrate` package:
1. Reads migration files from a folder
2. Checks which migrations have been applied
3. Applies any missing migrations
4. Tracks versions in a special `schema_migrations` table

---

## Migration Files Explained

### Current Migration Structure

You already have these migration files (all empty):

| File | Purpose |
|------|---------|
| 000001 | Users table |
| 000002 | Sessions table |
| 000003 | Follows + Follow Requests |
| 000004 | Posts + Post Recipients |
| 000005 | Comments + Reactions |
| 000006 | Groups |
| 000007 | Group Members |
| 000008 | Group Invitations + Join Requests |
| 000009 | Events |
| 000010 | Event Responses |
| 000011 | Private Messages |
| 000012 | Group Messages |
| 000013 | Notifications |

### Missing Migration

You need to add `000000_create_images_table.up.sql` because other tables reference it.

---

## Project Architecture Overview

### The Analogy: A Restaurant Kitchen

Think of your application like a **restaurant with a repository layer**:

```
┌─────────────────────────────────────────────────────────────┐
│                    CUSTOMER (Frontend)                     │
│  "I want to see my profile!"                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 WAITER (HTTP Handler)                      │
│  Takes order, writes it down, sends to kitchen               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              CHEF (Service Layer)                           │
│  "How do I make this dish?" - Knows the recipe               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              PROCUREMENT (Repository Layer)                 │
│  "Where do I get the ingredients?" - Knows suppliers         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 PANTRY (Database)                           │
│  Stores all the ingredients (data)                           │
└─────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Responsibility | Analogy |
|-------|---------------|---------|
| **Models** | Data structures | Recipe ingredients |
| **Repository** | Database operations | Procurement manager |
| **Services** | Business logic | Chef cooking |
| **Handlers** | HTTP request/response | Waiter taking orders |
| **Middleware** | Request processing | Security checkpoints |

---

## The Repository Pattern

### Why Repository Pattern?

The repository pattern is like having a **procurement manager** in your restaurant:

- If you switch from one supplier to another, you only change the procurement manager
- The chef doesn't need to know where ingredients come from
- The procurement manager knows how to talk to each supplier

### Repository Structure

```
backend/internal/
├── repository/
│   ├── user_repository.go    # All user DB operations
│   ├── post_repository.go    # All post DB operations
│   ├── group_repository.go   # All group DB operations
│   ├── event_repository.go   # All event DB operations
│   ├── message_repository.go # All message DB operations
│   ├── follow_repository.go  # All follow DB operations
│   └── image_repository.go   # All image DB operations
```

### Repository Interface Example

```go
// user_repository.go
package repository

import (
    "context"
    "backend/internal/models"
)

// UserRepository defines all user database operations
type UserRepository interface {
    Create(ctx context.Context, user *models.User) error
    FindByID(ctx context.Context, id string) (*models.User, error)
    FindByEmail(ctx context.Context, email string) (*models.User, error)
    Update(ctx context.Context, user *models.User) error
    Delete(ctx context.Context, id string) error
}

// sqliteUserRepository implements the interface for SQLite
type sqliteUserRepository struct {
    db *sql.DB
}

func (r *sqliteUserRepository) Create(ctx context.Context, user *models.User) error {
    // SQLite-specific SQL query
    query := `INSERT INTO users (id, email, password_hash, ...) VALUES (?, ?, ?, ...)`
    _, err := r.db.ExecContext(ctx, query, user.ID, user.Email, user.PasswordHash, ...)
    return err
}

// If you switch to PostgreSQL, you create postgresUserRepository
// with the same interface but different SQL syntax
```

### How Services Use Repositories

```go
// auth_service.go
type AuthService struct {
    userRepo repository.UserRepository
    sessionRepo repository.SessionRepository
}

func (s *AuthService) Register(user *models.User) error {
    // Business logic here
    return s.userRepo.Create(context.Background(), user)
}
```

---

## The Request Flow - Step by Step

### Example: User Login

```
1. Frontend → POST /api/auth/login (email, password)
   ↓
2. Router → authHandler.Login()
   ↓
3. Auth Middleware → Validates session cookie (if exists)
   ↓
4. Auth Handler → Parses request body
   ↓
5. Auth Service → 
   a. Calls userRepo.FindByEmail()
   b. Calls bcrypt.Compare()
   c. Calls sessionRepo.Create()
   ↓
6. Repository Layer → Executes SQL queries
   ↓
7. Database → Returns data
   ↓
8. Auth Handler → Sets cookie, returns success
   ↓
9. Frontend → Receives response, stores session
```

### Example: Create a Post

```
1. Frontend → POST /api/posts (content, privacy)
   ↓
2. Auth Middleware → Validates session, gets user ID
   ↓
3. Post Handler → Parses request
   ↓
4. Post Service → 
   a. Calls postRepo.Create()
   b. If private, calls postRecipientRepo.Create()
   c. Calls notificationRepo.Create()
   ↓
5. Repository Layer → Executes SQL queries
   ↓
6. Database → Returns data
   ↓
7. Post Handler → Returns created post
   ↓
8. Frontend → Displays new post
```

### Example: Real-time Chat (WebSocket)

```
1. User opens chat page
   ↓
2. Frontend → WebSocket connection to /ws
   ↓
3. WebSocket Handler → 
   a. Validates session
   b. Registers client in hub
   ↓
4. User sends message
   ↓
5. WebSocket Handler → 
   a. Calls messageRepo.Create()
   b. Broadcasts to recipient(s)
   ↓
6. Recipient's browser → Receives message instantly
```

---

## Authentication System

### The Analogy: A Nightclub Bouncer

Think of authentication like a **nightclub entry system**:

1. **Registration** - You give your ID to get a membership card
2. **Login** - You show your card to enter
3. **Session** - The bouncer remembers you for the night
4. **Logout** - You give back your card, bouncer forgets you

### How It Works

```
┌─────────────────┐
│   Registration  │
│                 │
│ Email + Password│
│ First Name      │
│ Last Name       │
│ Date of Birth   │
└────────┬──────────┘
         │
         ▼
┌─────────────────┐
│   Password      │
│   Hashing       │
│                 │
│ bcrypt.Hash()   │
│ (One-way hash)  │
└────────┬──────────┘
         │
         ▼
┌─────────────────┐
│   Database      │
│                 │
│ Store user with │
│ hashed password │
└─────────────────┘
```

```
┌─────────────────┐
│   Login         │
│                 │
│ Email + Password│
└────────┬──────────┘
         │
         ▼
┌─────────────────┐
│   Verify        │
│                 │
│ bcrypt.Compare()│
│ (Check password)│
└────────┬──────────┘
         │
         ▼
┌─────────────────┐
│   Create        │
│   Session       │
│                 │
│ Generate UUID   │
│ Store in DB     │
│ Set cookie      │
└─────────────────┘
```

### Session Management

```go
// What a session looks like in the database
Session {
    ID: "a1b2c3d4-e5f6-7890..."  // Random UUID
    UserID: "user-uuid-here"       // Who owns this session
    ExpiresAt: "2024-01-01..."  // When it expires
    CreatedAt: "2024-01-01..."   // When created
}
```

---

## Middleware Explained

### The Analogy: Security Checkpoints

Middleware is like **airport security checkpoints**:

1. **Auth Middleware** - Checks your boarding pass (session)
2. **CORS Middleware** - Checks if you're allowed in (origin check)
3. **Logger Middleware** - Logs everyone who passes through
4. **Error Handler** - Handles problems gracefully

### Middleware Flow

```
Request → [CORS] → [Logger] → [Auth] → [Handler] → Response
              ↘         ↘         ↘
            Check origin  Log it   Check session
```

### Auth Middleware Example

```go
func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // 1. Get session cookie
        cookie, err := r.Cookie("session")
        
        // 2. If no cookie, user is not logged in
        if err != nil {
            // Allow public routes, block private ones
            next.ServeHTTP(w, r)
            return
        }
        
        // 3. Look up session in database
        session, err := sessionRepo.FindByID(cookie.Value)
        
        // 4. If session invalid/expired, clear cookie
        if err != nil || session.Expired() {
            http.SetCookie(w, &http.Cookie{MaxAge: -1})
            next.ServeHTTP(w, r)
            return
        }
        
        // 5. Add user info to request context
        ctx := context.WithValue(r.Context(), "userID", session.UserID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

---

## WebSocket Real-time Communication

### The Analogy: A Phone Call vs. Mail

- **HTTP** is like **mail** - you send a letter, wait for response
- **WebSocket** is like a **phone call** - instant two-way communication

### How WebSocket Works

```
Browser                           Server
   │                                │
   │    1. HTTP Upgrade Request     │
   │ ─────────────────────────────→ │
   │                                │
   │    2. Connection Accepted      │
   │ ←───────────────────────────── │
   │                                │
   │    3. Connected!               │
   │ ◎────────────────────────────◎ │
   │                                │
   │    4. Send Message             │
   │ ─────────────────────────────→ │
   │                                │
   │    5. Broadcast to Others      │
   │ ←───────────────────────────── │
```

### WebSocket Hub Pattern

```go
// The Hub manages all WebSocket connections
type Hub struct {
    clients map[*Client]bool  // All connected users
    broadcast chan Message    // Messages to send
}

// Each user has a Client
type Client struct {
    userID string
    conn *websocket.Conn
    send chan Message
}

// Flow:
// 1. User connects → Register in hub
// 2. User sends message → Hub receives
// 3. Hub broadcasts → All relevant users
// 4. User disconnects → Remove from hub
```

---

## Frontend-Backend Communication

### The Analogy: Client-Server Restaurant

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
│                 │
│ React Components│
│ API Calls       │
│ WebSocket       │
└────────┬──────────┘
         │ HTTP/WS
         ▼
┌─────────────────┐
│   Backend       │
│   (Go)          │
│                 │
│ HTTP Handlers   │
│ WebSocket Hub   │
│ Services        │
│ Repositories    │
└────────┬──────────┘
         │
         ▼
┌─────────────────┐
│   Database      │
│   (SQLite)      │
└─────────────────┘
```

---

## Complete API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| POST | /api/auth/register | Register new user | `{email, password, first_name, last_name, date_of_birth, nickname?, about_me?, avatar?}` |
| POST | /api/auth/login | Login user | `{email, password}` |
| POST | /api/auth/logout | Logout user | - |
| GET | /api/auth/me | Get current user | - |

### User Profile Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users/:id | Get user profile by ID |
| PUT | /api/users/:id | Update user profile |
| GET | /api/users/:id/posts | Get user's posts |
| GET | /api/users/:id/followers | Get user's followers |
| GET | /api/users/:id/following | Get users they follow |

### Follow Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/follow/:id | Send follow request |
| DELETE | /api/follow/:id | Unfollow user |
| POST | /api/follow/:id/accept | Accept follow request |
| POST | /api/follow/:id/decline | Decline follow request |
| GET | /api/follow/requests | Get pending follow requests |

### Post Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/posts | Get feed (posts from followed users) |
| POST | /api/posts | Create new post |
| POST | /api/posts/:id/react | React to post (like/dislike) |
| GET | /api/posts/:id | Get single post |
| PUT | /api/posts/:id | Update post |
| DELETE | /api/posts/:id | Delete post |
| POST | /api/posts/:id/recipients | Add recipient to private post |

### Comment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/posts/:id/comments | Get comments on post |
| POST | /api/posts/:id/comments | Create comment |
| PUT | /api/comments/:id | Update comment |
| DELETE | /api/comments/:id | Delete comment |
| POST | /api/comments/:id/react | React to comment (like/dislike) |

### Group Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/groups | List all groups |
| POST | /api/groups | Create group |
| GET | /api/groups/:id | Get group details |
| PUT | /api/groups/:id | Update group |
| DELETE | /api/groups/:id | Delete group |
| POST | /api/groups/:id/invite | Invite user to group |
| POST | /api/groups/:id/join | Request to join group |
| POST | /api/groups/:id/leave | Leave group |

### Event Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/groups/:id/events | Get group events |
| POST | /api/groups/:id/events | Create event |
| GET | /api/events/:id | Get event details |
| PUT | /api/events/:id | Update event |
| DELETE | /api/events/:id | Delete event |
| POST | /api/events/:id/respond | RSVP to event |

### Chat Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/chats | Get chat list (conversations) |
| GET | /api/chats/:id | Get messages with user |
| POST | /api/chats | Send private message |
| GET | /api/groups/:id/messages | Get group messages |
| POST | /api/groups/:id/messages | Send group message |

### Notification Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/notifications | Get all notifications |
| POST | /api/notifications/:id/read | Mark as read |
| GET | /api/notifications/unread | Get unread count |

### Image Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/images | Upload image |
| GET | /api/images/:id | Get image |

---

## Next.js Frontend Structure

### Project Structure

```
frontend/
├── package.json           # Dependencies
├── next.config.js         # Next.js configuration
├── .env.local           # Environment variables
├── public/              # Static files
│   └── images/
├── styles/              # CSS styles
│   ├── globals.css
│   └── components/
├── pages/               # Next.js pages
│   ├── _app.js          # App wrapper
│   ├── _document.js     # HTML document
│   ├── index.js         # Home page
│   ├── login.js         # Login page
│   ├── register.js      # Register page
│   ├── profile/
│   │   └── [id].js      # Dynamic profile page
│   ├── groups/
│   │   ├── index.js     # Groups list
│   │   └── [id].js      # Group detail
│   ├── chat/
│   │   ├── index.js     # Chat list
│   │   └── [id].js      # Single chat
│   ├── events/
│   │   └── [id].js      # Event detail
│   └── settings.js      # User settings
├── components/          # React components
│   ├── layout/
│   │   ├── Navbar.js
│   │   └── Footer.js
│   ├── posts/
│   │   ├── PostCard.js
│   │   ├── PostForm.js
│   │   └── PostList.js
│   ├── comments/
│   │   ├── CommentCard.js
│   │   └── CommentForm.js
│   ├── groups/
│   │   ├── GroupCard.js
│   │   └── GroupList.js
│   ├── chat/
│   │   ├── ChatWindow.js
│   │   └── MessageList.js
│   └── ui/
│       ├── Button.js
│       ├── Modal.js
│       └── Avatar.js
├── lib/                 # Helper functions
│   ├── api.js           # API client
│   └── auth.js          # Auth utilities
├── hooks/               # Custom React hooks
│   ├── useAuth.js
│   ├── useWebSocket.js
│   └── useApi.js
└── context/             # React context
    └── AuthContext.js
```

### package.json

```json
{
  "name": "social-network-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}
```

### How to Initialize Next.js

```bash
# Navigate to frontend directory
cd frontend

# Create package.json
npm init -y

# Install Next.js
npm install next react react-dom

# Create the folder structure
mkdir -p pages/profile pages/groups pages/chat pages/events
mkdir -p components/layout components/posts components/comments components/groups components/chat components/ui
mkdir -p lib hooks context styles/public styles/components
```

### API Client Example (lib/api.js)

```javascript
// lib/api.js
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export async function api(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include', // Include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(await response.text());
  }
  
  return response.json();
}

// Usage examples:
// api('/auth/login', { method: 'POST', body: JSON.stringify({email, password}) })
// api('/posts')
// api('/groups')
```

### WebSocket Client Example (hooks/useWebSocket.js)

```javascript
// hooks/useWebSocket.js
import { useEffect, useRef } from 'react';

export function useWebSocket(onMessage) {
  const ws = useRef(null);
  
  useEffect(() => {
    // Connect to WebSocket
    ws.current = new WebSocket('ws://localhost:8080/ws');
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };
    
    return () => {
      ws.current?.close();
    };
  }, [onMessage]);
  
  const send = (data) => {
    ws.current?.send(JSON.stringify(data));
  };
  
  return { send };
}
```

---

## Step-by-Step Implementation Plan

### Phase 1: Database & Migrations (Start Here)

1. **Add missing images migration**
   - Create `000000_create_images_table.up.sql`
   - Create `000000_create_images_table.down.sql`

2. **Fill in all migration files**
   - Copy the SQL from below
   - Add proper foreign key constraints

3. **Create repository layer**
   - Create `backend/internal/repository/` folder
   - Create repository interfaces and implementations

4. **Update sqlite.go to run migrations**
   - Add golang-migrate integration
   - Run migrations on startup

5. **Update go.mod**
   - Add required dependencies

### Phase 2: Backend Core

6. **Implement utils package**
   - `bcrypt.go` - Password hashing
   - `session.go` - Session management
   - `uuid.go` - UUID generation
   - `image.go` - Image handling

7. **Implement middleware**
   - `auth.go` - Session validation
   - `cors.go` - CORS headers
   - `logger.go` - Request logging
   - `error_handler.go` - Error responses

8. **Implement services**
   - `auth_service.go` - Registration, login, logout
   - `user_service.go` - Profile operations
   - `post_service.go` - Post   
   - `follow_service.go` - Follow/unfollow
   - `group_service.go` - Group management
   - `chat_service.go` - Message handling

9. **Implement handlers**
   - `auth.go` - Auth endpoints
   - `user.go` - User endpoints
   - `post.go` - Post endpoints
   - `group.go` - Group endpoints
   - `event.go` - Event endpoints
   - `comment.go` - Comment endpoints
   - `notification.go` - Notification endpoints
   - `websocket.go` - WebSocket endpoint

10. **Complete main.go**
    - Initialize all repositories
    - Initialize all services
    - Register all routes
    - Start server

### Phase 3: Frontend (Next.js)

11. **Initialize Next.js project**
    - Create package.json
    - Install dependencies

12. **Create pages**
    - Login, Register
    - Feed, Profile
    - Groups, Events
    - Chat, Settings

13. **Create components**
    - Post, Comment, GroupCard
    - Navbar, Modal, Notification

14. **Implement API client**
    - Connect to backend endpoints
    - Handle authentication

15. **Implement WebSocket client**
    - Real-time chat
    - Live notifications

### Phase 4: Integration & Testing

16. **Docker setup**
    - Backend Dockerfile
    - Frontend Dockerfile
    - docker-compose.yml

17. **Test all features**
    - Registration flow
    - Login/logout
    - Create posts/comments
    - Follow users
    - Create groups
    - Real-time chat

---

## SQLite Database - Detailed Guide

### What is SQLite?

SQLite is a **self-contained, serverless, zero-configuration** database engine. It's different from other databases like PostgreSQL or MySQL:

| Feature | SQLite | PostgreSQL | MySQL |
|---------|--------|------------|-------|
| Server | No (file-based) | Yes | Yes |
| Setup | Zero config | Complex | Complex |
| Use case | Small to medium apps | Large scale | Large scale |
| File | Single .db file | Multiple files | Multiple files |

### Why SQLite for This Project?

- **Simple setup** - No database server to install
- **Single file** - Easy to backup and deploy
- **Good for learning** - No complex configuration
- **Sufficient for social network** - Can handle thousands of users

### How to Initialize SQLite

Your `sqlite.go` already has the initialization code. Here's what it does:

```go
// 1. Opens/creates the database file
db, err := sql.Open("sqlite", "data/app.db")

// 2. Configures connection pool
db.SetMaxOpenConns(10)
db.SetMaxIdleConns(5)
db.SetConnMaxLifetime(time.Hour)

// 3. Enables foreign keys (important!)
db.Exec("PRAGMA foreign_keys = ON")

// 4. Tests connection
db.Ping()
```

### SQLite Commands in Terminal

```bash
# Install SQLite (Ubuntu/Debian)
sudo apt-get install sqlite3

# Install SQLite (macOS)
brew install sqlite

# Open database
sqlite3 data/app.db

# Show all tables
.tables

# Show table schema
.schema users

# Query data
SELECT * FROM users;

# Exit
.quit
```

### Testing SQLite Without Code

```bash
# Create a test database
sqlite3 test.db "CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT);"

# Insert data
sqlite3 test.db "INSERT INTO test (name) VALUES ('Hello');"

# Query data
sqlite3 test.db "SELECT * FROM test;"
```

---

## Testing API Endpoints with curl

### What is curl?

curl is a command-line tool for making HTTP requests. It's perfect for testing your API endpoints.

### Basic curl Commands

```bash
# GET request
curl http://localhost:8080/api/posts

# POST request with JSON
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# POST with form data
curl -X POST http://localhost:8080/api/images \
  -F "image=@/path/to/image.jpg"

# With cookies (for authenticated requests)
curl -b cookies.txt -c cookies.txt http://localhost:8080/api/auth/me
```

### Testing Authentication Flow

```bash
# 1. Register a new user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User",
    "date_of_birth": "1990-01-01"
  }' \
  -c cookies.txt

# 2. Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# 3. Get current user (authenticated)
curl http://localhost:8080/api/auth/me \
  -b cookies.txt

# 4. Create a post (authenticated)
curl -X POST http://localhost:8080/api/posts \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello World!","privacy_level":"public"}' \
  -b cookies.txt

# 5. Get feed
curl http://localhost:8080/api/posts \
  -b cookies.txt

# 6. Logout
curl -X POST http://localhost:8080/api/auth/logout \
  -b cookies.txt
```

### Testing Follow System

```bash
# Send follow request
curl -X POST http://localhost:8080/api/follow/USER_ID \
  -b cookies.txt

# Get follow requests
curl http://localhost:8080/api/follow/requests \
  -b cookies.txt

# Accept follow request
curl -X POST http://localhost:8080/api/follow/REQUEST_ID/accept \
  -b cookies.txt
```

### Testing Groups

```bash
# Create group
curl -X POST http://localhost:8080/api/groups \
  -H "Content-Type: application/json" \
  -d '{"title":"My Group","description":"A test group"}' \
  -b cookies.txt

# List groups
curl http://localhost:8080/api/groups

# Join group
curl -X POST http://localhost:8080/api/groups/GROUP_ID/join \
  -b cookies.txt
```

### Testing Reactions

```bash
# React to a post (like)
curl -X POST http://localhost:8080/api/posts/POST_ID/react \
  -H "Content-Type: application/json" \
  -d '{"reaction_type":"like"}' \
  -b cookies.txt

# React to a comment (dislike)
curl -X POST http://localhost:8080/api/comments/COMMENT_ID/react \
  -H "Content-Type: application/json" \
  -d '{"reaction_type":"dislike"}' \
  -b cookies.txt
```

---

## How to Run Migrations

### 1. Install golang-migrate

```bash
go get -u github.com/golang-migrate/migrate/v4
```

### 2. Update sqlite.go

```go
import (
    "github.com/golang-migrate/migrate/v4"
    _ "github.com/golang-migrate/migrate/v4/database/sqlite"
    _ "github.com/golang-migrate/migrate/v4/source/file"
)

func NewSQLite(cfg Config) (*DB, error) {
    // ... existing code ...
    
    // Run migrations
    m, err := migrate.New("file://migrations/sqlite", "sqlite://data/app.db")
    if err != nil {
        return nil, err
    }
    
    if err := m.Up(); err != nil && err != migrate.ErrNoChange {
        return nil, err
    }
    
    return &DB{conn: db}, nil
}
```

### 3. Run the application

```bash
go run backend/cmd/server/main.go
```

Migrations will run automatically on startup!

---

## Key Concepts Summary

| Concept | What It Is | Why It Matters |
|---------|-----------|----------------|
| **Migrations** | Version-controlled database changes | Safe, repeatable deployments |
| **Models** | Data structures | Type-safe data handling |
| **Repository** | Database operations layer | Database abstraction |
| **Services** | Business logic | Reusable, testable code |
| **Handlers** | HTTP endpoints | API interface |
| **Middleware** | Request processors | Cross-cutting concerns |
| **Sessions** | User authentication | Stay logged in |
| **bcrypt** | Password hashing | Secure passwords |
| **WebSocket** | Real-time connection | Instant messaging |

---

## Next Steps

1. **Start with migrations** - They're the foundation
2. **Create repository layer** - Database abstraction
3. **Build auth system** - Everything depends on it
4. **Add one feature at a time** - Don't try to do everything at once
5. **Test as you go** - Verify each piece works
