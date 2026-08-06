import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import CollectionPage from "./CollectionPage";
import AdminPage from "./AdminPage";
import AlertsPage from "./AlertsPage";
import SellerPage from "./SellerPage";
import TradeHubPage from "./TradeHubPage";
import LiveStreamStage from "../components/LiveStreamStage";

const NAV_ITEMS = [
  ["dashboard", "Dashboard"],
  ["collection", "Collection"],
  ["missing", "Missing"],
  ["wishlist", "Wishlist"],
  ["iso", "ISO"],
  ["diso", "DISO"],
  ["trade", "Trades"],
  ["matches", "Trade Chat"],
  ["live", "Live Wheel"],
  ["alerts", "Alerts"],
  ["seller", "Seller Pro"],
];

export default function HomePage({ session }) {
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
          {NAV_ITEMS.map(([id, label]) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => setView(id)}
            >
              {label}
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
          <button onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </nav>
      {view === "admin" && isAdmin ? (
        <AdminPage session={session} />
      ) : view === "alerts" ? (
        <AlertsPage />
      ) : view === "seller" ? (
        <SellerPage session={session} isAdmin={isAdmin} />
      ) : view === "matches" ? (
        <TradeHubPage session={session} />
      ) : view === "live" ? (
        <main className="seller-page">
          <LiveStreamStage userId={session.user.id} />
        </main>
      ) : (
        <CollectionPage session={session} view={view} onNavigate={setView} />
      )}
    </>
  );
}
