import crypto from "crypto";
import { db } from "./db";
import { Prisma, PrismaClient } from "@prisma/client";

export const ACCESS_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface GeneratedTokens {
  rawBookingToken: string;
  rawInvoiceToken: string;
  expiresAt: Date;
}

export type AccessTokenValidationResult =
  | { valid: true; booking: any; tokenRecord: any; expiresAt: Date }
  | { valid: false; error: "not_found" | "expired" | "revoked" | "invalid_purpose"; booking?: any; expiresAt?: Date };

/**
 * Computes a SHA-256 hash of the raw access token for secure database storage.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Generates a 256-bit cryptographically secure random token (64 hex characters).
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Creates customer access tokens for a booking:
 * 1. Match pass access token (customer_access)
 * 2. Invoice download token (invoice_download)
 *
 * Rules:
 * - Expiration is calculated server-side as booking.createdAt + 7 days.
 * - Tokens are stored as SHA-256 hashes to protect against database exposure.
 * - Raw tokens are returned to be sent to the customer URL.
 */
export async function createBookingAccessTokens(
  bookingId: string,
  bookingCreatedAt: Date,
  dbOrTx?: Prisma.TransactionClient | PrismaClient
): Promise<GeneratedTokens> {
  const client = dbOrTx || db;

  const rawBookingToken = generateSecureToken();
  const rawInvoiceToken = generateSecureToken();
  const expiresAt = new Date(bookingCreatedAt.getTime() + ACCESS_TOKEN_EXPIRY_MS);

  const bookingTokenHash = hashToken(rawBookingToken);
  const invoiceTokenHash = hashToken(rawInvoiceToken);

  await client.bookingAccessToken.createMany({
    data: [
      {
        bookingId,
        tokenHash: bookingTokenHash,
        purpose: "customer_access",
        expiresAt,
      },
      {
        bookingId,
        tokenHash: invoiceTokenHash,
        purpose: "invoice_download",
        expiresAt,
      },
    ],
  });

  return {
    rawBookingToken,
    rawInvoiceToken,
    expiresAt,
  };
}

/**
 * Validates a customer access token.
 * Enforces server-authoritative 7-day expiration and purpose check.
 */
export async function validateAccessToken(
  rawToken: string,
  expectedPurpose?: "customer_access" | "invoice_download" | "any"
): Promise<AccessTokenValidationResult> {
  if (!rawToken || typeof rawToken !== "string") {
    return { valid: false, error: "not_found" };
  }

  const tokenHash = hashToken(rawToken.trim());

  const tokenRecord = await db.bookingAccessToken.findUnique({
    where: { tokenHash },
    include: {
      booking: {
        include: {
          venue: {
            include: {
              business: true,
            },
          },
          resource: true,
          customer: true,
          payments: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!tokenRecord) {
    return { valid: false, error: "not_found" };
  }

  if (expectedPurpose && expectedPurpose !== "any" && tokenRecord.purpose !== expectedPurpose) {
    return { valid: false, error: "invalid_purpose" };
  }

  if (tokenRecord.revokedAt) {
    return {
      valid: false,
      error: "revoked",
      booking: tokenRecord.booking,
      expiresAt: tokenRecord.expiresAt,
    };
  }

  const now = new Date();
  if (now.getTime() >= tokenRecord.expiresAt.getTime()) {
    return {
      valid: false,
      error: "expired",
      booking: tokenRecord.booking,
      expiresAt: tokenRecord.expiresAt,
    };
  }

  // Update lastUsedAt asynchronously without blocking response
  db.bookingAccessToken
    .update({
      where: { id: tokenRecord.id },
      data: { lastUsedAt: now },
    })
    .catch(() => {});

  return {
    valid: true,
    booking: tokenRecord.booking,
    tokenRecord,
    expiresAt: tokenRecord.expiresAt,
  };
}

/**
 * Retrieves the latest active tokens for a booking, creating them if missing.
 */
export async function getOrCreateBookingAccessTokens(
  bookingId: string
): Promise<{ rawBookingToken?: string; expiresAt: Date; isExpired: boolean }> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, createdAt: true },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  const expiresAt = new Date(booking.createdAt.getTime() + ACCESS_TOKEN_EXPIRY_MS);
  const isExpired = Date.now() >= expiresAt.getTime();

  return {
    expiresAt,
    isExpired,
  };
}
