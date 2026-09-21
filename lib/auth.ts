import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.JWT_SECRET;

if (!secretKey) {
  throw new Error("JWT_SECRET no está definida");
}

const encodedKey = new TextEncoder().encode(secretKey);

export type UserRole = "USER" | "CREATOR" | "ADMIN";

export type Session = {
  userId: string;
  role: UserRole;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function createToken(
  userId: string,
  role: "USER" | "CREATOR" | "ADMIN"
): Promise<string> {
  return new SignJWT({
    userId,
    role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function verifyToken(
  token: string
): Promise<Session> {
  const { payload } = await jwtVerify(
    token,
    encodedKey
  );

  if (typeof payload.userId !== "string") {
    throw new Error("Token inválido");
  }

  if (
    payload.role !== "USER" &&
    payload.role !== "CREATOR" &&
    payload.role !== "ADMIN"
  ) {
    throw new Error("Rol inválido");
  }

  return {
    userId: payload.userId,
    role: payload.role,
  };
}

export async function getSessionFromRequest(
  request: Request
): Promise<Session | null> {
  const cookieHeader = request.headers.get("cookie");
  const token = cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("session="))
    ?.slice("session=".length);

  if (!token) return null;

  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export function hasRole(
  session: Session | null,
  roles: readonly UserRole[]
): boolean {
  return session !== null && roles.includes(session.role);
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) return null;

  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}