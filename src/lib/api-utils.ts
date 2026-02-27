import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/** Standard API error response */
export function apiError(message: string, status: number = 500) {
  return NextResponse.json({ error: message }, { status });
}

/** Wrap an API handler with try-catch + auth check */
export function withAuth(
  handler: (session: any, ...args: any[]) => Promise<NextResponse>,
  options?: { roles?: string[] }
) {
  return async (...args: any[]) => {
    try {
      const session = await auth();
      if (!session?.user?.id) return apiError("Unauthorized", 401);
      if (options?.roles && !options.roles.includes((session.user as any).role)) {
        return apiError("Forbidden", 403);
      }
      return await handler(session, ...args);
    } catch (err: any) {
      console.error("[API Error]", err?.message || err);
      return apiError(
        process.env.NODE_ENV === "development" ? err?.message || "Internal error" : "Internal server error",
        500
      );
    }
  };
}
