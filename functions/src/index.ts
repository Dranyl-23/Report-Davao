import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import * as crypto from "crypto";

// The API Secret lives ONLY in environment variables on the server — never in the browser
const cloudinaryApiSecret = defineString("CLOUDINARY_API_SECRET");

/**
 * Returns a short-lived Cloudinary signed-upload signature.
 * Requires the caller to be authenticated with Firebase Auth.
 * The API Secret is never exposed to the client.
 */
export const getCloudinarySignature = onCall(
  {
    // Singapore region — closest to Davao for low latency
    region: "asia-southeast1",
  },
  (request) => {
    // ── Auth guard ────────────────────────────────────────────────────────────
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to upload photos.",
      );
    }

    const apiSecret = cloudinaryApiSecret.value();

    if (!apiSecret) {
      throw new HttpsError(
        "internal",
        "Cloudinary is not configured on the server. Contact the administrator.",
      );
    }

    // ── Build the signature ───────────────────────────────────────────────────
    // Cloudinary signed upload: SHA-1 of sorted params string + api_secret
    const timestamp = Math.round(Date.now() / 1000);
    const folder = "report-photos";

    // All upload params (except file, api_key, cloud_name) sorted alphabetically
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto
      .createHash("sha1")
      .update(`${paramsToSign}${apiSecret}`)
      .digest("hex");

    return { signature, timestamp, folder };
  },
);
