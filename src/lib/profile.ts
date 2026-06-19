import type { UserProfile } from "./auth";

export function isCitizenProfileComplete(profile: UserProfile | null) {
  return Boolean(
    profile?.residenceArea?.trim() &&
      profile.residenceDistrict?.trim() &&
      profile.residenceBarangay?.trim(),
  );
}
