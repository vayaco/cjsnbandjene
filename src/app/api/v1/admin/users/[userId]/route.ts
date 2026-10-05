import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "Only Super Admins can update administrator accounts" },
        { status: 403 }
      );
    }

    const { userId } = await context.params;
    const body = await request.json();
    const { name, role, status, password, venueId } = body;

    const existingUser = await db.businessUser.findUnique({
      where: { id: userId },
    });

    if (!existingUser || existingUser.businessId !== user.businessId) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Safety check: if demoting or deactivating, ensure at least one active super_admin remains
    if (
      (role && role !== "super_admin" && existingUser.role === "super_admin") ||
      (status === "inactive" && existingUser.role === "super_admin")
    ) {
      const superAdminCount = await db.businessUser.count({
        where: {
          businessId: user.businessId,
          role: "super_admin",
          status: "active",
          id: { not: userId },
        },
      });

      if (superAdminCount === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot demote or deactivate the only remaining active Super Admin",
          },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (name && name.trim()) updateData.name = name.trim();
    if (role && ["super_admin", "admin"].includes(role)) updateData.role = role;
    if (status && ["active", "inactive"].includes(status)) updateData.status = status;
    if (venueId !== undefined) updateData.venueId = venueId || null;
    if (password && password.length >= 6) {
      updateData.passwordHash = await hashPassword(password);
    }

    const updatedUser = await db.businessUser.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        venueId: true,
        updatedAt: true,
      },
    });

    await db.auditLog.create({
      data: {
        businessId: user.businessId,
        userId: user.id,
        userEmail: user.email,
        action: "admin_user_updated",
        entityType: "business_user",
        entityId: userId,
        details: JSON.stringify({
          targetUserEmail: existingUser.email,
          updatedFields: Object.keys(updateData).filter((k) => k !== "passwordHash"),
          passwordReset: !!updateData.passwordHash,
        }),
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("Update admin user error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update administrator account" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "Only Super Admins can delete administrator accounts" },
        { status: 403 }
      );
    }

    const { userId } = await context.params;

    if (userId === user.id) {
      return NextResponse.json(
        { success: false, error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const targetUser = await db.businessUser.findUnique({
      where: { id: userId },
    });

    if (!targetUser || targetUser.businessId !== user.businessId) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (targetUser.role === "super_admin") {
      const superAdminCount = await db.businessUser.count({
        where: {
          businessId: user.businessId,
          role: "super_admin",
          id: { not: userId },
        },
      });

      if (superAdminCount === 0) {
        return NextResponse.json(
          { success: false, error: "Cannot delete the only remaining Super Admin account" },
          { status: 400 }
        );
      }
    }

    await db.businessUser.delete({
      where: { id: userId },
    });

    await db.auditLog.create({
      data: {
        businessId: user.businessId,
        userId: user.id,
        userEmail: user.email,
        action: "admin_user_deleted",
        entityType: "business_user",
        entityId: userId,
        details: JSON.stringify({
          deletedUserName: targetUser.name,
          deletedUserEmail: targetUser.email,
          role: targetUser.role,
        }),
      },
    });

    return NextResponse.json({ success: true, message: "Administrator account deleted" });
  } catch (error: any) {
    console.error("Delete admin user error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete administrator account" },
      { status: 500 }
    );
  }
}
