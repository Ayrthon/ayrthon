/** Session cookie auth for `/planning` (server APIs under `/api/planning/*`). */

function planningFetchErrorMessage(err: unknown): string {
  const fallback = "Wrong password or sign-in failed.";
  if (!err || typeof err !== "object") return fallback;
  const x = err as Record<string, unknown>;

  if (typeof x.statusMessage === "string" && x.statusMessage.trim()) {
    return x.statusMessage;
  }
  if (typeof x.message === "string" && x.message.trim()) {
    return x.message;
  }

  const data = x.data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.statusMessage === "string" && d.statusMessage.trim()) {
      return d.statusMessage;
    }
    if (typeof d.message === "string" && d.message.trim()) {
      return d.message;
    }
  }

  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}
export function usePlanningAuth() {
  const ready = ref(false);
  const authenticated = ref(false);
  const loginError = ref<string | null>(null);

  async function check() {
    try {
      const r = await $fetch<{ ok: boolean }>("/api/planning/session", {
        credentials: "include",
        cache: "no-store",
      });
      authenticated.value = r.ok;
    } catch {
      authenticated.value = false;
    } finally {
      ready.value = true;
    }
  }

  async function login(password: string) {
    loginError.value = null;
    try {
      await $fetch("/api/planning/login", {
        method: "POST",
        body: { password },
        credentials: "include",
        cache: "no-store",
      });
      authenticated.value = true;
    } catch (e: unknown) {
      authenticated.value = false;
      loginError.value = planningFetchErrorMessage(e);
    }
  }

  async function logout() {
    loginError.value = null;
    try {
      await $fetch("/api/planning/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } catch {
      /* still treat as logged out locally */
    }
    authenticated.value = false;
  }

  if (import.meta.client) {
    void check();
  }

  return reactive({
    ready,
    authenticated,
    loginError,
    check,
    login,
    logout,
  });
}
