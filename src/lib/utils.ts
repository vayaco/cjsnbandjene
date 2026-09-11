import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines tailwind classes safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Indian Rupee format (e.g. ₹600)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format 24h time "18:00" to readable "6:00 PM"
 */
export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

/**
 * Format time range e.g. "18:00", "19:00" -> "6:00 PM - 7:00 PM"
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

/**
 * Clean and normalize phone numbers (e.g. "9820011223" -> "+919820011223")
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }
  return phone.trim();
}

/**
 * Legacy booking number generator.
 * Note: Core booking allocation is database-controlled via allocateBookingNumber in @/lib/booking-number.
 */
export function generateBookingNumber(sequenceNumber?: number): string {
  if (sequenceNumber && Number.isInteger(sequenceNumber) && sequenceNumber > 0) {
    const numStr = sequenceNumber.toString();
    const padded = numStr.length < 6 ? numStr.padStart(6, "0") : numStr;
    return `NA${padded}`;
  }
  return "NA000101";
}

