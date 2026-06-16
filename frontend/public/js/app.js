import { LoginPage } from './pages/login.js';

const appRoot = document.getElementById('app');

function router() {
    const hash = window.location.hash || '#login';

    if (hash === '#login') {
        appRoot.innerHTML = LoginPage.render();
        LoginPage.init();
    } else if (hash === '#feed') {
        appRoot.innerHTML = '<h2 style="text-align:center; margin-top:50px;">🌐 News Feed Dashboard</h2>';
    } else {
        appRoot.innerHTML = '<h2 style="text-align:center; margin-top:50px;">404 - Page Not Found</h2>';
    }
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);
