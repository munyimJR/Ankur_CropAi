import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { z } from "zod";
import { readStored, writeStored } from "./lib/storage";
import { listFarms } from "./services/farms.service";
import { getProfile, saveProfile } from "./services/profile.service";
import {
  fetchCurrentUser,
  loginUser,
  registerUser,
  logoutUser,
  updateCurrentUserProfile,
  deleteCurrentUserAccount,
  type User,
  type LoginInput,
  type RegisterInput,
} from "./services/auth.service";
import type { Farm, Lang, Profile } from "./services/types";

function useStore() {
  const [lang, setLangValue] = useState<Lang>(() =>
    readStored("lang", z.enum(["en", "bn"]), "en"),
  );
  const [user, setUser] = useState<User | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(() =>
    readStored("selected", z.string(), ""),
  );
  const [profile, setProfile] = useState<Profile>(getProfile);
  const [notice, setNotice] = useState("");

  // Check authenticated user on mount
  useEffect(() => {
    fetchCurrentUser().then((u) => {
      if (u) {
        setUser(u);
        setProfile(u.profile);
      }
    });
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listFarms();
      setFarms(data);
    } catch {
      setError(
        "Unable to load fields. Retry or turn off simulated errors in Settings.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(id);
  }, [notice]);

  const farm = farms.find((f) => f.id === selected) ?? farms[0];

  const handleLogin = async (input: LoginInput) => {
    try {
      const u = await loginUser(input);
      setUser(u);
      setProfile(u.profile);
      await reload();
      return true;
    } catch {
      return false;
    }
  };

  const handleRegister = async (input: RegisterInput) => {
    try {
      const u = await registerUser(input);
      setUser(u);
      setProfile(u.profile);
      await reload();
      return true;
    } catch {
      return false;
    }
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setProfile(getProfile());
    void reload();
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteCurrentUserAccount();
      setUser(null);
      setProfile(getProfile());
      void reload();
      return true;
    } catch {
      return false;
    }
  };

  return {
    lang,
    t: (en: string, bn: string) => (lang === "bn" ? bn : en),
    setLang: (l: Lang) => {
      setLangValue(l);
      writeStored("lang", l);
    },
    user,
    isAuthenticated: !!user,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    deleteAccount: handleDeleteAccount,
    farms,
    farm,
    loading,
    error,
    reload,
    select: (id: string) => {
      setSelected(id);
      writeStored("selected", id);
    },
    profile,
    updateProfile: (p: Profile) => {
      if (user) {
        updateCurrentUserProfile(p).catch(() => {});
      }
      if (!saveProfile(p)) return false;
      setProfile(p);
      return true;
    },
    notice,
    notify: setNotice,
  };
}

const Context = createContext<ReturnType<typeof useStore> | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const value = useStore();
  return (
    <Context.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {value.notice && <div className="toast">{value.notice}</div>}
      </div>
    </Context.Provider>
  );
}

export function useApp() {
  const c = useContext(Context);
  if (!c) throw Error("AppProvider required");
  return c;
}

export function useResource<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T>(),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError("");
    loader()
      .then((d) => {
        if (!cancel) setData(d);
      })
      .catch((e: Error) => {
        if (!cancel) setError(e.message || "Failed to load");
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  return {
    data,
    loading,
    error,
    reload: () => setAttempt((a) => a + 1),
    retry: () => setAttempt((a) => a + 1),
  };
}
