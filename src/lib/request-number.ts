import prisma from "./prisma";

export async function generateRequestNumber(): Promise<string> {
  const now = new Date();
  const prefix = `CR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const count = await prisma.changeRequest.count({
    where: { requestNumber: { startsWith: prefix } },
  });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}
