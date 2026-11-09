"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
type Item = {
  productName: string;
  unitPriceCents: number;
  quantity: number;
  customization: unknown;
};
type Payment = {
  provider: string;
  status: string;
  amountCents: number;
  currency: string;
};
type Order = {
  id: string;
  number: string;
  customerName: string;
  phone: string;
  address: string | null;
  fulfillment: string;
  requestedAt: string | null;
  notes: string | null;
  subtotalCents: number;
  deliveryCents: number;
  totalCents: number;
  status: string;
  archivedAt: string | null;
  items: Item[];
  payments: Payment[];
};
const labels: Record<string, string> = {
    PENDING_PAYMENT: "Pago pendiente",
    RECEIVED: "Recibido",
    PREPARING: "En preparación",
    READY: "Listo",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
  },
  next: Record<string, string[]> = {
    PENDING_PAYMENT: ["RECEIVED", "CANCELLED"],
    RECEIVED: ["PREPARING", "CANCELLED"],
    PREPARING: ["READY", "CANCELLED"],
    READY: ["DELIVERED"],
    DELIVERED: [],
    CANCELLED: [],
  };
export default function Admin() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [orders, setOrders] = useState<Order[]>([]),
    [archivedOrders, setArchivedOrders] = useState<Order[]>([]),
    [error, setError] = useState(""),
    [logged, setLogged] = useState(false),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      const r = await fetch("/api/admin/orders", { cache: "no-store" }),
        data = await r.json();
      if (!r.ok) {
        setError(data.error || "No se pudieron consultar los pedidos.");
        return;
      }
      setOrders(data);
      const historyResponse = await fetch("/api/admin/orders/history", { cache: "no-store" });
      if (historyResponse.ok) setArchivedOrders(await historyResponse.json());
      setError("");
      setLogged(true);
    } catch {
      setError("No se pudo conectar con PostgreSQL.");
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        }),
        data = await r.json();
      if (!r.ok) {
        setError(data.error || "No se pudo iniciar sesión.");
        return;
      }
      await load();
    } catch {
      setError("No se pudo conectar con PostgreSQL.");
    } finally {
      setBusy(false);
    }
  }
  async function status(id: string, newStatus: string) {
    setError("");
    try {
      const endpoint = newStatus === "RECEIVED" ? `/api/admin/orders/${id}/receive` : `/api/admin/orders/${id}`;
      const r = await fetch(endpoint, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }),
        data = await r.json();
      if (!r.ok) setError(data.error || "No se guardó el estado.");
      await load();
    } catch {
      setError("No se pudo conectar con PostgreSQL.");
    }
  }
  async function archiveOrder(id: string) {
    if (!window.confirm("¿Archivar este pedido? Podrás restaurarlo desde el historial.")) return;
    setError("");
    try {
      const r = await fetch(`/api/admin/orders/${id}/archive`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "No se pudo archivar el pedido.");
        return;
      }
      await load();
    } catch {
      setError("No se pudo archivar el pedido.");
    }
  }
  async function restoreOrder(id: string) {
    setError("");
    const r = await fetch(`/api/admin/orders/${id}/restore`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { setError(data.error || "No se pudo restaurar el pedido."); return; }
    await load();
  }
  async function permanentlyDeleteOrder(id: string) {
    if (!window.confirm("Esta acción eliminará permanentemente el pedido y sus datos. ¿Continuar?")) return;
    setError("");
    const r = await fetch(`/api/admin/orders/${id}`, { method: "DELETE" });
    const data = await r.json();
    if (!r.ok) { setError(data.error || "No se pudo eliminar permanentemente el pedido."); return; }
    await load();
  }
  if (!logged)
    return (
      <main className="admin">
        <Link className="brand" href="/">
          E<span>·</span>Pan
        </Link>
        <h1 className="serif">Acceso del equipo</h1>
        <form onSubmit={login} style={{ maxWidth: 380 }}>
          <label className="label">
            Correo
            <input
              className="formInput"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="label">
            Contraseña
            <input
              className="formInput"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Verificando…" : "Iniciar sesión"}
          </button>
          <p role="alert">{error}</p>
        </form>
      </main>
    );
  return (
    <main className="admin">
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <div>
          <Link className="brand" href="/">
            E<span>·</span>Pan
          </Link>
          <h1 className="serif">Pedidos</h1>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link className="add" href="/admin/productos">
            Administrar productos
          </Link>
          <button
            onClick={async () => {
              await fetch("/api/admin/logout", { method: "POST" });
              setLogged(false);
            }}
          >
            Salir
          </button>
        </div>
      </header>
      <p role="alert">{error}</p>
      {orders.length === 0 ? (
        <p className="notice">No hay pedidos registrados.</p>
      ) : (
        orders.map((o) => (
          <article
            className="orderRow"
            key={o.id}
            style={{ alignItems: "start" }}
          >
            <div style={{ flex: 1 }}>
              <b>
                {o.number} · {o.customerName}
              </b>
              <p>
                {o.phone} ·{" "}
                {o.fulfillment === "PICKUP"
                  ? "Recoger en panadería"
                  : "Entrega a domicilio"}
                {o.address ? ` · ${o.address}` : ""}
              </p>
              {o.requestedAt && (
                <p>
                  Fecha solicitada:{" "}
                  {new Date(o.requestedAt).toLocaleString("es-MX")}
                </p>
              )}
              {o.notes && <p>Notas: {o.notes}</p>}
              <ul>
                {o.items.map((i, index) => (
                  <li key={`${i.productName}-${index}`}>
                    {i.quantity} × {i.productName} · $
                    {(i.unitPriceCents / 100).toFixed(2)} MXN
                    {i.customization
                      ? ` · Personalización: ${JSON.stringify(i.customization)}`
                      : ""}
                  </li>
                ))}
              </ul>
              <p>
                Subtotal ${(o.subtotalCents / 100).toFixed(2)} · Envío $
                {(o.deliveryCents / 100).toFixed(2)} ·{" "}
                <b>Total ${(o.totalCents / 100).toFixed(2)} MXN</b>
              </p>
              <p>
                Pago:{" "}
                {o.payments.length
                  ? o.payments
                      .map(
                        (p) =>
                          `${p.provider}: ${p.status} (${(p.amountCents / 100).toFixed(2)} ${p.currency})`,
                      )
                      .join("; ")
                  : "Sin registro de pago"}
              </p>
              <span className="status">{labels[o.status]}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <select
                aria-label={`Cambiar estado de ${o.number}`}
                value={o.status}
                onChange={(e) => status(o.id, e.target.value)}
              >
                <option value={o.status}>{labels[o.status]}</option>
                {next[o.status].map((s) => (
                  <option key={s} value={s}>
                    {labels[s]}
                  </option>
                ))}
              </select>
              <button className="add" type="button" onClick={() => archiveOrder(o.id)}>
                Archivar pedido
              </button>
            </div>
          </article>
        ))
      )}
      <section style={{ marginTop: 40 }}>
        <h2 className="serif">Historial de pedidos archivados</h2>
        {!archivedOrders.length ? <p className="notice">No hay pedidos archivados.</p> : archivedOrders.map((o) => (
          <article className="orderRow" key={o.id} style={{ alignItems: "start", opacity: .85 }}>
            <div style={{ flex: 1 }}><b>{o.number} · {o.customerName}</b><p>{labels[o.status] || o.status} · Archivado: {o.archivedAt ? new Date(o.archivedAt).toLocaleString("es-MX") : "—"}</p><p>Total ${(o.totalCents / 100).toFixed(2)} MXN</p></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="add" type="button" onClick={() => restoreOrder(o.id)}>Restaurar</button>
              <button className="add" type="button" onClick={() => permanentlyDeleteOrder(o.id)}>Eliminar permanentemente</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
