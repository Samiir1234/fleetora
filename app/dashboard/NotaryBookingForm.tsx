"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { CheckCircle2, Send, X } from "lucide-react";
import { saveDashboardDataAndWait } from "./dashboard-storage";

type Props = {
  onClose: () => void;
  reference?: string;
  initialData?: Record<string, string>;
  onSaved?: (booking: { reference: string; details: Record<string, string> }) => Promise<void>;
};

export default function NotaryBookingForm({ onClose, reference, initialData, onSaved }: Props) {
  const [clientName, setClientName] = useState(initialData?.clientName ?? "");
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, string>>(initialData ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const formData = new FormData(event.currentTarget);
      const bookingRef = reference ?? `NB-${new Date().getFullYear()}-${Date.now()}`;
      const saved = localStorage.getItem("fleetora-notary-booking-requests");
      const previous: unknown = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(previous)) throw new Error("Saved notary booking data is invalid.");

      const request = Object.fromEntries(
        Array.from(formData.entries())
          .filter((entry): entry is [string, string] => typeof entry[1] === "string")
          .map(([key, value]) => [key, value.trim()]),
      );
      const nextRequests = reference
        ? previous.map((item) => (
          item && typeof item === "object" && "id" in item && item.id === bookingRef
            ? { ...item, ...request, updatedAt: new Date().toISOString() }
            : item
        ))
        : [
          { id: bookingRef, status: "Pending", createdAt: new Date().toISOString(), ...request },
          ...previous,
        ];
      if (reference && !nextRequests.some((item) => item && typeof item === "object" && "id" in item && item.id === bookingRef)) {
        throw new Error("This saved booking request could not be found. Close the form and refresh the page.");
      }
      await saveDashboardDataAndWait("fleetora-notary-booking-requests", nextRequests);
      await onSaved?.({ reference: bookingRef, details: request });
      setSubmittedRef(bookingRef);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this booking request.");
    } finally {
      setSaving(false);
    }
  }

  function updateFormPreview(event: ChangeEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    setPreviewData(
      Object.fromEntries(
        Array.from(formData.entries())
          .filter((entry): entry is [string, string] => typeof entry[1] === "string")
          .map(([key, value]) => [key, value.trim()]),
      ),
    );
  }

  const cleanWhatsAppNumber = (previewData.clientWhatsApp || "").replace(/[^0-9]/g, "");
  const whatsappShareText = encodeURIComponent(
    `*NEW NOTARY BOOKING REQUEST*\nRef: ${submittedRef || "NB-PENDING"}\nClient: ${previewData.clientName}\nService: ${previewData.serviceType}\nDate: ${previewData.bookingDate} at ${previewData.bookingTime}\nLocation: ${previewData.appointmentLocation}\nNotary: ${previewData.notaryName}\n\nPrepared via Fleetora.`
  );
  const whatsappUrl = `https://wa.me/${cleanWhatsAppNumber}?text=${whatsappShareText}`;

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="create-dialog booking-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-booking-title"
      >
        <div className="dialog-heading">
          <div>
            <h2 id="create-booking-title">{reference ? "Edit notary booking request" : "Create notary booking request"}</h2>
            <p>{reference ? "Update the saved request. Your existing details are filled in below." : "Save the request to your account, then optionally prepare a WhatsApp message."}</p>
          </div>
          <button type="button" className="dialog-close" aria-label="Close dialog" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div
          className="booking-demo-notice"
          role="note"
          style={{
            background: "#fffbeb",
            borderColor: "#fde68a",
            color: "#92400e",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#f59e0b",
              display: "inline-block",
            }}
          />
          {reference ? "Updating this request saves your changes to this account's Supabase workspace." : "Client identity and contact details will be saved in this account's Supabase workspace."}
        </div>

        {submittedRef ? (
          <div style={{ padding: "24px 20px", textAlign: "center" }}>
            <div style={{ display: "inline-flex", padding: 12, borderRadius: "50%", background: "#ecfdf5", color: "#059669", marginBottom: 16 }}>
              <CheckCircle2 size={40} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px 0", color: "#0f172a" }}>
              {reference ? "Notary Booking Request Updated" : "Notary Booking Request Saved"}
            </h3>
            <p style={{ margin: "0 0 16px 0", color: "#475569", fontSize: 14 }}>
              Request reference: <strong>{submittedRef}</strong>. {reference ? "Your changes are saved in Supabase." : "The request is saved in Supabase."}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="primary-action"
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Send size={15} />
                Open WhatsApp Message
              </a>
              <button type="button" className="secondary-action" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form className="booking-form" onSubmit={handleSubmit} onChange={updateFormPreview}>
            {error ? <div className="storage-message" role="alert">{error}</div> : null}
            <fieldset>
              <legend>Client information</legend>
              <div className="booking-fields">
                <label>
                  Client full name
                  <input
                    name="clientName"
                    required
                    autoComplete="name"
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                  />
                </label>
                <label>
                  Phone number
                  <input name="clientPhone" type="tel" required placeholder="+252..." defaultValue={initialData?.clientPhone ?? ""} />
                </label>
                <label>
                  WhatsApp number
                  <input
                    name="clientWhatsApp"
                    type="tel"
                    required
                    pattern="[+][1-9][0-9]{7,14}"
                    title="Enter the country code and number, for example +252..."
                    placeholder="+252..."
                    defaultValue={initialData?.clientWhatsApp ?? ""}
                  />
                </label>
                <label>
                  Email address (optional)
                  <input name="clientEmail" type="email" autoComplete="email" defaultValue={initialData?.clientEmail ?? ""} />
                </label>
                <label>
                  ID / passport number
                  <input name="clientIdNumber" required defaultValue={initialData?.clientIdNumber ?? ""} />
                </label>
                <label>
                  Country
                  <input name="clientCountry" required autoComplete="country-name" defaultValue={initialData?.clientCountry ?? "Somalia"} />
                </label>
                <label>
                  City
                  <input name="clientCity" required autoComplete="address-level2" defaultValue={initialData?.clientCity ?? "Mogadishu"} />
                </label>
                <label>
                  Current location / address
                  <input name="clientAddress" required autoComplete="street-address" defaultValue={initialData?.clientAddress ?? ""} />
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>Notary contact and service</legend>
              <div className="booking-fields">
                <label>
                  Preferred notary full name
                  <input name="notaryName" required defaultValue={initialData?.notaryName ?? ""} />
                </label>
                <label>
                  Assigned notary WhatsApp (include country code)
                  <input
                    name="notaryWhatsApp"
                    type="tel"
                    required
                    pattern="[+][1-9][0-9]{7,14}"
                    title="Enter the country code and number, for example +252..."
                    placeholder="+252..."
                    defaultValue={initialData?.notaryWhatsApp ?? ""}
                  />
                </label>
                <label>
                  Notary registration / license number
                  <input name="notaryLicense" required defaultValue={initialData?.notaryLicense ?? ""} />
                </label>
                <label>
                  Notary office / company
                  <input name="notaryCompany" defaultValue={initialData?.notaryCompany ?? ""} />
                </label>
                <label>
                  Notary email
                  <input name="notaryEmail" type="email" defaultValue={initialData?.notaryEmail ?? ""} />
                </label>
                <label>
                  Notary office address
                  <input name="notaryAddress" defaultValue={initialData?.notaryAddress ?? ""} />
                </label>
                <label>
                  Notary service type
                  <input name="serviceType" required placeholder="e.g. Document notarization" defaultValue={initialData?.serviceType ?? ""} />
                </label>
                <label>
                  Document type
                  <input name="documentType" required defaultValue={initialData?.documentType ?? ""} />
                </label>
                <label>
                  Purpose of notarization
                  <input name="purpose" required defaultValue={initialData?.purpose ?? ""} />
                </label>
                <label>
                  Language
                  <select name="language" required defaultValue={initialData?.language ?? "Somali"}>
                    <option value="" disabled>
                      Select language
                    </option>
                    <option>Somali</option>
                    <option>English</option>
                    <option>Arabic</option>
                    <option>Other</option>
                  </select>
                </label>
                <label>
                  Urgency
                  <select name="urgency" required defaultValue={initialData?.urgency ?? "Standard"}>
                    <option value="" disabled>
                      Select urgency
                    </option>
                    <option>Standard</option>
                    <option>Urgent</option>
                    <option>Emergency</option>
                  </select>
                </label>
                <label className="booking-field-wide">
                  Additional notes
                  <textarea name="notes" rows={3} defaultValue={initialData?.notes ?? ""} />
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>Booking information</legend>
              <div className="booking-fields">
                <label>
                  Booking date
                  <input name="bookingDate" type="date" required defaultValue={initialData?.bookingDate ?? new Date().toISOString().slice(0, 10)} />
                </label>
                <label>
                  Booking time
                  <input name="bookingTime" type="time" required defaultValue={initialData?.bookingTime ?? "10:00"} />
                </label>
                <label>
                  Appointment location
                  <input name="appointmentLocation" required defaultValue={initialData?.appointmentLocation ?? "Main Branch Office"} />
                </label>
                <label>
                  Expected completion time
                  <input name="expectedCompletion" type="datetime-local" required defaultValue={initialData?.expectedCompletion ?? ""} />
                </label>
                <label>
                  Created by
                  <input name="createdBy" required defaultValue={initialData?.createdBy ?? "Mohamed Ali"} />
                </label>
              </div>
            </fieldset>

            <div className="submission-preview">
              <strong>Submission preview</strong>
              <p>NEW NOTARY BOOKING REQUEST</p>
              <p>
                Client: {previewData.clientName || "—"} · Phone: {previewData.clientPhone || "—"} · WhatsApp: {previewData.clientWhatsApp || "—"}
                <br />
                ID / Passport: {previewData.clientIdNumber || "—"} · Location: {[previewData.clientCity, previewData.clientCountry].filter(Boolean).join(", ") || "—"}
                <br />
                Service: {previewData.serviceType || "—"} · Document type: {previewData.documentType || "—"} · Purpose: {previewData.purpose || "—"}
                <br />
                Booking: {previewData.bookingDate || "—"} {previewData.bookingTime || ""} · {previewData.appointmentLocation || "—"}
                <br />
                Expected completion: {previewData.expectedCompletion || "—"} · Notary: {previewData.notaryName || "—"} · WhatsApp: {previewData.notaryWhatsApp || "—"}
                <br />
                Language: {previewData.language || "—"} · Urgency: {previewData.urgency || "—"} · Notes: {previewData.notes || "—"}
                <br />
                Created by: {previewData.createdBy || "—"}
              </p>
              <p>Submitting saves these details to this account&apos;s Supabase workspace.</p>
            </div>

            <div className="dialog-actions">
              <button type="button" className="secondary-action" onClick={onClose}>
                Close
              </button>
              <button type="submit" className="primary-action" disabled={saving}>
                {saving ? "Saving…" : reference ? "Save changes" : "Save and Continue"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
