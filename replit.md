# OneStack.pro SaaS Platform

## Overview
OneStack.pro is a subscription-based software access platform where users subscribe via Whop, authorize via Discord OAuth, set up DICloak browser with shared credentials and a unique encryption key, and access premium AI/software tools seamlessly. The platform includes a landing page, Discord OAuth login, credentials/setup guide, all-in-one dashboard, affiliate program, and admin management.

## Tech Stack
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui components
- **Backend**: Express.js with express-session (PostgreSQL session store)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Discord OAuth2 as primary login, email/password for admin only (hidden /admin-login route)
- **Discord**: OAuth2 as primary authentication (identify + email scopes)
- **Email**: Resend integration for license key delivery (onboarding@resend.dev default sender)
- **DICloak**: API integration for automated member management (create/enable/disable)
- **Security**: express-rate-limit for API rate limiting, concurrent session prevention
- **Routing**: wouter (frontend), Express routes (backend)

## Project Structure
- `client/src/` - Frontend React application
  - `pages/` - Route pages (landing, auth, credentials, dashboard, tools, affiliates, admin, admin-login)
  - `components/` - Reusable components (sidebar, theme toggle)
  - `lib/` - Auth context, theme provider, query client
- `server/` - Backend Express application
  - `routes.ts` - All API endpoints
  - `storage.ts` - Database storage layer (Drizzle)
  - `db.ts` - Database connection
  - `seed.ts` - Seed data for tools and admin user
  - `email.ts` - Resend email integration
- `shared/schema.ts` - Drizzle schema and Zod validation

## Database Tables
- `users` - User accounts with email, passwordHash, licenseKey (unique), welcomeToken (unique, one-time use), role, subscription status, discord info (discordId, discordUsername), referral info, currentSessionId
- `tools` - Software tools with name, description, icon, category, logoUrl, accessUrl, toolUsername, toolPassword, totpSecret (for shared account 2FA)
- `referrals` - Referral relationships between users
- `payout_requests` - Affiliate payout requests with bank details
- `session_logs` - Tool launch session logs

## Application Flow

### Phase 1: Landing Page (/)
- Public landing page for unauthenticated visitors
- Value proposition, tools grid with logos, CTA → Whop checkout
- "Sign In" link for returning users

### Phase 2: Purchase (Whop)
- User clicks "Get Started" → redirected to Whop checkout
- After payment, Whop webhook creates user, generates encryption key, activates subscription
- Key emailed via Resend as backup

### Phase 3: Auth Page (/auth) — Discord OAuth Login
- "Authorize with Discord" button (styled like competitor)
- Clicking initiates Discord OAuth2 flow (identify + email scopes)
- After authorization, callback creates/finds user:
  1. Match by discordId (returning user)
  2. Match by email (Whop-created user linking Discord)
  3. Create new user (new Discord user, inactive subscription)
- Redirects to /credentials after successful auth

### Phase 4: Credentials/Setup Guide (/credentials)
- Step-by-step guide matching competitor layout:
  1. Download DICloak browser
  2. Login Credentials (shared email/password with copy buttons)
  3. Get 2FA Code (generates TOTP on click, 30s countdown)
  4. Unique Encryption Key (per-user, with copy + security warning)
  5. Select AutoLogin profile in DICloak

### Phase 5: Dashboard (/dashboard) — All-in-One Hub
- Referral banner: "Earn 33% recurring • Get lifetime access after X referrals"
- "ALL TOOLS 100% PRIVATE • FASTEST LOGINS • ZERO DOWNTIME" banner
- "ONESTACK TOOLS" heading with search bar and category filters
- **Tools Grid**: All tools with logos, click to launch (opens URL directly in new tab)
  - Locked state if no active subscription
- **Affiliate Section**: referral link, earnings, payout request form, payout history
- **Settings**: View/copy encryption key, link Discord, browser preference

## Key Features
1. **Discord OAuth Authentication** - Primary login via Discord authorization
2. **Credentials/Setup Guide** - Post-auth page with DICloak setup, shared credentials, 2FA, encryption key
3. **Seamless Tool Launch** - Click tool → opens in new tab
4. **Live 2FA Code Generation** - "Get 2FA Code" button generates TOTP codes with 30s countdown
5. **All-in-One Dashboard** - Tools with search/filter, affiliates, and settings
6. **Affiliate Program** - 25-40% recurring commissions, payout requests with bank details
7. **Admin Panel** - User management, tool management, payout approval, session logs
8. **Hidden Admin Login** - Separate /admin-login route for admin email/password access
9. **Security** - Rate limiting, concurrent session prevention

## Whop Integration
- Subscribe button opens `VITE_WHOP_URL` in new tab
- Webhook: `POST /api/webhooks/whop`
  - `membership.went_valid` / `payment.succeeded` → creates user, generates key, activates subscription
  - `membership.went_invalid` → cancels subscription
- Optional `WHOP_WEBHOOK_SECRET` for signature verification

## Discord OAuth Setup
Requires environment variables:
- `DISCORD_CLIENT_ID` - Discord application client ID
- `DISCORD_CLIENT_SECRET` - Discord application client secret
- Redirect URI dynamically computed: `{protocol}://{host}/api/discord/callback`
- Scopes: identify, email

## Default Admin Account
- Email: admin@onestack.pro
- Password: admin123!
- License Key: ADMN-ADMN-ADMN-ADMN
- Login via hidden route: /admin-login

## Design
- Dark-themed by default with light mode toggle
- Cyan/teal primary color palette (hsl 186)
- OneStack logo in sidebar, landing page, auth page
- Inter font family, clean SaaS aesthetic

## API Endpoints
### Auth
- POST /api/auth/login - Login with { licenseKey } or { email, password }
- POST /api/auth/logout - Logout
- GET /api/auth/me - Get current user
- GET /api/auth/welcome?session={token} - Auto-login via welcome token (one-time use)
- GET /api/auth/license-key - Get current user's key
- PATCH /api/auth/preferred-browser - Set preferred browser

### Discord OAuth
- GET /api/discord/authorize - Initiate Discord OAuth (returns URL)
- GET /api/discord/callback - Discord OAuth callback (handles login/link)
- POST /api/discord/unlink - Unlink Discord account

### Credentials
- GET /api/credentials - Get shared login credentials + user's license key
- POST /api/credentials/totp - Generate fresh TOTP code for shared tool

### Tools
- GET /api/tools - List tools (public: limited fields; authenticated: full)
- POST /api/tools/:id/launch - Launch tool (logs session, returns accessUrl)
- POST /api/tools/:id/totp - Get fresh TOTP code for tool

### Admin
- GET /api/admin/stats - Dashboard statistics
- GET/POST /api/admin/users - List/create users
- PATCH /api/admin/users/:id - Update user
- POST /api/admin/users/:id/regenerate-key - Regenerate encryption key
- DELETE /api/admin/users/:id - Delete user
- POST /api/admin/tools - Create tool
- PATCH /api/admin/tools/:id - Update tool

### Email
- Encryption key emails sent via Resend (default: onboarding@resend.dev)
