import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import CollectionPage from "./CollectionPage";
import AdminPage from "./AdminPage";
import AlertsPage from "./AlertsPage";
import SellerPage from "./SellerPage";
import TradeHubPage from "./TradeHubPage";
import LiveStreamStage from "../components/LiveStreamStage";
import OnboardingGuide from "../components/OnboardingGuide";
import UpgradePage from "../components/UpgradePage";
import EmailPreferences from "../components/EmailPreferences";

const NAV_ITEMS = [
  ["dashboard", "Dashboard", false],
  ["collection", "Collection", false],
  ["missing", "Missing", false],
  ["wishlist", "Wishlist", false],
  ["hunt", "ISO · DISO · Incoming", false],
  ["trade", "Trades", false],
  ["matches", "Trade Chat", true],
  ["live", "Live Wheel", true],
  ["alerts", "Alerts", true],
  ["seller", "Seller Pro", true],
  ["email", "Email settings", false],
];

const PRO_VIEWS = new Set(NAV_ITEMS.filter(([, , pro]) => pro).map(([id]) => id));

export default function HomePage({ session, isPro, checkout, message }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState(() =>
    window.location.hash.startsWith("#live-wheel/") ? "live" : "dashboard",
  );

  useEffect(() => {
    supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [session.user.id]);

  useEffect(() => {
    const openSharedRoom = () => {
      if (window.location.hash.startsWith("#live-wheel/")) setView("live");
    };
    window.addEventListener("hashchange", openSharedRoom);
    return () => window.removeEventListener("hashchange", openSharedRoom);
  }, []);

  return (
    <>
      <nav className="top-nav">
        <button className="brand-button" onClick={() => setView("dashboard")}>
          Collector Vault
        </button>
        <div className="nav-actions">
          {NAV_ITEMS.map(([id, label, pro]) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => setView(id)}
            >
              {label}{pro && !isPro ? <small className="pro-nav-badge">PRO</small> : null}
            </button>
          ))}
          {isAdmin && (
            <button
              className={view === "admin" ? "active" : ""}
              onClick={() => setView("admin")}
            >
              Admin
            </button>
          )}
          <button
            onClick={() => {
              window.location.hash = "about";
            }}
          >
            About
          </button>
          <button onClick={() => window.dispatchEvent(new Event("collector-vault:tour"))}>Quick tour</button>
          <button onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </nav>
      {PRO_VIEWS.has(view) && !isPro ? (
        <UpgradePage checkout={checkout} message={message} featureName={NAV_ITEMS.find(([id]) => id === view)?.[1] || 'this feature'} />
      ) : view === "admin" && isAdmin ? (
        <AdminPage session={session} />
      ) : view === "alerts" ? (
        <AlertsPage isAdmin={isAdmin} />
      ) : view === "seller" ? (
        <SellerPage session={session} isAdmin={isAdmin} />
      ) : view === "email" ? (
        <EmailPreferences session={session} />
      ) : view === "matches" ? (
        <TradeHubPage session={session} />
      ) : view === "live" ? (
        <main className="seller-page">
          <LiveStreamStage userId={session.user.id} />
        </main>
      ) : (
        <CollectionPage session={session} view={view} onNavigate={setView} />
      )}
      <div className={`plan-pill ${isPro ? 'pro' : 'free'}`}>{isPro ? 'Collector Vault Pro' : 'Free plan'}{!isPro && <button onClick={() => setView('matches')}>Upgrade</button>}</div>
      <OnboardingGuide userId={session.user.id} />
    </>
  );
}
