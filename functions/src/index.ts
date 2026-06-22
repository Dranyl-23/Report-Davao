import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import * as crypto from "crypto";

initializeApp();

const cloudinaryApiKey = defineSecret("CLOUDINARY_API_KEY");
const cloudinaryApiSecret = defineSecret("CLOUDINARY_API_SECRET");
const superAdminEmails = defineString("SUPER_ADMIN_EMAILS");

async function assertCallerIsActive(uid: string) {
  const callerProfile = await getFirestore().doc(`users/${uid}`).get();

  if (callerProfile.exists && callerProfile.get("disabled") === true) {
    throw new HttpsError(
      "permission-denied",
      "This account is restricted. Contact the Report Davao administrator.",
    );
  }
}

export const getCloudinarySignature = onCall(
  {
    region: "asia-southeast1",
    secrets: [cloudinaryApiKey, cloudinaryApiSecret],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to upload photos.",
      );
    }

    await assertCallerIsActive(request.auth.uid);

    const apiKey = cloudinaryApiKey.value();
    const apiSecret = cloudinaryApiSecret.value();

    if (!apiKey || !apiSecret) {
      throw new HttpsError(
        "internal",
        "Cloudinary is not configured on the server. Contact the administrator.",
      );
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = `report-photos/${request.auth.uid}`;
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto
      .createHash("sha1")
      .update(`${paramsToSign}${apiSecret}`)
      .digest("hex");

    return { apiKey, signature, timestamp, folder };
  },
);

export const setSuperAdminClaim = onCall(
  {
    region: "asia-southeast1",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    await assertCallerIsActive(request.auth.uid);

    const allowedOwnerEmails = superAdminEmails
      .value()
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    const callerEmail = String(request.auth.token.email ?? "").toLowerCase();
    const callerIsAllowedOwner = allowedOwnerEmails.includes(callerEmail);
    const callerIsSuperAdmin =
      request.auth.token.superAdmin === true ||
      request.auth.token.role === "super-admin";

    if (!callerIsAllowedOwner && !callerIsSuperAdmin) {
      throw new HttpsError(
        "permission-denied",
        "Only the system owner or an existing super admin can manage super admin claims.",
      );
    }

    const targetUid = typeof request.data?.uid === "string" ? request.data.uid : "";
    const enabled = request.data?.enabled !== false;

    if (!targetUid) {
      throw new HttpsError("invalid-argument", "Target uid is required.");
    }

    const targetUser = await getAuth().getUser(targetUid);
    const currentClaims = targetUser.customClaims ?? {};
    const nextClaims = {
      ...currentClaims,
      role: enabled
        ? "super-admin"
        : currentClaims.role === "super-admin"
          ? "citizen"
          : currentClaims.role,
      superAdmin: enabled,
    };

    await getAuth().setCustomUserClaims(targetUid, nextClaims);

    return {
      enabled,
      uid: targetUid,
    };
  },
);
