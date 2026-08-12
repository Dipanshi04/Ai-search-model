import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const event = await prisma.event.upsert({
    where: { slug: 'isa-tech-marathon-2026' },
    update: {},
    create: {
      id: 'default-event-id',
      name: 'ISA Tech Marathon 2026',
      slug: 'isa-tech-marathon-2026',
      description: 'Run for a Greener Tomorrow',
      date: new Date('2026-03-15T06:00:00Z'),
      status: 'UPCOMING',
      registrationOpen: true,
      maxParticipants: 2000,
    },
  });
  console.log(`✅ Event: ${event.name}`);

  // Create default race distances
  const distances = [
    { name: '3K Fun Run', distanceKm: 3 },
    { name: '5K Challenge', distanceKm: 5 },
  ];

  for (const d of distances) {
    await prisma.raceDistance.upsert({
      where: { eventId_name: { eventId: event.id, name: d.name } },
      update: {},
      create: {
        eventId: event.id,
        name: d.name,
        distanceKm: d.distanceKm,
      },
    });
  }
  console.log(`✅ ${distances.length} race distances`);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@isamarathon.com' },
    update: {},
    create: {
      email: 'admin@isamarathon.com',
      phone: '+919876543210',
      name: 'Admin User',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'SUPER_ADMIN',
    },
  });
  console.log(`✅ Admin: ${adminUser.email} / admin123`);

  const raceManager = await prisma.user.upsert({
    where: { email: 'racemanager@isamarathon.com' },
    update: {},
    create: {
      email: 'racemanager@isamarathon.com',
      phone: '+919876543211',
      name: 'Race Manager',
      passwordHash: await bcrypt.hash('manager123', 10),
      role: 'RACE_MANAGER',
    },
  });
  console.log(`✅ Race Manager: ${raceManager.email} / manager123`);

  const companies = await Promise.all([
    prisma.company.upsert({
      where: { name: 'TATA Technologies' },
      update: {},
      create: { name: 'TATA Technologies', industry: 'IT', employeeCount: 500 },
    }),
    prisma.company.upsert({
      where: { name: 'Infosys' },
      update: {},
      create: { name: 'Infosys', industry: 'IT', employeeCount: 1000 },
    }),
    prisma.company.upsert({
      where: { name: 'Wipro' },
      update: {},
      create: { name: 'Wipro', industry: 'IT', employeeCount: 800 },
    }),
    prisma.company.upsert({
      where: { name: 'Tech Mahindra' },
      update: {},
      create: { name: 'Tech Mahindra', industry: 'IT', employeeCount: 600 },
    }),
    prisma.company.upsert({
      where: { name: 'HCL Technologies' },
      update: {},
      create: { name: 'HCL Technologies', industry: 'IT', employeeCount: 700 },
    }),
  ]);
  console.log(`✅ ${companies.length} companies`);

  const testRunners = [
    { name: 'Vikas Dosi', email: 'vikas@test.com', phone: '+911111111101', company: 'TATA Technologies', category: 'RUN_5K' as const, gender: 'MALE' as const },
    { name: 'Priya Sharma', email: 'priya@test.com', phone: '+911111111102', company: 'Infosys', category: 'RUN_3K' as const, gender: 'FEMALE' as const },
    { name: 'Rahul Patel', email: 'rahul@test.com', phone: '+911111111103', company: 'Wipro', category: 'RUN_5K' as const, gender: 'MALE' as const },
    { name: 'Anita Gupta', email: 'anita@test.com', phone: '+911111111104', company: 'Tech Mahindra', category: 'RUN_3K' as const, gender: 'FEMALE' as const },
    { name: 'Suresh Kumar', email: 'suresh@test.com', phone: '+911111111105', company: 'HCL Technologies', category: 'RUN_5K' as const, gender: 'MALE' as const },
    { name: 'Meera Singh', email: 'meera@test.com', phone: '+911111111106', company: 'TATA Technologies', category: 'RUN_3K' as const, gender: 'FEMALE' as const },
    { name: 'Amit Verma', email: 'amit@test.com', phone: '+911111111107', company: 'Infosys', category: 'RUN_5K' as const, gender: 'MALE' as const },
    { name: 'Deepa Reddy', email: 'deepa@test.com', phone: '+911111111108', company: 'Wipro', category: 'RUN_3K' as const, gender: 'FEMALE' as const },
    { name: 'Rajesh Nair', email: 'rajesh@test.com', phone: '+911111111109', company: 'Tech Mahindra', category: 'RUN_5K' as const, gender: 'MALE' as const },
    { name: 'Kavita Joshi', email: 'kavita@test.com', phone: '+911111111110', company: 'HCL Technologies', category: 'RUN_3K' as const, gender: 'FEMALE' as const },
  ];

  for (let i = 0; i < testRunners.length; i++) {
    const runner = testRunners[i];
    const company = companies.find((c) => c.name === runner.company);

    const user = await prisma.user.upsert({
      where: { email: runner.email },
      update: {},
      create: {
        name: runner.name,
        email: runner.email,
        phone: runner.phone,
        passwordHash: await bcrypt.hash('runner123', 10),
        role: 'PARTICIPANT',
      },
    });

    await prisma.participant.upsert({
      where: { bibNumber: `ISA${(1001 + i).toString()}` },
      update: {},
      create: {
        eventId: event.id,
        userId: user.id,
        companyId: company?.id,
        bibNumber: `ISA${(1001 + i).toString()}`,
        category: runner.category,
        gender: runner.gender,
        status: 'REGISTERED',
      },
    });
  }
  console.log(`✅ ${testRunners.length} test participants`);

  await prisma.treeCounter.upsert({
    where: { eventId: event.id },
    update: {},
    create: { eventId: event.id, totalTrees: 0, totalKm: 0, totalCO2: 0 },
  });
  console.log('✅ Tree counter initialized');

  const sponsors = [
    { name: 'TATA', tier: 'PLATINUM', displayOrder: 1 },
    { name: 'Infosys', tier: 'GOLD', displayOrder: 2 },
    { name: 'Wipro', tier: 'GOLD', displayOrder: 3 },
    { name: 'Tech Mahindra', tier: 'SILVER', displayOrder: 4 },
    { name: 'HCL', tier: 'SILVER', displayOrder: 5 },
    { name: 'Mindtree', tier: 'BRONZE', displayOrder: 6 },
  ];

  for (const sponsor of sponsors) {
    await prisma.sponsor.create({
      data: {
        eventId: event.id,
        name: sponsor.name,
        tier: sponsor.tier,
        displayOrder: sponsor.displayOrder,
      },
    });
  }
  console.log(`✅ ${sponsors.length} sponsors`);

  await prisma.announcement.createMany({
    data: [
      { eventId: event.id, title: 'Welcome!', message: 'ISA Tech Marathon 2026 is coming soon. Stay tuned for updates!', type: 'info' },
      { eventId: event.id, title: 'Registration Open', message: 'Register now for ISA Tech Marathon 2026!', type: 'info' },
    ],
  });
  console.log('✅ Announcements created');

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Test Credentials:');
  console.log('   Admin:    admin@isamarathon.com / admin123');
  console.log('   Manager:  racemanager@isamarathon.com / manager123');
  console.log('   Runner:   vikas@test.com / runner123');
}

main()
  .catch((e) => { console.error('❌ Seeding failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
