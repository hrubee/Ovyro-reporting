import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}
function dayName(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return DAYS[d.getDay()];
}

const HYGIENE_AREAS = [
  "PRODUCTION ROOM", "OVEN ROOM", "FRIDGE ROOM", "UTILITY AREA",
  "PUFF DEPARTMENT", "ADMIN", "STORE 1", "PASSAGE GROUND FLOOR",
  "SECURITY AREA", "TOILET GUEST", "SIR OFFICE", "TOILET",
  "CAKE ROOM", "PASSAGE FIRST FLOOR", "STORE ROOM 2", "OUTSIDE COMPOUND",
];

const GLASS_LOCATIONS = [
  "OVEN ROOM 1", "PARTITION GLASS 4", "PRODUCTION ROOM 1", "WINDOW 1",
  "PRODUCTION ROOM DOOR", "PUFF ROOM PARTITION GLASS 2 LEFT",
  "PUFF ROOM PARTITION GLASS 2 RIGHT", "PUFF ROOM DOOR",
  "ADMIN DOOR", "ADMIN WINDOW 1", "ADMIN WINDOW 2",
  "MAIN ENTRANCE DOOR", "STORE ROOM DOOR GROUND",
  "CAKE ROOM WINDOW 1", "CAKE ROOM WINDOW 2",
];

const FRIDGE_ITEMS = [
  { zone: "PRODUCTION — FRIDGES", productName: "FRIDGE UNDER TABLE", machineNumber: "1", referenceTemp: "+3 to +8°C" },
  { zone: "PRODUCTION — FRIDGES", productName: "FRIDGE", machineNumber: "2", referenceTemp: "+3 to +8°C" },
  { zone: "PRODUCTION — FRIDGES", productName: "FRIDGE", machineNumber: "3", referenceTemp: "+3 to +8°C" },
  { zone: "PRODUCTION — FRIDGES", productName: "FRIDGE", machineNumber: "4", referenceTemp: "+3 to +8°C" },
  { zone: "PRODUCTION — FRIDGES", productName: "FRIDGE", machineNumber: "5", referenceTemp: "+3 to +8°C" },
  { zone: "PRODUCTION — FREEZERS", productName: "FREEZER", machineNumber: "1", referenceTemp: "-18 to -15°C" },
  { zone: "PRODUCTION — FREEZERS", productName: "FREEZER", machineNumber: "2", referenceTemp: "-18 to -15°C" },
  { zone: "PRODUCTION — FREEZERS", productName: "FREEZER", machineNumber: "3", referenceTemp: "-18 to -15°C" },
  { zone: "PRODUCTION — FREEZERS", productName: "FREEZER", machineNumber: "4", referenceTemp: "-18 to -16°C" },
  { zone: "CAKE ROOM — FRIDGES", productName: "FRIDGE", machineNumber: "1", referenceTemp: "+3 to +8°C" },
  { zone: "CAKE ROOM — FRIDGES", productName: "COLD ROOM", machineNumber: "1", referenceTemp: "+3 to +8°C" },
  { zone: "CAKE ROOM — FREEZERS", productName: "FREEZER", machineNumber: "1", referenceTemp: "-18 to -15°C" },
  { zone: "CAKE ROOM — FREEZERS", productName: "FREEZER", machineNumber: "2", referenceTemp: "-18 to -15°C" },
  { zone: "STORE ROOM", productName: "FREEZER", machineNumber: "1", referenceTemp: "-18 to -15°C" },
  { zone: "STORE ROOM", productName: "CHILLER BLASTER", machineNumber: "—", referenceTemp: "—" },
];

const KITCHEN_EQUIPMENT = [
  "OVEN 1", "OVEN 2", "OVEN 3", "ELECTRIC GAS RANGE 1", "ELECTRIC GAS RANGE 2",
  "GAS BURNER 3 BURNER", "GAS BURNER SINGLE", "WORKING TABLE 1", "WORKING TABLE 2",
  "WORKING TABLE 3", "WORKING TABLE 4", "WORKING TABLE 5", "WORKING TABLE 6",
  "WET - DRY DUSTBIN", "MIXER GRINDER", "MASALA GRINDER", "KHEEMA MACHINE",
  "PROOFER", "TANDOOR", "SINK 1", "CHILLER BLASTER",
];

const PRODUCTION_EQUIPMENT = [
  "WORKING TABLE 1", "WORKING TABLE 2", "WORKING TABLE 3", "WORKING TABLE 4",
  "WORKING TABLE 5", "WORKING TABLE 6", "WORKING TABLE 7", "WET - DRY DUSTBIN",
  "DOUGH KNEADER", "SPIRAL MIXER", "PLANETARY MIXER 1", "PLANETARY MIXER 2",
  "PLANETARY MIXER 3", "PLANETARY MIXER 4", "PLANETARY MIXER 5", "PLANETARY MIXER 6",
  "BREAD SLICER 1 / TABLE", "BREAD SLICER 2 / TABLE", "BREAD BUN DIVIDER",
  "WEIGHING SCALE 1 / TABLE", "WEIGHING SCALE 2 / TABLE", "SEALING MACHINE 1",
  "SEALING MACHINE 2", "WASH SINK 1", "WASH SINK 2", "FLOUR BIN 1", "FLOUR BIN 2", "FLOUR BIN 3",
];

const PUFF_EQUIPMENT = [
  "DOUGH SHEETER", "TABLE 1", "TABLE 2", "TABLE 3", "TABLE 4",
  "WASH SINK 1", "OFFICE DESK", "CHAIR", "WET - DRY DUSTBIN",
  "STORE ROOM 1", "LIFT", "CUPBOARD 1", "CUPBOARD 2", "STORE ROOM 2", "RACKS",
];

const CAKE_EQUIPMENT = [
  "PLANETARY MIXER 1", "PLANETARY MIXER 2", "TABLE 1", "TABLE 2",
  "TABLE 3", "TABLE 4", "TABLE 5", "MACHINE TABLE 6", "WET - DRY DUSTBIN",
  "STORE CABINET", "MICROWAVE 1", "WEIGHING SCALE 1", "MICROWAVE 2",
  "WEIGHING SCALE 2", "OFFICE DESK", "STOOL / CHAIR",
];

const ORETA_HYGIENE_AREAS = [
  { id: 1, area: "KITCHEN", morning: "RAMESHWAR / BHARTI", afternoon: "RAMESHWAR / BHARTI", evening: "RAMESHWAR / BHARTI", night: "RAMESHWAR / BHARTI" },
  { id: 2, area: "WASH ROOM", morning: "—", afternoon: "MANGLA / BHARTI", evening: "MANGLA / BHARTI", night: "MANGLA / BHARTI" },
  { id: 3, area: "OUTDOOR CLEANING", morning: "MANGLA / BHARTI", afternoon: "MANGLA / BHARTI", evening: "MANGLA / BHARTI", night: "MANGLA / BHARTI" },
  { id: 4, area: "INSIDE TOP / GROUND CLEANING", morning: "MANGLA / BHARTI", afternoon: "MANGLA / BHARTI", evening: "MANGLA / BHARTI", night: "MANGLA / BHARTI" },
  { id: 5, area: "CASH COUNTER", morning: "ARZAAAN / NEW", afternoon: "ARZAAAN / NEW", evening: "ARZAAAN / NEW", night: "ARZAAAN / NEW" },
  { id: 6, area: "DISPLAY COUNTERS", morning: "ARZAAAN / NEW", afternoon: "ARZAAAN / NEW", evening: "ARZAAAN / NEW", night: "ARZAAAN / NEW" },
  { id: 7, area: "FREEZER", morning: "ARZAAAN / NEW", afternoon: "ARZAAAN / NEW", evening: "ARZAAAN / NEW", night: "ARZAAAN / NEW" },
  { id: 8, area: "RACKS", morning: "ARZAAAN / NEW", afternoon: "ARZAAAN / NEW", evening: "ARZAAAN / NEW", night: "ARZAAAN / NEW" },
  { id: 9, area: "STORE", morning: "ARZAAAN / NEW", afternoon: "ARZAAAN / NEW", evening: "ARZAAAN / NEW", night: "ARZAAAN / NEW" },
  { id: 10, area: "DUSTING", morning: "BHARTI / MANGLA", afternoon: "BHARTI / MANGLA", evening: "BHARTI / MANGLA", night: "BHARTI / MANGLA" },
  { id: 11, area: "TABLES / CHAIRS", morning: "BHARTI / RAMESHWAR", afternoon: "BHARTI / RAMESHWAR", evening: "BHARTI / RAMESHWAR", night: "BHARTI / RAMESHWAR" },
  { id: 12, area: "WASHING VESSELS", morning: "BHARTI - RAMESHWAR", afternoon: "BHARTI - RAMESHWAR", evening: "BHARTI - RAMESHWAR", night: "BHARTI - RAMESHWAR" },
];

async function main() {
  console.log("🌱 Seeding PNR Bakery & Oreta World Staff and Demo Reports...");

  const defaultPassword = await bcrypt.hash("Pnr@123", 12);
  const adminPassword = await bcrypt.hash("Admin@123", 12);

  // 1. Administrators / Bakery Supervisors
  const admin = await prisma.user.upsert({
    where: { email: "admin@pnr.com" },
    update: {},
    create: { name: "Admin", email: "admin@pnr.com", passwordHash: adminPassword, role: "ADMIN" },
  });

  const aboli = await prisma.user.upsert({
    where: { email: "aboli@pnr.com" },
    update: {},
    create: { name: "Aboli Wagh", email: "aboli@pnr.com", passwordHash: defaultPassword, role: "ADMIN" },
  });

  const sandeep = await prisma.user.upsert({
    where: { email: "sandeep@pnr.com" },
    update: {},
    create: { name: "Sandeep Gargate", email: "sandeep@pnr.com", passwordHash: defaultPassword, role: "ADMIN" },
  });

  // 2. Employees / Staff across Outlets
  const staffList = [
    // Bakery Staff
    { name: "Shridhar Jadhav", email: "shridhar@pnr.com", sheets: ["HYGIENE_REPORT"] },
    { name: "Pravin Jadhav", email: "pravin@pnr.com", sheets: ["HYGIENE_REPORT", "PRODUCTION", "KITCHEN"] },
    { name: "Mavshi", email: "mavshi@pnr.com", sheets: ["HYGIENE_REPORT", "PRODUCTION", "KITCHEN"] },
    { name: "Sanjay Jadhav", email: "sanjay@pnr.com", sheets: ["GLASS_REPORT"] },
    { name: "Suresh", email: "suresh@pnr.com", sheets: ["GLASS_REPORT", "KITCHEN"] },
    { name: "Sagar Yadav", email: "sagar@pnr.com", sheets: ["PRODUCTION", "KITCHEN"] },
    { name: "Dilip", email: "dilip@pnr.com", sheets: ["PUFF_ROOM"] },
    { name: "Meraj Khan", email: "meraj@pnr.com", sheets: ["CAKE_ROOM"] },
    { name: "Jaseen Siddique", email: "jaseen@pnr.com", sheets: ["CAKE_ROOM"] },
    { name: "Nadeem Faruqi", email: "nadeem@pnr.com", sheets: ["CAKE_ROOM"] },
    // Oreta World Staff
    { name: "Rameshwar", email: "rameshwar@pnr.com", sheets: ["ORETA_HYGIENE"] },
    { name: "Bharti", email: "bharti@pnr.com", sheets: ["ORETA_HYGIENE"] },
    { name: "Mangla", email: "mangla@pnr.com", sheets: ["ORETA_HYGIENE"] },
    { name: "Arzaaan", email: "arzaaan@pnr.com", sheets: ["ORETA_HYGIENE"] },
  ];

  const createdStaff: Record<string, string> = {};

  for (const s of staffList) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { name: s.name },
      create: { name: s.name, email: s.email, passwordHash: defaultPassword, role: "EMPLOYEE" },
    });
    createdStaff[s.name] = user.id;

    for (const sheet of s.sheets) {
      await prisma.sheetAccess.upsert({
        where: { userId_sheet: { userId: user.id, sheet } },
        update: {},
        create: { userId: user.id, sheet },
      });
    }
  }

  console.log("✅ All Bakery & Oreta World Staff Created with Sheet Access!");

  // Clean previous demo entries
  await prisma.hygieneEntry.deleteMany({});
  await prisma.glassEntry.deleteMany({});
  await prisma.fridgeEntry.deleteMany({});
  await prisma.kitchenEntry.deleteMany({});
  await prisma.productionEntry.deleteMany({});
  await prisma.puffRoomEntry.deleteMany({});
  await prisma.cakeRoomEntry.deleteMany({});
  await prisma.oretaHygieneEntry.deleteMany({});

  // Seed 7 days of realistic historical demo data
  for (let daysAgo = 7; daysAgo >= 1; daysAgo--) {
    const date = dateStr(daysAgo);
    const day = dayName(daysAgo);
    const supervisor = daysAgo % 2 === 0 ? "Aboli Wagh" : "Sandeep Gargate";

    // 1. Hygiene (Shridhar Jadhav & Pravin Jadhav)
    await prisma.hygieneEntry.create({
      data: {
        date, day,
        areaChecks: JSON.stringify(
          HYGIENE_AREAS.map((area, i) => ({
            area,
            checkedBy: i % 3 === 0 ? "Mavshi" : i % 2 === 0 ? "Pravin Jadhav" : "Shridhar Jadhav",
            time: "09:15",
          }))
        ),
        supervisorName: supervisor,
        comments: "All areas clean and sanitized.",
        correctiveAction: "No action needed.",
        submittedById: createdStaff["Shridhar Jadhav"] || admin.id,
        createdAt: new Date(`${date}T09:15:00.000Z`),
      },
    });

    // 2. Glass (Sanjay Jadhav & Suresh)
    await prisma.glassEntry.create({
      data: {
        date,
        locationChecks: JSON.stringify(
          GLASS_LOCATIONS.map((location, i) => ({
            location,
            name: i % 2 === 0 ? "Sanjay Jadhav" : "Suresh",
          }))
        ),
        supervisorName: supervisor,
        comments: "Glass and partitions wiped clean.",
        correctiveAction: "",
        submittedById: createdStaff["Sanjay Jadhav"] || admin.id,
        createdAt: new Date(`${date}T10:00:00.000Z`),
      },
    });

    // 3. Fridge (Aboli Wagh / Sandeep Gargate)
    await prisma.fridgeEntry.create({
      data: {
        date,
        supervisedBy: supervisor,
        fridgeChecks: JSON.stringify(
          FRIDGE_ITEMS.map((item, idx) => {
            const isNA = idx === 3 || idx === 4 || idx === 8;
            return {
              ...item,
              actualTempMorning: isNA ? "N/A" : item.zone.includes("FREEZER") ? "-17.5°C" : "+4.2°C",
              actualTempEvening: isNA ? "N/A" : item.zone.includes("FREEZER") ? "-18.0°C" : "+5.0°C",
            };
          })
        ),
        hygiene: "Good",
        comments: "3 main fridges running normal; standby extra fridges powered down (N/A).",
        correctiveAction: "",
        submittedById: aboli.id,
        createdAt: new Date(`${date}T08:30:00.000Z`),
      },
    });

    // 4. Kitchen (Sagar Yadav, Pravin Jadhav, Mavshi)
    await prisma.kitchenEntry.create({
      data: {
        date,
        equipmentChecks: JSON.stringify(
          KITCHEN_EQUIPMENT.map((equipment, i) => ({
            equipment,
            yesNo: "YES",
            time: "11:00",
            name: i % 3 === 0 ? "Mavshi" : i % 2 === 0 ? "Pravin Jadhav" : "Sagar Yadav",
          }))
        ),
        supervisorName: supervisor,
        workerName: "Sagar Yadav",
        comments: "Kitchen equipment washed and checked.",
        correctiveAction: "",
        submittedById: createdStaff["Sagar Yadav"] || admin.id,
        createdAt: new Date(`${date}T11:00:00.000Z`),
      },
    });

    // 5. Production (Sagar Yadav, Pravin Jadhav, Mavshi)
    await prisma.productionEntry.create({
      data: {
        date,
        equipmentChecks: JSON.stringify(
          PRODUCTION_EQUIPMENT.map((equipment, i) => ({
            equipment,
            yesNo: "YES",
            time: "12:00",
            name: i % 3 === 0 ? "Mavshi" : i % 2 === 0 ? "Pravin Jadhav" : "Sagar Yadav",
          }))
        ),
        supervisorName: supervisor,
        workerName: "Pravin Jadhav",
        comments: "Mixers and tables sanitized.",
        correctiveAction: "",
        submittedById: createdStaff["Pravin Jadhav"] || admin.id,
        createdAt: new Date(`${date}T12:00:00.000Z`),
      },
    });

    // 6. Puff Room (Dilip & Sandeep Gargate)
    await prisma.puffRoomEntry.create({
      data: {
        date,
        equipmentChecks: JSON.stringify(
          PUFF_EQUIPMENT.map((equipment, i) => ({
            equipment,
            yesNo: "YES",
            time: "13:30",
            name: i % 2 === 0 ? "Dilip" : "Sandeep Gargate",
          }))
        ),
        supervisorName: "Sandeep Gargate",
        workerName: "Dilip",
        comments: "Sheeter and tables cleaned.",
        correctiveAction: "",
        submittedById: createdStaff["Dilip"] || admin.id,
        createdAt: new Date(`${date}T13:30:00.000Z`),
      },
    });

    // 7. Cake Room (Meraj Khan, Jaseen Siddique, Nadeem Faruqi)
    await prisma.cakeRoomEntry.create({
      data: {
        date,
        equipmentChecks: JSON.stringify(
          CAKE_EQUIPMENT.map((equipment, i) => ({
            equipment,
            yesNo: "YES",
            time: "14:00",
            name: i % 3 === 0 ? "Meraj Khan" : i % 2 === 0 ? "Jaseen Siddique" : "Nadeem Faruqi",
          }))
        ),
        supervisorName: "Aboli Wagh",
        workerName: "Meraj Khan",
        comments: "Planetary mixers and cold tables ready.",
        correctiveAction: "",
        submittedById: createdStaff["Meraj Khan"] || admin.id,
        createdAt: new Date(`${date}T14:00:00.000Z`),
      },
    });

    // 8. Oreta World Hygiene SOP (Rameshwar, Bharti, Mangla, Arzaaan)
    await prisma.oretaHygieneEntry.create({
      data: {
        date,
        day,
        areaChecks: JSON.stringify(
          ORETA_HYGIENE_AREAS.map((item) => ({
            id: item.id,
            area: item.area,
            morning: {
              status: item.morning === "—" ? "N/A" : "YES",
              staff: item.morning === "—" ? "—" : item.morning,
              time: "09:00",
            },
            afternoon: {
              status: "YES",
              staff: item.afternoon,
              time: "14:00",
            },
            evening: {
              status: "YES",
              staff: item.evening,
              time: "18:30",
            },
            night: {
              status: "YES",
              staff: item.night,
              time: "22:00",
            },
          }))
        ),
        supervisorName: "Admin",
        comments: "All 4 shifts completed at Oreta World outlet.",
        correctiveAction: "",
        submittedById: createdStaff["Rameshwar"] || admin.id,
        createdAt: new Date(`${date}T22:15:00.000Z`),
      },
    });

    console.log(`✅ Seeded historical reports for ${date} (${day}) across Bakery & Oreta World`);
  }

  console.log("\n📋 Login Credentials for Staff & Supervisors:");
  console.log("   Admin:       admin@pnr.com    / Admin@123");
  console.log("   Supervisor:  aboli@pnr.com    / Pnr@123  (Aboli Wagh)");
  console.log("   Supervisor:  sandeep@pnr.com  / Pnr@123  (Sandeep Gargate)");
  console.log("   Bakery:      shridhar@pnr.com / Pnr@123  (Shridhar Jadhav)");
  console.log("   Bakery:      pravin@pnr.com   / Pnr@123  (Pravin Jadhav)");
  console.log("   Bakery:      sagar@pnr.com    / Pnr@123  (Sagar Yadav)");
  console.log("   Bakery:      dilip@pnr.com    / Pnr@123  (Dilip)");
  console.log("   Bakery:      meraj@pnr.com    / Pnr@123  (Meraj Khan)");
  console.log("   Oreta World: rameshwar@pnr.com / Pnr@123 (Rameshwar)");
  console.log("   Oreta World: bharti@pnr.com    / Pnr@123 (Bharti)");
  console.log("   Oreta World: mangla@pnr.com    / Pnr@123 (Mangla)");
  console.log("   Oreta World: arzaaan@pnr.com   / Pnr@123 (Arzaaan)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
