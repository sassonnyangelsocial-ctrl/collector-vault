import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const money = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v || 0));
const categories = ["inventory", "shipping_supplies", "postage", "promotion", "giveaway", "mileage", "software", "labor", "taxes", "refund", "other"];

export function FinanceOverview({ sales, expenses, orders, shows, setTab }) {
  const m = useMemo(() => {
    const sum = (rows, key) => rows.reduce((n, x) => n + Number(x[key] || 0), 0);
    const gross = sum(sales, "gross_sales");
    const refunds = sum(sales, "refund_amount");
    const fees = sales.reduce((n, x) => n + Number(x.commission_fee || 0) + Number(x.processing_fee || 0) + Number(x.fee_tax || 0) + Number(x.promotion_fee || 0) + Number(x.platform_fees && !x.commission_fee && !x.processing_fee ? x.platform_fees : 0), 0);
    const shipping = sales.reduce((n, x) => n + Number(x.shipping_cost || 0) + Number(x.giveaway_shipping || 0) + Number(x.shipping_adjustment || 0), 0);
    const cogs = sum(sales, "cogs");
    const operating = sum(expenses, "amount");
    const net = gross - refunds - fees - shipping - cogs - operating;
    return { gross, refunds, fees, shipping, cogs, operating, net, inventoryCash: orders.reduce((n, x) => n + Number(x.total_cost || 0), 0) };
  }, [sales, expenses, orders]);
  return <>
    <section className="seller-metrics">
      {[['Gross sales', money(m.gross)], ['Estimated net profit', money(m.net)], ['Completed shows', shows.length], ['Operating expenses', money(m.operating)]].map(([a,b]) => <article key={a}><span>{a}</span><strong>{b}</strong></article>)}
    </section>
    <section className="seller-columns">
      <article className="seller-panel"><span className="eyebrow">Profit & loss</span><h2>True seller margin</h2><div className="profit-stack">
        {[['Sales',m.gross],['Refunds',-m.refunds],['Whatnot fees + fee tax',-m.fees],['Shipping adjustments',-m.shipping],['Cost of goods sold',-m.cogs],['Operating expenses',-m.operating]].map(([a,b]) => <div key={a}><span>{a}</span><strong>{money(b)}</strong></div>)}
        <div className="profit-total"><span>Estimated net profit</span><strong>{money(m.net)}</strong></div>
      </div><small>Inventory purchases ({money(m.inventoryCash)} cash spent) are tracked separately and become COGS when sold, preventing double-counting.</small></article>
      <article className="seller-panel"><span className="eyebrow">Action center</span><h2>Reconcile the business</h2>
        <button className="seller-action" onClick={() => setTab('sales')}>Import official Whatnot exports</button>
        <button className="seller-action" onClick={() => setTab('shows')}>Review show profitability</button>
        <button className="seller-action" onClick={() => setTab('expenses')}>Log supplies or another expense</button>
        <button className="seller-action" onClick={() => setTab('orders')}>Log inventory purchase order</button>
      </article>
    </section>
  </>;
}

export function Shows({ shows, expenses }) {
  return <section className="seller-panel"><div className="panel-heading"><div><span className="eyebrow">Show analytics</span><h2>{shows.length} Whatnot shows</h2></div><small>Actual commission rate = commission ÷ gross sales</small></div>
    <div className="show-grid">{shows.map((x) => {
      const direct = expenses.filter(e => e.show_id === x.id).reduce((n,e)=>n+Number(e.amount||0),0);
      const profit = Number(x.payout_amount || 0) - direct;
      const rate = Number(x.gross_sales) ? Number(x.commission_fees||0)/Number(x.gross_sales)*100 : 0;
      return <article className="show-card" key={x.id}><div><strong>{x.title}</strong><small>{new Date(x.started_at).toLocaleDateString()} · {x.orders_count} orders · {x.items_sold} items</small></div><dl><div><dt>Gross</dt><dd>{money(x.gross_sales)}</dd></div><div><dt>Commission</dt><dd>{money(x.commission_fees)} ({rate.toFixed(1)}%)</dd></div><div><dt>Processing + tax</dt><dd>{money(Number(x.processing_fees||0)+Number(x.fee_taxes||0))}</dd></div><div><dt>Shipping/promos</dt><dd>{money(Number(x.seller_paid_shipping||0)+Number(x.shipping_adjustments||0)+Number(x.promotion_fees||0))}</dd></div><div><dt>Direct expenses</dt><dd>{money(direct)}</dd></div><div><dt>Cash after expenses</dt><dd className={profit >= 0 ? 'positive' : ''}>{money(profit)}</dd></div></dl></article>;
    })}{!shows.length && <p>Import a Weekly Orders, Ledger, Seller Statement, or show-report CSV to build show-level analytics.</p>}</div>
  </section>;
}

export function Expenses({ expenses, shows, userId, reload, notify }) {
  const [form,setForm] = useState({category:'shipping_supplies',description:'',merchant:'',amount:'',expense_date:new Date().toISOString().slice(0,10),show_id:'',tax_deductible:true});
  async function save(e){e.preventDefault(); const payload={...form,user_id:userId,show_id:form.show_id||null,amount:Number(form.amount)}; const {error}=await supabase.from('seller_expenses').insert(payload); notify(error?error.message:'Expense saved.'); if(!error){setForm({...form,description:'',merchant:'',amount:'',show_id:''}); reload();}}
  async function remove(id){const {error}=await supabase.from('seller_expenses').delete().eq('id',id).eq('user_id',userId); notify(error?error.message:'Expense removed.'); if(!error) reload();}
  return <section className="seller-columns wide-left"><article className="seller-panel"><span className="eyebrow">Expense log</span><h2>Add a business cost</h2><form className="seller-form" onSubmit={save}>
    <label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label>
    <label>Description<input required value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
    <div className="form-row"><label>Merchant<input value={form.merchant} onChange={e=>setForm({...form,merchant:e.target.value})}/></label><label>Amount<input required min="0" step="0.01" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label></div>
    <div className="form-row"><label>Date<input type="date" value={form.expense_date} onChange={e=>setForm({...form,expense_date:e.target.value})}/></label><label>Assign to show<select value={form.show_id} onChange={e=>setForm({...form,show_id:e.target.value})}><option value="">General business</option>{shows.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label></div>
    <label className="check-row"><input type="checkbox" checked={form.tax_deductible} onChange={e=>setForm({...form,tax_deductible:e.target.checked})}/> Potentially tax deductible</label><button className="upload-button">Save expense</button>
  </form></article><article className="seller-panel"><div className="panel-heading"><div><span className="eyebrow">Business ledger</span><h2>{expenses.length} expenses</h2></div><strong>{money(expenses.reduce((n,x)=>n+Number(x.amount||0),0))}</strong></div><div className="seller-table">{expenses.map(x=><div key={x.id}><span><strong>{x.description}</strong><small>{x.category.replaceAll('_',' ')} · {x.merchant||'No merchant'} · {x.expense_date}</small></span><span><b>{money(x.amount)}</b><button className="text-button" onClick={()=>remove(x.id)}>Remove</button></span></div>)}</div></article></section>;
}
