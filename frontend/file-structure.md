# Frontend File Structure

A professional Next.js 14+ file structure for the Social Network application.

## Root Level

```
frontend/
├── .env.example              # Environment variables template
├── .env.local                # Local environment variables (git-ignored)
├── .eslintrc.json            # ESLint configuration
├── .gitignore                # Git ignore rules
├── docker-compose.yml        # Docker composition for frontend
├── Dockerfile                # Production Docker image
├── next.config.js            # Next.js configuration
├── package.json              # Dependencies and scripts
├── postcss.config.js         # PostCSS configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── README.md                 # Project documentation
```

## App Directory (App Router)

```
frontend/src/app/
├── layout.jsx                # Root layout with providers
├── page.jsx                  # Landing page (public)
├── globals.css               # Global styles and Tailwind imports
├── loading.jsx               # Global loading UI
├── error.jsx                 # Global error boundary
├── not-found.jsx             # Global 404 page
├── (auth)/                   # Auth route group (no layout)
│   ├── login/
│   │   └── page.jsx          # Login page
│   ├── register/
│   │   └── page.jsx          # Registration page
│   └── forgot-password/
│       └── page.jsx          # Password reset request
├── (dashboard)/              # Protected dashboard route group
│   ├── layout.jsx            # Dashboard shell layout
│   ├── feed/
│   │   └── page.jsx          # Main feed page
│   ├── profile/
│   │   ├── page.jsx          # Own profile page
│   │   └── [userId]/
│   │       └── page.jsx      # Other user's profile
│   ├── messages/
│   │   ├── page.jsx          # Messages list
│   │   └── [conversationId]/
│   │       └── page.jsx      # Individual conversation
│   ├── groups/
│   │   ├── page.jsx          # Groups listing
│   │   ├── create/
│   │   │   └── page.jsx      # Create group page
│   │   └── [groupId]/
│   │       ├── page.jsx      # Group detail
│   │       └── events/
│   │           └── page.jsx  # Group events
│   ├── notifications/
│   │   └── page.jsx          # Notifications page
│   └── settings/
│       └── page.jsx          # User settings
└── api/                      # API routes (if needed for frontend-only endpoints)
    └── auth/
        └── [...nextauth]/
            └── route.js      # NextAuth configuration
```

## Components Directory

```
frontend/src/components/
├── ui/                       # Reusable primitive components
│   ├── button.jsx
│   ├── input.jsx
│   ├── textarea.jsx
│   ├── select.jsx
│   ├── checkbox.jsx
│   ├── modal.jsx
│   ├── dropdown.jsx
│   ├── avatar.jsx
│   ├── badge.jsx
│   ├── card.jsx
│   ├── skeleton.jsx
│   ├── toast.jsx
│   ├── tooltip.jsx
│   └── index.js              # Barrel export
├── layout/                   # Layout-specific components
│   ├── navbar.jsx
│   ├── sidebar.jsx
│   ├── footer.jsx
│   ├── mobile-nav.jsx
│   └── protected-route.jsx   # Route protection wrapper
├── features/                 # Feature-specific components
│   ├── auth/
│   │   ├── login-form.jsx
│   │   ├── register-form.jsx
│   │   └── forgot-password-form.jsx
│   ├── posts/
│   │   ├── post-card.jsx
│   │   ├── post-composer.jsx
│   │   ├── comment-list.jsx
│   │   ├── comment-form.jsx
│   │   └── reaction-buttons.jsx
│   ├── chat/
│   │   ├── chat-window.jsx
│   │   ├── message-bubble.jsx
│   │   ├── message-input.jsx
│   │   ├── conversation-list.jsx
│   │   └── online-indicator.jsx
│   ├── groups/
│   │   ├── group-card.jsx
│   │   ├── group-form.jsx
│   │   ├── event-card.jsx
│   │   ├── event-form.jsx
│   │   └── member-list.jsx
│   ├── notifications/
│   │   ├── notification-item.jsx
│   │   ├── notification-dropdown.jsx
│   │   └── notification-badge.jsx
│   └── profile/
│       ├── profile-header.jsx
│       ├── profile-avatar.jsx
│       ├── follow-button.jsx
│       └── stats-card.jsx
└── shared/                   # Shared across features
    ├── image-uploader.jsx
    ├── emoji-picker.jsx
    ├── infinite-scroll.jsx
    └── search-bar.jsx
```

## State Management

```
frontend/src/
├── store/                    # Zustand stores
│   ├── auth-store.js
│   ├── chat-store.js
│   ├── notification-store.js
│   └── index.js
├── context/                  # React Context providers
│   ├── auth-context.jsx
│   ├── notification-context.jsx
│   └── websocket-context.jsx
└── hooks/                    # Custom React hooks
    ├── use-auth.js
    ├── use-websocket.js
    ├── use-notifications.js
    ├── use-infinite-scroll.js
    ├── use-debounce.js
    └── use-media-query.js
```

## Utilities and Configuration

```
frontend/src/
├── lib/                      # Core utilities and configurations
│   ├── api-client.js         # Axios/fetch instance with interceptors
│   ├── websocket-client.js   # WebSocket connection manager
│   ├── utils.js              # Helper functions (cn, formatDate, etc.)
│   ├── constants.js          # App constants
│   └── validators.js         # Form validation schemas (Zod)
├── types/                    # TypeScript type definitions
│   ├── user.js
│   ├── post.js
│   ├── comment.js
│   ├── group.js
│   ├── event.js
│   ├── message.js
│   ├── notification.js
│   └── index.js
└── middleware.js             # Next.js middleware for route protection
```

## Public Assets

```
frontend/public/
├── images/
│   ├── logo.svg
│   ├── placeholder-avatar.png
│   └── og-image.png
├── icons/
│   ├── favicon.ico
│   └── icons/
└── fonts/                    # Custom fonts if needed
```

## Key Design Decisions

1. **App Router**: Using Next.js 14+ App Router for better performance and SEO
2. **Route Groups**: `(auth)` and `(dashboard)` for logical organization without affecting URLs
3. **Feature-based components**: Organized by domain (posts, chat, groups) for scalability
4. **TypeScript**: Full type safety across the application
5. **Tailwind CSS**: Utility-first styling for rapid UI development
6. **Zustand**: Lightweight state management for global state
7. **React Context**: For auth and websocket state that needs to be widely available
8. **Custom hooks**: Reusable logic extraction
9. **Barrel exports**: Clean imports via index.js files
