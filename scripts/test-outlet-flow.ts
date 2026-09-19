import { prisma } from "../lib/db";

async function runTest() {
  console.log("🧪 Testing Outlet Creation & Association Logic...");

  const org = await prisma.organization.findFirst();
  if (!org) throw new Error("No organization found");

  const newOutlet = await prisma.outlet.create({
    data: {
      organizationId: org.id,
      name: "Test Ocean Drive Kitchen",
      code: "TEST-01",
      type: "CLOUD_KITCHEN",
      icon: "🍳",
      address: "45 Ocean Drive",
      shifts: JSON.stringify(["Morning", "Evening", "Night"]),
    },
  });

  console.log(`✅ Created outlet: ${newOutlet.name} (${newOutlet.id})`);

  // Assign templates
  const templates = await prisma.formTemplate.findMany({ where: { organizationId: org.id } });
  for (const [idx, t] of templates.entries()) {
    await prisma.outletTemplate.create({
      data: {
        outletId: newOutlet.id,
        templateId: t.id,
        order: idx,
        isEnabled: true,
      },
    });
  }

  console.log(`✅ Assigned ${templates.length} templates to outlet.`);

  // Verify fetch with includes
  const fetched = await prisma.outlet.findUnique({
    where: { id: newOutlet.id },
    include: {
      outletTemplates: {
        include: { template: true },
      },
    },
  });

  if (!fetched || fetched.outletTemplates.length !== templates.length) {
    throw new Error("Outlet template query mismatch");
  }

  console.log("✅ Verified outlet template fetch.");

  // Clean up test outlet
  await prisma.outletTemplate.deleteMany({ where: { outletId: newOutlet.id } });
  await prisma.outlet.delete({ where: { id: newOutlet.id } });
  console.log("✅ Cleaned up test outlet.");

  console.log("\n🎉 ALL OUTLET CREATION TESTS PASSED!\n");
}

runTest()
  .catch((e) => {
    console.error("❌ Outlet test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
