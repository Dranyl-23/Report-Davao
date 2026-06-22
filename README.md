# Report Davao

Community-driven civic issue reporting platform for Davao residents and LGU/barangay admins.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- Firebase Auth and Firestore
- Cloudinary for signed evidence photo uploads
- Leaflet + OpenStreetMap
- React Router

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and add your Firebase web app config plus Cloudinary cloud name.

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
- Citizen side: submit GPS-pinned reports, browse/search/filter reports, view report details, confirm other reports, track personal submissions, and edit/delete own submitted reports.
- Photo upload: Cloudinary signed upload is used for evidence images.
- Storage: Firebase Storage is paused for now because it requires a pricing plan upgrade in this project.
- Security: Firestore and Storage rules are included in `firestore.rules` and `storage.rules`.

## Cloudinary Photo Upload

Set the public Cloudinary cloud name in frontend environments:

- `VITE_CLOUDINARY_CLOUD_NAME`

Set these Firebase Functions parameters before deploying functions:

- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Firebase Secret Manager requires the Firebase project to be on the Blaze plan. Upgrade the project before running `firebase functions:secrets:set`.

The app requests a short-lived upload signature from the `getCloudinarySignature` callable, uploads the image to Cloudinary, and stores the returned `imageUrl` plus `imagePublicId` in Firestore.
Keep the Cloudinary API secret and `CLOUDINARY_URL` out of frontend env files.

Until the first Firestore report is submitted, the dashboard shows sample reports for demo continuity.

See `docs/security-checklist.md` before deploying rules or promoting admin users.
