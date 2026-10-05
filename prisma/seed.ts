import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // Clean the database
  console.log('Cleaning existing data...')
  await prisma.holiday.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.pricingRule.deleteMany()
  await prisma.blockedPeriod.deleteMany()
  await prisma.operatingHour.deleteMany()
  await prisma.slotHold.deleteMany()
  await prisma.resource.deleteMany()
  await prisma.venue.deleteMany()
  await prisma.businessUser.deleteMany()
  await prisma.business.deleteMany()

  // 1. Create Business
  console.log('Creating main business record...')
  const business = await prisma.business.create({
    data: {
      name: 'Badminton Academy',
      slug: 'badminton-academy',
      supportPhone: '+919876543210',
      supportEmail: 'support@smashzone.in',
      cancellationPolicy: 'Cancellations allowed up to 4 hours before the slot time for a full refund.',
      festiveTheme: 'default',
    },
  })

  // 2. Create Super Admin User
  console.log('Creating super admin user...')
  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash('admin123', salt)

  await prisma.businessUser.create({
    data: {
      businessId: business.id,
      name: 'Super Admin',
      email: 'admin@smashzone.in',
      passwordHash: passwordHash,
      role: 'super_admin',
    },
  })

  // 3. Create Standard Admin User
  console.log('Creating admin user...')
  await prisma.businessUser.create({
    data: {
      businessId: business.id,
      name: 'Operations Admin',
      email: 'manager@smashzone.in',
      passwordHash: passwordHash,
      role: 'admin',
    },
  })

  console.log('Seeding finished. Added Business, Super Admin, and Admin.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
