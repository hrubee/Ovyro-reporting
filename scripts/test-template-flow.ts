import { prisma } from "../lib/db";

async function runTest() {
  console.log("🧪 Running End-to-End Template Builder & Schema Flow Verification...");

  const org = await prisma.organization.findFirst({ where: { slug: "oreta-hospitality" } });
  if (!org) throw new Error("Org not found");

  const outlet = await prisma.outlet.findFirst({ where: { organizationId: org.id } });
  if (!outlet) throw new Error("Outlet not found");

  // 1. Create a dynamic template
  const newSlug = `test-cold-storage-${Date.now().toString().slice(-4)}`;
  const template = await prisma.formTemplate.create({
    data: {
      organizationId: org.id,
      title: "Automated Test Cold Storage",
      slug: newSlug,
      category: "TEMPERATURE",
      icon: "🧊",
      description: "Automated test template for verification",
      frequency: "DAILY",
      schema: JSON.stringify({
        type: "TEMPERATURE",
        sections: [
          {
            id: "sec-1",
            title: "Test Chillers",
            items: [
              { id: "temp-1", name: "Chiller A", machineNumber: "1", referenceTemp: "+2 to +6°C", targetMinTemp: 2, targetMaxTemp: 6 },
              { id: "temp-2", name: "Chiller B", machineNumber: "2", referenceTemp: "+2 to +6°C", targetMinTemp: 2, targetMaxTemp: 6 },
            ],
          },
        ],
      }),
    },
  });

  console.log(`✅ Step 1: Created dynamic template: ${template.title} (ID: ${template.id}, Slug: ${template.slug})`);

  // 2. Assign to outlet
  await prisma.outletTemplate.create({
    data: {
      outletId: outlet.id,
      templateId: template.id,
      order: 99,
      isEnabled: true,
    },
  });

  console.log(`✅ Step 2: Assigned template to outlet: ${outlet.name}`);

  // 3. Verify outlet template lookup
  const outletTemplates = await prisma.outletTemplate.findMany({
    where: { outletId: outlet.id, templateId: template.id },
    include: { template: true },
  });

  if (outletTemplates.length === 0 || !outletTemplates[0].template) {
    throw new Error("Failed to link template to outlet");
  }

  // 4. Verify schema parsing
  const rawSchema = outletTemplates[0].template.schema;
  const parsed = typeof rawSchema === "string" ? JSON.parse(rawSchema) : rawSchema;
  if (!parsed.sections || parsed.sections.length === 0 || parsed.sections[0].items.length !== 2) {
    throw new Error("Schema items corrupted or missing");
  }

  console.log(`✅ Step 3: Successfully parsed schema with ${parsed.sections[0].items.length} checkpoint items`);

  // 5. Clean up test template
  await prisma.outletTemplate.deleteMany({ where: { templateId: template.id } });
  await prisma.formTemplate.delete({ where: { id: template.id } });
  console.log("✅ Step 4: Cleanup completed.");

  console.log("\n🎉 ALL TEMPLATE BUILDER & SCHEMA ENGINE TESTS PASSED!\n");
}

runTest()
  .catch((e) => {
    console.error("❌ Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
