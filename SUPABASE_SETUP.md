# Supabase setup

The app uses Supabase Auth and a per-user JSON record table for dashboard data.

1. In Supabase, open **SQL Editor** and run `supabase/migrations/20261031000000_create_dashboard_records.sql`.
2. Run `supabase/migrations/20261101100000_create_gps_tracking_tables.sql` to create the account-scoped vehicle and GPS location-history tables, their row-level security policies, and Realtime publication entries.
3. If `public.vehicles` already exists, run `supabase/migrations/20261101110000_add_vehicle_details.sql` to add its brand, model, and year fields.
4. If inserting a vehicle fails with `vehicles_status_check`, run `supabase/migrations/20261101120000_fix_vehicle_status_constraint.sql` to align the database statuses with Live Tracking.
5. Run `supabase/migrations/20261102100000_add_vehicle_passenger_count.sql` to add the manually entered passenger count used in the Hargeisa live report.
6. Run `supabase/migrations/20261102110000_create_trip_permission_requests.sql` to enable regional travel requests, administrator decisions, and row-level security.
7. Grant the real administrator account the trusted `app_metadata.role` claim in Supabase SQL Editor (replace the email). The admin APIs accept `Administrator` or `admin`:
   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"Administrator"}'::jsonb
   where email = 'admin@example.com';
   ```
   The signed-in administrator must sign out and back in for the role claim to refresh. Alternatively, set the server-only `SUPABASE_ADMIN_EMAILS` environment variable to a comma-separated allowlist of administrator sign-in emails, then restart the app. Do not use client-controlled user metadata for admin authorization. The Users & Roles page currently contains demo entries and does not grant Supabase administrator privileges.
8. The System Users page uses Supabase Auth accounts; it does not require a `profiles` table. `GET /api/admin/drivers` requires a signed-in Administrator and paginates Auth accounts (`page`, `perPage`; maximum 100), including their trusted role, account creation time, and last sign-in time. `POST /api/admin/drivers` creates a confirmed driver account from `full_name`, `email`, `password`, and optional `phone`; it assigns trusted `app_metadata.role = "drivers"` and stores name/phone in user metadata. Both methods require the signed-in account's trusted `app_metadata.role = "Administrator"` claim. The service-role key is used only on the server.
9. In **Authentication → URL Configuration**, set the site URL to your deployed app URL. Add `http://localhost:3000` to the redirect URLs for local development.
10. Keep the Supabase URL and anon or publishable key in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and either `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The GPS API also requires `SUPABASE_SERVICE_ROLE_KEY` and a long random `GPS_DEVICE_TOKEN` in the server environment. Never expose the service-role key or GPS token to the browser or commit `.env.local`.
11. Restart the Next.js server after changing environment variables.

Login and signup use Supabase Auth. If email confirmation is enabled, new users must confirm their email before signing in. The dashboard data table has row-level security policies that limit each authenticated account to its own records. Existing `fleetora-*` browser records are imported for the first account that signs in from that browser.

Live Tracking stores GPS-tracked vehicles in `public.vehicles`, separately from the Fleet Management records. When adding a vehicle, the app requests the browser device's current location; latitude and longitude are not entered manually. Browser location access requires the user to grant permission and the site to use HTTPS (or localhost). To track a vehicle's real position, the device granting location access must be inside that vehicle, or a connected GPS tracker must send positions to `POST /api/gps`. Hargeisa GPS positions are accepted normally. A trip outside Hargeisa but within Somaliland must have an approved `trip_permission_requests` record whose departure/return window includes the current time; unapproved, expired, or out-of-area GPS updates are rejected. Staff submit a destination, purpose, passenger count, and travel window in Live Tracking. Only accounts with the trusted Supabase `app_metadata.role = Administrator` claim can see all requests and approve or reject them. During an active approved trip, the route map may follow the vehicle within Somaliland. Passenger count is entered manually and shown in the automatic report. Configure the GPS token on the trusted gateway only, never on a tracker or in browser code.

The **Users & Roles** page stores team-member entries, custom role descriptions, and branch names as account-owned dashboard data. Roles and branches start empty and can be added, edited, and removed there. Role responsibilities are descriptive only; they do not enforce Supabase Auth permissions, and team-member entries do not invite or provision Supabase Auth users.
