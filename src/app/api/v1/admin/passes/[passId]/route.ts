import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ passId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { passId } = await context.params;

    const pass = await db.monthlyPass.findUnique({
      where: { id: passId },
      include: {
        venue: true,
        resource: true,
        customer: true,
        bookings: {
          include: {
            payments: true,
          },
          orderBy: { dateStr: "asc" },
        },
      },
    });

    if (!pass || pass.businessId !== user.businessId) {
      return NextResponse.json({ success: false, error: "Monthly pass not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, pass });
  } catch (error: any) {
    console.error("Get pass details error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch pass details" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ passId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { passId } = await context.params;

    const pass = await db.monthlyPass.findUnique({
      where: { id: passId },
      include: {
        bookings: true,
        customer: true,
      },
    });

    if (!pass || pass.businessId !== user.businessId) {
      return NextResponse.json({ success: false, error: "Pass not found" }, { status: 404 });
    }

    const now = new Date();

    // Cancel all future or active bookings under this pass in a transaction
    await db.$transaction(async (tx) => {
      // 1. Update MonthlyPass status
      await tx.monthlyPass.update({
        where: { id: passId },
        data: {
          status: "cancelled",
        },
      });

      // 2. Cancel all confirmed bookings for this pass
      await tx.booking.updateMany({
        where: {
          passId: pass.id,
          status: "confirmed",
        },
        data: {
          status: "cancelled",
          cancellationReason: `Monthly Pass ${pass.passNumber} cancelled by admin`,
          cancelledAt: now,
        },
      });

      // 3. Create Audit Log
      await tx.auditLog.create({
        data: {
          businessId: user.businessId,
          userId: user.id,
          userEmail: user.email,
          action: "monthly_pass_cancelled",
          entityType: "monthly_pass",
          entityId: pass.id,
          details: JSON.stringify({
            passNumber: pass.passNumber,
            customerPhone: pass.customer.phone,
            cancelledBy: user.email,
            cancelledAt: now.toISOString(),
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Monthly pass ${pass.passNumber} and all associated bookings have been cancelled.`,
    });
  } catch (error: any) {
    console.error("Cancel monthly pass error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel monthly pass" },
      { status: 500 }
    );
  }
}
