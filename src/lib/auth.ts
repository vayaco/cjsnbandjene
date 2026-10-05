import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "slot-booking-saas-secret-key-2026";
const COOKIE_NAME = "sb_admin_token";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin" | "venue_manager" | "staff";
  businessId: string;
  venueId?: string | null;
}

/**
 * Hash a plain text password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare plain text password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create a signed JWT token
 */
export function signToken(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}

/**
 * Get the current authenticated admin/staff user from cookies
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  return verifyToken(token);
}

/**
 * Require an authenticated user with minimum role permission
 */
export async function requireAuth(
  allowedRoles: string[] = ["super_admin", "admin", "venue_manager", "staff"]
): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  if (!allowedRoles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }

  return user;
}

/**
 * Require Super Admin role specifically
 */
export async function requireSuperAdmin(): Promise<SessionUser> {
  return requireAuth(["super_admin"]);
}

