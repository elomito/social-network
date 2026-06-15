export const LoginPage = {
    // 1. The HTML Layout (Login Form UI)
    render: () => {
        return `
            <div style="max-width: 400px; margin: 60px auto; padding: 30px; border: 1px solid #ddd; border-radius: 8px; font-family: sans-serif; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="text-align: center; margin-bottom: 20px; color: #333;">Welcome Back</h2>
                
                <div id="global-error" style="color: #dc3545; background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; border-radius: 4px; margin-bottom: 15px; display: none; font-size: 14px; font-weight: bold;"></div>

                <form id="login-form" novalidate>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 60px; color: #555;">Email Address</label>
                        <input type="email" id="email" name="email" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                        <small id="email-error" style="color: #dc3545; display: block; margin-top: 5px; font-size: 12px;"></small>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 60px; color: #555;">Password</label>
                        <input type="password" id="password" name="password" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                        <small id="password-error" style="color: #dc3545; display: block; margin-top: 5px; font-size: 12px;"></small>
                    </div>

                    <button type="submit" id="submit-btn" style="width: 100%; padding: 12px; background-color: #007bff; color: white; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; font-weight: bold;">
                        Log In
                    </button>
                </form>
            </div>
        `;
    },
// 2. The Logic Engine (Validation & API Integration)
    init: () => {
        const form = document.getElementById('login-form');
        const globalError = document.getElementById('global-error');
        const submitBtn = document.getElementById('submit-btn');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Reset error states
            globalError.style.display = 'none';
            document.getElementById('email-error').textContent = '';
            document.getElementById('password-error').textContent = '';

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
/ --- Client-side Validation ---
            let hasError = false;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!email) {
                document.getElementById('email-error').textContent = 'Email is strictly required.';
                hasError = true;
            } else if (!emailRegex.test(email)) {
                document.getElementById('email-error').textContent = 'Please provide a valid email address.';
                hasError = true;
            }

            if (!password) {
                document.getElementById('password-error').textContent = 'Password cannot be empty.';
                hasError = true;
            }

            if (hasError) return; // Exit if validation fails
