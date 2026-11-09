import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { databaseSetupMessage, hasDatabaseUrl } from "@/lib/db-config";

export async function GET() {
  try {
    if (!(await requireStaff())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!hasDatabaseUrl()) return NextResponse.json({ error: databaseSetupMessage }, { status: 503 });
    const orders = await db.order.findMany({
      where: { archivedAt: { not: null } },
      orderBy: { archivedAt: "desc" },
      take: 200,
      select: {
        id: true, number: true, customerName: true, phone: true, address: true,
        fulfillment: true, requestedAt: true, notes: true, subtotalCents: true,
        deliveryCents: true, totalCents: true, status: true, archivedAt: true,
        createdAt: true, updatedAt: true,
        items: { select: { productName: true, unitPriceCents: true, quantity: true, customization: true } },
        payments: { select: { provider: true, status: true, amountCents: true, currency: true, createdAt: true } },
      },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error("admin_order_history_read_failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "No se pudo consultar el historial." }, { status: 503 });
  }
}
