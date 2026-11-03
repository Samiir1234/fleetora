import Sidebar from "./Sidebar";

export default function DashboardLoading() {
  return (
    <div className="contract-page-shell" aria-busy="true" aria-live="polite">
      <Sidebar />
      <main className="contract-main-panel payments-page dashboard-loading">
        <header className="contract-topbar">
          <div className="route-skeleton route-breadcrumb" />
          <div className="route-skeleton route-user" />
        </header>
        <section className="payments-body route-loading-content">
          <div className="route-skeleton route-heading" />
          <div className="route-loading-metrics">
            <div className="route-skeleton route-metric" />
            <div className="route-skeleton route-metric" />
            <div className="route-skeleton route-metric" />
          </div>
          <div className="route-skeleton route-table" />
          <span className="route-loading-label">Loading section…</span>
        </section>
      </main>
    </div>
  );
}
