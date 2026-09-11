import { db } from "./db";

export interface GeneratedSlot {
  slotId: string; // e.g. "court1_18:00_19:00"
  resourceId: string;
  resourceName: string;
  resourceType: string;
  startTime: string; // "18:00"
  endTime: string;   // "19:00"
  startAt: string;   // ISO string
  endAt: string;     // ISO string
  price: number;
  status: "available" | "booked" | "held" | "blocked" | "past";
  bookingId?: string;
  blockedReason?: string;
}

export interface ResourceAvailability {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  capacity: number;
  status: string; // active, maintenance
  slots: GeneratedSlot[];
}

export interface VenueDayAvailability {
  venueId: string;
  venueName: string;
  dateStr: string; // "2026-09-15"
  dayOfWeek: number;
  isOpen: boolean;
  isHoliday: boolean;
  holidayReason?: string;
  openTime: string;
  closeTime: string;
  resources: ResourceAvailability[];
  timeHeaders: { startTime: string; endTime: string }[];
}

export interface BookingWindow {
  bookingWindowStart: string;
  bookingWindowEnd: string;
  allowedDates: string[];
}

/**
 * Calculates the exact 7-calendar-day booking window in the venue's configured timezone.
 * Returns Today through Today + 6 calendar days (7 dates total).
 */
export function getBookingCalendarWindow(timezone: string = "Asia/Kolkata"): BookingWindow {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const todayStr = formatter.format(now);
  const [year, month, day] = todayStr.split("-").map(Number);
  const baseDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  const allowedDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
    allowedDates.push(d.toISOString().slice(0, 10));
  }

  return {
    bookingWindowStart: allowedDates[0],
    bookingWindowEnd: allowedDates[6],
    allowedDates,
  };
}

/**
 * Validates whether a requested date string falls within the 7-day booking window.
 */
export function validateBookingDateInWindow(
  dateStr: string,
  timezone: string = "Asia/Kolkata"
): { valid: boolean; error?: string } {
  const window = getBookingCalendarWindow(timezone);
  if (!window.allowedDates.includes(dateStr)) {
    return {
      valid: false,
      error: "This date is no longer available for online booking.",
    };
  }
  return { valid: true };
}

/**
 * Generates slots and resolves real-time availability and dynamic pricing for a venue on a given date.
 */
export async function getVenueAvailability(
  venueId: string,
  dateStr: string,
  currentHoldToken?: string
): Promise<VenueDayAvailability> {
  const venue = await db.venue.findUnique({
    where: { id: venueId },
    include: {
      resources: {
        where: { status: { not: "inactive" } },
        orderBy: { name: "asc" },
      },
      operatingHours: true,
      pricingRules: {
        where: { status: "active" },
      },
    },
  });

  if (!venue) {
    throw new Error("Venue not found");
  }

  const now = new Date();

  // Purge expired holds asynchronously
  await db.slotHold.deleteMany({
    where: { expiresAt: { lte: now } },
  }).catch(() => {});

  // Accurate timezone calculation for venue
  const venueTz = venue.timezone || "Asia/Kolkata";
  const todayInVenue = new Intl.DateTimeFormat("en-CA", {
    timeZone: venueTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // "2026-09-11"

  const currentTimeInVenue = new Intl.DateTimeFormat("en-GB", {
    timeZone: venueTz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now); // "19:43"

  // Enforce 7-day booking window strictly
  const windowValidation = validateBookingDateInWindow(dateStr, venueTz);
  if (!windowValidation.valid) {
    throw new Error("This date is no longer available for online booking.");
  }

  // Calculate day of week from dateStr (in venue timezone)
  const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
  const dayOfWeek = targetDate.getUTCDay(); // 0 = Sun, 6 = Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const dayType = isWeekend ? "weekend" : "weekday";

  // Get operating hours for this day
  const opHours = venue.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);
  const isOpen = opHours ? opHours.isOpen : true;
  const openTime = opHours?.openTime || venue.openTime || "06:00";
  const closeTime = opHours?.closeTime || venue.closeTime || "23:00";
  const slotMinutes = venue.slotDurationMinutes || 60;

  // Generate hourly intervals
  const [openHour] = openTime.split(":").map(Number);
  const [closeHour] = closeTime.split(":").map(Number);

  const timeHeaders: { startTime: string; endTime: string }[] = [];
  for (let h = openHour; h < closeHour; h += slotMinutes / 60) {
    const sHour = Math.floor(h);
    const sMin = (h % 1) * 60;
    const eH = h + slotMinutes / 60;
    const eHour = Math.floor(eH);
    const eMin = (eH % 1) * 60;

    timeHeaders.push({
      startTime: `${String(sHour).padStart(2, "0")}:${String(sMin).padStart(2, "0")}`,
      endTime: `${String(eHour).padStart(2, "0")}:${String(eMin).padStart(2, "0")}`,
    });
  }

  // Check for Holidays
  const holiday = await db.holiday.findFirst({
    where: {
      businessId: venue.businessId,
      dateStr: dateStr,
      OR: [{ venueId: venue.id }, { venueId: null }],
    },
  });

  if (holiday) {
    return {
      venueId: venue.id,
      venueName: venue.name,
      dateStr,
      dayOfWeek,
      isOpen: false,
      isHoliday: true,
      holidayReason: holiday.reason,
      openTime,
      closeTime,
      resources: [],
      timeHeaders,
    };
  }

  // If venue is closed on this day
  if (!isOpen) {
    return {
      venueId: venue.id,
      venueName: venue.name,
      dateStr,
      dayOfWeek,
      isOpen: false,
      isHoliday: false,
      openTime,
      closeTime,
      resources: [],
      timeHeaders,
    };
  }

  // Fetch confirmed and payment_pending bookings for this date
  const bookings = await db.booking.findMany({
    where: {
      venueId: venue.id,
      dateStr: dateStr,
      status: { in: ["confirmed", "payment_pending"] },
    },
    select: {
      id: true,
      resourceId: true,
      startTimeStr: true,
      endTimeStr: true,
      status: true,
    },
  });

  // Fetch active slot holds
  const activeHolds = await db.slotHold.findMany({
    where: {
      resource: { venueId: venue.id },
      expiresAt: { gt: now },
    },
  });

  // Fetch blocked periods covering this date
  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

  const blockedPeriods = await db.blockedPeriod.findMany({
    where: {
      venueId: venue.id,
      startAt: { lte: dayEnd },
      endAt: { gte: dayStart },
    },
  });

  // Pricing resolver helper
  const resolvePrice = (resourceDefaultPrice: number, startTime: string): number => {
    const rule = venue.pricingRules.find((r) => {
      const matchDay = r.dayType === "all" || r.dayType === dayType;
      const matchTime = startTime >= r.startTime && startTime < r.endTime;
      return matchDay && matchTime;
    });

    return rule ? rule.price : resourceDefaultPrice;
  };

  // Build availability per resource
  const resourcesAvailability: ResourceAvailability[] = venue.resources.map((resource) => {
    const slots: GeneratedSlot[] = timeHeaders.map(({ startTime, endTime }) => {
      const slotStartAt = new Date(`${dateStr}T${startTime}:00.000Z`);
      const slotEndAt = new Date(`${dateStr}T${endTime}:00.000Z`);

      // Timezone-precise past check
      const isPast =
        dateStr < todayInVenue ||
        (dateStr === todayInVenue && startTime <= currentTimeInVenue);

      // Check if booked
      const existingBooking = bookings.find(
        (b) => b.resourceId === resource.id && b.startTimeStr === startTime
      );

      // Check if held by someone else
      const existingHold = activeHolds.find(
        (h) =>
          h.resourceId === resource.id &&
          h.startAt.getTime() === slotStartAt.getTime() &&
          h.holdToken !== currentHoldToken
      );

      // Check if blocked
      const block = blockedPeriods.find((bp) => {
        const affectsThisResource = !bp.resourceId || bp.resourceId === resource.id;
        const overlaps = bp.startAt < slotEndAt && bp.endAt > slotStartAt;
        return affectsThisResource && overlaps;
      });

      let status: GeneratedSlot["status"] = "available";
      let blockedReason: string | undefined;

      if (resource.status === "maintenance") {
        status = "blocked";
        blockedReason = "Court Under Maintenance";
      } else if (block) {
        status = "blocked";
        blockedReason = block.reason || "Blocked Period";
      } else if (existingBooking) {
        status = "booked";
      } else if (existingHold) {
        status = "held";
      } else if (isPast) {
        status = "past";
      }

      const price = resolvePrice(resource.defaultPrice, startTime);

      return {
        slotId: `${resource.id}_${startTime}_${endTime}`,
        resourceId: resource.id,
        resourceName: resource.name,
        resourceType: resource.resourceType,
        startTime,
        endTime,
        startAt: slotStartAt.toISOString(),
        endAt: slotEndAt.toISOString(),
        price,
        status,
        bookingId: existingBooking?.id,
        blockedReason,
      };
    });

    return {
      resourceId: resource.id,
      resourceName: resource.name,
      resourceType: resource.resourceType,
      capacity: resource.capacity,
      status: resource.status,
      slots,
    };
  });

  return {
    venueId: venue.id,
    venueName: venue.name,
    dateStr,
    dayOfWeek,
    isOpen: true,
    isHoliday: false,
    openTime,
    closeTime,
    resources: resourcesAvailability,
    timeHeaders,
  };
}
