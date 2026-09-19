import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

// ─── TEMPLATE DEFINITIONS ─────────────────────────────────────────────────────

const HOUSEKEEPING_4SHIFT_SCHEMA = {
  type: "HOUSEKEEPING",
  shifts: ["Morning", "Afternoon", "Evening", "Night"],
  allowPhotoEvidence: true,
  sections: [
    {
      id: "shop-hygiene",
      title: "Daily House Keeping & SOPs",
      items: [
        { id: 1, name: "Kitchen", defaultAssignee: "Rameshwar", assignedStaff: ["Rameshwar", "Bharti"] },
        { id: 2, name: "Wash Room", defaultAssignee: "Mangla", assignedStaff: ["Mangla", "Bharti"], disabledShifts: ["Morning"] },
        { id: 3, name: "Outdoor Cleaning", defaultAssignee: "Mangla", assignedStaff: ["Mangla", "Bharti"] },
        { id: 4, name: "Inside Top / Ground Cleaning", defaultAssignee: "Mangla", assignedStaff: ["Mangla", "Bharti"] },
        { id: 5, name: "Cash Counter", defaultAssignee: "Arzaaan", assignedStaff: ["Arzaaan", "New Staff"] },
        { id: 6, name: "Display Counters", defaultAssignee: "Arzaaan", assignedStaff: ["Arzaaan", "New Staff"] },
        { id: 7, name: "Freezer Top & Exterior", defaultAssignee: "Arzaaan", assignedStaff: ["Arzaaan", "New Staff"] },
        { id: 8, name: "Racks & Storage", defaultAssignee: "Arzaaan", assignedStaff: ["Arzaaan", "New Staff"] },
        { id: 9, name: "Store Room", defaultAssignee: "Arzaaan", assignedStaff: ["Arzaaan", "New Staff"] },
        { id: 10, name: "General Dusting", defaultAssignee: "Bharti", assignedStaff: ["Bharti", "Mangla"] },
        { id: 11, name: "Tables & Chairs", defaultAssignee: "Bharti", assignedStaff: ["Bharti", "Rameshwar"] },
        { id: 12, name: "Washing Vessels & Utensils", defaultAssignee: "Bharti", assignedStaff: ["Bharti", "Rameshwar"] },
      ],
    },
  ],
};

const EQUIPMENT_CLEANING_SCHEMA = {
  type: "EQUIPMENT",
  allowPhotoEvidence: true,
  sections: [
    {
      id: "kitchen-cooking",
      title: "Kitchen & Cooking Equipment",
      items: [
        { id: "eq-1", name: "Oven", category: "Kitchen & Cooking", defaultAssignee: "Rameshwar" },
        { id: "eq-2", name: "Microwave", category: "Kitchen & Cooking", defaultAssignee: "Rameshwar" },
        { id: "eq-3", name: "Gas range", category: "Kitchen & Cooking", defaultAssignee: "Rameshwar" },
        { id: "eq-4", name: "Oil fryer", category: "Kitchen & Cooking", defaultAssignee: "Rameshwar" },
        { id: "eq-5", name: "Working Table 1", category: "Kitchen & Cooking", defaultAssignee: "Bharti" },
        { id: "eq-6", name: "Working Table 2", category: "Kitchen & Cooking", defaultAssignee: "Bharti" },
        { id: "eq-7", name: "Working Table 3", category: "Kitchen & Cooking", defaultAssignee: "Bharti" },
        { id: "eq-8", name: "Bar counter", category: "Kitchen & Cooking", defaultAssignee: "Bharti" },
        { id: "eq-9", name: "Kitchen Rack", category: "Kitchen & Cooking", defaultAssignee: "Rameshwar" },
        { id: "eq-10", name: "Wash Sink", category: "Kitchen & Cooking", defaultAssignee: "Bharti" },
        { id: "eq-11", name: "Chimney Exhaust", category: "Kitchen & Cooking", defaultAssignee: "Rameshwar" },
        { id: "eq-12", name: "Griller 1", category: "Kitchen & Cooking", defaultAssignee: "Rameshwar" },
        { id: "eq-13", name: "Griller 2", category: "Kitchen & Cooking", defaultAssignee: "Rameshwar" },
      ],
    },
    {
      id: "beverage-cold",
      title: "Beverage & Refrigeration Units",
      items: [
        { id: "eq-14", name: "Iced tea machine", category: "Beverage & Refrigeration", defaultAssignee: "Arzaaan" },
        { id: "eq-15", name: "Coffee machine 1", category: "Beverage & Refrigeration", defaultAssignee: "Arzaaan" },
        { id: "eq-16", name: "Coffee machine 2", category: "Beverage & Refrigeration", defaultAssignee: "Arzaaan" },
        { id: "eq-17", name: "Fridge 1", category: "Beverage & Refrigeration", defaultAssignee: "Rameshwar" },
        { id: "eq-18", name: "Fridge 2", category: "Beverage & Refrigeration", defaultAssignee: "Rameshwar" },
        { id: "eq-19", name: "Fridge Top", category: "Beverage & Refrigeration", defaultAssignee: "Rameshwar" },
        { id: "eq-20", name: "Freezer 1", category: "Beverage & Refrigeration", defaultAssignee: "Rameshwar" },
      ],
    },
    {
      id: "containers-prep",
      title: "Containers & Prep Tools",
      items: [
        { id: "eq-21", name: "Food containers", category: "Containers & Prep", defaultAssignee: "Bharti" },
        { id: "eq-22", name: "Sauce containers", category: "Containers & Prep", defaultAssignee: "Bharti" },
        { id: "eq-23", name: "Spice containers", category: "Containers & Prep", defaultAssignee: "Bharti" },
        { id: "eq-24", name: "Weighing Scale 1", category: "Containers & Prep", defaultAssignee: "Arzaaan" },
        { id: "eq-25", name: "Weighing Scale 2", category: "Containers & Prep", defaultAssignee: "Arzaaan" },
        { id: "eq-26", name: "Wet and Dry Dustbins", category: "Containers & Prep", defaultAssignee: "Mangla" },
      ],
    },
    {
      id: "display-retail",
      title: "Display & Retail Counters",
      items: [
        { id: "eq-27", name: "Cake counter 1", category: "Display & Retail", defaultAssignee: "Arzaaan" },
        { id: "eq-28", name: "Cake counter 2", category: "Display & Retail", defaultAssignee: "Arzaaan" },
        { id: "eq-29", name: "Ice cream counter", category: "Display & Retail", defaultAssignee: "Arzaaan" },
        { id: "eq-30", name: "Food rack", category: "Display & Retail", defaultAssignee: "Arzaaan" },
        { id: "eq-31", name: "Food Rack Top", category: "Display & Retail", defaultAssignee: "Arzaaan" },
        { id: "eq-32", name: "Store rack", category: "Display & Retail", defaultAssignee: "Arzaaan" },
        { id: "eq-33", name: "Store room", category: "Display & Retail", defaultAssignee: "Arzaaan" },
        { id: "eq-34", name: "Cabinet cleaning", category: "Display & Retail", defaultAssignee: "Mangla" },
        { id: "eq-35", name: "Cash Counter", category: "Display & Retail", defaultAssignee: "Arzaaan" },
        { id: "eq-36", name: "Gods Altar", category: "Display & Retail", defaultAssignee: "Bharti" },
      ],
    },
    {
      id: "facility-env",
      title: "Facility & Environment",
      items: [
        { id: "eq-37", name: "Pest control inspection", category: "Facility & Environment", defaultAssignee: "Mangla" },
        { id: "eq-38", name: "Pest - Flies Machine Catch Tray", category: "Facility & Environment", defaultAssignee: "Mangla" },
        { id: "eq-39", name: "Outdoor sitting area", category: "Facility & Environment", defaultAssignee: "Mangla" },
        { id: "eq-40", name: "Web / Cobweb Cleaning", category: "Facility & Environment", defaultAssignee: "Mangla" },
        { id: "eq-41", name: "Signage board", category: "Facility & Environment", defaultAssignee: "Mangla" },
      ],
    },
  ],
};

const TEMPERATURE_LOG_SCHEMA = {
  type: "TEMPERATURE",
  unit: "°C",
  allowPhotoEvidence: true,
  sections: [
    {
      id: "kitchen-cold-units",
      title: "Kitchen Chillers & Freezers",
      items: [
        { id: "temp-1", name: "FRIDGE UNDER TABLE", machineNumber: "1", referenceTemp: "+3 to +8°C", targetMinTemp: 3, targetMaxTemp: 8 },
        { id: "temp-2", name: "FRIDGE 1", machineNumber: "2", referenceTemp: "+3 to +8°C", targetMinTemp: 3, targetMaxTemp: 8 },
        { id: "temp-3", name: "FRIDGE 2", machineNumber: "3", referenceTemp: "+3 to +8°C", targetMinTemp: 3, targetMaxTemp: 8 },
        { id: "temp-4", name: "FREEZER 1", machineNumber: "1", referenceTemp: "-18 to -15°C", targetMinTemp: -18, targetMaxTemp: -15 },
        { id: "temp-5", name: "FREEZER 2", machineNumber: "2", referenceTemp: "-18 to -15°C", targetMinTemp: -18, targetMaxTemp: -15 },
      ],
    },
    {
      id: "cake-display-units",
      title: "Cake Display & Retail Chillers",
      items: [
        { id: "temp-6", name: "Cake display counter 1", machineNumber: "1", referenceTemp: "+2 to +10°C", targetMinTemp: 2, targetMaxTemp: 10 },
        { id: "temp-7", name: "Cake display counter 2", machineNumber: "2", referenceTemp: "+2 to +10°C", targetMinTemp: 2, targetMaxTemp: 10 },
      ],
    },
  ],
};

const GLASS_SAFETY_SCHEMA = {
  type: "SAFETY_GLASS",
  sections: [
    {
      id: "ground-floor-glass",
      title: "Ground Floor Panels",
      items: [
        { id: "gl-1", name: "Glass Ground floor 1", defaultAssignee: "Mangla" },
        { id: "gl-2", name: "Glass Ground floor 2", defaultAssignee: "Mangla" },
        { id: "gl-3", name: "Glass Ground floor 3", defaultAssignee: "Mangla" },
        { id: "gl-4", name: "Glass Ground floor 4", defaultAssignee: "Mangla" },
      ],
    },
    {
      id: "mezzanine-glass",
      title: "Mezzanine Floor Panels",
      items: [
        { id: "gl-5", name: "Mezzanine floor 1", defaultAssignee: "Bharti" },
        { id: "gl-6", name: "Mezzanine floor 2", defaultAssignee: "Bharti" },
      ],
    },
  ],
};

const MONTHLY_MAINTENANCE_SCHEMA = {
  type: "MAINTENANCE",
  frequency: "MONTHLY",
  sections: [
    {
      id: "monthly-deep-tasks",
      title: "Monthly Deep Sanitization & Heavy Machinery",
      items: [
        { id: "mm-1", name: "Rolling Shutters Deep Wash & Lubrication", category: "Physical Security", defaultAssignee: "Mangla" },
        { id: "mm-2", name: "Shutter Locks Inspection & Grease", category: "Physical Security", defaultAssignee: "Mangla" },
        { id: "mm-3", name: "Generator Area Clearance & Spill Check", category: "Electrical & Power", defaultAssignee: "Rameshwar" },
        { id: "mm-4", name: "Generator Engine Oil & Battery Service", category: "Electrical & Power", defaultAssignee: "Technician / Rameshwar" },
        { id: "mm-5", name: "Air Condition HVAC Filters Deep Clean", category: "HVAC & Climate", defaultAssignee: "AC Technician" },
        { id: "mm-6", name: "Chiller / Fridge Condenser Coil De-scaling", category: "Refrigeration", defaultAssignee: "Chiller Technician" },
      ],
    },
  ],
};

const BAKERY_PRODUCTION_SOP_SCHEMA = {
  type: "HOUSEKEEPING",
  shifts: ["Morning", "Evening"],
  sections: [
    {
      id: "bakery-production-zones",
      title: "Bakery Facility Production Areas",
      items: [
        { id: "bk-1", name: "Production Room Floor & Tables", defaultAssignee: "Pravin Jadhav" },
        { id: "bk-2", name: "Oven Room & Exhaust Hoods", defaultAssignee: "Shridhar Jadhav" },
        { id: "bk-3", name: "Puff Department & Sheeter", defaultAssignee: "Dilip" },
        { id: "bk-4", name: "Cake Room & Cold Storage", defaultAssignee: "Meraj Khan" },
        { id: "bk-5", name: "Flour Silos & Ingredient Bins", defaultAssignee: "Sagar Yadav" },
        { id: "bk-6", name: "Utility & Wash Station", defaultAssignee: "Mavshi" },
      ],
    },
  ],
};

async function main() {
  console.log("🚀 Seeding Multi-Tenant SaaS Reporting Platform with Dynamic Roles...");

  const defaultPassword = await bcrypt.hash("Pnr@123", 12);
  const adminPassword = await bcrypt.hash("Admin@123", 12);

  // 1. Create Demo Organization
  const org = await prisma.organization.upsert({
    where: { slug: "oreta-hospitality" },
    update: {
      name: "Oreta & PNR Hospitality Group",
      plan: "PRO",
      status: "ACTIVE",
    },
    create: {
      name: "Oreta & PNR Hospitality Group",
      slug: "oreta-hospitality",
      plan: "PRO",
      status: "ACTIVE",
      settings: JSON.stringify({
        timezone: "Asia/Kolkata",
        currency: "INR",
        branding: {
          primaryColor: "#059669",
          companyName: "Oreta & PNR Foods",
        },
      }),
    },
  });

  console.log(`✅ Organization created: ${org.name}`);

  // 2. Create Dynamic Custom Roles
  const supervisorRole = await prisma.customRole.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Shift Supervisor" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Shift Supervisor",
      description: "Shift supervisor with audit verification and sign-off authority",
      permissions: JSON.stringify(["submit_checklists", "supervisor_signoff", "view_reports"]),
    },
  });

  const managerRole = await prisma.customRole.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "General Manager" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "General Manager",
      description: "Facility manager with full reporting, team and outlet access",
      permissions: JSON.stringify([
        "submit_checklists",
        "supervisor_signoff",
        "view_reports",
        "export_audit_pack",
        "manage_team",
      ]),
    },
  });

  const chefRole = await prisma.customRole.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Head Chef" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Head Chef",
      description: "Kitchen leader managing food safety and recipe sanitation SOPs",
      permissions: JSON.stringify(["submit_checklists", "supervisor_signoff", "view_reports"]),
    },
  });

  const workerRole = await prisma.customRole.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Line Worker / Cleaner" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Line Worker / Cleaner",
      description: "Floor staff responsible for executing daily housekeeping and equipment logs",
      permissions: JSON.stringify(["submit_checklists"]),
    },
  });

  console.log("✅ Dynamic Custom Roles Created (Supervisor, GM, Head Chef, Line Worker)!");

  // 3. Create Outlets
  const outletBakery = await prisma.outlet.upsert({
    where: { id: "outlet-bakery-main" },
    update: { name: "PNR Central Bakery Facility", code: "BKR-01" },
    create: {
      id: "outlet-bakery-main",
      organizationId: org.id,
      name: "PNR Central Bakery Facility",
      code: "BKR-01",
      type: "BAKERY",
      icon: "🥐",
      address: "Plot 12, Industrial Area, Mumbai",
      shifts: JSON.stringify(["Morning", "Evening"]),
    },
  });

  const outletOreta = await prisma.outlet.upsert({
    where: { id: "outlet-oreta-world" },
    update: { name: "Oreta World Cafe & Kitchen", code: "ORETA-01" },
    create: {
      id: "outlet-oreta-world",
      organizationId: org.id,
      name: "Oreta World Cafe & Kitchen",
      code: "ORETA-01",
      type: "RESTAURANT",
      icon: "🌐",
      address: "Unit 4, High Street Avenue, Mumbai",
      shifts: JSON.stringify(["Morning", "Afternoon", "Evening", "Night"]),
    },
  });

  // 4. Create Users with Dynamic Roles & Permissions
  const admin = await prisma.user.upsert({
    where: { email: "admin@reporting.app" },
    update: { organizationId: org.id, role: "ORG_ADMIN", name: "System Admin" },
    create: {
      organizationId: org.id,
      name: "System Admin",
      email: "admin@reporting.app",
      passwordHash: adminPassword,
      role: "ORG_ADMIN",
      permissions: JSON.stringify([
        "submit_checklists",
        "supervisor_signoff",
        "view_reports",
        "export_audit_pack",
        "manage_templates",
        "manage_outlets",
        "manage_team",
      ]),
    },
  });

  const supervisorAboli = await prisma.user.upsert({
    where: { email: "aboli@reporting.app" },
    update: { organizationId: org.id, role: "SUPERVISOR", customRoleId: supervisorRole.id },
    create: {
      organizationId: org.id,
      name: "Aboli Wagh (Supervisor)",
      email: "aboli@reporting.app",
      passwordHash: defaultPassword,
      role: "SUPERVISOR",
      customRoleId: supervisorRole.id,
      permissions: JSON.stringify(["submit_checklists", "supervisor_signoff", "view_reports"]),
    },
  });

  const staffUsers = [
    { name: "Rameshwar", email: "rameshwar@reporting.app", outlets: [outletOreta.id], roleId: workerRole.id },
    { name: "Bharti", email: "bharti@reporting.app", outlets: [outletOreta.id], roleId: workerRole.id },
    { name: "Mangla", email: "mangla@reporting.app", outlets: [outletOreta.id], roleId: workerRole.id },
    { name: "Arzaaan", email: "arzaaan@reporting.app", outlets: [outletOreta.id], roleId: workerRole.id },
    { name: "Shridhar Jadhav", email: "shridhar@reporting.app", outlets: [outletBakery.id], roleId: workerRole.id },
    { name: "Pravin Jadhav", email: "pravin@reporting.app", outlets: [outletBakery.id], roleId: chefRole.id },
    { name: "Meraj Khan", email: "meraj@reporting.app", outlets: [outletBakery.id], roleId: workerRole.id },
  ];

  const createdStaff: Record<string, string> = {};

  for (const s of staffUsers) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { organizationId: org.id, name: s.name, customRoleId: s.roleId },
      create: {
        organizationId: org.id,
        name: s.name,
        email: s.email,
        passwordHash: defaultPassword,
        role: "OPERATOR",
        customRoleId: s.roleId,
        permissions: JSON.stringify(["submit_checklists"]),
      },
    });
    createdStaff[s.name] = user.id;

    for (const outletId of s.outlets) {
      await prisma.userOutlet.upsert({
        where: { userId_outletId: { userId: user.id, outletId } },
        update: {},
        create: { userId: user.id, outletId, role: "OPERATOR" },
      });
    }
  }

  // Grant admin & supervisor access to all outlets
  for (const oId of [outletBakery.id, outletOreta.id]) {
    await prisma.userOutlet.upsert({
      where: { userId_outletId: { userId: admin.id, outletId: oId } },
      update: {},
      create: { userId: admin.id, outletId: oId, role: "ORG_ADMIN" },
    });
    await prisma.userOutlet.upsert({
      where: { userId_outletId: { userId: supervisorAboli.id, outletId: oId } },
      update: {},
      create: { userId: supervisorAboli.id, outletId: oId, role: "SUPERVISOR" },
    });
  }

  // 5. Create Dynamic Form Templates
  const templates = [
    {
      slug: "housekeeping-sop",
      title: "Daily House Keeping SOPs",
      category: "HOUSEKEEPING",
      icon: "🧹",
      description: "4-Shift SOP and general sanitization checklist",
      frequency: "SHIFT_WISE",
      schema: HOUSEKEEPING_4SHIFT_SCHEMA,
      outlets: [outletOreta.id],
    },
    {
      slug: "equipment-cleaning",
      title: "Kitchen & Cafe Equipment Cleaning",
      category: "EQUIPMENT",
      icon: "⚙️",
      description: "Sanitation log for kitchen fryers, ovens, coffee machines and counters",
      frequency: "DAILY",
      schema: EQUIPMENT_CLEANING_SCHEMA,
      outlets: [outletOreta.id],
    },
    {
      slug: "temperature-log",
      title: "Fridge & Display Temp Log",
      category: "TEMPERATURE",
      icon: "🧊",
      description: "Chillers, freezers and cake display temperature monitoring with limits",
      frequency: "DAILY",
      schema: TEMPERATURE_LOG_SCHEMA,
      outlets: [outletOreta.id, outletBakery.id],
    },
    {
      slug: "glass-safety",
      title: "Glass & Safety Inspection",
      category: "SAFETY_GLASS",
      icon: "🪟",
      description: "Ground floor and mezzanine partition glass safety checklist",
      frequency: "DAILY",
      schema: GLASS_SAFETY_SCHEMA,
      outlets: [outletOreta.id],
    },
    {
      slug: "monthly-maintenance",
      title: "Monthly Deep Maintenance",
      category: "MAINTENANCE",
      icon: "🗓️",
      description: "Heavy machinery, AC filters, DG generator and rolling shutter service",
      frequency: "MONTHLY",
      schema: MONTHLY_MAINTENANCE_SCHEMA,
      outlets: [outletOreta.id, outletBakery.id],
    },
    {
      slug: "bakery-production-sop",
      title: "Bakery Production & Hygiene SOP",
      category: "HOUSEKEEPING",
      icon: "🥐",
      description: "Oven room, puff room, dough sheeter & cake room sanitization",
      frequency: "DAILY",
      schema: BAKERY_PRODUCTION_SOP_SCHEMA,
      outlets: [outletBakery.id],
    },
  ];

  for (const [idx, t] of templates.entries()) {
    const template = await prisma.formTemplate.upsert({
      where: { organizationId_slug: { organizationId: org.id, slug: t.slug } },
      update: {
        title: t.title,
        category: t.category,
        icon: t.icon,
        description: t.description,
        frequency: t.frequency,
        schema: JSON.stringify(t.schema),
      },
      create: {
        organizationId: org.id,
        title: t.title,
        slug: t.slug,
        category: t.category,
        icon: t.icon,
        description: t.description,
        frequency: t.frequency,
        schema: JSON.stringify(t.schema),
      },
    });

    for (const outletId of t.outlets) {
      await prisma.outletTemplate.upsert({
        where: { outletId_templateId: { outletId, templateId: template.id } },
        update: { order: idx },
        create: { outletId, templateId: template.id, order: idx, isEnabled: true },
      });
    }
  }

  // 6. Seed Submissions
  await prisma.formSubmission.deleteMany({});

  const housekeepingTemplate = await prisma.formTemplate.findFirst({ where: { slug: "housekeeping-sop", organizationId: org.id } });
  const equipTemplate = await prisma.formTemplate.findFirst({ where: { slug: "equipment-cleaning", organizationId: org.id } });
  const tempTemplate = await prisma.formTemplate.findFirst({ where: { slug: "temperature-log", organizationId: org.id } });

  for (let daysAgo = 5; daysAgo >= 0; daysAgo--) {
    const date = dateStr(daysAgo);

    if (housekeepingTemplate) {
      for (const shift of ["Morning", "Afternoon", "Evening"]) {
        await prisma.formSubmission.create({
          data: {
            organizationId: org.id,
            outletId: outletOreta.id,
            templateId: housekeepingTemplate.id,
            templateVersion: 1,
            date,
            shift,
            submittedById: createdStaff["Bharti"] || admin.id,
            supervisorName: "Aboli Wagh",
            supervisorSigned: true,
            complianceScore: 100,
            status: "VERIFIED",
            comments: `All ${shift} housekeeping zones sanitized as per SOP.`,
            data: JSON.stringify({
              items: HOUSEKEEPING_4SHIFT_SCHEMA.sections[0].items.map((item) => ({
                id: item.id,
                name: item.name,
                checked: true,
                cleanedBy: item.defaultAssignee,
                time: shift === "Morning" ? "08:30" : shift === "Afternoon" ? "14:15" : "20:45",
              })),
            }),
          },
        });
      }
    }

    if (tempTemplate) {
      await prisma.formSubmission.create({
        data: {
          organizationId: org.id,
          outletId: outletOreta.id,
          templateId: tempTemplate.id,
          templateVersion: 1,
          date,
          shift: "General",
          submittedById: createdStaff["Rameshwar"] || admin.id,
          supervisorName: "Aboli Wagh",
          supervisorSigned: true,
          complianceScore: 100,
          status: "VERIFIED",
          comments: "All units running within optimal safety range.",
          data: JSON.stringify({
            readings: [
              { id: "temp-1", name: "FRIDGE UNDER TABLE", morningTemp: 4.2, eveningTemp: 4.5, status: "NORMAL" },
              { id: "temp-2", name: "FRIDGE 1", morningTemp: 3.8, eveningTemp: 4.1, status: "NORMAL" },
              { id: "temp-3", name: "FRIDGE 2", morningTemp: 4.0, eveningTemp: 4.4, status: "NORMAL" },
              { id: "temp-4", name: "FREEZER 1", morningTemp: -17.2, eveningTemp: -16.8, status: "NORMAL" },
              { id: "temp-5", name: "FREEZER 2", morningTemp: -17.5, eveningTemp: -17.0, status: "NORMAL" },
              { id: "temp-6", name: "Cake display counter 1", morningTemp: 5.1, eveningTemp: 5.4, status: "NORMAL" },
              { id: "temp-7", name: "Cake display counter 2", morningTemp: 5.0, eveningTemp: 5.2, status: "NORMAL" },
            ],
          }),
        },
      });
    }

    if (equipTemplate) {
      await prisma.formSubmission.create({
        data: {
          organizationId: org.id,
          outletId: outletOreta.id,
          templateId: equipTemplate.id,
          templateVersion: 1,
          date,
          submittedById: createdStaff["Mangla"] || admin.id,
          supervisorName: "Aboli Wagh",
          supervisorSigned: true,
          complianceScore: 100,
          status: "VERIFIED",
          comments: "Full equipment sanitization completed.",
          data: JSON.stringify({
            completedItems: EQUIPMENT_CLEANING_SCHEMA.sections.flatMap((s) => s.items).map((eq) => ({
              id: eq.id,
              name: eq.name,
              category: eq.category,
              cleanedBy: eq.defaultAssignee,
              checkedBy: "Aboli Wagh",
              status: "DONE",
              time: "21:00",
            })),
          }),
        },
      });
    }
  }

  console.log("🎉 Seeding completed with dynamic roles and granular permissions!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
