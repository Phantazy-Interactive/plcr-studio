import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

const isAuthEnabled = process.env.AUTH_ENABLED === "true";

export async function proxy(request: NextRequest) {
  // If auth is not enabled, allow all requests
  if (!isAuthEnabled) {
    return NextResponse.next();
  }

  // If auth is enabled, check authentication
  const session = await auth();

  // Allow access to auth pages and auth API routes
  if (
    request.nextUrl.pathname.startsWith("/api/auth") ||
    request.nextUrl.pathname.startsWith("/auth")
  ) {
    return NextResponse.next();
  }

  // For API routes (other than /api/auth), return 401 if not authenticated
  if (request.nextUrl.pathname.startsWith("/api/")) {
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // For page routes, redirect to sign in if not authenticated
  if (!session) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};
