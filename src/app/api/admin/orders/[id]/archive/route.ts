import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { databaseSetupMessage, hasDatabaseUrl } from "@/lib/db-config";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let staff;
  try { staff = await requireStaff(); } catch { return NextResponse.json({ error: "No se pudo verificar la sesión administrativa." }, { status: 503 }); }
  if (!staff) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!hasDatabaseUrl()) return NextResponse.json({ error: databaseSetupMessage }, { status: 503 });
  const { id } = await params;
  try {
    const order = await db.order.update({ where: { id }, data: { archivedAt: new Date() }, select: { id: true, archivedAt: true } });
    await db.auditLog.create({ data: { userId: staff.id, action: "ORDER_ARCHIVED", entity: "Order", entityId: id, details: {} } });
    return NextResponse.json(order);
  } catch (error) {
    console.error("order_archive_failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "No se pudo archivar el pedido." }, { status: 503 });
  }
}
