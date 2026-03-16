import { prisma } from "./prisma";

export async function generateBillNumber(shopId: string): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

  const count = await prisma.bill.count({
    where: {
      shopId,
      createdAt: {
        gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      },
    },
  });

  const sequence = String(count + 1).padStart(4, "0");
  return `ECO-${dateStr}-${sequence}`;
}
