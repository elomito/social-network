window.loginPage = {
  init({ showDashboard }) {
    const form = document.querySelector("#login-form");
    if (!form) return;

    const submit = form.querySelector("button[type='submit']");
    submit.dataset.label = submit.textContent;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      formUtils.clearErrors(form);
      formUtils.setMessage(form, "");

      const values = formUtils.values(form);
      const errors = {};
      if (!values.email) errors.email = "Email is required.";
      if (!values.password) errors.password = "Password is required.";
      if (Object.keys(errors).length > 0) {
        formUtils.showErrors(form, errors, "login");
        return;
      }

      formUtils.setSubmitting(form, true);
      try {
        await api.login(values);
        showDashboard();
      } catch (error) {
        formUtils.setMessage(form, error.payload?.message || "Login failed.");
      } finally {
        formUtils.setSubmitting(form, false);
      }
    });
  },
};
