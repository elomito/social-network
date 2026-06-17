(() => {
  const registerForm = document.querySelector("#register-form");
  const loginForm = document.querySelector("#login-form");
  const dashboard = document.querySelector("#dashboard");
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
