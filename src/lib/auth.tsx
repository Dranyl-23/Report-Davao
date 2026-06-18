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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);

      if (nextUser) {
        const nextProfile = await ensureUserProfile(nextUser);
        setProfile(nextProfile);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      login: async (email, password) => {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        await ensureUserProfile(credential.user);
      },
      register: async (email, password) => {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await ensureUserProfile(credential.user);
      },
      loginWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        const credential = await signInWithPopup(auth, provider);
        await ensureUserProfile(credential.user);
      },
      logout: async () => {
        await signOut(auth);
      },
    }),
    [loading, profile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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
