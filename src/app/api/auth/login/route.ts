import { type NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { createJwt } from "@/lib/jwt";

// For MVP we use a single hardcoded user stored via env or seeded later.
const SINGLE_USER_EMAIL = process.env.SINGLE_USER_EMAIL ?? "admin@clinic.local";
const SINGLE_USER_PASSWORD_HASH = process.env.SINGLE_USER_PASSWORD_HASH ?? "";
const SINGLE_USER_PASSWORD = process.env.SINGLE_USER_PASSWORD ?? ""; // dev fallback

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { email?: string; password?: string };
  const email = body?.email ?? "";
  const password = body?.password ?? "";
  if (email !== SINGLE_USER_EMAIL) {
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 },
    );
  }
  const ok = SINGLE_USER_PASSWORD_HASH
    ? await verifyPassword(password, SINGLE_USER_PASSWORD_HASH)
    : SINGLE_USER_PASSWORD !== "" && password === SINGLE_USER_PASSWORD;
  if (!ok) {
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 },
    );
  }
  const token = await createJwt({ sub: SINGLE_USER_EMAIL });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("tm_jwt", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
  return res;
}
