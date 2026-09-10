import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const whereClause: any = {
      businessId: user.businessId,
    };

    if (search) {
      const q = search.trim();
      whereClause.OR = [
        { name: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
      ];
    }

    const customers = await db.customer.findMany({
      where: whereClause,
      include: {
        _count: { select: { bookings: true } },
      },
      orderBy: { totalSpend: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, customers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to fetch customers" }, { status: 500 });
  }
}
