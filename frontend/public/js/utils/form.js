window.formUtils = {
  values(form) {
    return Object.fromEntries(new FormData(form).entries());
  },

  clearErrors(form) {
    form.querySelectorAll(".field-error").forEach((node) => {
      node.textContent = "";
    });
    form.querySelectorAll("[aria-invalid]").forEach((node) => {
      node.removeAttribute("aria-invalid");
    });
  },

  showErrors(form, errors, prefix = "") {
    Object.entries(errors || {}).forEach(([field, message]) => {
      const key = prefix ? `${prefix}-${field}` : field;
      const node = form.querySelector(`[data-error-for="${key}"]`);
      const input = form.elements[field];
      if (node) node.textContent = message;
      if (input) input.setAttribute("aria-invalid", "true");
    });
  },

  setMessage(form, message, isSuccess = false) {
    const node = form.querySelector(".form-message");
    if (!node) return;
    node.textContent = message || "";
    node.classList.toggle("is-success", isSuccess);
  },

  setSubmitting(form, isSubmitting) {
    const button = form.querySelector("button[type='submit']");
    if (!button) return;
    button.disabled = isSubmitting;
    button.textContent = isSubmitting ? "Please wait..." : button.dataset.label;
  },
};
