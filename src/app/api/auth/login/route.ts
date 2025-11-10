import { type NextRequest } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { createJwt } from "@/lib/jwt";
import {
  createErrorResponse,
  createSuccessResponse,
  ErrorCodes,
  withErrorHandler,
} from "@/lib/api-errors";
import {
  loginRequestSchema,
  validateRequestBody,
} from "@/lib/api-validation";

// For MVP we use a single hardcoded user stored via env or seeded later.
const SINGLE_USER_EMAIL = process.env.SINGLE_USER_EMAIL ?? "admin@clinic.local";
const SINGLE_USER_PASSWORD_HASH = process.env.SINGLE_USER_PASSWORD_HASH ?? "";
const SINGLE_USER_PASSWORD = process.env.SINGLE_USER_PASSWORD ?? ""; // dev fallback

/**
 * Login handler - authenticates user and sets JWT cookie
 * 
 * @param req - Next.js request object containing email and password in JSON body
 * @returns Success response with JWT cookie set, or error response
 * 
 * @example
 * ```typescript
 * POST /api/auth/login
 * Body: { "email": "admin@clinic.local", "password": "password123" }
 * Response: { "success": true, "data": { "ok": true } }
 * Cookie: tm_jwt=<jwt-token>
 * ```
 */
async function handleLogin(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const validation = validateRequestBody(loginRequestSchema, body);
  if (!validation.success) {
    return createErrorResponse(
      ErrorCodes.VALIDATION_ERROR,
      validation.error,
      400,
    );
  }

  const { email, password } = validation.data;

  if (email !== SINGLE_USER_EMAIL) {
    return createErrorResponse(
      ErrorCodes.UNAUTHORIZED,
      "Invalid credentials",
      401,
    );
  }

  const ok = SINGLE_USER_PASSWORD_HASH
    ? await verifyPassword(password, SINGLE_USER_PASSWORD_HASH)
    : SINGLE_USER_PASSWORD !== "" && password === SINGLE_USER_PASSWORD;

  if (!ok) {
    return createErrorResponse(
      ErrorCodes.UNAUTHORIZED,
      "Invalid credentials",
      401,
    );
  }

  const token = await createJwt({ sub: SINGLE_USER_EMAIL });
  const res = createSuccessResponse({ ok: true });
  res.cookies.set("tm_jwt", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
  return res;
}

export const POST = withErrorHandler(handleLogin);
