import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile as updateFirebaseProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "./firebase";
import { db } from "./firebase";

export type UserRole = "citizen" | "staff" | "lgu-admin" | "super-admin";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  customClaimsSuperAdmin?: boolean;
  photoUrl?: string;
  photoPublicId?: string;
  residenceArea?: string;
  residenceDistrict?: string;
  residenceBarangay?: string;
  assignedArea?: string;
  assignedDepartment?: string;
  disabled?: boolean;
  disableReason?: string;
}

export interface ResidenceInfo {
  residenceArea: string;
  residenceDistrict: string;
  residenceBarangay: string;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  profileError: string;
  isSuperAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (email: string, password: string) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<UserProfile>;
  updateProfilePhoto: (photoUrl: string, photoPublicId: string) => Promise<void>;
  updateResidenceInfo: (residenceInfo: ResidenceInfo) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);

      try {
        if (nextUser) {
          const nextProfile = await ensureUserProfile(nextUser);
          setProfile(nextProfile);
          setProfileError("");
        } else {
          setProfile(null);
          setProfileError("");
        }
      } catch (error) {
        if (nextUser) {
          setProfile(getFallbackProfile(nextUser));
          setProfileError(getProfileErrorMessage(error));
        } else {
          setProfile(null);
          setProfileError("");
        }
      } finally {
        setLoading(false);
      }
    });
  }, []);

  async function syncProfile(nextUser: User) {
    try {
      const nextProfile = await ensureUserProfile(nextUser);
      setProfile(nextProfile);
      setProfileError("");
      return nextProfile;
    } catch (error) {
      const fallbackProfile = getFallbackProfile(nextUser);
      setProfile(fallbackProfile);
      setProfileError(getProfileErrorMessage(error));
      return fallbackProfile;
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      profileError,
      isSuperAdmin: profile?.customClaimsSuperAdmin === true || profile?.role === "super-admin",
      loading,
      login: async (email, password) => {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        return syncProfile(credential.user);
      },
      register: async (email, password) => {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        return syncProfile(credential.user);
      },
      loginWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        const credential = await signInWithPopup(auth, provider);
        return syncProfile(credential.user);
      },
      updateProfilePhoto: async (photoUrl, photoPublicId) => {
        if (!auth.currentUser) {
          throw new Error("Please sign in first.");
        }

        await updateFirebaseProfile(auth.currentUser, { photoURL: photoUrl });
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          photoUrl,
          photoPublicId,
          updatedAt: serverTimestamp(),
        });

        setUser(auth.currentUser);
        setProfile((currentProfile) => {
          const baseProfile = currentProfile ?? getFallbackProfile(auth.currentUser as User);

          return {
            ...baseProfile,
            photoUrl,
            photoPublicId,
          };
        });
      },
      updateResidenceInfo: async (residenceInfo) => {
        if (!auth.currentUser) {
          throw new Error("Please sign in first.");
        }

        const nextResidenceInfo = {
          residenceArea: residenceInfo.residenceArea.trim(),
          residenceDistrict: residenceInfo.residenceDistrict.trim(),
          residenceBarangay: residenceInfo.residenceBarangay.trim(),
        };

        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          ...nextResidenceInfo,
          updatedAt: serverTimestamp(),
        });

        setProfile((currentProfile) => {
          const baseProfile = currentProfile ?? getFallbackProfile(auth.currentUser as User);

          return {
            ...baseProfile,
            ...nextResidenceInfo,
          };
        });
      },
      logout: async () => {
        await signOut(auth);
        setProfile(null);
        setProfileError("");
      },
    }),
    [loading, profile, profileError, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function getFallbackProfile(nextUser: User): UserProfile {
  return {
    uid: nextUser.uid,
    email: nextUser.email,
    displayName: nextUser.displayName,
    role: "citizen",
    photoUrl: nextUser.photoURL ?? undefined,
  };
}

const userRoles: UserRole[] = ["citizen", "staff", "lgu-admin", "super-admin"];

function normalizeUserRole(role: unknown): UserRole {
  return typeof role === "string" && userRoles.includes(role as UserRole) ? (role as UserRole) : "citizen";
}

function getProfileErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to load your profile.";

  if (message.includes("Database") && message.includes("not found")) {
    return "Signed in, but live profile data is not available yet. Please try again after setup is completed.";
  }

  if (message.includes("offline")) {
    return "Signed in, but profile data is unreachable right now. Check your connection and refresh.";
  }

  return `Signed in, but your profile could not be loaded: ${message}`;
}

async function ensureUserProfile(nextUser: User): Promise<UserProfile> {
  const userRef = doc(db, "users", nextUser.uid);
  const [userSnap, idTokenResult] = await Promise.all([
    getDoc(userRef),
    nextUser.getIdTokenResult(),
  ]);
  const customClaimsSuperAdmin =
    idTokenResult.claims.superAdmin === true || idTokenResult.claims.role === "super-admin";

  if (userSnap.exists()) {
    const data = userSnap.data() as Partial<UserProfile>;
    return {
      uid: nextUser.uid,
      email: data.email ?? nextUser.email,
      displayName: data.displayName ?? nextUser.displayName,
      role: customClaimsSuperAdmin ? "super-admin" : normalizeUserRole(data.role),
      customClaimsSuperAdmin,
      photoUrl: data.photoUrl ?? nextUser.photoURL ?? undefined,
      photoPublicId: data.photoPublicId,
      residenceArea: data.residenceArea,
      residenceDistrict: data.residenceDistrict,
      residenceBarangay: data.residenceBarangay,
      assignedArea: data.assignedArea,
      assignedDepartment: data.assignedDepartment,
      disabled: data.disabled === true,
      disableReason: data.disableReason,
    };
  }

  const profileData: UserProfile = {
    uid: nextUser.uid,
    email: nextUser.email,
    displayName: nextUser.displayName,
    role: customClaimsSuperAdmin ? "super-admin" : "citizen",
    customClaimsSuperAdmin,
  };

  await setDoc(userRef, {
    uid: profileData.uid,
    email: profileData.email,
    displayName: profileData.displayName,
    role: "citizen",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return profileData;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
