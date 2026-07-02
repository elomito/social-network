window.api = (function () {
  const DEFAULT_BACKEND = "http://127.0.0.1:8080";
  const useBackendOrigin = window.location.port === "8000";
  const apiOrigin = useBackendOrigin ? DEFAULT_BACKEND : "";

  function getUrl(path) {
    return apiOrigin ? `${apiOrigin}${path}` : path;
  }

  async function request(path, options = {}) {
    const response = await fetch(getUrl(path), {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { message: await response.text() };

    if (!response.ok) {
      const error = new Error(payload.message || "Request failed");
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  return {
    request,

    register(data) {
      return request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    login(data) {
      return request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    logout() {
      return request("/api/auth/logout", { method: "POST" });
    },

    me() {
      return request("/api/auth/me");
    },

    getUserProfile(userId) {
      return request(`/api/users?id=${encodeURIComponent(userId)}`);
    },
  };
})();
