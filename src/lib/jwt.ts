import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();
const getSecretKey = () => encoder.encode(process.env.JWT_SECRET!);

export async function createJwt(payload: Record<string, unknown>, ttlSeconds = 60 * 60) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttlSeconds;
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(getSecretKey());
}

export async function verifyJwt<T = any>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as T;
  } catch {
    return null;
  }
}


