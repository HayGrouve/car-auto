import { type NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login", "/api/auth/logout", "/favicon.ico"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith("/assets") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }
  const token = req.cookies.get("tm_jwt")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const payload = token ? await verifyJwt(token) : null;
  if (!payload) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.set("tm_jwt", "", { httpOnly: true, expires: new Date(0), path: "/" });
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth/login|api/auth/logout|_next|assets|favicon.ico).*)"]
};


