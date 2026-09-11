import { db } from "./db";
import crypto from "crypto";
import { validateBookingDateInWindow } from "./availability";

export interface CreateSlotHoldParams {
  venueId: string;
  resourceId: string;
  dateStr: string;      // "2026-09-15"
  startTimeStr: string; // "18:00"
  endTimeStr: string;   // "19:00"
  customerPhone?: string;
  customerName?: string;
  holdMinutes?: number; // default 10 minutes
}

export interface SlotHoldResult {
  success: boolean;
  holdToken?: string;
  expiresAt?: Date;
  remainingSeconds?: number;
  slotDetails?: {
    venueId: string;
    venueName: string;
    venueSlug: string;
    venueAddress: string;
    resourceId: string;
    resourceName: string;
    dateStr: string;
    startTimeStr: string;
    endTimeStr: string;
    price: number;
    customerName?: string;
    customerPhone?: string;
  };
  error?: string;
}

/**
 * Creates a temporary slot hold for a customer with configurable expiry.
 * Guaranteed atomic lock inside database transaction.
 */
export async function createSlotHold(params: CreateSlotHoldParams): Promise<SlotHoldResult> {
  const {
    venueId,
    resourceId,
    dateStr,
    startTimeStr,
    endTimeStr,
    customerPhone,
    customerName,
    holdMinutes = 10,
  } = params;

  if (!venueId || !resourceId || !dateStr || !startTimeStr || !endTimeStr) {
    return { success: false, error: "Missing required slot parameters." };
  }

  const startAt = new Date(`${dateStr}T${startTimeStr}:00.000Z`);
  const endAt = new Date(`${dateStr}T${endTimeStr}:00.000Z`);
  const now = new Date();

  if (startAt.getTime() <= now.getTime()) {
    return { success: false, error: "This slot is in the past and cannot be booked." };
  }

  const expiresAt = new Date(now.getTime() + holdMinutes * 60 * 1000);
  const holdToken = `hold_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;

  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Purge expired holds for this resource
      await tx.slotHold.deleteMany({
        where: {
          resourceId,
          expiresAt: { lte: now },
        },
      });

      // 2. Fetch court and pricing
      const resource = await tx.resource.findUnique({
        where: { id: resourceId },
        include: {
          venue: {
            include: {
              pricingRules: { where: { status: "active" } },
            },
          },
        },
      });

      if (!resource || resource.venueId !== venueId) {
        throw new Error("Court or venue could not be found.");
      }

      if (resource.status !== "active") {
        throw new Error("This court is currently under maintenance or unavailable.");
      }

      // Enforce 7-day booking window strictly
      const venueTz = resource.venue.timezone || "Asia/Kolkata";
      const windowValidation = validateBookingDateInWindow(dateStr, venueTz);
      if (!windowValidation.valid) {
        throw new Error("This date is no longer available for online booking.");
      }

      // 3. Check for existing confirmed or pending bookings
      const existingBooking = await tx.booking.findFirst({
        where: {
          resourceId,
          dateStr,
          startTimeStr,
          status: { in: ["confirmed", "payment_pending"] },
        },
      });

      if (existingBooking) {
        throw new Error("This slot was just booked by another player. Please select another time.");
      }

      // 4. Check for active holds by another customer
      const existingHold = await tx.slotHold.findFirst({
        where: {
          resourceId,
          startAt,
          expiresAt: { gt: now },
        },
      });

      if (existingHold) {
        throw new Error(
          "This slot is currently being held by another player in checkout. Please select another time."
        );
      }

      // 5. Calculate slot price
      const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
      const dayOfWeek = targetDate.getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dayType = isWeekend ? "weekend" : "weekday";

      const matchedRule = resource.venue.pricingRules.find((r) => {
        const matchDay = r.dayType === "all" || r.dayType === dayType;
        const matchTime = startTimeStr >= r.startTime && startTimeStr < r.endTime;
        return matchDay && matchTime;
      });

      const slotPrice = matchedRule ? matchedRule.price : resource.defaultPrice;

      // 6. Create the slot hold
      await tx.slotHold.create({
        data: {
          resourceId,
          startAt,
          endAt,
          holdToken,
          customerPhone: customerPhone || null,
          expiresAt,
        },
      });

      return {
        venueId: resource.venue.id,
        venueName: resource.venue.name,
        venueSlug: resource.venue.slug,
        venueAddress: resource.venue.address,
        resourceId: resource.id,
        resourceName: resource.name,
        dateStr,
        startTimeStr,
        endTimeStr,
        price: slotPrice,
        customerName,
        customerPhone,
      };
    });

    const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

    return {
      success: true,
      holdToken,
      expiresAt,
      remainingSeconds,
      slotDetails: result,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to hold slot.",
    };
  }
}

/**
 * Retrieves and validates an active slot hold by its token.
 */
export async function getSlotHold(holdToken: string): Promise<SlotHoldResult> {
  if (!holdToken) {
    return { success: false, error: "Hold token is required." };
  }

  const now = new Date();
  const hold = await db.slotHold.findUnique({
    where: { holdToken },
    include: {
      resource: {
        include: {
          venue: {
            include: {
              pricingRules: { where: { status: "active" } },
            },
          },
        },
      },
    },
  });

  if (!hold) {
    return { success: false, error: "Reservation hold not found or already released." };
  }

  if (hold.expiresAt.getTime() <= now.getTime()) {
    // Delete expired hold
    await db.slotHold.delete({ where: { id: hold.id } }).catch(() => {});
    return {
      success: false,
      error: "Your slot reservation has expired. Please select a time slot again.",
    };
  }

  const remainingSeconds = Math.max(0, Math.floor((hold.expiresAt.getTime() - now.getTime()) / 1000));
  const startTimeStr = hold.startAt.toISOString().substring(11, 16);
  const endTimeStr = hold.endAt.toISOString().substring(11, 16);
  const dateStr = hold.startAt.toISOString().substring(0, 10);

  // Calculate price
  const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
  const dayOfWeek = targetDate.getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const dayType = isWeekend ? "weekend" : "weekday";

  const matchedRule = hold.resource.venue.pricingRules.find((r) => {
    const matchDay = r.dayType === "all" || r.dayType === dayType;
    const matchTime = startTimeStr >= r.startTime && startTimeStr < r.endTime;
    return matchDay && matchTime;
  });

  const slotPrice = matchedRule ? matchedRule.price : hold.resource.defaultPrice;

  return {
    success: true,
    holdToken: hold.holdToken,
    expiresAt: hold.expiresAt,
    remainingSeconds,
    slotDetails: {
      venueId: hold.resource.venue.id,
      venueName: hold.resource.venue.name,
      venueSlug: hold.resource.venue.slug,
      venueAddress: hold.resource.venue.address,
      resourceId: hold.resource.id,
      resourceName: hold.resource.name,
      dateStr,
      startTimeStr,
      endTimeStr,
      price: slotPrice,
      customerPhone: hold.customerPhone || undefined,
    },
  };
}

/**
 * Releases a slot hold so others can immediately book it.
 */
export async function releaseSlotHold(holdToken: string): Promise<boolean> {
  if (!holdToken) return false;
  try {
    await db.slotHold.delete({ where: { holdToken } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Housekeeping utility to delete all expired slot holds across the system.
 */
export async function cleanExpiredSlotHolds(): Promise<number> {
  try {
    const result = await db.slotHold.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    return result.count;
  } catch {
    return 0;
  }
}
