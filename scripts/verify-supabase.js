const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:24Hrushi%4002@db.gnesgmmxkrkjzpndtkrc.supabase.co:5432/postgres",
    },
  },
});

async function main() {
  const users = await prisma.user.findMany();
  console.log("Total users found in Supabase:", users.length);
  for (const u of users) {
    const isMatchAdmin = await bcrypt.compare("Admin@123", u.passwordHash);
    console.log(`User: ${u.email} | Name: ${u.name} | Role: ${u.role} | Active: ${u.isActive} | Admin@123 match: ${isMatchAdmin}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
