import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hashPassword, requireAuth, requireSuperAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const users = await db.businessUser.findMany({
      where: { businessId: user.businessId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        venueId: true,
        venue: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      users,
      currentUserId: user.id,
      currentUserRole: user.role,
      isSuperAdmin: user.role === "super_admin",
    });
  } catch (error: any) {
    console.error("Fetch admin users error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch admin users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "Only Super Admins can create administrator accounts" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, password, role = "admin", venueId = null } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
    }

    if (!email || !email.trim()) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ success: false, error: "Invalid email format" }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const allowedRoles = ["super_admin", "admin"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role specified. Allowed: super_admin or admin" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await db.businessUser.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newUser = await db.businessUser.create({
      data: {
        businessId: user.businessId,
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role,
        venueId: venueId || null,
        status: "active",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        venueId: true,
        createdAt: true,
      },
    });

    // Record audit log
    await db.auditLog.create({
      data: {
        businessId: user.businessId,
        userId: user.id,
        userEmail: user.email,
        action: "admin_user_created",
        entityType: "business_user",
        entityId: newUser.id,
        details: JSON.stringify({
          createdUserName: newUser.name,
          createdUserEmail: newUser.email,
          role: newUser.role,
        }),
      },
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error("Create admin user error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create administrator account" },
      { status: 500 }
    );
  }
}
