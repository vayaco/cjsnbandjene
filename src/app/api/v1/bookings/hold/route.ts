import { NextRequest, NextResponse } from "next/server";
import { createSlotHold, getSlotHold, releaseSlotHold } from "@/lib/slot-hold";
import { normalizePhone } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      venueId,
      resourceId,
      dateStr,
      startTimeStr,
      endTimeStr,
      customerName,
      customerPhone,
      holdMinutes = 10,
    } = body;

    if (!venueId || !resourceId || !dateStr || !startTimeStr || !endTimeStr) {
      return NextResponse.json(
        { success: false, error: "Missing required booking slot information." },
        { status: 400 }
      );
    }

    if (!customerName?.trim()) {
      return NextResponse.json(
        { success: false, error: "Please enter your name to reserve this slot." },
        { status: 400 }
      );
    }

    const cleanPhone = normalizePhone(customerPhone || "");
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    const result = await createSlotHold({
      venueId,
      resourceId,
      dateStr,
      startTimeStr,
      endTimeStr,
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      holdMinutes,
    });

    if (!result.success) {
      const isWindowError = result.error?.includes("no longer available for online booking");
      return NextResponse.json(
        { success: false, error: result.error },
        { status: isWindowError ? 422 : 409 }
      );
    }

    return NextResponse.json({
      success: true,
      holdToken: result.holdToken,
      expiresAt: result.expiresAt,
      remainingSeconds: result.remainingSeconds,
      slotDetails: result.slotDetails,
      message: `Slot held for ${holdMinutes} minutes. Complete booking before timer expires.`,
    });
  } catch (error: any) {
    console.error("Slot hold error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to hold slot." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const holdToken = searchParams.get("holdToken");

    if (!holdToken) {
      return NextResponse.json(
        { success: false, error: "Hold token is required." },
        { status: 400 }
      );
    }

    const result = await getSlotHold(holdToken);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      holdToken: result.holdToken,
      expiresAt: result.expiresAt,
      remainingSeconds: result.remainingSeconds,
      slotDetails: result.slotDetails,
    });
  } catch (error: any) {
    console.error("Slot hold retrieval error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve slot reservation." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let holdToken = searchParams.get("holdToken");

    if (!holdToken) {
      try {
        const body = await request.json();
        holdToken = body.holdToken;
      } catch {
        // body may be empty
      }
    }

    if (holdToken) {
      await releaseSlotHold(holdToken);
    }

    return NextResponse.json({ success: true, message: "Slot hold released." });
  } catch (error: any) {
    console.error("Release hold error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to release slot hold." },
      { status: 500 }
    );
  }
}
