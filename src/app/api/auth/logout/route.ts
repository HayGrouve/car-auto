import type { NextRequest, NextResponse } from "next/server";
import {
  createSuccessResponse,
  withErrorHandler,
  type ApiResponse,
} from "@/lib/api-errors";

/**
 * Logout handler - clears JWT authentication cookie
 * 
 * @returns Success response with cleared cookie
 * 
 * @example
 * ```typescript
 * POST /api/auth/logout
 * Response: { "success": true, "data": { "ok": true } }
 * Cookie: tm_jwt="" (cleared)
 * ```
 */
async function handleLogout(
  _req: Request | NextRequest,
): Promise<NextResponse<ApiResponse<{ ok: boolean }>>> {
  const res = createSuccessResponse({ ok: true });
  res.cookies.set("tm_jwt", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
  return res;
}

export const POST = withErrorHandler(handleLogout);
