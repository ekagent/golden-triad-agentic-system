import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// We define all routes that should be public
const isPublicRoute = createRouteMatcher([
  '/',
  '/api/health(.*)',
  '/api/run(.*)' // We'll leave API execution public temporarily until MONY-5 introduces billing
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    // If route is not public (like /dashboard), protect it
    await auth.protect();
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
