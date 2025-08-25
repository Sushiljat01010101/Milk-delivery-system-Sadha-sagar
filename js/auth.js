import { auth } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Listen for auth state changes
        onAuthStateChanged(auth, (user) => {
            this.currentUser = user;
            this.handleAuthStateChange(user);
        });

        // Set up login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Set up logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('login-error');
        
        try {
            this.showLoading(true);
            await signInWithEmailAndPassword(auth, email, password);
            errorElement.textContent = '';
        } catch (error) {
            console.error('Login error:', error);
            errorElement.textContent = this.getErrorMessage(error.code);
        } finally {
            this.showLoading(false);
        }
    }

    async handleLogout() {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    handleAuthStateChange(user) {
        const loginScreen = document.getElementById('login-screen');
        const appContainer = document.getElementById('app');
        const adminEmail = document.getElementById('admin-email');

        if (user) {
            // User is signed in
            loginScreen.style.display = 'none';
            appContainer.style.display = 'grid';
            if (adminEmail) {
                adminEmail.textContent = user.email;
            }
            
            // Initialize the app
            if (window.app && typeof window.app.init === 'function') {
                window.app.init();
            }
        } else {
            // User is signed out
            loginScreen.style.display = 'flex';
            appContainer.style.display = 'none';
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.toggle('active', show);
        }
    }

    getErrorMessage(errorCode) {
        switch (errorCode) {
            case 'auth/user-not-found':
                return 'No user found with this email address.';
            case 'auth/wrong-password':
                return 'Incorrect password.';
            case 'auth/invalid-email':
                return 'Invalid email address.';
            case 'auth/user-disabled':
                return 'This account has been disabled.';
            case 'auth/too-many-requests':
                return 'Too many failed login attempts. Please try again later.';
            default:
                return 'Login failed. Please check your credentials and try again.';
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }
}

// Create global auth manager instance
window.authManager = new AuthManager();

export default window.authManager;
