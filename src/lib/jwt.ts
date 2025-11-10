import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();
const getSecretKey = () => encoder.encode(process.env.JWT_SECRET ?? "");

/**
 * Creates a JWT token with the given payload
 * 
 * @param payload - Data to include in the JWT token
 * @param ttlSeconds - Time to live in seconds (default: 3600 = 1 hour)
 * @returns Signed JWT token string
 * 
 * @example
 * ```typescript
 * const token = await createJwt({ sub: "user@example.com" });
 * ```
 */
export async function createJwt(
  payload: Record<string, unknown>,
  ttlSeconds = 60 * 60,
) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttlSeconds;
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(getSecretKey());
}

/**
 * Verifies and decodes a JWT token
 * 
 * @param token - JWT token string to verify
 * @returns Decoded payload if valid, null if invalid or expired
 * 
 * @example
 * ```typescript
 * const payload = await verifyJwt<{ sub: string }>(token);
 * if (payload) {
 *   console.log("User:", payload.sub);
 * }
 * ```
 */
export async function verifyJwt<T = Record<string, unknown>>(
  token: string,
): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as T;
  } catch {
    return null;
  }
}
