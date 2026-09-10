# Multi-Venue Slot Booking SaaS (SmashZone Arena)

A modern, scalable, multi-venue SaaS platform for slot-based businesses (Badminton, Pickleball, Turfs, Studios, and Appointment facilities).

> **Core Product Rule**: *Customers experience simplicity. Businesses experience control.*

---

## 🌟 Key Features

### 1. Customer Booking Experience (Mobile-First)
- **Zero Account Required**: Customers book seamlessly without mandatory passwords or complex registration.
- **3-Click Booking Journey**:
  ```
  Choose Venue → Pick Date & Court Slot → Enter Contact → Booking Confirmed
  ```
- **Sticky Booking Summary**: Always-visible sticky bottom summary bar on mobile displaying Court, Date, Time, and Price.
- **Real-Time Availability**: Dynamically calculates open, booked, temporarily held, and maintenance slots.
- **Find My Booking (Recovery)**: Customers can retrieve their digital pass and cancel anytime using just their **Booking ID + Mobile Number**.
- **Celebratory Confirmation**: Confetti animations, digital match ticket, receipt printing, and Google Maps venue directions.

### 2. Payment Architecture (Phase 1 MVP)
- **Deferred Gateway Integration**: As requested, payment gateway integration is currently deferred. The checkout screen presents a modern preview notice with an instant **"Confirm Booking (Demo Mode)"** button.
- **Payment Provider Abstraction Layer**: Built with generic interfaces (`PaymentProvider`, `createOrder`, `verifyPayment`, `refund`) so Razorpay, Cashfree, or PhonePe can be plugged in later with zero architectural refactoring.

### 3. Business & Admin Operating System
- **Unified Multi-Venue Dashboard**: Live metric cards for Today's Revenue, Bookings Count, Court Occupancy %, and Cancellations.
- **Top Venue Switcher**: Instantly filter metrics and schedules across all branches (Andheri, Powai, Bandra).
- **Interactive Calendar Matrix**: Day-view grid mapping all courts against hourly time blocks with status colors.
- **Manual Booking Creator**: Allows staff to record walk-in desk payments, phone reservations, and cash bookings.
- **Customer Directory**: Unified player ledger automatically linked by phone number with lifetime spend and booking counts.
- **Audit-Ready Reports**: Detailed revenue ledger with 1-click **CSV export** formatted for Indian Financial Year (1 Apr – 31 Mar).
- **Security Audit Logs**: Immutable audit log tracking sensitive changes (pricing updates, cancellations, venue edits).

---

## 🛠 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, React 19, Server Components & Server Actions)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with custom sport & SaaS design tokens
- **Icons & UI Primitives**: [Lucide React](https://lucide.dev/), shadcn/ui design patterns
- **Database & ORM**: [Prisma ORM](https://www.prisma.io/) with SQLite for instant zero-dependency local dev (swappable to PostgreSQL)
- **Authentication**: Secure HTTP-only JWT session cookies with bcrypt password hashing
- **Visuals**: Canvas Confetti for celebratory booking confirmation

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Push Database Schema & Seed Demo Data
```bash
# Push schema to local database (SQLite dev.db)
npx prisma db push

# Seed realistic venues, courts, pricing rules, customers, and bookings
npx prisma db seed
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Admin Credentials

You can sign in to the Admin Portal at [http://localhost:3000/admin/login](http://localhost:3000/admin/login) using:

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@smashzone.in` | `admin123` | Full access across all venues & settings |
| **Venue Manager** | `manager@smashzone.in` | `manager123` | Scoped to Andheri venue |

---

## 📁 Directory Architecture

```text
src/
├── app/
│   ├── (customer)/
│   │   ├── page.tsx                     # Landing / Venue Selector
│   │   ├── v/[venueSlug]/
│   │   │   ├── page.tsx                 # 3-Step Booking Flow (Date -> Court -> Slot)
│   │   │   ├── layout.tsx               # Venue header with back button
│   │   │   └── payment/page.tsx         # Payment page (preview mode with 1-click demo confirm)
│   │   ├── booking/[bookingId]/page.tsx # Digital match pass & receipt
│   │   └── find-booking/page.tsx        # Booking recovery & cancellation
│   │
│   ├── admin/
│   │   ├── login/page.tsx               # Admin login with quick demo credentials
│   │   ├── dashboard/page.tsx           # Multi-venue overview & 7-day revenue trend
│   │   ├── calendar/page.tsx            # Daily court occupancy matrix grid
│   │   ├── bookings/
│   │   │   ├── page.tsx                 # Searchable & filterable bookings table
│   │   │   └── new/page.tsx             # Staff manual desk booking creator
│   │   ├── venues/page.tsx              # Venues & courts configuration
│   │   ├── customers/page.tsx           # Customer directory & lifetime spend
│   │   ├── reports/page.tsx             # Financial reports with CSV export
│   │   └── settings/page.tsx            # Business profile & immutable audit logs
│   │
│   └── api/v1/                          # REST API routes
│       ├── venues/
│       ├── availability/
│       ├── bookings/
│       ├── auth/
│       └── admin/
│
├── components/
│   ├── ui/                              # Button, Card, Badge, Input, Skeleton, EmptyState
│   └── booking/                         # DateStrip, SlotGrid, StickySummaryBar
│
└── lib/
    ├── db.ts                            # Prisma singleton
    ├── auth.ts                          # JWT & bcrypt utilities
    ├── availability.ts                  # Slot generation & pricing rules engine
    ├── booking-engine.ts                # Concurrency lock & booking creation
    ├── payment-service.ts               # Abstract payment provider interface
    └── utils.ts                         # Formatting currency, time, phone
```

---

## 🔒 Concurrency & Anti-Double-Booking Guarantee

The booking engine enforces zero double bookings through:
1. **Database Transaction Isolation**: Every booking creation runs inside an atomic `db.$transaction`.
2. **Conflict Verification**: Checks existing active bookings (`status IN ('confirmed', 'payment_pending')`) before creating a new record.
3. **Optimistic Slot Holds**: Supports temporary reservation holds during checkout.
4. **Permanent Audit Trail**: Bookings are never hard-deleted (`DELETE`); financial status is transitioned to `cancelled`.
