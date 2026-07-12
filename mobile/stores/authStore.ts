import { create } from "zustand";

import { clearToken, getToken, setToken } from "@/services/tokenStore";

type AuthState = {
  token: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setAuthToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  hydrated: false,
  async hydrate() {
    const token = await getToken();
    set({ token, hydrated: true });
  },
  async setAuthToken(token) {
    await setToken(token);
    set({ token });
  },
  async logout() {
    await clearToken();
    set({ token: null });
  }
}));
