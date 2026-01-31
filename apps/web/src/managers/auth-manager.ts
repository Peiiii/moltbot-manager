import { useAuthStore } from "@/stores/auth-store";

export class AuthManager {
  setAuthHeader = (value: string | null) => useAuthStore.getState().setAuthHeader(value);
  clearAuth = () => useAuthStore.getState().clearAuth();
  login = async (username: string, password: string) =>
    useAuthStore.getState().login(username, password);
}
