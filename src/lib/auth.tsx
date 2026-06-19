import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "./firebase";
import { db } from "./firebase";

export type UserRole = "citizen" | "admin";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  profileError: string;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
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
    } catch (error) {
      setProfile(getFallbackProfile(nextUser));
      setProfileError(getProfileErrorMessage(error));
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      profileError,
      loading,
      login: async (email, password) => {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        await syncProfile(credential.user);
      },
      register: async (email, password) => {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await syncProfile(credential.user);
      },
      loginWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        const credential = await signInWithPopup(auth, provider);
        await syncProfile(credential.user);
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
  };
}

function getProfileErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to load Firestore user profile.";

  if (message.includes("Database") && message.includes("not found")) {
    return "Signed in, but Firestore database is not available. Create/check the default Firestore database for this Firebase project, then refresh.";
  }

  if (message.includes("offline")) {
    return "Signed in, but Firestore is unreachable right now. If your internet is working, check that the default Firestore database exists and rules are published.";
  }

  return `Signed in, but the Firestore user profile could not be loaded: ${message}`;
}

async function ensureUserProfile(nextUser: User): Promise<UserProfile> {
  const userRef = doc(db, "users", nextUser.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data() as Partial<UserProfile>;
    return {
      uid: nextUser.uid,
      email: data.email ?? nextUser.email,
      displayName: data.displayName ?? nextUser.displayName,
      role: data.role === "admin" ? "admin" : "citizen",
    };
  }

  const profileData: UserProfile = {
    uid: nextUser.uid,
    email: nextUser.email,
    displayName: nextUser.displayName,
    role: "citizen",
  };

  await setDoc(userRef, {
    ...profileData,
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
