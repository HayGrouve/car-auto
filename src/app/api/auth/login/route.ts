import { NextRequest, NextResponse } from "next/server";
import { createJwt, verifyPassword } from "@/lib/auth";

// For MVP we use a single hardcoded user stored via env or seeded later.
const SINGLE_USER_EMAIL = process.env.SINGLE_USER_EMAIL || "admin@clinic.local";
const SINGLE_USER_PASSWORD_HASH = process.env.SINGLE_USER_PASSWORD_HASH || "";
const SINGLE_USER_PASSWORD = process.env.SINGLE_USER_PASSWORD || ""; // dev fallback

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (email !== SINGLE_USER_EMAIL) {
    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }
  let ok = false;
  if (SINGLE_USER_PASSWORD_HASH) {
    ok = await verifyPassword(password, SINGLE_USER_PASSWORD_HASH);
  } else if (SINGLE_USER_PASSWORD) {
    ok = password === SINGLE_USER_PASSWORD;
  }
  if (!ok) {
    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
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


