# Report Davao

Community-driven civic issue reporting platform for Davao residents and LGU/barangay admins.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- Firebase Auth, Firestore, and Storage
- Leaflet + OpenStreetMap
- React Router

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and add your Firebase web app config.

3. Run the dev server:

   ```bash
   npm run dev
   ```

## Suggested Firebase Collections

- `users`
- `reports`
- `statusLogs`
- `upvotes`
- `notifications`

The starter app currently uses local sample data so the UI runs before Firebase is connected.

## Current Firebase Status

- Authentication: email/password and Google sign-in are wired in.
- Firestore: the app reads and writes `reports`.
- Citizen side: submit GPS-pinned reports, browse/search/filter reports, confirm other reports, and track personal submissions.
- Storage: paused for now because Firebase requires a pricing plan upgrade in this project.
- Security: Firestore and Storage rules are included in `firestore.rules` and `storage.rules`.

Until the first Firestore report is submitted, the dashboard shows sample reports for demo continuity.

See `docs/security-checklist.md` before deploying rules or promoting admin users.
