(() => {
  const registerForm = document.querySelector("#register-form");
  const loginForm = document.querySelector("#login-form");
  const dashboard = document.querySelector("#dashboard");
  const dashboardProfile = document.querySelector("#dashboard-profile");
  const tabs = document.querySelectorAll("[data-auth-tab]");

  function setTab(name) {
    const isRegister = name === "register";
    registerForm.classList.toggle("is-hidden", !isRegister);
    loginForm.classList.toggle("is-hidden", isRegister);
    dashboard.classList.add("is-hidden");
    tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.authTab === name));
  }

  function showDashboard() {
    registerForm.classList.add("is-hidden");
    loginForm.classList.add("is-hidden");
    dashboard.classList.remove("is-hidden");
    tabs.forEach((tab) => tab.classList.remove("is-active"));
    loadDashboardProfile();
  }

  async function loadDashboardProfile() {
    if (!dashboardProfile) {
      return;
    }

    try {
      const me = await api.me();
      const profile = await api.getUserProfile(me.user_id);
      renderDashboardProfile(profile);
    } catch (error) {
      console.error("Failed to load dashboard profile", error);
      dashboardProfile.innerHTML = '<p class="dashboard-note">Unable to load profile data.</p>';
    }
  }

  function renderDashboardProfile(profile) {
    const name = [profile.nickname, profile.first_name, profile.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "User";
    const initials = name
      .split(" ")
      .map((part) => part[0] || "")
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const avatarUrl = profile.avatar_url || "";

    dashboardProfile.innerHTML = `
      <div class="dashboard-profile-card">
        <div class="dashboard-avatar">
          ${avatarUrl ? `<img src="${avatarUrl}" alt="${name} avatar" class="avatar-image" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22 viewBox=%220 0 64 64%22%3E%3Crect width=%2264%22 height=%2264%22 rx=%2212%22 fill=%22%23e5e7eb%22/%3E%3Ctext x=%2232%22 y=%2238%22 font-size=%2220%22 text-anchor=%22middle%22 fill=%22%2374757f%22 font-family=%22Arial,sans-serif%22%3E${initials}%3C/text%3E%3C/svg%3E';"/>` : `<div class="avatar-fallback">${initials}</div>`}
        </div>
        <div class="dashboard-profile-meta">
          <p class="eyebrow">Signed in as</p>
          <h2>${name}</h2>
          <p>${profile.about_me || "Your profile summary will appear here."}</p>
        </div>
      </div>
    `;
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => setTab(tab.dataset.authTab));
  });

  document.querySelector("#logout-button")?.addEventListener("click", async () => {
    await api.logout();
    setTab("login");
  });

  registerPage.init({ showLogin: () => setTab("login") });
  loginPage.init({ showDashboard });
})();
