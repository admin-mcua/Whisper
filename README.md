# Whisper — Anonymous Messaging Platform

## Project Overview
- **Name**: Whisper
- **Goal**: An NGL/Sendit-style anonymous messaging app. Users sign up, get a personal link (`/@username`), share it, and receive anonymous messages in their inbox. Includes an admin backend to view all registered accounts.
- **Stack**: Hono + TypeScript + Cloudflare Pages + D1 (SQLite) + TailwindCSS (CDN)

## Features (Completed)
- ✅ **Auth** — Sign up & log in with username/email + password (PBKDF2 hashing via Web Crypto)
- ✅ **Facebook OAuth** — "Continue with Facebook" (real OAuth flow + demo fallback for testing)
- ✅ **Play tab** — "Copy your link" button that gives each user a unique `/@username` page
- ✅ **Per-user public page** — `/@username` where anyone can send an anonymous message
- ✅ **Inbox tab** — Received anonymous messages with unread badge + delete
- ✅ **Admin backend** — `/admin` panel (password protected) listing every account, provider, message counts, and stats
- ✅ **Persistent storage** — Cloudflare D1 database (survives restarts)

## Functional URIs
| Path | Method | Auth | Description |
|------|--------|------|-------------|
| `/` | GET | - | Login / signup landing page |
| `/play` | GET | user | Dashboard "Play" tab — copy your link |
| `/inbox` | GET | user | Dashboard "Inbox" tab — read messages |
| `/@:username` | GET | - | Public page to send an anonymous message |
| `/admin` | GET | - | Admin login + accounts panel |
| `/logout` | GET | user | Clear session |
| `/auth/facebook` | GET | - | Start Facebook OAuth (demo if no creds) |
| `/auth/facebook/callback` | GET | - | Facebook OAuth callback |
| `/api/signup` | POST | - | `{username,email?,password}` → create account |
| `/api/login` | POST | - | `{identifier,password}` → log in |
| `/api/me` | GET | user | Current user info + share link |
| `/api/messages` | GET | user | List inbox messages (marks read) |
| `/api/messages/unread` | GET | user | Unread count |
| `/api/messages/:id` | DELETE | user | Delete a message |
| `/api/send/:username` | POST | - | `{body}` → send anonymous message |
| `/api/admin/login` | POST | - | `{password}` → admin session |
| `/api/admin/accounts` | GET | admin | All accounts + stats |
| `/api/admin/messages/:userId` | GET | admin | Messages for a user |

## Data Architecture
- **Storage**: Cloudflare D1 (SQLite)
- **Tables**:
  - `users` — id, username (unique, used for `/@`), email, password_hash, display_name, avatar_url, provider (`local`/`facebook`), provider_id, created_at, last_login
  - `messages` — id, recipient_id (FK users), body, sender_ip, is_read, created_at
- **Sessions**: HMAC-signed cookie tokens (`session` for users, `admin_session` for admin)

## User Guide
1. Open the site → **Sign Up** (choose a username = your link) or **Continue with Facebook**.
2. In **Play**, tap **Copy your link** and share `/@yourname` with friends.
3. Friends open your link and send anonymous messages (they stay anonymous).
4. Read them in your **Inbox**. Delete any you don't want.
5. Admins: go to `/admin`, enter the admin password to see all accounts.

## Configuration (for production)
Set these as Cloudflare secrets (`wrangler pages secret put NAME`):
- `SESSION_SECRET` — random string for signing session tokens
- `ADMIN_PASSWORD` — admin panel password (default `admin123` in dev)
- `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` — from developers.facebook.com (enables real Facebook Login)
- `FACEBOOK_REDIRECT_URI` — e.g. `https://yourapp.pages.dev/auth/facebook/callback`

> Without Facebook credentials, "Continue with Facebook" runs in **demo mode** so you can test the flow.

## Deployment
- **Platform**: Cloudflare Pages
- **Status**: ✅ Running locally (sandbox). Not yet deployed to production Cloudflare.
- **Local dev**: `npm run build && pm2 start ecosystem.config.cjs` (port 3000)
- **DB migrate (local)**: `npx wrangler d1 migrations apply webapp-production --local`
- **Last Updated**: 2026-07-11
