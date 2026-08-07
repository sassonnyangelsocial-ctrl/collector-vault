import { isNativeApp } from '../lib/runtime'
import './UpgradePage.css'

const benefits = [
  ['Trade Match + Chat', 'Find reciprocal matches and keep private trade conversations organized.'],
  ['Verified alerts', 'Follow restocks, releases, and scheduled drops with calendar downloads.'],
  ['Live Wheel hosting', 'Host synchronized rooms with guest viewers, live chat, and optional audio or video.'],
  ['Seller Pro', 'Track suppliers, purchase orders, inventory, costs, fees, expenses, and profit.'],
  ['Whatnot import', 'Bring in your own Seller Hub CSV without sharing your password.'],
  ['Premium roadmap', 'Get the advanced analytics and automation features added for Pro members.'],
]

export default function UpgradePage({ checkout, message, featureName = 'this feature' }) {
  return <main className="upgrade-page">
    <section className="upgrade-hero"><span className="eyebrow">Collector Vault Pro</span><h1>Unlock {featureName}.</h1><p>Your collection tracker is free forever. Upgrade when you are ready for matching, community, live-hosting, alert, and seller tools.</p></section>
    <section className="upgrade-benefits">{benefits.map(([title, copy]) => <article key={title}><span>PRO</span><h2>{title}</h2><p>{copy}</p></article>)}</section>
    <section className="upgrade-pricing"><article><span>Free</span><strong>$0</strong><p>Catalog, tracking, missing, wishlist, ISO, DISO, trades, quantities, social sharing, and CSV export.</p><b>Your current plan</b></article><article className="featured"><span>Pro monthly</span><strong>$4.99<small>/month</small></strong><p>Try every Pro feature free for seven days, then continue monthly. Cancel anytime.</p>{!isNativeApp && <button className="primary-button" onClick={() => checkout('month')}>Start Pro trial</button>}</article><article><span>Pro yearly</span><strong>$49.99<small>/year</small></strong><p>Two months of savings compared with monthly billing.</p>{!isNativeApp && <button className="primary-button" onClick={() => checkout('year')}>Start yearly Pro trial</button>}</article></section>
    {isNativeApp && <p className="upgrade-native-note">Pro purchasing is available on the Collector Vault website. Sign in there with this same account, then reopen the app.</p>}
    {message && <p className="form-message membership-message">{message}</p>}
  </main>
}
