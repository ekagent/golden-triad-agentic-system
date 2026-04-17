# Multi-Tenant Authentication (MONY-1)

The underlying platform serves as the basis for a consumer-facing AI coding assistant model. To properly bill users (via usage-based API hooks) and track history independently, the ecosystem leverages **Clerk Authentication**.

## Structural Overview
1. **Clerk Provider (`app/layout.jsx`)**
   - The Root Layout wraps the entire app scope in `<ClerkProvider>`. This initializes Clerk's internal session context allowing the app securely route logic based on the user's `userId`.

2. **Route Middleware Restrictions (`middleware.js`)**
   - A globally applied `clerkMiddleware` logic intercepts every edge request navigating to the application.
   - It automatically grants visibility to explicit public paths configured inside `createRouteMatcher` (e.g. `/` landing page splash, `/api/run` execution hooks, `/api/health`).
   - Every other route (e.g. the `/dashboard` workspace and agent console) triggers `await auth.protect()` sending the user to a secure Hosted Login workflow if they are missing a valid active Clerk cookie.

3. **Environments and Setup**
   - Environment variables map standard integration IDs directly from the developer's Clerk platform settings:
   ```bash
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/
   ```
