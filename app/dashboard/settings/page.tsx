"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Download,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";
import Sidebar from "../Sidebar";
import TopbarActions from "../TopbarActions";
import { resetDashboardData, saveDashboardDataAndWait } from "../dashboard-storage";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "policies" | "locale" | "alerts" | "data">("general");
  const [saveToast, setSaveToast] = useState(false);

  // General Settings
  const [companyName, setCompanyName] = useState("Fleetora Car Rentals Ltd.");
  const [licenseNumber, setLicenseNumber] = useState("MOG-RENT-2024-8841");
  const [supportEmail, setSupportEmail] = useState("support@fleetora.demo");
  const [hotline, setHotline] = useState("+252 61 500 0000");
  const [headOffice, setHeadOffice] = useState("Airport Road, Wadajir District, Mogadishu, Somalia");

  // Rental Policies
  const [securityDeposit, setSecurityDeposit] = useState("200");
  const [gracePeriod, setGracePeriod] = useState("2");
  const [fuelPolicy, setFuelPolicy] = useState("Same-to-Same (Full-to-Full)");
  const [minAge, setMinAge] = useState("21");

  // Localization
  const [language, setLanguage] = useState("SO / EN (Bilingual)");
  const [currency, setCurrency] = useState("USD ($)");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");

  // SMS & Alerts Toggles
  const [smsBooking, setSmsBooking] = useState(true);
  const [smsOverdue, setSmsOverdue] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);

  // Load from localStorage if previously modified
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLanguage = localStorage.getItem("fleetora-language");
      if (savedLanguage === "so") setLanguage("Somali");
      if (savedLanguage === "en") setLanguage("English");
      const saved = localStorage.getItem("fleetora-settings");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.companyName) setCompanyName(parsed.companyName);
          if (parsed.licenseNumber) setLicenseNumber(parsed.licenseNumber);
          if (parsed.supportEmail) setSupportEmail(parsed.supportEmail);
          if (parsed.hotline) setHotline(parsed.hotline);
          if (parsed.headOffice) setHeadOffice(parsed.headOffice);
          if (parsed.securityDeposit) setSecurityDeposit(parsed.securityDeposit);
          if (parsed.currency) setCurrency(parsed.currency);
        } catch {}
      }
    }
  }, []);

  async function handleSaveSettings(e?: React.FormEvent) {
    if (e) e.preventDefault();

    const payload = {
      companyName,
      licenseNumber,
      supportEmail,
      hotline,
      headOffice,
      securityDeposit,
      gracePeriod,
      fuelPolicy,
      minAge,
      language,
      currency,
      dateFormat,
      smsBooking,
      smsOverdue,
      emailDigest,
    };

    try {
      await saveDashboardDataAndWait("fleetora-settings", payload);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
    } catch (error) {
      alert(error instanceof Error ? `Could not save settings: ${error.message}` : "Could not save settings.");
    }
  }

  async function handleResetDemoData() {
    if (confirm("Reset all workspace data in Supabase to the initial sample records? This cannot be undone.")) {
      try {
        await resetDashboardData();
        alert("Workspace data was reset.");
        window.location.reload();
      } catch (error) {
        alert(error instanceof Error ? `Could not reset workspace data: ${error.message}` : "Could not reset workspace data.");
      }
    }
  }

  function handleExportBackup() {
    if (typeof window === "undefined") return;
    const backup: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("fleetora-")) {
        try {
          backup[key] = JSON.parse(localStorage.getItem(key) ?? "null");
        } catch {
          backup[key] = localStorage.getItem(key);
        }
      }
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fleetora-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="contract-page-shell">
      <Sidebar currentPath="/dashboard/settings" />

      <main className="contract-main-panel settings-page-panel">
        {/* Topbar */}
        <header className="contract-topbar">
          <div className="topbar-left">
            <Link href="/dashboard" className="topbar-home-link">
              Fleetora
            </Link>
            <span className="topbar-separator">›</span>
            <span>Administration</span>
            <span className="topbar-separator">›</span>
            <span className="current-page">Settings</span>
          </div>

          <div className="topbar-center">
            <div className="top-search-global">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search settings..."
                aria-label="Search settings"
              />
              <span className="keyboard-shortcut">⌘ K</span>
            </div>
          </div>

          <div className="topbar-right">
            <TopbarActions
              language={language === "Somali" ? "so" : "en"}
              onLanguageChange={(nextLanguage) => setLanguage(nextLanguage === "so" ? "Somali" : "English")}
            />
          </div>
        </header>

        {/* Content Body */}
        <div className="settings-page-body">
          {/* Header Row */}
          <div className="payments-title-row">
            <div className="page-heading">
              <h1>Settings</h1>
              <p>Configure company profile, rental policies, localization, and system backups</p>
            </div>
            <button
              type="button"
              className="primary-blue-btn"
              onClick={() => handleSaveSettings()}
            >
              <Save size={16} />
              <span>Save Changes</span>
            </button>
          </div>

          {/* Toast Notification */}
          {saveToast && (
            <div className="settings-toast-notice">
              <Check size={16} color="#16a34a" />
              <span>Settings successfully updated and saved!</span>
            </div>
          )}

          {/* Settings Tabs */}
          <div className="manage-tabs-bar" style={{ marginTop: 14, borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <button
              type="button"
              className={`manage-tab-btn ${activeTab === "general" ? "active" : ""}`}
              onClick={() => setActiveTab("general")}
            >
              Company Profile
            </button>
            <button
              type="button"
              className={`manage-tab-btn ${activeTab === "policies" ? "active" : ""}`}
              onClick={() => setActiveTab("policies")}
            >
              Rental Policies
            </button>
            <button
              type="button"
              className={`manage-tab-btn ${activeTab === "locale" ? "active" : ""}`}
              onClick={() => setActiveTab("locale")}
            >
              Localization &amp; Currency
            </button>
            <button
              type="button"
              className={`manage-tab-btn ${activeTab === "alerts" ? "active" : ""}`}
              onClick={() => setActiveTab("alerts")}
            >
              SMS &amp; Notifications
            </button>
            <button
              type="button"
              className={`manage-tab-btn ${activeTab === "data" ? "active" : ""}`}
              onClick={() => setActiveTab("data")}
            >
              Data &amp; Backups
            </button>
          </div>

          {/* Settings Content Container */}
          <div className="settings-content-card" style={{ marginTop: 16 }}>
            {/* TAB 1: General Company Profile */}
            {activeTab === "general" && (
              <form onSubmit={handleSaveSettings} className="register-tracker-form">
                <div className="form-section-head">
                  <h3>Company &amp; Legal Entity</h3>
                  <p>Details displayed on rental contracts, invoices, and customer receipts.</p>
                </div>

                <div className="form-grid-2">
                  <div className="form-group-field">
                    <label>Company Trading Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group-field">
                    <label>Commercial Registry / License Number</label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group-field">
                    <label>Customer Support Email</label>
                    <input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group-field">
                    <label>Customer Hotline / Phone</label>
                    <input
                      type="tel"
                      value={hotline}
                      onChange={(e) => setHotline(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group-field" style={{ gridColumn: "1 / -1" }}>
                    <label>Head Office Address</label>
                    <input
                      type="text"
                      value={headOffice}
                      onChange={(e) => setHeadOffice(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <button type="submit" className="primary-blue-btn">
                    Save Profile
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: Rental Policies */}
            {activeTab === "policies" && (
              <form onSubmit={handleSaveSettings} className="register-tracker-form">
                <div className="form-section-head">
                  <h3>Rental Rules &amp; Operational Policies</h3>
                  <p>Rules enforced when creating customer reservations and returning vehicles.</p>
                </div>

                <div className="form-grid-2">
                  <div className="form-group-field">
                    <label>Standard Security Deposit ($ USD)</label>
                    <input
                      type="number"
                      value={securityDeposit}
                      onChange={(e) => setSecurityDeposit(e.target.value)}
                      min="0"
                      step="10"
                    />
                    <span className="form-helper-note">Held upon contract signing, refunded upon safe inspection</span>
                  </div>

                  <div className="form-group-field">
                    <label>Late Return Grace Period (Hours)</label>
                    <input
                      type="number"
                      value={gracePeriod}
                      onChange={(e) => setGracePeriod(e.target.value)}
                      min="0"
                      max="24"
                    />
                    <span className="form-helper-note">Hours allowed before an overdue extra-day fee applies</span>
                  </div>

                  <div className="form-group-field">
                    <label>Fuel Handover Policy</label>
                    <select
                      value={fuelPolicy}
                      onChange={(e) => setFuelPolicy(e.target.value)}
                    >
                      <option value="Same-to-Same (Full-to-Full)">Same-to-Same (Full-to-Full)</option>
                      <option value="Prepaid Fuel">Prepaid Fuel (Customer returns at any level)</option>
                      <option value="Exact Gauge Matching">Exact Gauge Matching (Quarter / Half)</option>
                    </select>
                  </div>

                  <div className="form-group-field">
                    <label>Minimum Driver Age</label>
                    <input
                      type="number"
                      value={minAge}
                      onChange={(e) => setMinAge(e.target.value)}
                      min="18"
                      max="30"
                    />
                    <span className="form-helper-note">Minimum age required for primary driver license</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <button type="submit" className="primary-blue-btn">
                    Save Policies
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: Localization */}
            {activeTab === "locale" && (
              <form onSubmit={handleSaveSettings} className="register-tracker-form">
                <div className="form-section-head">
                  <h3>Regional Formatting &amp; Languages</h3>
                  <p>Configure interface languages, currency symbol, and date displays.</p>
                </div>

                <div className="form-grid-2">
                  <div className="form-group-field">
                    <label>System Language</label>
                    <select value={language} onChange={(e) => {
                      const nextLanguage = e.target.value;
                      setLanguage(nextLanguage);
                      if (nextLanguage === "Somali" || nextLanguage === "English") {
                        const selected = nextLanguage === "Somali" ? "so" : "en";
                        void saveDashboardDataAndWait("fleetora-language", selected).catch((error: unknown) => {
                          alert(error instanceof Error ? `Could not save language: ${error.message}` : "Could not save language.");
                        });
                        window.dispatchEvent(new CustomEvent("fleetora-language-changed", { detail: selected }));
                      }
                    }}>
                      <option value="SO / EN (Bilingual)">SO / EN (Somali &amp; English Bilingual)</option>
                      <option value="Somali">Somali (Af-Soomaali)</option>
                      <option value="English">English (United States)</option>
                    </select>
                  </div>

                  <div className="form-group-field">
                    <label>Default Ledger Currency</label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                      <option value="USD ($)">USD ($ United States Dollar)</option>
                      <option value="SOS (Sh.So)">SOS (Somali Shilling)</option>
                    </select>
                  </div>

                  <div className="form-group-field">
                    <label>Date Notation</label>
                    <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Standard)</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY (European Format)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (US Format)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <button type="submit" className="primary-blue-btn">
                    Save Localization
                  </button>
                </div>
              </form>
            )}

            {/* TAB 4: Alerts & SMS */}
            {activeTab === "alerts" && (
              <div className="register-tracker-form">
                <div className="form-section-head">
                  <h3>Automated SMS &amp; Email Dispatch</h3>
                  <p>Keep customers and staff notified via Hormuud / Telesom SMS gateway.</p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <label className="settings-toggle-row">
                    <div>
                      <strong>Instant Booking SMS Confirmation</strong>
                      <p>Send rental confirmation and pickup branch address when booking is created.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={smsBooking}
                      onChange={(e) => setSmsBooking(e.target.checked)}
                      className="settings-toggle-checkbox"
                    />
                  </label>

                  <label className="settings-toggle-row">
                    <div>
                      <strong>Overdue Vehicle Reminder SMS</strong>
                      <p>Send notification to customer when vehicle has not been returned within grace period.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={smsOverdue}
                      onChange={(e) => setSmsOverdue(e.target.checked)}
                      className="settings-toggle-checkbox"
                    />
                  </label>

                  <label className="settings-toggle-row">
                    <div>
                      <strong>Daily Executive Operations Digest</strong>
                      <p>Send morning report of today&apos;s upcoming pickups, returns, and maintenance.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={emailDigest}
                      onChange={(e) => setEmailDigest(e.target.checked)}
                      className="settings-toggle-checkbox"
                    />
                  </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <button type="button" className="primary-blue-btn" onClick={() => handleSaveSettings()}>
                    Save Alert Rules
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: Data & Backup */}
            {activeTab === "data" && (
              <div className="register-tracker-form">
                <div className="form-section-head">
                  <h3>Local Data &amp; Backups</h3>
                  <p>Demo records stay in this browser. Export a local backup or restore the demo data.</p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="manage-stat-box" style={{ padding: "18px 16px", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Download size={18} color="#2563eb" />
                      <strong>Export JSON Backup</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                      Download a JSON copy of this browser&apos;s Fleetora demo data.
                    </p>
                    <button
                      type="button"
                      className="secondary-action"
                      style={{ marginTop: 8 }}
                      onClick={handleExportBackup}
                    >
                      <Download size={14} />
                      <span>Download Local Backup</span>
                    </button>
                  </div>

                  <div className="manage-stat-box" style={{ padding: "18px 16px", gap: 8, borderColor: "#fee2e2", background: "#fffafb" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <RefreshCw size={18} color="#dc2626" />
                      <strong style={{ color: "#991b1b" }}>Reset to Factory Defaults</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                      Re-initializes demo records (fleet, bookings, customers, expenses, inspections, maintenance).
                    </p>
                    <button
                      type="button"
                      className="action-icon-btn danger"
                      style={{ marginTop: 8, width: "fit-content" }}
                      onClick={handleResetDemoData}
                    >
                      <RefreshCw size={14} />
                      <span>Reset Demo Data</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
