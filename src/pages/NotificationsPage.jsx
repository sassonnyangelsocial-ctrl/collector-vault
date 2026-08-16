import AlertsPage from "./AlertsPage";
import EmailPreferences from "../components/EmailPreferences";
import "./NotificationsPage.css";

export default function NotificationsPage({ session, isAdmin = false }) {
  return (
    <main className="notifications-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Stay in the loop</span>
          <h1>Notifications</h1>
          <p>Choose the updates you want to receive and the collections you want us to watch.</p>
        </div>
      </header>
      <section className="notification-section"><EmailPreferences session={session} /></section>
      <section className="notification-section notification-alerts"><AlertsPage isAdmin={isAdmin} /></section>
    </main>
  );
}
