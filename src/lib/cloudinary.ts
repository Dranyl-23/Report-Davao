const maxImageSizeBytes = 5 * 1024 * 1024;
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

interface CloudinaryUploadResponse {
  secure_url?: string;
  public_id?: string;
  error?: {
    message?: string;
  };
}

export interface UploadedReportImage {
  imageUrl: string;
  imagePublicId: string;
}

export function validateReportImage(file: File) {
  if (!allowedImageTypes.includes(file.type)) {
    return "Please upload a JPG, PNG, or WebP image.";
  }

  if (file.size > maxImageSizeBytes) {
    return "Photo must be 5 MB or smaller.";
  }

  return "";
}

export async function uploadReportImage(file: File): Promise<UploadedReportImage> {
  const validationMessage = validateReportImage(file);

  if (validationMessage) {
    throw new Error(validationMessage);
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary upload is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });
  const data = (await response.json()) as CloudinaryUploadResponse;

  if (!response.ok || !data.secure_url || !data.public_id) {
    throw new Error(data.error?.message ?? "Photo upload failed.");
  }

  return {
    imageUrl: data.secure_url,
    imagePublicId: data.public_id,
  };
}
