import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionPayload } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  // Protect /admin routes and the root page (/)
  if (
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname === "/"
  ) {
    const payload = await getSessionPayload(request);

    if (!payload) {
      // If there's no valid session, redirect to the login page
      // Assuming you have a /login page (you can adjust this path)
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*"],
};
