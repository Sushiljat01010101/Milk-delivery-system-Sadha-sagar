import authManager from './auth.js';
import customerManager from './customers.js';
import deliveryManager from './deliveries.js';
import reportsManager from './reports.js';
import dashboardManager from './dashboard.js';
import paymentManager from './payments.js';

class App {
    constructor() {
        this.currentView = 'dashboard';
        this.managers = {
            auth: authManager,
            customers: customerManager,
            deliveries: deliveryManager,
            reports: reportsManager,
            dashboard: dashboardManager,
            payments: paymentManager
        };
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupComponents();
            });
        } else {
            this.setupComponents();
        }
    }

    setupComponents() {
        this.setupNavigation();
        this.setupMobileMenu();
        this.setupGlobalErrorHandling();
        
        // Set initial view
        this.showView('dashboard');
        
        // Auto-refresh dashboard every 5 minutes
        setInterval(() => {
            if (this.currentView === 'dashboard' && authManager.isAuthenticated()) {
                dashboardManager.refresh();
            }
        }, 5 * 60 * 1000);
    }

    setupNavigation() {
        // Wait a bit for all components to be ready
        setTimeout(() => {
            const navItems = document.querySelectorAll('.nav-item');
            console.log('Setting up navigation for', navItems.length, 'items');
            
            navItems.forEach((item, index) => {
                // Remove any existing listeners first
                item.replaceWith(item.cloneNode(true));
            });

            // Re-query after cloning
            const freshNavItems = document.querySelectorAll('.nav-item');
            
            freshNavItems.forEach((item, index) => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const view = e.currentTarget.dataset.view;
                    console.log('Navigation clicked:', view);
                    
                    if (view) {
                        this.showView(view);
                        // Close mobile menu on item click
                        this.closeMobileMenu();
                    }
                });
                
                // Also handle touch events for mobile
                item.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    const view = e.currentTarget.dataset.view;
                    if (view) {
                        this.showView(view);
                        this.closeMobileMenu();
                    }
                });
            });
        }, 100);
    }

    setupMobileMenu() {
        setTimeout(() => {
            const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
            const navigation = document.getElementById('navigation');
            const navOverlay = document.getElementById('nav-overlay');

            console.log('Setting up mobile menu:', {
                toggle: !!mobileMenuToggle,
                nav: !!navigation,
                overlay: !!navOverlay
            });

            if (mobileMenuToggle && navigation && navOverlay) {
                // Clear any existing listeners
                const newToggle = mobileMenuToggle.cloneNode(true);
                mobileMenuToggle.parentNode.replaceChild(newToggle, mobileMenuToggle);
                
                const newOverlay = navOverlay.cloneNode(true);
                navOverlay.parentNode.replaceChild(newOverlay, navOverlay);

                // Re-get elements after replacement
                const freshToggle = document.getElementById('mobile-menu-toggle');
                const freshOverlay = document.getElementById('nav-overlay');

                // Toggle menu on hamburger click
                freshToggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Mobile menu toggle clicked');
                    this.toggleMobileMenu();
                });

                // Also handle touch for mobile
                freshToggle.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    this.toggleMobileMenu();
                });

                // Close menu on overlay click
                freshOverlay.addEventListener('click', (e) => {
                    console.log('Overlay clicked');
                    this.closeMobileMenu();
                });

                // Close menu on escape key
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        this.closeMobileMenu();
                    }
                });
            }
        }, 150);
    }

    toggleMobileMenu() {
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const navigation = document.getElementById('navigation');
        const navOverlay = document.getElementById('nav-overlay');

        console.log('Toggle mobile menu called');

        if (mobileMenuToggle && navigation && navOverlay) {
            const isActive = navigation.classList.contains('active');
            console.log('Menu is currently active:', isActive);
            
            if (isActive) {
                this.closeMobileMenu();
            } else {
                this.openMobileMenu();
            }
        } else {
            console.error('Mobile menu elements not found:', {
                toggle: !!mobileMenuToggle,
                nav: !!navigation,
                overlay: !!navOverlay
            });
        }
    }

    openMobileMenu() {
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const navigation = document.getElementById('navigation');
        const navOverlay = document.getElementById('nav-overlay');

        if (mobileMenuToggle && navigation && navOverlay) {
            mobileMenuToggle.classList.add('active');
            navigation.classList.add('active');
            navOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeMobileMenu() {
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const navigation = document.getElementById('navigation');
        const navOverlay = document.getElementById('nav-overlay');

        if (mobileMenuToggle && navigation && navOverlay) {
            mobileMenuToggle.classList.remove('active');
            navigation.classList.remove('active');
            navOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    showView(viewName) {
        console.log('Showing view:', viewName);
        
        // Update navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const isActive = item.dataset.view === viewName;
            item.classList.toggle('active', isActive);
        });

        // Update view content
        const views = document.querySelectorAll('.view');
        views.forEach(view => {
            const isActive = view.id === `${viewName}-view`;
            view.classList.toggle('active', isActive);
            view.style.display = isActive ? 'block' : 'none';
        });

        this.currentView = viewName;

        // Trigger view-specific actions
        this.onViewChange(viewName);
    }

    onViewChange(viewName) {
        switch (viewName) {
            case 'dashboard':
                if (dashboardManager) {
                    dashboardManager.refresh();
                }
                break;
            case 'customers':
                // Customers are loaded automatically via real-time listeners
                break;
            case 'deliveries':
                if (deliveryManager) {
                    deliveryManager.loadDeliveries();
                }
                break;
            case 'reports':
                // Reports are initialized automatically
                break;
            case 'payments':
                if (paymentManager) {
                    paymentManager.loadData();
                }
                break;
            case 'customer-details':
                // Ensure customer details is properly initialized
                setTimeout(() => {
                    if (window.customerDetailsManager) {
                        window.customerDetailsManager.init();
                    }
                }, 100);
                break;
            case 'broadcast':
                if (window.broadcastManager) {
                    window.broadcastManager.refresh();
                }
                break;
        }
    }

    setupGlobalErrorHandling() {
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.showNotification('An unexpected error occurred. Please refresh the page.', 'error');
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            this.showNotification('An unexpected error occurred. Please try again.', 'error');
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // Add styles if not already added
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    max-width: 400px;
                    padding: 1rem;
                    border-radius: 8px;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    z-index: 3000;
                    animation: slideIn 0.3s ease-out;
                }
                .notification-info {
                    background-color: #3b82f6;
                    color: white;
                }
                .notification-error {
                    background-color: #ef4444;
                    color: white;
                }
                .notification-success {
                    background-color: #10b981;
                    color: white;
                }
                .notification-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 1rem;
                }
                .notification-close {
                    background: none;
                    border: none;
                    color: inherit;
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                }
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(styles);
        }

        // Add to page
        document.body.appendChild(notification);

        // Set up close functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // Utility methods for managers to use
    static showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.toggle('active', show);
        }
    }

    static showError(message) {
        app.showNotification(message, 'error');
    }

    static showSuccess(message) {
        app.showNotification(message, 'success');
    }

    static showInfo(message) {
        app.showNotification(message, 'info');
    }
}

// Create global app instance
const app = new App();
window.app = app;

// Export for other modules
export default app;
