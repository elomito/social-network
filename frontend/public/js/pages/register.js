window.registerPage = {
  init({ showLogin }) {
    const form = document.querySelector("#register-form");
    if (!form) return;

    const passwordInput = form.elements.password;
    const submit = form.querySelector("button[type='submit']");
    submit.dataset.label = submit.textContent;

    passwordInput.addEventListener("input", () => {
      this.updatePasswordRules(passwordInput.value);
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      formUtils.clearErrors(form);
      formUtils.setMessage(form, "");

      const values = formUtils.values(form);
      const errors = this.validate(values);
      if (Object.keys(errors).length > 0) {
        formUtils.showErrors(form, errors);
        formUtils.setMessage(form, "Please fix the highlighted fields.");
        return;
      }

      formUtils.setSubmitting(form, true);
      try {
        await api.register({
          ...values,
          is_public: form.elements.is_public.checked,
        });
        form.reset();
        this.updatePasswordRules("");
        formUtils.setMessage(form, "Account created. You can log in now.", true);
        window.setTimeout(() => showLogin(), 900);
      } catch (error) {
        const payload = error.payload || {};
        formUtils.showErrors(form, payload.errors || {});
        formUtils.setMessage(form, payload.message || "Registration failed.");
      } finally {
        formUtils.setSubmitting(form, false);
      }
    });
  },

  validate(values) {
    const errors = {};
    if (!values.first_name.trim()) errors.first_name = "First name is required.";
    if (!values.last_name.trim()) errors.last_name = "Last name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email || "")) {
      errors.email = "Enter a valid email address.";
    }
    if (!values.date_of_birth) errors.date_of_birth = "Date of birth is required.";

    const passwordIssues = [];
    if ((values.password || "").length < 8) passwordIssues.push("at least 8 characters");
    if (!/[A-Z]/.test(values.password || "")) passwordIssues.push("an uppercase letter");
    if (!/[a-z]/.test(values.password || "")) passwordIssues.push("a lowercase letter");
    if (!/[0-9]/.test(values.password || "")) passwordIssues.push("a number");
    if (passwordIssues.length > 0) {
      errors.password = `Password must include ${passwordIssues.join(", ")}.`;
    }

    return errors;
  },

  updatePasswordRules(password) {
    const rules = {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
    };

    Object.entries(rules).forEach(([rule, isValid]) => {
      document.querySelector(`[data-rule="${rule}"]`)?.classList.toggle("is-valid", isValid);
    });
  },
};
