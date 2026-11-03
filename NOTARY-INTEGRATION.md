# Notary booking requests

Notary booking requests are saved to the signed-in user's Supabase workspace under `fleetora-notary-booking-requests`. The WhatsApp action only opens a prefilled message for the user to review and send; the app does not send WhatsApp messages or upload documents.

The form collects personal identity and contact information. Use it only after enabling the Supabase database migration described in `SUPABASE_SETUP.md`. Row-level security restricts records to the signed-in account. Do not enter confidential documents; file upload is not implemented.
