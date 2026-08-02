import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { supabase } from "../lib/supabase";
import "./SellerPage.css";
import OrdersDetailed from "../components/OrdersDetailed";
import LiveWheel from "../components/LiveWheel";
import PrivateLaunchStudio from "../components/PrivateLaunchStudio";
import { Expenses, FinanceOverview, Shows } from "../components/SellerFinanceWorkspace";

const sellerTabs = [
  ["overview", "Overview"],
  ["shows", "Show analytics"],
  ["expenses", "Expenses"],
  ["orders", "Purchase orders"],
  ["suppliers", "Suppliers"],
  ["sales", "Whatnot sales"],
  ["wheel", "Giveaway draw"],
];
const adminTabs = [...sellerTabs, ["marketing", "Launch studio"]];
const money = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(value || 0),
  );
const today = new Date().toISOString().slice(0, 10);

export default function SellerPage({ session, isAdmin = false }) {
  const [tab, setTab] = useState("overview"),
    [orders, setOrders] = useState([]),
    [suppliers, setSuppliers] = useState([]),
    [sales, setSales] = useState([]),
    [shows, setShows] = useState([]),
    [expenses, setExpenses] = useState([]),
    [importRuns, setImportRuns] = useState([]),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(true);
  async function load() {
    const userId = session.user.id;
    const [o, p, s, sh, ex, ir] = await Promise.all([
      supabase
        .from("seller_purchase_orders")
        .select("*,supplier:seller_suppliers(name)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("seller_suppliers").select("*").eq("user_id", userId).order("name"),
      supabase
        .from("seller_sales")
        .select("*")
        .eq("user_id", userId)
        .order("sold_at", { ascending: false }),
      supabase.from("seller_shows").select("*").eq("user_id", userId).order("started_at", { ascending: false }),
      supabase.from("seller_expenses").select("*").eq("user_id", userId).order("expense_date", { ascending: false }),
      supabase.from("seller_import_runs").select("*").eq("user_id", userId).order("imported_at", { ascending: false }).limit(10),
    ]);
    const error = o.error || p.error || s.error || sh.error || ex.error || ir.error;
    if (error) setMessage(error.message);
    setOrders(o.data || []);
    setSuppliers(p.data || []);
    setSales(s.data || []);
    setShows(sh.data || []);
    setExpenses(ex.data || []);
    setImportRuns(ir.data || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);
  const metrics = useMemo(() => {
    const revenue = sales.reduce((n, x) => n + Number(x.gross_sales || 0), 0),
      fees = sales.reduce(
        (n, x) =>
          n + Number(x.platform_fees || 0) + Number(x.shipping_cost || 0),
        0,
      ),
      cogs = sales.reduce((n, x) => n + Number(x.cogs || 0), 0);
    return {
      revenue,
      fees,
      cogs,
      profit: revenue - fees - cogs,
      open: orders.filter((x) => !["received", "cancelled"].includes(x.status))
        .length,
      inventory:
        orders
          .filter((x) => x.status === "received")
          .reduce((n, x) => n + Number(x.units || 0), 0) -
        sales.reduce((n, x) => n + Number(x.quantity || 1), 0),
    };
  }, [orders, sales]);
  if (loading)
    return <div className="center compact">Opening Seller Pro...</div>;
  const tabs = isAdmin ? adminTabs : sellerTabs;
  return (
    <main className="seller-page">
      <header className="seller-hero">
        <div>
          <span className="eyebrow">Seller Pro add-on</span>
          <h1>Run the business behind the collection.</h1>
          <p>
            Purchasing, suppliers, inventory, Whatnot payouts, and business
            tools in one workspace.
          </p>
        </div>
        <span className="pro-badge">PRO</span>
      </header>
      <div className="seller-tabs">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {message && <p className="admin-message">{message}</p>}
      {tab === "overview" && (
        <FinanceOverview
          orders={orders}
          sales={sales}
          shows={shows}
          expenses={expenses}
          setTab={setTab}
        />
      )}{" "}
      {tab === "shows" && <Shows shows={shows} expenses={expenses} />}{" "}
      {tab === "expenses" && <Expenses expenses={expenses} shows={shows} userId={session.user.id} reload={load} notify={setMessage} />}{" "}
      {tab === "orders" && (
        <OrdersDetailed
          orders={orders}
          suppliers={suppliers}
          userId={session.user.id}
          reload={load}
          notify={setMessage}
        />
      )}{" "}
      {tab === "suppliers" && (
        <Suppliers
          suppliers={suppliers}
          userId={session.user.id}
          reload={load}
          notify={setMessage}
        />
      )}{" "}
      {tab === "sales" && (
        <Sales
          sales={sales}
          shows={shows}
          importRuns={importRuns}
          userId={session.user.id}
          reload={load}
          notify={setMessage}
        />
      )}{" "}
      {tab === "wheel" && <LiveWheel userId={session.user.id} />}{" "}
      {tab === "marketing" && isAdmin && <PrivateLaunchStudio session={session} />}
    </main>
  );
}

function Overview({ metrics, orders, sales, setTab, isAdmin }) {
  const activity = [
    ...orders.map((x) => ({
      date: x.order_date,
      title: `PO · ${x.supplier?.name || "Supplier"}`,
      detail: `${x.units || 0} units · ${x.status}`,
      amount: -Number(x.total_cost || 0),
    })),
    ...sales.map((x) => ({
      date: x.sold_at,
      title: `Sale · ${x.product_name}`,
      detail: `${x.platform} · ${x.buyer_handle || "buyer"}`,
      amount: Number(x.gross_sales || 0),
    })),
  ]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 8);
  return (
    <>
      <section className="seller-metrics">
        {[
          ["Gross sales", money(metrics.revenue)],
          ["Net profit", money(metrics.profit)],
          ["Open POs", metrics.open],
          ["Units on hand", Math.max(0, metrics.inventory)],
        ].map(([a, b]) => (
          <article key={a}>
            <span>{a}</span>
            <strong>{b}</strong>
          </article>
        ))}
      </section>
      <section className="seller-columns">
        <article className="seller-panel">
          <span className="eyebrow">Cash flow</span>
          <h2>Profit snapshot</h2>
          <div className="profit-stack">
            <div>
              <span>Revenue</span>
              <strong>{money(metrics.revenue)}</strong>
            </div>
            <div>
              <span>Product cost</span>
              <strong>-{money(metrics.cogs)}</strong>
            </div>
            <div>
              <span>Fees + shipping</span>
              <strong>-{money(metrics.fees)}</strong>
            </div>
            <div className="profit-total">
              <span>Estimated profit</span>
              <strong>{money(metrics.profit)}</strong>
            </div>
          </div>
          <small>Estimates only. Reconcile against official statements.</small>
        </article>
        <article className="seller-panel">
          <span className="eyebrow">Action center</span>
          <h2>Keep momentum</h2>
          <button className="seller-action" onClick={() => setTab("orders")}>
            + Log a case or supply order
          </button>
          <button className="seller-action" onClick={() => setTab("sales")}>
            Import Whatnot sales CSV
          </button>
          {isAdmin && (
            <button
              className="seller-action"
              onClick={() => setTab("marketing")}
            >
              Open today’s launch kit
            </button>
          )}
        </article>
      </section>
      <section className="seller-panel">
        <span className="eyebrow">Recent activity</span>
        <h2>Business ledger</h2>
        <div className="activity-list">
          {activity.map((x, i) => (
            <div key={i}>
              <span>
                <strong>{x.title}</strong>
                <small>{x.detail}</small>
              </span>
              <b className={x.amount >= 0 ? "positive" : ""}>
                {x.amount >= 0 ? "+" : ""}
                {money(x.amount)}
              </b>
            </div>
          ))}
          {!activity.length && (
            <p>
              No activity yet. Log your first order or import sales to begin.
            </p>
          )}
        </div>
      </section>
    </>
  );
}

function Orders({ orders, suppliers, userId, reload, notify }) {
  const empty = {
      supplier_id: "",
      order_number: "",
      order_type: "case",
      order_date: today,
      status: "ordered",
      units: "",
      total_cost: "",
      eta: "",
      tracking_number: "",
      notes: "",
    },
    [form, setForm] = useState(empty);
  async function submit(e) {
    e.preventDefault();
    const { error } = await supabase
      .from("seller_purchase_orders")
      .insert({
        ...form,
        user_id: userId,
        units: Number(form.units || 0),
        total_cost: Number(form.total_cost || 0),
        eta: form.eta || null,
        supplier_id: form.supplier_id || null,
      });
    notify(error ? error.message : "Purchase order saved.");
    if (!error) {
      setForm(empty);
      reload();
    }
  }
  return (
    <section className="seller-columns wide-left">
      <form className="seller-panel seller-form" onSubmit={submit}>
        <span className="eyebrow">New purchase</span>
        <h2>Log case or supplies</h2>
        <label>
          Supplier
          <select
            value={form.supplier_id}
            onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
          >
            <option value="">No supplier selected</option>
            {suppliers.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <div className="form-row">
          <label>
            Order type
            <select
              value={form.order_type}
              onChange={(e) => setForm({ ...form, order_type: e.target.value })}
            >
              <option value="case">Figure case</option>
              <option value="supply">Shipping supplies</option>
              <option value="inventory">Loose inventory</option>
            </select>
          </label>
          <label>
            PO / invoice #
            <input
              value={form.order_number}
              onChange={(e) =>
                setForm({ ...form, order_number: e.target.value })
              }
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Units
            <input
              type="number"
              min="0"
              value={form.units}
              onChange={(e) => setForm({ ...form, units: e.target.value })}
            />
          </label>
          <label>
            Total cost
            <input
              type="number"
              min="0"
              step=".01"
              value={form.total_cost}
              onChange={(e) => setForm({ ...form, total_cost: e.target.value })}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Order date
            <input
              type="date"
              value={form.order_date}
              onChange={(e) => setForm({ ...form, order_date: e.target.value })}
            />
          </label>
          <label>
            Expected arrival
            <input
              type="date"
              value={form.eta}
              onChange={(e) => setForm({ ...form, eta: e.target.value })}
            />
          </label>
        </div>
        <label>
          Tracking
          <input
            value={form.tracking_number}
            onChange={(e) =>
              setForm({ ...form, tracking_number: e.target.value })
            }
          />
        </label>
        <label>
          Notes
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>
        <button className="primary-button">Save purchase order</button>
      </form>
      <article className="seller-panel">
        <span className="eyebrow">Order book</span>
        <h2>Cases & supplies</h2>
        <div className="seller-table">
          {orders.map((x) => (
            <div key={x.id}>
              <span>
                <strong>{x.supplier?.name || x.order_type}</strong>
                <small>
                  {x.order_number || "No PO number"} · {x.units} units
                </small>
              </span>
              <span>
                <b>{money(x.total_cost)}</b>
                <small className="status">{x.status}</small>
              </span>
            </div>
          ))}
          {!orders.length && <p>No orders logged yet.</p>}
        </div>
      </article>
    </section>
  );
}

function Suppliers({ suppliers, userId, reload, notify }) {
  const empty = {
      name: "",
      contact_name: "",
      email: "",
      phone: "",
      website: "",
      lead_time_days: "",
      minimum_order: "",
      payment_terms: "",
      rating: "5",
      notes: "",
    },
    [form, setForm] = useState(empty);
  async function submit(e) {
    e.preventDefault();
    const { error } = await supabase
      .from("seller_suppliers")
      .insert({
        ...form,
        user_id: userId,
        lead_time_days: Number(form.lead_time_days || 0),
        minimum_order: Number(form.minimum_order || 0),
        rating: Number(form.rating || 5),
      });
    notify(error ? error.message : "Supplier added.");
    if (!error) {
      setForm(empty);
      reload();
    }
  }
  return (
    <section className="seller-columns wide-left">
      <form className="seller-panel seller-form" onSubmit={submit}>
        <span className="eyebrow">Supplier CRM</span>
        <h2>Add a supplier</h2>
        <label>
          Business name
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <div className="form-row">
          <label>
            Contact
            <input
              value={form.contact_name}
              onChange={(e) =>
                setForm({ ...form, contact_name: e.target.value })
              }
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Phone
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label>
            Website
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Lead time (days)
            <input
              type="number"
              min="0"
              value={form.lead_time_days}
              onChange={(e) =>
                setForm({ ...form, lead_time_days: e.target.value })
              }
            />
          </label>
          <label>
            Minimum order ($)
            <input
              type="number"
              min="0"
              step=".01"
              value={form.minimum_order}
              onChange={(e) =>
                setForm({ ...form, minimum_order: e.target.value })
              }
            />
          </label>
        </div>
        <label>
          Terms
          <input
            placeholder="Prepaid, Net 30…"
            value={form.payment_terms}
            onChange={(e) =>
              setForm({ ...form, payment_terms: e.target.value })
            }
          />
        </label>
        <label>
          Notes
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>
        <button className="primary-button">Add supplier</button>
      </form>
      <article className="supplier-grid">
        {suppliers.map((x) => (
          <div className="supplier-card" key={x.id}>
            <div>
              <span className="supplier-avatar">{x.name[0]}</span>
              <b>{x.rating}/5</b>
            </div>
            <h3>{x.name}</h3>
            <p>
              {x.contact_name || "No contact"} ·{" "}
              {x.email || x.phone || "Add contact details"}
            </p>
            <dl>
              <div>
                <dt>Lead time</dt>
                <dd>{x.lead_time_days || "—"} days</dd>
              </div>
              <div>
                <dt>MOQ</dt>
                <dd>{money(x.minimum_order)}</dd>
              </div>
            </dl>
            {x.website && (
              <a href={x.website} target="_blank" rel="noreferrer">
                Open supplier site ↗
              </a>
            )}
          </div>
        ))}
        {!suppliers.length && (
          <div className="empty-panel">
            <h3>Your supplier list is empty</h3>
            <p>
              Add distributors, wholesalers, packaging vendors, and local
              sources.
            </p>
          </div>
        )}
      </article>
    </section>
  );
}

function Sales({ sales, shows, importRuns, userId, reload, notify }) {
  const [busy, setBusy] = useState(false);
  function importCsv(file) {
    if (!file) return;
    setBusy(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data }) => {
        const pick = (row, names) => {
            const key = Object.keys(row).find((k) =>
              names.includes(k.trim().toLowerCase()),
            );
            return key ? row[key] : "";
          },
          num = (v) =>
            Number(
              String(v || "0")
                .replace(/[$,]/g, "")
                .replace(/^\((.*)\)$/, "-$1"),
            ) || 0,
          showUpserts = new Map(),
          rows = data
            .map((r, index) => {
              const soldAt = pick(r, ["processed date", "order placed at utc", "transaction completed at utc", "date"]) || new Date().toISOString();
              const showTitle = pick(r, ["show title", "show name", "livestream title", "live show", "show"]) || "Marketplace / unassigned";
              const showExternal = pick(r, ["show id", "show_id", "livestream id", "live id", "show uuid"]) || `unassigned-${String(soldAt).slice(0, 7)}`;
              const commission = Math.abs(num(pick(r, ["commission fee", "commission", "whatnot commission"]))), processing = Math.abs(num(pick(r, ["processing fee", "payment processing fee"]))), feeTax = Math.abs(num(pick(r, ["tax on fees", "taxes on fees", "fee tax"]))), promotion = Math.abs(num(pick(r, ["promotion fee", "promotions", "boost fee", "boosts"]))), shipping = Math.abs(num(pick(r, ["seller paid shipping", "shipping cost", "seller shipping"]))), adjustment = Math.abs(num(pick(r, ["shipping adjustment", "shipping adjustments", "surcharge"]))), refund = Math.abs(num(pick(r, ["refund", "refund amount", "refunded amount"])));
              const row = {
              user_id: userId,
              platform: "Whatnot",
              external_order_id: pick(r, ["order id", "order_id", "transaction id"]) || `import-${showExternal}-${index}`,
              show_title: showTitle,
              buyer_handle: pick(r, ["buyer", "buyer username"]),
              product_name:
                pick(r, ["product name", "product", "title"]) || "Whatnot sale",
              sold_at: soldAt,
              quantity: num(pick(r, ["quantity"])) || 1,
              gross_sales: num(
                pick(r, ["subtotal", "sale price", "gross sales", "total"]),
              ),
              platform_fees: commission + processing + feeTax + promotion,
              commission_fee: commission, processing_fee: processing, fee_tax: feeTax, promotion_fee: promotion, refund_amount: refund,
              shipping_cost: shipping, shipping_adjustment: adjustment,
              payout_amount: num(
                pick(r, ["paid out amount", "earnings", "resulting earnings"]),
              ),
              status: pick(r, ["order status", "status"]) || "completed",
              raw_data: r,
              };
              const show = showUpserts.get(showExternal) || {user_id:userId,platform:"Whatnot",external_show_id:showExternal,title:showTitle,started_at:soldAt,orders_count:0,items_sold:0,gross_sales:0,refunds:0,commission_fees:0,processing_fees:0,fee_taxes:0,seller_paid_shipping:0,shipping_adjustments:0,promotion_fees:0,payout_amount:0};
              show.orders_count++; show.items_sold += row.quantity; show.gross_sales += row.gross_sales; show.refunds += refund; show.commission_fees += commission; show.processing_fees += processing; show.fee_taxes += feeTax; show.seller_paid_shipping += shipping; show.shipping_adjustments += adjustment; show.promotion_fees += promotion; show.payout_amount += row.payout_amount; showUpserts.set(showExternal, show);
              return {...row, show_external_id:showExternal};
            })
            .filter(
              (r) =>
                r.external_order_id ||
                r.gross_sales ||
                r.product_name !== "Whatnot sale",
            ),
          { data: savedShows, error: showError } = await supabase.from("seller_shows").upsert([...showUpserts.values()], { onConflict: "user_id,platform,external_show_id" }).select("id,external_show_id"),
          showIds = new Map((savedShows || []).map(x => [x.external_show_id, x.id])),
          linkedRows = rows.map(({show_external_id, ...r}) => ({...r, show_id: showIds.get(show_external_id) || null})),
          { error } = showError ? { error: showError } : await supabase
            .from("seller_sales")
            .upsert(linkedRows, { onConflict: "user_id,platform,external_order_id" });
        const lowerName = String(file.name || "").toLowerCase(), importType = lowerName.includes("weekly") ? "weekly_orders" : lowerName.includes("statement") ? "seller_statement" : lowerName.includes("ledger") ? "ledger" : "show_report";
        await supabase.from("seller_import_runs").insert({user_id:userId,platform:"Whatnot",import_type:importType,file_name:file.name,rows_read:data.length,rows_imported:error?0:linkedRows.length,shows_imported:error?0:showUpserts.size,status:error?"failed":"completed",error_message:error?.message||null});
        notify(
          error ? error.message : `Imported ${linkedRows.length} sales across ${showUpserts.size} shows.`,
        );
        setBusy(false);
        if (!error) reload();
      },
    });
  }
  return (
    <>
      <section className="whatnot-connect">
        <div>
          <span className="whatnot-mark">W</span>
          <div>
            <span className="eyebrow">Supported Whatnot connection</span>
            <h2>Import your Seller Hub CSV</h2>
            <p>
              Export from Whatnot → Financials → Ledger → Export Data, then
              upload it here. Collector Vault calculates fees, payout, and
              profit without asking for your Whatnot password.
            </p>
          </div>
        </div>
        <label className="upload-button">
          {busy ? "Importing…" : "Choose Whatnot CSV"}
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={busy}
            onChange={(e) => importCsv(e.target.files?.[0])}
          />
        </label>
      </section>
      <section className="seller-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Sales ledger</span>
            <h2>{sales.length} imported sales</h2>
          </div>
          <strong>
            {money(sales.reduce((n, x) => n + Number(x.gross_sales || 0), 0))}{" "}
            gross
          </strong>
        </div>
        <div className="sales-table">
          <div className="table-head">
            <span>Sale</span>
            <span>Gross</span>
            <span>Fees</span>
            <span>Payout</span>
          </div>
          {sales.map((x) => (
            <div key={x.id}>
              <span>
                <strong>{x.product_name}</strong>
                <small>
                  {x.buyer_handle || "Buyer"} ·{" "}
                  {new Date(x.sold_at).toLocaleDateString()}
                </small>
              </span>
              <b>{money(x.gross_sales)}</b>
              <span>{money(x.platform_fees)}</span>
              <strong>
                {money(
                  x.payout_amount ||
                    Number(x.gross_sales) - Number(x.platform_fees),
                )}
              </strong>
            </div>
          ))}
          {!sales.length && (
            <p>
              Upload a seller order-history, weekly-orders, show-report, or
              ledger CSV to begin.
            </p>
          )}
        </div>
      </section>
    </>
  );
}

const posts = [
  [
    "Launch post",
    "Your collection has a business side now.",
    "Introducing Seller Pro inside Collector Vault ✨ Log every case and supply order, organize suppliers, import Whatnot sales, track fees and COGS, and see estimated profit in one calm dashboard. Founding seller access is open now. Comment SELLER and I’ll send the link. #SonnyAngelSeller #WhatnotSeller #ResellerTools #CollectorVault",
  ],
  [
    "Feature post",
    "Stop calculating show profit in your head.",
    "Your sell price is not your profit. Seller Pro brings your Whatnot sales, platform fees, shipping costs, inventory cost, and payouts together—so you can see what each show actually earned. Import your Seller Hub CSV and let the dashboard do the math. Join Collector Vault today.",
  ],
  [
    "Community post",
    "Built for collectors who became sellers.",
    "The supplier texts. The case invoices. The shipping supplies. The live-sale CSVs. The “did I actually make money?” spreadsheet. We put it all in one place. Seller Pro is live in Collector Vault 💗",
  ],
];
function LaunchStudio() {
  const [copied, setCopied] = useState("");
  async function copy(text, id) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(""), 1500);
  }
  return (
    <>
      <section className="launch-banner">
        <span>LAUNCH DAY</span>
        <h2>Seller Pro is ready to announce.</h2>
        <p>
          Use this sequence today: teaser Story → demo Reel → launch post →
          evening proof/FAQ Story.
        </p>
      </section>
      <section className="seller-columns">
        <article className="seller-panel">
          <span className="eyebrow">30-second Reel</span>
          <h2>“From case to cash”</h2>
          <ol className="reel-script">
            <li>
              <b>0–3s · Hook</b>
              <span>
                Screen text: “What did your last live actually profit?”
              </span>
            </li>
            <li>
              <b>3–9s · Problem</b>
              <span>
                Flash invoices, supplier messages, and a messy spreadsheet.
              </span>
            </li>
            <li>
              <b>9–20s · Reveal</b>
              <span>
                Screen-record Supplier CRM → Purchase Orders → Whatnot CSV
                Import → Profit Snapshot.
              </span>
            </li>
            <li>
              <b>20–27s · Payoff</b>
              <span>
                Screen text: “Know your numbers. Grow your collection business.”
              </span>
            </li>
            <li>
              <b>27–30s · CTA</b>
              <span>
                “Seller Pro is live inside Collector Vault. Link in bio.”
              </span>
            </li>
          </ol>
          <button
            className="copy-button"
            onClick={() =>
              copy(
                "What did your last live actually profit? Seller Pro tracks cases, suppliers, Whatnot fees, payouts and real margins in one place. Live now inside Collector Vault. #WhatnotSeller #SonnyAngelSeller #ResellerBusiness",
                "reel",
              )
            }
          >
            {copied === "reel" ? "Copied!" : "Copy Reel caption"}
          </button>
        </article>
        <article className="seller-panel">
          <span className="eyebrow">Today’s rollout</span>
          <h2>4-post schedule</h2>
          <div className="timeline">
            <div>
              <b>10:00 AM</b>
              <span>Story teaser + countdown sticker</span>
            </div>
            <div>
              <b>12:00 PM</b>
              <span>Demo Reel + link in bio</span>
            </div>
            <div>
              <b>3:00 PM</b>
              <span>Carousel launch post</span>
            </div>
            <div>
              <b>7:00 PM</b>
              <span>FAQ Story + founder offer reminder</span>
            </div>
          </div>
          <h3>Founding offer</h3>
          <p>
            <b>
              “Join this week and get Seller Pro onboarding plus our Whatnot
              profit template included.”
            </b>
          </p>
          <small>Use a real end date and honor the offer shown.</small>
        </article>
      </section>
      <section className="post-grid">
        {posts.map(([tag, title, body], i) => (
          <article className="post-card" key={tag}>
            <span>{tag}</span>
            <h3>{title}</h3>
            <p>{body}</p>
            <button className="copy-button" onClick={() => copy(body, `p${i}`)}>
              {copied === `p${i}` ? "Copied!" : "Copy caption"}
            </button>
          </article>
        ))}
      </section>
    </>
  );
}
