# Snapchat Clone — Frontend

A full-featured Snapchat-inspired web application built with React, TypeScript, and Tailwind CSS. Supports real-time messaging, ephemeral snaps, stories, camera capture, and user moderation.

---

## Table of Contents

- [Project Overview](https://claude.ai/chat/04240e5b-0fb5-42c8-892c-22ca923898b2#project-overview)
- [Tech Stack](https://claude.ai/chat/04240e5b-0fb5-42c8-892c-22ca923898b2#tech-stack)
- [Features](https://claude.ai/chat/04240e5b-0fb5-42c8-892c-22ca923898b2#features)
- [Folder Structure](https://claude.ai/chat/04240e5b-0fb5-42c8-892c-22ca923898b2#folder-structure)
- [Prerequisites](https://claude.ai/chat/04240e5b-0fb5-42c8-892c-22ca923898b2#prerequisites)
- [Getting Started](https://claude.ai/chat/04240e5b-0fb5-42c8-892c-22ca923898b2#getting-started)
- [Environment Variables](https://claude.ai/chat/04240e5b-0fb5-42c8-892c-22ca923898b2#environment-variables)
- [Available Scripts](https://claude.ai/chat/04240e5b-0fb5-42c8-892c-22ca923898b2#available-scripts)
- [Architecture Decisions](https://claude.ai/chat/04240e5b-0fb5-42c8-892c-22ca923898b2#architecture-decisions)
- [Key Concepts](https://claude.ai/chat/04240e5b-0fb5-42c8-892c-22ca923898b2#key-concepts)
- [API Integration](https://claude.ai/chat/04240e5b-0fb5-42c8-892c-22ca923898b2#api-integration)
- [Real-Time Events](https://claude.ai/chat/04240e5b-0fb5-42c8-892c-22ca923898b2#real-time-events)
- [Media Handling](https://claude.ai/chat/04240e5b-0fb5-42c8-892c-22ca923898b2#media-handling)
- [State Management](https://claude.ai/chat/04240e5b-0fb5-42c8-892c-22ca923898b2#state-management)

---

## Project Overview

This is the frontend client for the Snapchat Clone platform. It communicates with a Node.js/Express/TypeScript backend via a REST API and a persistent Socket.IO WebSocket connection. All media files are uploaded directly to AWS S3 using presigned URLs — the frontend never routes binary data through the backend server.

---

## Tech Stack

Category

Technology

Reason

Framework

React 18 + TypeScript

Component model + end-to-end type safety

Build Tool

Vite 5

Near-instant HMR, fast production builds

Styling

Tailwind CSS

Utility-first, no CSS files to maintain

Routing

React Router v6

Nested routes, protected route wrappers

Global State

Zustand

Minimal boilerplate, TypeScript-native

Server State

TanStack React Query

Caching, background refetch, loading states

HTTP Client

Axios

Interceptors for automatic token refresh

Real-Time

Socket.IO Client

Persistent WebSocket, typed events

Forms

React Hook Form + Zod

Performant forms, schema-driven validation

Camera

React Webcam

getUserMedia wrapper, stream management

Media Recording

MediaRecorder API (native)

Browser-native video/audio recording

Icons

Lucide React

Tree-shakeable, consistent icon set

Notifications

React Hot Toast

Lightweight, Tailwind-compatible toasts

Date Formatting

date-fns

Modular, tree-shakeable date utilities

Image Compression

browser-image-compression

Client-side compression before S3 upload

---

## Features

### Authentication

- User registration and login with JWT tokens
- Automatic access token refresh via Axios interceptor
- Persistent sessions using localStorage
- Password reset via email link

### Real-Time Messaging

- One-to-one direct message conversations
- Group chat with multiple participants
- Live typing indicators
- Message delivered and read receipts
- Ephemeral messages that self-destruct after viewing

### Camera & Media

- Live camera preview using device camera
- Photo capture (image snaps)
- Video recording up to 60 seconds
- Audio note recording
- Client-side image compression before upload
- Direct-to-S3 upload using presigned URLs

### Stories

- Upload image or video stories
- 24-hour automatic expiry with countdown timer
- Public stories visible to all friends
- Custom/private stories visible to selected friends only
- Stories feed grouped by author with unviewed indicators

### Friends & Discovery

- Search users by username
- Send, accept, and reject friend requests
- View incoming pending requests
- Remove friends

### Groups

- Create group chats with multiple friends
- Add and remove members
- Admin and member role management

### Safety & Moderation

- Block users (removes friendship, prevents contact)
- Mute user stories or chats independently
- Report profiles, stories, messages, and snaps
- Download complete personal data export
- Permanent account deletion with cascade cleanup

---

## Folder Structure

```
src/
├── api/                    # All Axios API call functions
│   ├── client.ts           # Axios instance + token refresh interceptor
│   ├── auth.api.ts
│   ├── users.api.ts
│   ├── friendships.api.ts
│   ├── messages.api.ts
│   ├── groups.api.ts
│   ├── media.api.ts
│   ├── stories.api.ts
│   └── moderation.api.ts
│
├── components/             # Reusable UI components
│   ├── ui/                 # Generic primitives (Button, Input, Modal...)
│   ├── auth/               # Login and register forms
│   ├── chat/               # Message bubbles, input, typing indicator
│   ├── stories/            # Story rings, viewer, uploader
│   ├── media/              # Camera, recording timer, preview
│   └── moderation/         # Report modal, block/mute menu
│
├── pages/                  # Route-level page components
│   ├── auth/               # Login, Register, ForgotPassword, ResetPassword
│   ├── chat/               # ChatPage, ConversationPage
│   ├── stories/            # StoriesPage
│   ├── camera/             # CameraPage
│   ├── profile/            # ProfilePage, EditProfilePage
│   ├── friends/            # FriendsPage
│   └── settings/           # SettingsPage
│
├── hooks/                  # Custom React hooks
│   ├── useAuth.ts          # Authentication state and actions
│   ├── useSocket.ts        # Socket.IO connection management
│   ├── useMessages.ts      # Send/receive messages, read receipts
│   ├── useTyping.ts        # Debounced typing indicator logic
│   ├── useCamera.ts        # getUserMedia and MediaRecorder
│   ├── useMediaUpload.ts   # Full presign → S3 PUT → confirm flow
│   ├── useStories.ts       # Stories feed, view, publish
│   └── useFriends.ts       # Friend list and request management
│
├── store/                  # Zustand global state slices
│   ├── auth.store.ts       # User object, tokens, isAuthenticated
│   ├── socket.store.ts     # Socket instance, connection status
│   ├── chat.store.ts       # Conversations, messages, typing states
│   ├── stories.store.ts    # Stories feed, currently viewed story
│   └── ui.store.ts         # Modal visibility, toast queue, loading
│
├── socket/                 # Socket.IO configuration
│   ├── socket.client.ts    # Socket instance factory
│   └── socket.events.ts    # Event name constants (typed)
│
├── types/                  # TypeScript interfaces matching backend DTOs
│   ├── auth.types.ts
│   ├── user.types.ts
│   ├── message.types.ts
│   ├── story.types.ts
│   ├── media.types.ts
│   ├── group.types.ts
│   └── moderation.types.ts
│
├── utils/                  # Pure helper functions
│   ├── token.ts            # localStorage token management
│   ├── time.ts             # Timestamp formatting, countdowns
│   ├── media.ts            # Blob helpers, MIME type detection
│   └── validation.ts       # Shared Zod schemas
│
├── router/
│   ├── AppRouter.tsx       # All route definitions
│   └── ProtectedRoute.tsx  # Auth guard — redirects to /login
│
├── App.tsx
├── main.tsx
└── index.css               # Tailwind base directives only

```

---

## Prerequisites

Before running this project ensure you have:

- **Node.js** v18 or higher — [Download](https://nodejs.org/)
- **npm** v9 or higher (included with Node.js)
- The **backend server** running on `http://localhost:3000` — See the backend repository README for setup instructions

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/snapchat-frontend.git
cd snapchat-frontend

```

### 2. Install dependencies

```bash
npm install

```

### 3. Configure environment variables

```bash
cp .env.example .env

```

Open `.env` and fill in the values described in the [Environment Variables](https://claude.ai/chat/04240e5b-0fb5-42c8-892c-22ca923898b2#environment-variables) section.

### 4. Start the development server

```bash
npm run dev

```

The application will be available at `http://localhost:5173`

> **Important:** The backend server must be running before starting the frontend. The frontend will not function without an active backend connection.

---

## Environment Variables

Create a `.env` file in the project root by copying `.env.example`:

```bash
cp .env.example .env

```

### `.env.example`

```env
# Backend REST API base URL
VITE_API_BASE_URL=http://localhost:3000

# Backend Socket.IO URL (usually same as API URL)
VITE_SOCKET_URL=http://localhost:3000

# Application name (displayed in browser tab and UI)
VITE_APP_NAME=Snapchat Clone

```

### Variable Reference

Variable

Required

Description

`VITE_API_BASE_URL`

Yes

Full URL of the backend REST API including port. No trailing slash.

`VITE_SOCKET_URL`

Yes

URL for the Socket.IO connection. Usually identical to `VITE_API_BASE_URL`.

`VITE_APP_NAME`

No

Display name for the application. Defaults to "Snapchat Clone".

> **Vite Environment Variables:** All variables exposed to the browser must be prefixed with `VITE_`. Variables without this prefix are inaccessible in client-side code. Never put secrets in frontend environment variables — they are visible in the browser.

---

## Available Scripts

Run these from the project root directory:

```bash
# Start the Vite development server with hot module replacement
npm run dev

# Type-check the entire project without emitting output
npm run typecheck

# Run ESLint across all TypeScript and TSX files
npm run lint

# Run Prettier to auto-format all files
npm run format

# Build for production — outputs to dist/
npm run build

# Preview the production build locally before deploying
npm run preview

```

---

## Architecture Decisions

### Why Vite over Create React App

Vite uses native ES modules in development, resulting in near-instant server start times and hot module replacement measured in milliseconds rather than seconds. Create React App bundles everything upfront and becomes slow as the project grows.

### Why Zustand over Redux

Redux requires actions, reducers, action creators, and significant boilerplate for every piece of state. Zustand achieves the same result with a single store function and full TypeScript support out of the box. For this project's scale, Zustand covers all global state needs without the overhead.

### Why React Query alongside Zustand

These two libraries handle different categories of state. React Query manages server state — data that lives on the backend and needs to be fetched, cached, and kept fresh. Zustand manages client state — the socket connection, active UI state, optimistic message updates. Using both together means neither is asked to do something it is not designed for.

### Why Axios over Fetch

The automatic token refresh interceptor is the primary reason. When the backend returns a 401 (access token expired), the Axios interceptor silently requests a new access token using the refresh token and retries the original request — all transparently to the component that made the call. Implementing this with native fetch requires significantly more boilerplate.

### Why React Hook Form over Controlled Inputs

Controlled inputs with `useState` re-render the entire form on every keystroke. React Hook Form uses uncontrolled inputs with a ref-based approach, only triggering re-renders on validation state changes. For login, register, and profile edit forms this results in measurably smoother performance.

### Why the API Layer is Separated from Components

No component imports `axios` directly. All HTTP calls go through the typed functions in `src/api/`. This means if the backend URL changes, the base URL changes in one place. If an endpoint changes, one function updates. Components never need to know how data is fetched — only that it is available through a hook.

---

## Key Concepts

### Token Refresh Flow

```
Component calls API
      ↓
Axios interceptor attaches Bearer token
      ↓
Backend returns 401 (token expired)
      ↓
Response interceptor catches 401
      ↓
Calls POST /api/auth/refresh with refresh token
      ↓
Receives new access token
      ↓
Retries original request with new token
      ↓
Component receives data as if nothing happened

```

### Protected Routes

Every page except `/login`, `/register`, `/forgot-password`, and `/reset-password` is wrapped in `<ProtectedRoute>`. This component reads the authentication state from the Zustand auth store. If the user is not authenticated, it redirects to `/login` and preserves the attempted URL so the user is redirected back after successful login.

### Socket Connection Lifecycle

```
User logs in
      ↓
useSocket hook creates socket with auth token
      ↓
Socket connects to server (JWT verified)
      ↓
User joins their personal notification room (user:userId)
      ↓
User navigates to a conversation
      ↓
emit join_conversation(otherUserId)
      ↓
Socket joins dm:userA:userB room
      ↓
Messages flow in both directions
      ↓
User logs out
      ↓
socket.disconnect() called
      ↓
Socket instance cleared from store

```

### Media Upload Flow

```
User selects or records media
      ↓
useMediaUpload hook calls POST /api/media/presign
      ↓
Backend validates file type and size
      ↓
Backend creates PENDING media record
      ↓
Backend returns { uploadUrl, fileUrl, mediaId, s3Key }
      ↓
Hook PUTs blob directly to uploadUrl (goes to S3, not backend)
      ↓
Hook calls POST /api/media/:id/confirm
      ↓
Backend marks media as UPLOADED
      ↓
Hook returns { mediaId, fileUrl } to the calling component
      ↓
Component sends message with fileUrl and mediaId attached

```

---

## API Integration

All API functions are typed to match the backend DTOs exactly. The Axios client in `src/api/client.ts` handles:

- Setting the `Authorization: Bearer` header on every authenticated request
- Intercepting 401 responses and attempting token refresh automatically
- Redirecting to `/login` if the refresh token is also expired
- Exposing a consistent error shape to all API functions

Every API module exports plain async functions. These are called from React Query hooks in `src/hooks/` and never called directly from components.

---

## Real-Time Events

The Socket.IO client is initialised once after login and stored in the Zustand socket store. Custom hooks subscribe to events using `useEffect` with proper cleanup to prevent listener accumulation.

### Client → Server Events

Event

Payload

When

`join_conversation`

`userId: string`

Opening a DM conversation

`join_group`

`groupId: string`

Opening a group chat

`send_message`

`{receiverId, content, messageType, isEphemeral}`

Sending a DM

`send_group_message`

`{groupId, content, messageType, isEphemeral}`

Sending a group message

`typing_start`

`{receiverId or groupId}`

User begins typing (debounced)

`typing_stop`

`{receiverId or groupId}`

User stops typing

`message_seen`

`{messageId, mediaId?}`

Message becomes visible on screen

### Server → Client Events

Event

Payload

Effect

`new_message`

Full message object

Append to conversation, notify if not active

`new_group_message`

Full message object

Append to group conversation

`user_typing`

`{userId, username}`

Show typing indicator

`user_stopped_typing`

`{userId, username}`

Hide typing indicator

`message_read`

`{messageId, readAt, status}`

Update message status to read

`message_deleted`

`{messageId, reason}`

Remove ephemeral message from UI

---

## Media Handling

### Camera Access

Camera and microphone access uses the browser-native `MediaDevices API`. The `useCamera` hook abstracts:

- Requesting `getUserMedia` permission
- Attaching the stream to a preview `<video>` element
- Starting and stopping `MediaRecorder` for video/audio
- Enforcing the 60-second recording limit with `setTimeout`
- Assembling recorded `Blob` chunks into a single file on recording stop
- Releasing the camera stream when the component unmounts

### Supported Formats

Type

MIME Type

Notes

Image

`image/jpeg`

Compressed client-side before upload

Image

`image/png`

Compressed client-side before upload

Video

`video/webm`

Chrome and Firefox recording format

Audio

`audio/webm`

Chrome and Firefox recording format

Video

`video/mp4`

Safari fallback

### File Size Limits (enforced by backend)

Type

Maximum Size

Image

10 MB

Video

150 MB

Audio

20 MB

### Duration Limit

Video and audio recordings are capped at **60 seconds** enforced by the `useCamera` hook before any data is sent to the backend.

---

## State Management

### Auth Store (`auth.store.ts`)

Holds the authenticated user object, access token, and refresh token. Persisted to `localStorage` so sessions survive page refreshes. Cleared on logout.

### Socket Store (`socket.store.ts`)

Holds the active Socket.IO instance and connection status. The socket is created with the current access token after login and disconnected on logout.

### Chat Store (`chat.store.ts`)

Holds conversation previews, messages for the active conversation, and a map of which users are currently typing. Updated by Socket.IO event listeners in `useMessages` and `useTyping`.

### Stories Store (`stories.store.ts`)

Holds the stories feed grouped by author and the currently viewed story index for the full-screen story viewer.

### UI Store (`ui.store.ts`)

Holds modal open/closed states, active toast notifications, and global loading flags. Keeps UI state out of individual components so modals can be triggered from anywhere.

---

## Contributing

1.  Create a feature branch from `main`: `git checkout -b feature/your-feature-name`
2.  Make your changes with appropriate TypeScript types
3.  Run `npm run typecheck` and `npm run lint` — both must pass
4.  Run `npm run format` to apply consistent formatting
5.  Submit a pull request with a clear description of what changed and why
