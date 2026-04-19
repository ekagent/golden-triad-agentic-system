import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { checkRateLimit, getRateLimitHeaders, classifyRoute, extractIdentifier } from "@/lib/rate-limit";

// Routes that don't require Clerk authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/waitlist',
  '/api/health(.*)',
  '/api/waitlist(.*)',      // Waitlist signup is public
  '/api/v1/(.*)',           // Public API — uses API key auth, not Clerk
  '/api/webhooks/(.*)',     // Webhooks — verified by signature, not Clerk
]);


export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Rate limit all API routes
  if (pathname.startsWith("/api/")) {
    const tier = classifyRoute(pathname);
    const identifier = extractIdentifier(req);
    const result = await checkRateLimit(identifier, tier);

    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please slow down.", retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000) }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...getRateLimitHeaders(result)
          }
        }
      );
    }
  }

  // Clerk auth for non-public routes
  if (!isPublicRoute(req)) {
    await auth.protect();

    // Private Beta Gate
    if (process.env.PRIVATE_BETA_MODE === "true" && pathname !== "/waitlist") {
      const { userId } = await auth();
      const admins = (process.env.ADMIN_USER_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
      const isAdmin = userId && admins.includes(userId);

      if (!isAdmin) {
        return NextResponse.redirect(new URL("/waitlist", req.url));
      }
    }
  }
});


export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
