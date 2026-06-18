# Report Davao Security Checklist

## Current MVP Security

- Firebase Authentication is required before a citizen can submit a report.
- New users are created with `role: citizen` in `users/{uid}`.
- Admin pages require an authenticated user profile with `role: admin`.
- Firestore rules validate report fields before accepting writes.
- Citizens can only create reports as themselves.
- Citizens can confirm other users' reports once.
- Citizens can edit or delete their own reports only while the report is still `submitted`.
- Report status updates are admin-only.
- Public report reads are allowed for the transparency map/stats, but reports must not store private contact details.
- Photo upload currently uses Cloudinary unsigned uploads for MVP evidence images.
- Storage upload rules are prepared, but Firebase Storage upload is paused until Firebase Storage is available.

## Firestore Collections

### `users/{uid}`

Stores user profile and role.

Allowed roles:

- `citizen`
- `admin`

Only trusted project owners should promote an account to admin.

### `reports/{reportId}`

Stores public civic issue reports.

Allowed citizen-created fields:

- `title`
- `category`
- `description`
- `barangay`
- `latitude`
- `longitude`
- `status`
- `upvotes`
- `createdBy`
- `createdAt`
- `updatedAt`
- `imageUrl`
- `imagePublicId`

Status must start as `submitted`.

Citizen edits are limited to:

- `title`
- `category`
- `description`
- `barangay`
- `latitude`
- `longitude`
- `updatedAt`

Once a report moves to `under-review`, `in-progress`, or `resolved`, citizens can no longer edit or delete it.

### `statusLogs/{logId}`

Reserved for admin-only audit history.

### `upvotes/{upvoteId}`

Stores citizen "I also saw this" confirmations.

Allowed citizen-created fields:

- `reportId`
- `userId`
- `createdAt`

The document ID must be `{reportId}_{uid}` so each user can confirm a report only once. Users cannot confirm reports they created.

## How To Promote An Admin

1. Create/login with the LGU or barangay staff account once.
2. Go to Firebase Console > Firestore.
3. Open `users/{uid}` for that account.
4. Change `role` from `citizen` to `admin`.
5. Keep normal resident accounts as `citizen`.

## Firebase Console Setup

Paste or deploy these files:

- `firestore.rules`
- `storage.rules`

For a class demo, using Firebase Console is fine:

1. Firebase Console > Firestore Database > Rules
2. Paste `firestore.rules`
3. Publish
4. Firebase Console > Storage > Rules
5. Paste `storage.rules` once Storage is available

## Security Notes For Defense

- The frontend hides admin UI, but Firestore rules are the real protection.
- API keys in Firebase web apps are not secrets; security depends on Auth, rules, and allowed domains.
- The app does not publicly expose emails, phone numbers, or user contact details in reports.
- Photos should be moderated later because they may contain faces, house numbers, or license plates.
- Cloudinary unsigned upload presets should be locked down by file type, size, and folder. Rotate the preset if it is exposed or abused.
- Admin role assignment should be controlled manually during MVP/pilot stage.
