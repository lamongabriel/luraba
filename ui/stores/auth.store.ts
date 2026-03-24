import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { User } from "@/interfaces/users";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isBootstrapped: boolean;
  login: (user: User, token: string) => void;
  updateUserPreferences: (preferences: User["preferences"]) => void;
  setBootstrapped: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isBootstrapped: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      updateUserPreferences: (preferences) =>
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                preferences,
              }
            : state.user,
        })),
      setBootstrapped: (value) => set({ isBootstrapped: value }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
