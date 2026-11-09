"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ShoppingBag, X, Plus, Minus, ArrowRight } from "lucide-react";
import { categories, formatPrice, products } from "@/lib/catalog";
type CartItem = { id: string; qty: number };
type OrderResponse = { number: string; trackingToken: string; status?: string };
type SavedOrder = { number: string; token: string; status?: string };
export default function Home() {
  const [category, setCategory] = useState("Todo"),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("relevance"),
    [catalog, setCatalog] = useState(products),
    [cart, setCart] = useState<CartItem[]>([]),
    [pickQty, setPickQty] = useState<Record<string, number>>({}),
    [activeOrder, setActiveOrder] = useState<SavedOrder | null>(null),
    [editingOrder, setEditingOrder] = useState<{
      number: string;
      token: string;
    } | null>(null),
    [ready, setReady] = useState(false),
    [open, setOpen] = useState(false),
    [checkout, setCheckout] = useState(false),
    [busy, setBusy] = useState(false),
    [trackUrl, setTrackUrl] = useState("");
  const busyRef = useRef(false),
    keyRef = useRef("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    fulfillment: "PICKUP",
    address: "",
    notes: "",
  });
  useEffect(() => {
    try {
      const saved = localStorage.getItem("epan-active-order");
      if (saved) {
        const value = JSON.parse(saved);
        if (value?.number && value?.token) setActiveOrder(value);
      }
    } catch {}
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("edit") !== "1") return;
    const number = params.get("number"),
      token = params.get("token");
    if (!number || !token) return;
    setEditingOrder({ number, token });
    setOpen(true);
    void fetch(
      `/api/orders/edit?number=${encodeURIComponent(number)}&token=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    )
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setCart(
          data.items.map((item: { productId: string; quantity: number }) => ({
            id: item.productId,
            qty: item.quantity,
          })),
        );
        setForm({
          name: data.customerName,
          phone: data.phone,
          fulfillment: data.fulfillment,
          address: data.address || "",
          notes: data.notes || "",
        });
        setCheckout(false);
      })
      .catch((e) =>
        alert(
          e instanceof Error
            ? e.message
            : "No se pudo cargar el pedido para editar",
        ),
      );
  }, []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("epan-cart");
      if (saved) {
        const value = JSON.parse(saved);
        if (Array.isArray(value))
          setCart(
            value.filter(
              (x) =>
                typeof x?.id === "string" &&
                Number.isInteger(x?.qty) &&
                x.qty > 0 &&
                x.qty <= 30,
            ),
          );
      }
    } catch {}
    setReady(true);
    void fetch("/api/products")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data)) setCatalog(data);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem("epan-cart", JSON.stringify(cart));
  }, [cart, ready]);
  useEffect(() => {
    if (cart.length)
      setPickQty((q) => ({
        ...q,
        ...Object.fromEntries(cart.map((item) => [item.id, item.qty])),
      }));
  }, [cart]);
  const visible = useMemo(() => {
    const list = catalog.filter(
      (p) =>
        (category === "Todo" || p.category === category) &&
        p.name.toLowerCase().includes(search.trim().toLowerCase()),
    );
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    return list;
  }, [catalog, category, search, sort]);
  const lines = cart.map((c) => ({
    ...(catalog.find((p) => p.id === c.id) ??
      products.find((p) => p.id === c.id)!),
    qty: c.qty,
  }));
  const total = lines.reduce((s, p) => s + p.price * p.qty, 0);
  function selectedQty(id: string) {
    return pickQty[id] ?? 1;
  }
  function adjustPickQty(id: string, delta: number) {
    setPickQty((q) => ({ ...q, [id]: Math.max(1, (q[id] ?? 1) + delta) }));
  }
  function add(id: string) {
    const quantity = selectedQty(id);
    setCart((c) => {
      const old = c.find((i) => i.id === id);
      return old
        ? c.map((i) => (i.id === id ? { ...i, qty: i.qty + quantity } : i))
        : [...c, { id, qty: quantity }];
    });
  }
  function change(id: string, n: number) {
    setCart((c) =>
      c.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + n) } : i)),
    );
    setPickQty((q) => ({ ...q, [id]: Math.max(1, (q[id] ?? 1) + n) }));
  }
  function remove(id: string) {
    setCart((c) => c.filter((i) => i.id !== id));
    setPickQty((q) => ({ ...q, [id]: 1 }));
  }
  async function place() {
    if (busyRef.current) return;
    if (
      !form.name.trim() ||
      form.phone.replace(/\D/g, "").length < 10 ||
      (form.fulfillment === "DELIVERY" && !form.address.trim())
    )
      return alert("Revisa tu nombre, teléfono y dirección.");
    if (!cart.length) return alert("Agrega al menos un producto.");
    busyRef.current = true;
    if (!editingOrder && !keyRef.current) keyRef.current = crypto.randomUUID();
    setBusy(true);
    try {
      const editing = Boolean(editingOrder),
        payload = editing
          ? {
              ...form,
              items: cart.map((i) => ({ productId: i.id, quantity: i.qty })),
              number: editingOrder!.number,
              token: editingOrder!.token,
            }
          : {
              ...form,
              items: cart.map((i) => ({ productId: i.id, quantity: i.qty })),
            },
        headers: Record<string, string> = {
          "content-type": "application/json",
        };
      if (!editing) headers["idempotency-key"] = keyRef.current;
      const r = await fetch(editing ? "/api/orders/edit" : "/api/orders", {
          method: editing ? "PATCH" : "POST",
          headers,
          body: JSON.stringify(payload),
        }),
        d = await r.json();
      if (!r.ok) throw new Error(d.error || "No se pudo guardar el pedido");
      const result = d as OrderResponse;
      const trackingToken = editing
        ? editingOrder!.token
        : result.trackingToken;
      const url = `/seguimiento?number=${encodeURIComponent(result.number)}&token=${encodeURIComponent(trackingToken)}`;
      setTrackUrl(url);
      setActiveOrder({
        number: result.number,
        token: trackingToken,
        status: result.status,
      });
      localStorage.setItem(
        "epan-active-order",
        JSON.stringify({
          number: result.number,
          token: trackingToken,
          status: result.status,
        }),
      );
      setCart([]);
      setCheckout(false);
      setOpen(false);
      keyRef.current = "";
      setEditingOrder(null);
      if (!editing && d.paymentConfigured) {
        const p = await fetch("/api/payments/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ number: result.number, token: trackingToken }),
        });
        const payment = await p.json();
        if (p.ok && payment.url) {
          window.location.assign(payment.url);
          return;
        }
      }
      window.location.assign(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <header className="header">
        <div className="wrap nav">
          <a className="brand" href="#inicio">
            E<span>·</span>Pan
          </a>
          <nav className="links">
            <a href="#productos">Productos</a>
            <a href="#nosotros">Nuestra historia</a>
            <a href="#contacto">Visítanos</a>
          </nav>
          <button className="cartbtn" onClick={() => setOpen(true)}>
            <ShoppingBag
              size={17}
              style={{ verticalAlign: "middle", marginRight: 8 }}
            />
            Carrito ({cart.reduce((n, i) => n + i.qty, 0)})
          </button>
        </div>
      </header>
      <main id="inicio">
        <section className="hero wrap">
          <div className="heroCard">
            <div className="heroCopy">
              <span className="eyebrow">
                Panadería artesanal · Hecho con cariño
              </span>
              <h1>El sabor de siempre, recién horneado</h1>
              <p>
                Recetas de casa, ingredientes de verdad y ese aroma que te hace
                sentir en familia.
              </p>
              <a href="#productos" className="primary">
                Ver productos{" "}
                <ArrowRight
                  size={16}
                  style={{ verticalAlign: "middle", marginLeft: 8 }}
                />
              </a>
            </div>
          </div>
        </section>
        <section className="section wrap" id="productos">
          <div className="sectionHead">
            <div>
              <span className="eyebrow" style={{ color: "var(--baker)" }}>
                Del horno a tu mesa
              </span>
              <h2>Nuestros favoritos</h2>
              <p>Preparados cada día, con ingredientes que conocemos.</p>
            </div>
          </div>
          <div className="filters">
            {categories.map((c) => (
              <button
                className={`filter ${category === c ? "active" : ""}`}
                key={c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
            <input
              aria-label="Buscar productos"
              className="formInput"
              placeholder="Buscar pan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="Ordenar productos"
              className="formInput"
              style={{ maxWidth: 210 }}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="relevance">Relevancia</option>
              <option value="price-asc">Precio: menor a mayor</option>
              <option value="price-desc">Precio: mayor a menor</option>
            </select>
          </div>
          {visible.length === 0 ? (
            <div className="notice">
              No encontramos productos en esta categoría.
            </div>
          ) : (
            <div className="grid">
              {visible.map((p) => (
                <article className="card" key={p.id}>
                  <div
                    className="productImage"
                    style={{ backgroundImage: `url("${p.image}")` }}
                  >
                    {p.badge && <span className="badge">{p.badge}</span>}
                  </div>
                  <div className="cardBody">
                    <div className="cardTop">
                      <h3>{p.name}</h3>
                      <span className="price">{formatPrice(p.price)}</span>
                    </div>
                    <p>{p.description}</p>
                    {!("available" in p) || p.available ? (
                      <>
                        <div
                          className="qty"
                          aria-label={`Cantidad de ${p.name}`}
                        >
                          <button
                            type="button"
                            onClick={() => adjustPickQty(p.id, -1)}
                            aria-label={`Disminuir cantidad de ${p.name}`}
                          >
                            <Minus size={14} />
                          </button>
                          <span aria-live="polite">{selectedQty(p.id)}</span>
                          <button
                            type="button"
                            onClick={() => adjustPickQty(p.id, 1)}
                            aria-label={`Aumentar cantidad de ${p.name}`}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button className="add" onClick={() => add(p.id)}>
                          Agregar al carrito ·{" "}
                          {formatPrice(p.price * selectedQty(p.id))}
                        </button>
                      </>
                    ) : (
                      <button className="add" disabled>
                        Agotado
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="about" id="nosotros">
          <div className="wrap aboutInner">
            <div className="aboutPhoto" />
            <div>
              <span className="eyebrow" style={{ color: "var(--baker)" }}>
                Desde temprano, con cariño
              </span>
              <h2>Tradición que se comparte</h2>
              <p>
                En E-Pan creemos que un buen pan reúne a las personas. Cada
                mañana encendemos el horno y preparamos, con calma y buenos
                ingredientes, los sabores que nos acompañan desde siempre.
              </p>
              <p>
                Ven por tu favorito o haz tu pedido para compartir algo rico.
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer className="footer" id="contacto">
        <div className="wrap footerInner">
          <a className="brand" href="#inicio">
            E<span>·</span>Pan
          </a>
          <span>Pan recién hecho, todos los días.</span>
          <span>Contáctanos para conocer horarios y ubicación.</span>
          <a href="/admin">Acceso del equipo</a>
        </div>
      </footer>
      {open && (
        <div
          className="cartDrawer"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <aside className="cartPanel">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 className="serif" style={{ color: "var(--coffee)" }}>
                {checkout ? "Tu pedido" : "Tu carrito"}
              </h2>
              <button
                onClick={() => {
                  setOpen(false);
                  setCheckout(false);
                }}
                aria-label="Cerrar"
              >
                <X />
              </button>
            </div>
            {!checkout ? (
              <>
                {!lines.length ? (
                  <>
                    <p>Tu carrito está vacío.</p>
                    <button
                      className="add"
                      type="button"
                      onClick={() => setOpen(false)}
                    >
                      Volver al catálogo
                    </button>
                  </>
                ) : (
                  <>
                    {lines.map((p) => (
                      <div className="cartLine" key={p.id}>
                        <div>
                          <b>{p.name}</b>
                          <div className="qty">
                            <button
                              onClick={() => change(p.id, -1)}
                              aria-label="Restar"
                            >
                              <Minus size={14} />
                            </button>
                            {p.qty}
                            <button
                              onClick={() => change(p.id, 1)}
                              aria-label="Sumar"
                            >
                              <Plus size={14} />
                            </button>
                            <button
                              onClick={() => remove(p.id)}
                              aria-label={`Eliminar ${p.name}`}
                              style={{ border: 0, marginLeft: 8 }}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>
                        <b>{formatPrice(p.price * p.qty)}</b>
                      </div>
                    ))}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "22px 0",
                        fontSize: 18,
                      }}
                    >
                      <b>Total estimado</b>
                      <b>{formatPrice(total)}</b>
                    </div>
                    <button
                      className="primary"
                      onClick={() => setCheckout(true)}
                    >
                      Continuar con el pedido <ArrowRight size={16} />
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <p>
                  El pago se confirmará con la panadería. El importe final se
                  calcula en el servidor.
                </p>
                <label className="label">
                  Nombre completo
                  <input
                    className="formInput"
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label className="label">
                  Teléfono
                  <input
                    className="formInput"
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </label>
                <label className="label">
                  Entrega
                  <select
                    className="formInput"
                    value={form.fulfillment}
                    onChange={(e) =>
                      setForm({ ...form, fulfillment: e.target.value })
                    }
                  >
                    <option value="PICKUP">Recoger en panadería</option>
                    <option value="DELIVERY">Entrega a domicilio</option>
                  </select>
                </label>
                {form.fulfillment === "DELIVERY" && (
                  <label className="label">
                    Dirección
                    <input
                      className="formInput"
                      autoComplete="street-address"
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                    />
                  </label>
                )}
                <label className="label">
                  Notas (opcional)
                  <textarea
                    className="formInput"
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                  />
                </label>
                <div className="notice">
                  Total estimado: <b>{formatPrice(total)}</b>
                </div>
                <button className="primary" disabled={busy} onClick={place}>
                  {busy ? "Registrando…" : "Registrar pedido"}
                </button>
              </>
            )}
          </aside>
        </div>
      )}
      {trackUrl && <a href={trackUrl}>Seguir el último pedido</a>}
    </>
  );
}
