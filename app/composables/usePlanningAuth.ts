/** Session cookie auth for `/planning` (server APIs under `/api/planning/*`). */

export function usePlanningAuth() {
  const ready = ref(false);
  const authenticated = ref(false);
  const loginError = ref<string | null>(null);

  async function check() {
    try {
      const r = await $fetch<{ ok: boolean }>("/api/planning/session", {
        credentials: "include",
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
      });
      authenticated.value = true;
    } catch {
      authenticated.value = false;
      loginError.value = "Wrong password or sign-in failed.";
    }
  }

  async function logout() {
    loginError.value = null;
    try {
      await $fetch("/api/planning/logout", {
        method: "POST",
        credentials: "include",
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
