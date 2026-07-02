package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"

	"backend/internal/handlers"
	"backend/internal/middleware"
	"backend/internal/repository"
	"backend/internal/services"
	"backend/internal/websocket"
	"backend/pkg/db"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

func main() {
	log.Println("--- Launching Social Network Core Application ---")

	// 3. Opens or creates our local database file.
	sqliteConn, err := sql.Open("sqlite3", "./social_network.db")
	if err != nil {
		log.Fatalf("BOOT ERROR: Could not open database connection: %v", err)
	}
	defer sqliteConn.Close()

	// 4. Calls your automated script to read SQL files and build tables BEFORE the server turns on
	if err := db.RunMigrations(sqliteConn); err != nil {
		log.Fatalf("BOOT ERROR: Database migration pipeline failed: %v", err)
	}

	log.Println("System online! Database verification completely successful.")

	serverAddr := ":8080"

	// Initialize repositories
	eventRepo := repository.NewEventRepository(sqliteConn)
	eventResponseRepo := repository.NewEventResponseRepository(sqliteConn)
	postRepo := repository.NewPostRepository(sqliteConn)
	reactionRepo := repository.NewReactionRepository(sqliteConn)
	commentRepo := repository.NewCommentRepository(sqliteConn)

	// Initialize user & follow services
	userService := services.NewUserService(sqliteConn)
	followService := services.NewFollowService(sqliteConn)
	groupService := services.NewGroupService(sqliteConn)
	notificationService := services.NewNotificationService(sqliteConn)

	// Initialize WebSocket hub
	hub := websocket.NewHub()
	go hub.Run()

	// Initialize post and comment services
	postService := services.NewPostService(
		postRepo,
		reactionRepo,
		userService,
		nil, // imageRepo - not used in current implementation
		groupService,
		hub,
	)
	commentService := services.NewCommentService(
		commentRepo,
		reactionRepo,
		userService,
		postRepo,
		hub,
	)

	// Initialize event service
	eventService := services.NewEventService(eventRepo, eventResponseRepo)

	// Initialize handlers
	eventHandler := handlers.NewEventHandler(eventService)
	groupHandler := handlers.NewGroupHandler(groupService, sqliteConn)
	postHandler := handlers.NewPostHandler(postService)
	commentHandler := handlers.NewCommentHandler(commentService)

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handleWebSocket(hub))
	mux.HandleFunc("/api/auth/register", handlers.RegisterHandler(sqliteConn))
	mux.HandleFunc("/api/auth/login", handlers.LoginHandler(sqliteConn))
	mux.HandleFunc("/api/auth/logout", handlers.LogoutHandler(sqliteConn))
	mux.HandleFunc("/api/auth/me", handlers.MeHandler(sqliteConn))

	// Public user profile + visibility toggle
	mux.Handle("/api/users", middleware.Auth(sqliteConn)(http.HandlerFunc(handlers.ProfileHandler(sqliteConn, userService, followService))))
	mux.Handle("/api/users/discover", middleware.Auth(sqliteConn)(http.HandlerFunc(handlers.DiscoverUsersHandler(sqliteConn, followService))))
	mux.Handle("/api/users/visibility", middleware.Auth(sqliteConn)(http.HandlerFunc(handlers.ToggleVisibilityHandler(userService))))

	// Follow routes
	mux.Handle("/api/follow", middleware.Auth(sqliteConn)(http.HandlerFunc(handlers.FollowHandler(followService))))
	mux.Handle("/api/unfollow", middleware.Auth(sqliteConn)(http.HandlerFunc(handlers.UnfollowHandler(followService))))
	mux.Handle("/api/follow/status", middleware.Auth(sqliteConn)(http.HandlerFunc(handlers.FollowStatusHandler(followService))))
	mux.Handle("/api/followers", middleware.Auth(sqliteConn)(http.HandlerFunc(handlers.GetFollowersHandler(sqliteConn, followService))))

	// Event routes
	mux.Handle("/api/events", middleware.Auth(sqliteConn)(http.HandlerFunc(eventHandler.CreateEvent)))
	mux.Handle("/api/events/", middleware.Auth(sqliteConn)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			eventHandler.GetEvent(w, r)
		case http.MethodPut:
			eventHandler.UpdateEvent(w, r)
		case http.MethodDelete:
			eventHandler.DeleteEvent(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})))
	mux.Handle("/api/groups/{id}/events", middleware.Auth(sqliteConn)(http.HandlerFunc(eventHandler.ListGroupEvents)))
	mux.Handle("/api/events/{id}/responses", middleware.Auth(sqliteConn)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			eventHandler.GetEventResponses(w, r)
		case http.MethodPost:
			eventHandler.CreateEventResponse(w, r)
		case http.MethodDelete:
			eventHandler.DeleteEventResponse(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})))

	// Post routes
	mux.Handle("/api/posts", middleware.Auth(sqliteConn)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			postHandler.GetPosts(w, r)
		case http.MethodPost:
			postHandler.CreatePost(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})))
	mux.Handle("/api/posts/{id}", middleware.Auth(sqliteConn)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			postHandler.GetPost(w, r)
		case http.MethodPut:
			postHandler.UpdatePost(w, r)
		case http.MethodDelete:
			postHandler.DeletePost(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})))
	mux.Handle("/api/posts/{id}/reactions", middleware.Auth(sqliteConn)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			postHandler.AddReaction(w, r)
		case http.MethodDelete:
			postHandler.RemoveReaction(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})))
	mux.Handle("/api/posts/{id}/comments", middleware.Auth(sqliteConn)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			commentHandler.GetComments(w, r)
		case http.MethodPost:
			commentHandler.AddComment(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})))

	// Comment reaction routes
	mux.Handle("/api/comments/{id}/reactions", middleware.Auth(sqliteConn)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			commentHandler.AddCommentReaction(w, r)
		case http.MethodDelete:
			commentHandler.RemoveCommentReaction(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})))

	// Image routes
	mux.Handle("/api/images", middleware.Auth(sqliteConn)(http.HandlerFunc(handlers.UploadImageHandler(sqliteConn))))

	// Group routes
	mux.Handle("/api/groups", middleware.Auth(sqliteConn)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			groupHandler.ListGroups(w, r)
		case http.MethodPost:
			groupHandler.CreateGroup(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})))
	mux.Handle("/api/groups/{id}", middleware.Auth(sqliteConn)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			groupHandler.GetGroupByID(w, r)
		case http.MethodPut:
			groupHandler.UpdateGroup(w, r)
		case http.MethodDelete:
			groupHandler.DeleteGroup(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})))
	mux.Handle("/api/groups/{id}/join", middleware.Auth(sqliteConn)(http.HandlerFunc(groupHandler.JoinGroup)))
	mux.Handle("/api/groups/{id}/leave", middleware.Auth(sqliteConn)(http.HandlerFunc(groupHandler.LeaveGroup)))
	mux.Handle("/api/groups/{id}/members", middleware.Auth(sqliteConn)(http.HandlerFunc(groupHandler.ListGroupMembers)))
	mux.Handle("/api/groups/{id}/invitations", middleware.Auth(sqliteConn)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			groupHandler.GetGroupInvitations(w, r)
		case http.MethodPost:
			groupHandler.CreateGroupInvitation(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})))
	mux.Handle("/api/groups/{id}/invitations/{invitationId}/respond", middleware.Auth(sqliteConn)(http.HandlerFunc(groupHandler.RespondToInvitation)))
	mux.Handle("/api/groups/{id}/join-requests", middleware.Auth(sqliteConn)(http.HandlerFunc(groupHandler.GetGroupJoinRequests)))
	mux.Handle("/api/groups/{id}/join-requests/{requestId}/respond", middleware.Auth(sqliteConn)(http.HandlerFunc(groupHandler.RespondToJoinRequest)))
	mux.Handle("/api/groups/{id}/posts", middleware.Auth(sqliteConn)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			groupHandler.GetGroupPosts(w, r)
		case http.MethodPost:
			groupHandler.CreateGroupPost(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})))

	// Chat routes
	mux.Handle("/api/conversations", middleware.Auth(sqliteConn)(http.HandlerFunc(handlers.GetConversationsHandler(sqliteConn, hub))))
	mux.Handle("/api/conversations/peer", middleware.Auth(sqliteConn)(http.HandlerFunc(handlers.GetOrCreateConversationHandler(sqliteConn))))
	mux.Handle("/api/conversations/{id}/messages", middleware.Auth(sqliteConn)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handlers.GetConversationMessagesHandler(sqliteConn)(w, r)
		case http.MethodPost:
			handlers.SendPrivateMessageHandler(sqliteConn, hub)(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})))

	// Notifications
	mux.Handle("/api/notifications", middleware.Auth(sqliteConn)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handlers.ListNotificationsHandler(notificationService)(w, r)
		case http.MethodPost:
			handlers.CreateNotificationHandler(notificationService)(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})))
	mux.Handle("/api/notifications/read", middleware.Auth(sqliteConn)(http.HandlerFunc(handlers.MarkNotificationReadHandler(notificationService))))
	mux.Handle("/api/notifications/read-all", middleware.Auth(sqliteConn)(http.HandlerFunc(handlers.MarkAllNotificationsReadHandler(notificationService))))

	mux.Handle("/", http.FileServer(http.Dir("../frontend/public")))

	fmt.Printf("Starting server on http://localhost%s\n", serverAddr)
	fmt.Printf("WebSocket endpoint: ws://localhost%s/ws\n", serverAddr)
	if err := http.ListenAndServe(serverAddr, middleware.DefaultCORS(mux)); err != nil {
		log.Fatal("Error: Failed to initialise server.\nPort may be in use")
	}
}

func handleWebSocket(hub *websocket.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := uuid.Nil
		if rawUserID := r.URL.Query().Get("user_id"); rawUserID != "" {
			parsedUserID, err := uuid.Parse(rawUserID)
			if err != nil {
				http.Error(w, "invalid user_id query parameter", http.StatusBadRequest)
				return
			}

			userID = parsedUserID
		}

		websocket.ServeWS(hub, w, r, userID)
	}
}
