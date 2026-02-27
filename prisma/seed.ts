import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Seed users (matching original Flask users)
  const users = [
    { username: "admin", displayName: "Administrator", role: Role.ADMIN, password: "admin123" },
    { username: "mdm", displayName: "MDM Manager", role: Role.MDM_MANAGER, password: "mdm123" },
    { username: "demo", displayName: "Demo User", role: Role.MDM_ANALYST, password: "demo" },
    { username: "viewer", displayName: "Viewer", role: Role.VIEWER, password: "viewer" },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        username: u.username,
        displayName: u.displayName,
        role: u.role,
        passwordHash: hash,
      },
    });
  }

  console.log("✅ Seeded 4 users");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
