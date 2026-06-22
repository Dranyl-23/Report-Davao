import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

const maxImageSizeBytes = 5 * 1024 * 1024;
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

interface CloudinarySignatureResponse {
  apiKey?: string;
  folder?: string;
  signature?: string;
  timestamp?: number;
}

interface CloudinaryUploadResponse {
  secure_url?: string;
  public_id?: string;
  error?: {
    message?: string;
  };
}

export interface UploadedImage {
  imageUrl: string;
  imagePublicId: string;
}

export type UploadedReportImage = UploadedImage;

export function validateReportImage(file: File) {
  if (!allowedImageTypes.includes(file.type)) {
    return "Please upload a JPG, PNG, or WebP image.";
  }

  if (file.size > maxImageSizeBytes) {
    return "Photo must be 5 MB or smaller.";
  }

  return "";
}

export async function uploadImageToCloudinary(file: File): Promise<UploadedImage> {
  const validationMessage = validateReportImage(file);

  if (validationMessage) {
    throw new Error(validationMessage);
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;

  if (!cloudName) {
    throw new Error(
      "Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME to .env.",
    );
  }

  const signatureResponse = await httpsCallable<unknown, CloudinarySignatureResponse>(
    functions,
    "getCloudinarySignature",
  )({});
  const { apiKey, folder, signature, timestamp } = signatureResponse.data;

  if (!apiKey || !folder || !signature || !timestamp) {
    throw new Error("Cloudinary upload signing is not configured. Contact the administrator.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("folder", folder);
  formData.append("signature", signature);
  formData.append("timestamp", String(timestamp));

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData },
  );

  const data = (await response.json()) as CloudinaryUploadResponse;

  if (!response.ok || !data.secure_url || !data.public_id) {
    throw new Error(data.error?.message ?? "Photo upload failed.");
  }

  return {
    imageUrl: data.secure_url,
    imagePublicId: data.public_id,
  };
}

export async function uploadReportImage(file: File): Promise<UploadedReportImage> {
  return uploadImageToCloudinary(file);
}

export async function uploadProfileImage(file: File): Promise<UploadedImage> {
  return uploadImageToCloudinary(file);
}
