window.api = {
  async request(path, options = {}) {
    const response = await fetch(path, {
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
  },

  register(data) {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  login(data) {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  logout() {
    return this.request("/api/auth/logout", { method: "POST" });
  },
};
