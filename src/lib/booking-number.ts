import { db } from "./db";
import { Prisma, PrismaClient } from "@prisma/client";

export const BOOKING_CODE_PREFIX = "NA";
export const MIN_SEQUENCE_WIDTH = 6;
export const INITIAL_SEQUENCE_VALUE = 101;

export interface BookingNumberAllocation {
  sequenceNumber: number;
  bookingCode: string;
}

/**
 * Formats a sequence number into the permanent public booking code.
 * Structure: NA + sequential integer padded to at least 6 digits.
 * Examples:
 *   101     -> NA000101
 *   999     -> NA000999
 *   1000    -> NA001000
 *   999999  -> NA999999
 *   1000000 -> NA1000000 (grows naturally, never truncated)
 */
export function formatBookingCode(sequenceNumber: number): string {
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
    throw new Error(`Invalid sequence number: ${sequenceNumber}. Must be a positive integer.`);
  }

  const numStr = sequenceNumber.toString();
  const padded = numStr.length < MIN_SEQUENCE_WIDTH ? numStr.padStart(MIN_SEQUENCE_WIDTH, "0") : numStr;
  return `${BOOKING_CODE_PREFIX}${padded}`;
}

/**
 * Parses the numeric sequence portion from a public booking code.
 * Returns null if the code is invalid or does not match the NA prefix.
 */
export function parseBookingCode(code: string): number | null {
  if (!code || typeof code !== "string") return null;

  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!clean.startsWith(BOOKING_CODE_PREFIX)) return null;

  const numPart = clean.slice(BOOKING_CODE_PREFIX.length);
  if (!numPart || !/^\d+$/.test(numPart)) return null;

  const parsed = parseInt(numPart, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Normalizes user input for booking lookup:
 * Supports:
 * - Standard: NA000101
 * - Hyphenated: NA-000101
 * - Case-insensitive: na000101
 * - Raw sequence number: 101 -> NA000101
 * - Unpadded format: NA101 -> NA000101
 * - Legacy codes: BA-84920, SS-74118
 */
export function getBookingLookupCandidates(input: string): string[] {
  const clean = input.trim().toUpperCase();
  if (!clean) return [];

  const withoutHyphen = clean.replace(/[^A-Z0-9]/g, "");
  const candidates = new Set<string>();

  candidates.add(clean);
  candidates.add(withoutHyphen);

  // If user entered only digits (e.g. "101" or "000101")
  if (/^\d+$/.test(withoutHyphen)) {
    const seq = parseInt(withoutHyphen, 10);
    if (seq > 0) {
      candidates.add(formatBookingCode(seq));
    }
  }

  // If format is NA followed by digits (e.g. "NA101" or "NA000101")
  if (withoutHyphen.startsWith(BOOKING_CODE_PREFIX)) {
    const numPart = withoutHyphen.slice(BOOKING_CODE_PREFIX.length);
    if (/^\d+$/.test(numPart)) {
      const seq = parseInt(numPart, 10);
      if (seq > 0) {
        candidates.add(formatBookingCode(seq));
        candidates.add(`${BOOKING_CODE_PREFIX}-${numPart}`);
        candidates.add(`${BOOKING_CODE_PREFIX}-${numPart.padStart(MIN_SEQUENCE_WIDTH, "0")}`);
      }
    }
  }

  // Legacy format support: 2-3 letters + digits (e.g. BA-12345 or SS-74118)
  const legacyMatch = withoutHyphen.match(/^([A-Z]{2,3})(\d+)$/);
  if (legacyMatch) {
    candidates.add(`${legacyMatch[1]}-${legacyMatch[2]}`);
  }

  return Array.from(candidates);
}

/**
 * Allocates the next monotonic booking number from the database sequence table.
 *
 * Rules:
 * 1. The database owns the sequence.
 * 2. Never generated from MAX(id) + 1 or random numbers.
 * 3. Never reset or reused, even after cancellations, refunds, or failures.
 * 4. Multi-instance and concurrency safe.
 */
let isSequenceInitialized = false;

export async function allocateBookingNumber(
  dbOrTx?: Prisma.TransactionClient | PrismaClient
): Promise<BookingNumberAllocation> {
  const client = dbOrTx || db;
  const maxAttempts = 25;
  let delay = 15;

  if (!isSequenceInitialized) {
    try {
      await client.bookingSequence.upsert({
        where: { id: "global" },
        create: { id: "global", nextValue: INITIAL_SEQUENCE_VALUE },
        update: {},
      });
      isSequenceInitialized = true;
    } catch {
      // Ignored if concurrent worker already created it
    }
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // 1. Atomic increment on the sequence table
      const updated = await client.bookingSequence.update({
        where: { id: "global" },
        data: {
          nextValue: { increment: 1 },
        },
        select: {
          nextValue: true,
        },
      });

      const sequenceNumber = updated.nextValue - 1;
      const bookingCode = formatBookingCode(sequenceNumber);

      return { sequenceNumber, bookingCode };
    } catch (err: any) {
      // If sequence row does not exist yet (P2025: Record to update not found)
      if (err?.code === "P2025") {
        await client.bookingSequence.upsert({
          where: { id: "global" },
          create: { id: "global", nextValue: INITIAL_SEQUENCE_VALUE },
          update: {},
        }).catch(() => {});
        isSequenceInitialized = true;
        continue;
      }

      // Retry on busy, lock, or timeout errors under heavy concurrency
      const isLockOrTimeout =
        err?.code === "P1008" ||
        err?.code === "P2034" ||
        err?.code === "P2028" ||
        err?.message?.includes("database is locked") ||
        err?.message?.includes("SQLITE_BUSY") ||
        err?.message?.includes("timeout");

      if (isLockOrTimeout && attempt < maxAttempts) {
        await new Promise((res) => setTimeout(res, delay + Math.floor(Math.random() * 25)));
        delay = Math.min(delay * 1.4, 350);
        continue;
      }

      throw err;
    }
  }

  throw new Error("Failed to allocate booking number after multiple database retries.");
}


/**
 * Backward compatibility helper for existing callers.
 * Directs all generation through the database sequence service.
 */
export async function generateUniqueBookingNumber(
  dbOrTx?: any,
  _prefix?: string
): Promise<string> {
  const { bookingCode } = await allocateBookingNumber(dbOrTx);
  return bookingCode;
}

