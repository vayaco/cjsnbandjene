import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.slotHold.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.blockedPeriod.deleteMany();
  await prisma.operatingHour.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.businessUser.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.business.deleteMany();

  // 1. Create Business
  const business = await prisma.business.create({
    data: {
      name: "SmashZone Sports Arena",
      slug: "smashzone",
      logoUrl: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=120&h=120&fit=crop",
      supportPhone: "+91 98201 12345",
      supportEmail: "support@smashzone.in",
      cancellationPolicy:
        "Full refund if cancelled >24 hours prior. 50% refund between 6-24 hours. Non-refundable within 6 hours of slot time.",
    },
  });

  console.log("Created Business:", business.name);

  // 2. Create Users
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const managerPasswordHash = await bcrypt.hash("manager123", 10);

  const superAdmin = await prisma.businessUser.create({
    data: {
      businessId: business.id,
      name: "Ayan Choudhary",
      email: "admin@smashzone.in",
      passwordHash: adminPasswordHash,
      role: "super_admin",
      status: "active",
    },
  });

  console.log("Created Admin:", superAdmin.email);

  // 3. Create Venues
  const venuesData = [
    {
      name: "SmashZone - Andheri West",
      slug: "andheri",
      code: "SZ-AND",
      address: "Plot 42, New Link Road, Near Metro Station, Andheri West",
      city: "Mumbai",
      googleMapsUrl: "https://maps.google.com/?q=Andheri+West+Mumbai",
      phone: "+91 98201 11001",
      openTime: "06:00",
      closeTime: "23:00",
      slotDurationMinutes: 60,
      imageUrl: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80",
      description:
        "Premier 5-court indoor badminton facility featuring Olympic-standard BWF-approved synthetic rubber flooring, LED glare-free lighting, air-conditioned locker rooms, and ample parking.",
      courtsCount: 5,
    },
    {
      name: "SmashZone - Powai Central",
      slug: "powai",
      code: "SZ-POW",
      address: "Central Avenue, Hiranandani Gardens, Powai",
      city: "Mumbai",
      googleMapsUrl: "https://maps.google.com/?q=Powai+Mumbai",
      phone: "+91 98201 11002",
      openTime: "06:00",
      closeTime: "23:00",
      slotDurationMinutes: 60,
      imageUrl: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80",
      description:
        "4 professional badminton courts with teakwood sub-sprung cushioned flooring, spectator seating gallery, hydration lounge, and certified coaching available.",
      courtsCount: 4,
    },
    {
      name: "SmashZone - Bandra West",
      slug: "bandra",
      code: "SZ-BAN",
      address: "Near Lilavati Hospital, Bandra Reclamation, Bandra West",
      city: "Mumbai",
      googleMapsUrl: "https://maps.google.com/?q=Bandra+West+Mumbai",
      phone: "+91 98201 11003",
      openTime: "06:00",
      closeTime: "23:00",
      slotDurationMinutes: 60,
      imageUrl: "https://images.unsplash.com/photo-1521537634581-0dced2fee2ef?w=800&q=80",
      description:
        "Boutique 3-court setup right by the sea-breeze. Premium wooden courts, shower facilities, racquet stringing service, and energy snack bar.",
      courtsCount: 3,
    },
  ];

  const createdVenues: any[] = [];

  for (const v of venuesData) {
    const venue = await prisma.venue.create({
      data: {
        businessId: business.id,
        name: v.name,
        slug: v.slug,
        code: v.code,
        address: v.address,
        city: v.city,
        googleMapsUrl: v.googleMapsUrl,
        phone: v.phone,
        openTime: v.openTime,
        closeTime: v.closeTime,
        slotDurationMinutes: v.slotDurationMinutes,
        imageUrl: v.imageUrl,
        description: v.description,
      },
    });

    createdVenues.push(venue);

    // Operating hours for all 7 days
    for (let day = 0; day <= 6; day++) {
      await prisma.operatingHour.create({
        data: {
          venueId: venue.id,
          dayOfWeek: day,
          openTime: "06:00",
          closeTime: "23:00",
          isOpen: true,
        },
      });
    }

    // Pricing rules
    await prisma.pricingRule.create({
      data: {
        venueId: venue.id,
        name: "Weekday Morning Special",
        dayType: "weekday",
        startTime: "06:00",
        endTime: "16:00",
        price: 450,
      },
    });

    await prisma.pricingRule.create({
      data: {
        venueId: venue.id,
        name: "Weekday Peak Evening",
        dayType: "weekday",
        startTime: "16:00",
        endTime: "23:00",
        price: 650,
      },
    });

    await prisma.pricingRule.create({
      data: {
        venueId: venue.id,
        name: "Weekend All-Day",
        dayType: "weekend",
        startTime: "06:00",
        endTime: "23:00",
        price: 750,
      },
    });

    // Create Resources (Courts)
    for (let i = 1; i <= v.courtsCount; i++) {
      await prisma.resource.create({
        data: {
          venueId: venue.id,
          businessId: business.id,
          name: `Court ${i}`,
          resourceType: "court",
          capacity: 4,
          defaultPrice: 600,
          status: "active",
          description: `Court ${i} - BWF Grade-1 Synthetic Mat, LED floodlighting.`,
        },
      });
    }
  }

  // Create Venue Manager for Andheri
  await prisma.businessUser.create({
    data: {
      businessId: business.id,
      name: "Rahul Sharma",
      email: "manager@smashzone.in",
      passwordHash: managerPasswordHash,
      role: "venue_manager",
      venueId: createdVenues[0].id,
      status: "active",
    },
  });

  // 4. Seed Customers
  const customersData = [
    { name: "Vikram Malhotra", phone: "+919820011223", email: "vikram@example.com" },
    { name: "Pooja Desai", phone: "+919819933445", email: "pooja.d@example.com" },
    { name: "Rohan Kulkarni", phone: "+919821155667", email: "rohan.k@example.com" },
    { name: "Ananya Iyer", phone: "+919833377889", email: "ananya@example.com" },
    { name: "Sameer Joshi", phone: "+919820599001", email: "sameer.j@example.com" },
    { name: "Kavita Reddy", phone: "+919819122334", email: "kavita.r@example.com" },
  ];

  const createdCustomers: any[] = [];
  for (const c of customersData) {
    const cust = await prisma.customer.create({
      data: {
        businessId: business.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        totalBookings: 0,
        totalSpend: 0,
      },
    });
    createdCustomers.push(cust);
  }

  // 5. Seed Real Bookings for Today & Tomorrow
  const today = new Date();
  const dateStrToday = today.toISOString().split("T")[0];

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dateStrTomorrow = tomorrow.toISOString().split("T")[0];

  const andheriVenue = createdVenues[0];
  const andheriResources = await prisma.resource.findMany({
    where: { venueId: andheriVenue.id },
  });

  const sampleBookings = [
    {
      resourceIndex: 0, // Court 1
      hour: 7,
      customerIndex: 0,
      dateStr: dateStrToday,
      amount: 450,
      paymentMethod: "upi",
    },
    {
      resourceIndex: 1, // Court 2
      hour: 8,
      customerIndex: 1,
      dateStr: dateStrToday,
      amount: 450,
      paymentMethod: "card",
    },
    {
      resourceIndex: 0, // Court 1
      hour: 18,
      customerIndex: 2,
      dateStr: dateStrToday,
      amount: 650,
      paymentMethod: "upi",
    },
    {
      resourceIndex: 1, // Court 2
      hour: 19,
      customerIndex: 3,
      dateStr: dateStrToday,
      amount: 650,
      paymentMethod: "upi",
    },
    {
      resourceIndex: 2, // Court 3
      hour: 19,
      customerIndex: 4,
      dateStr: dateStrToday,
      amount: 650,
      paymentMethod: "card",
    },
    {
      resourceIndex: 0, // Court 1
      hour: 18,
      customerIndex: 5,
      dateStr: dateStrTomorrow,
      amount: 650,
      paymentMethod: "upi",
    },
    {
      resourceIndex: 3, // Court 4
      hour: 20,
      customerIndex: 0,
      dateStr: dateStrTomorrow,
      amount: 650,
      paymentMethod: "upi",
    },
  ];

  let bookingCount = 1001;

  for (const sb of sampleBookings) {
    const res = andheriResources[sb.resourceIndex];
    const cust = createdCustomers[sb.customerIndex];

    const startAt = new Date(`${sb.dateStr}T${String(sb.hour).padStart(2, "0")}:00:00.000Z`);
    const endAt = new Date(`${sb.dateStr}T${String(sb.hour + 1).padStart(2, "0")}:00:00.000Z`);
    const bookingNum = `SZ-${bookingCount++}`;

    const booking = await prisma.booking.create({
      data: {
        bookingNumber: bookingNum,
        businessId: business.id,
        venueId: andheriVenue.id,
        resourceId: res.id,
        customerId: cust.id,
        startAt,
        endAt,
        dateStr: sb.dateStr,
        startTimeStr: `${String(sb.hour).padStart(2, "0")}:00`,
        endTimeStr: `${String(sb.hour + 1).padStart(2, "0")}:00`,
        status: "confirmed",
        subtotal: sb.amount,
        total: sb.amount,
        paymentStatus: "successful",
        paymentMethod: sb.paymentMethod,
        createdBy: "customer",
      },
    });

    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        businessId: business.id,
        provider: "placeholder",
        amount: sb.amount,
        method: sb.paymentMethod,
        status: "successful",
        paidAt: new Date(),
      },
    });

    // Update customer stats
    await prisma.customer.update({
      where: { id: cust.id },
      data: {
        totalBookings: { increment: 1 },
        totalSpend: { increment: sb.amount },
        lastBookingAt: startAt,
      },
    });
  }

  // Add a sample blocked period for Court 5 maintenance
  const court5 = andheriResources[4];
  if (court5) {
    await prisma.blockedPeriod.create({
      data: {
        venueId: andheriVenue.id,
        resourceId: court5.id,
        reason: "Court Mat Replacement & Line Repainting",
        startAt: new Date(`${dateStrToday}T06:00:00.000Z`),
        endAt: new Date(`${dateStrToday}T23:00:00.000Z`),
      },
    });
  }

  // Create an initial audit log
  await prisma.auditLog.create({
    data: {
      businessId: business.id,
      userId: superAdmin.id,
      userEmail: superAdmin.email,
      action: "system_initialized",
      entityType: "business",
      entityId: business.id,
      details: JSON.stringify({ message: "Initial platform seed completed with 3 venues and courts." }),
    },
  });

  console.log("Database seeded successfully with demo venues, courts, pricing rules, and bookings!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
