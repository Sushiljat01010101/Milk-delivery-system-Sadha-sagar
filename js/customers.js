import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    getDocs, 
    query, 
    orderBy, 
    onSnapshot,
    where 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

class CustomerManager {
    constructor() {
        this.customers = [];
        this.filteredCustomers = [];
        this.currentEditingId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadCustomers();
    }

    setupEventListeners() {
        // Add customer button
        const addCustomerBtn = document.getElementById('add-customer-btn');
        if (addCustomerBtn) {
            addCustomerBtn.addEventListener('click', () => this.openCustomerModal());
        }

        // Customer form
        const customerForm = document.getElementById('customer-form');
        if (customerForm) {
            customerForm.addEventListener('submit', this.handleCustomerSubmit.bind(this));
        }

        // Modal close buttons
        const closeModal = document.getElementById('close-modal');
        const cancelModal = document.getElementById('cancel-modal');
        if (closeModal) closeModal.addEventListener('click', () => this.closeCustomerModal());
        if (cancelModal) cancelModal.addEventListener('click', () => this.closeCustomerModal());

        // Search and filter
        const searchInput = document.getElementById('customer-search');
        const statusFilter = document.getElementById('status-filter');
        
        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearch.bind(this));
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', this.handleFilter.bind(this));
        }

        // Modal overlay click
        const modal = document.getElementById('customer-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeCustomerModal();
                }
            });
        }
    }

    async loadCustomers() {
        try {
            const customersRef = collection(db, 'customers');
            const q = query(customersRef, orderBy('name'));
            
            // Set up real-time listener
            onSnapshot(q, (snapshot) => {
                this.customers = [];
                snapshot.forEach((doc) => {
                    this.customers.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                this.applyFilters();
            });
        } catch (error) {
            console.error('Error loading customers:', error);
            this.showError('Failed to load customers');
        }
    }

    applyFilters() {
        const searchTerm = document.getElementById('customer-search')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('status-filter')?.value || '';

        this.filteredCustomers = this.customers.filter(customer => {
            const matchesSearch = customer.name.toLowerCase().includes(searchTerm) ||
                                customer.phone.includes(searchTerm);
            const matchesStatus = !statusFilter || customer.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });

        this.renderCustomers();
    }

    handleSearch() {
        this.applyFilters();
    }

    handleFilter() {
        this.applyFilters();
    }

    renderCustomers() {
        const customersGrid = document.getElementById('customers-grid');
        if (!customersGrid) return;

        if (this.filteredCustomers.length === 0) {
            customersGrid.innerHTML = `
                <div class="empty-state">
                    <i data-feather="users"></i>
                    <h3>No customers found</h3>
                    <p>Add your first customer to get started.</p>
                </div>
            `;
            feather.replace();
            return;
        }

        customersGrid.innerHTML = this.filteredCustomers.map(customer => `
            <div class="customer-card">
                <div class="customer-header">
                    <div class="customer-name">${customer.name}</div>
                    <span class="customer-status status-${customer.status}">
                        ${customer.status}
                    </span>
                </div>
                <div class="customer-details">
                    <div class="customer-detail">
                        <i data-feather="phone"></i>
                        <span>${customer.phone}</span>
                    </div>
                    <div class="customer-detail">
                        <i data-feather="droplet"></i>
                        <span>${customer.daily_qty}L daily</span>
                    </div>
                    <div class="customer-detail">
                        <i data-feather="dollar-sign"></i>
                        <span>₹${customer.rate}/L</span>
                    </div>
                    ${customer.address ? `
                        <div class="customer-detail">
                            <i data-feather="map-pin"></i>
                            <span>${customer.address}</span>
                        </div>
                    ` : ''}
                    ${customer.tg_chat_id ? `
                        <div class="customer-detail">
                            <i data-feather="send"></i>
                            <span>Telegram: ${customer.tg_chat_id}</span>
                        </div>
                    ` : ''}
                    ${customer.created_at ? `
                        <div class="customer-detail">
                            <i data-feather="calendar"></i>
                            <span>Added: ${this.formatDate(customer.created_at)}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="customer-actions">
                    <button class="btn btn-secondary btn-small" onclick="customerManager.editCustomer('${customer.id}')">
                        <i data-feather="edit"></i>
                        Edit
                    </button>
                    <button class="btn btn-danger btn-small" onclick="customerManager.deleteCustomer('${customer.id}')">
                        <i data-feather="trash-2"></i>
                        Delete
                    </button>
                </div>
            </div>
        `).join('');

        feather.replace();
    }

    openCustomerModal(customer = null) {
        const modal = document.getElementById('customer-modal');
        const modalTitle = document.getElementById('modal-title');
        const form = document.getElementById('customer-form');
        
        if (!modal || !modalTitle || !form) return;

        this.currentEditingId = customer ? customer.id : null;
        modalTitle.textContent = customer ? 'Edit Customer' : 'Add Customer';
        
        if (customer) {
            document.getElementById('customer-name').value = customer.name || '';
            document.getElementById('customer-phone').value = customer.phone || '';
            document.getElementById('customer-qty').value = customer.daily_qty || '';
            document.getElementById('customer-rate').value = customer.rate || '';
            document.getElementById('customer-address').value = customer.address || '';
            // Set added date field
            if (customer.created_at) {
                const date = new Date(customer.created_at);
                document.getElementById('customer-added-date').value = date.toISOString().split('T')[0];
            } else {
                document.getElementById('customer-added-date').value = '';
            }
            document.getElementById('customer-telegram').value = customer.tg_chat_id || '';
            document.getElementById('customer-status').value = customer.status || 'active';
        } else {
            form.reset();
            document.getElementById('customer-status').value = 'active';
            // Set today's date as default for new customers
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('customer-added-date').value = today;
        }

        modal.classList.add('active');
    }

    closeCustomerModal() {
        const modal = document.getElementById('customer-modal');
        if (modal) {
            modal.classList.remove('active');
        }
        this.currentEditingId = null;
    }

    async handleCustomerSubmit(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('customer-name').value.trim(),
            phone: document.getElementById('customer-phone').value.trim(),
            daily_qty: parseFloat(document.getElementById('customer-qty').value),
            rate: parseInt(document.getElementById('customer-rate').value),
            address: document.getElementById('customer-address').value.trim(),
            tg_chat_id: document.getElementById('customer-telegram').value.trim(),
            status: document.getElementById('customer-status').value,
            updated_at: new Date().toISOString()
        };

        // Handle custom added date
        const addedDateValue = document.getElementById('customer-added-date').value;
        if (addedDateValue) {
            formData.created_at = new Date(addedDateValue).toISOString();
        }

        // Validation
        if (!formData.name || !formData.phone || !formData.daily_qty || !formData.rate) {
            this.showError('Please fill in all required fields');
            return;
        }

        if (formData.daily_qty <= 0 || formData.rate <= 0) {
            this.showError('Quantity and rate must be positive numbers');
            return;
        }

        try {
            this.showLoading(true);

            if (this.currentEditingId) {
                // Update existing customer - don't overwrite created_at if not provided
                if (!formData.created_at) {
                    delete formData.created_at;
                }
                const customerRef = doc(db, 'customers', this.currentEditingId);
                await updateDoc(customerRef, formData);
                
                // Send update notification to Telegram
                if (formData.tg_chat_id) {
                    await this.sendUpdateNotification(formData);
                }
                
                this.showSuccess('Customer updated successfully!', 'success');
            } else {
                // Add new customer - use created_at from form or current date
                if (!formData.created_at) {
                    formData.created_at = new Date().toISOString();
                }
                await addDoc(collection(db, 'customers'), formData);
                
                // Send registration success notification to Telegram
                if (formData.tg_chat_id) {
                    await this.sendRegistrationNotification(formData);
                }
                
                this.showSuccess('Customer added successfully!', 'success');
            }

            this.closeCustomerModal();
        } catch (error) {
            console.error('Error saving customer:', error);
            this.showError('Failed to save customer');
        } finally {
            this.showLoading(false);
        }
    }

    editCustomer(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (customer) {
            this.openCustomerModal(customer);
        }
    }

    async deleteCustomer(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;

        if (!confirm(`Are you sure you want to delete ${customer.name}? This will permanently delete all their data including deliveries and payments. This action cannot be undone.`)) {
            return;
        }

        try {
            this.showLoading(true);
            
            // Delete all deliveries for this customer
            const deliveriesRef = collection(db, 'deliveries');
            const deliveriesQuery = query(deliveriesRef, where('customer_id', '==', customerId));
            const deliveriesSnapshot = await getDocs(deliveriesQuery);
            
            const deliveryDeletePromises = [];
            deliveriesSnapshot.forEach((deliveryDoc) => {
                deliveryDeletePromises.push(deleteDoc(doc(db, 'deliveries', deliveryDoc.id)));
            });
            
            // Delete all payments for this customer
            const paymentsRef = collection(db, 'payments');
            const paymentsQuery = query(paymentsRef, where('customer_id', '==', customerId));
            const paymentsSnapshot = await getDocs(paymentsQuery);
            
            const paymentDeletePromises = [];
            paymentsSnapshot.forEach((paymentDoc) => {
                paymentDeletePromises.push(deleteDoc(doc(db, 'payments', paymentDoc.id)));
            });
            
            // Execute all deletions in parallel
            await Promise.all([
                ...deliveryDeletePromises,
                ...paymentDeletePromises
            ]);
            
            // Finally delete the customer record
            await deleteDoc(doc(db, 'customers', customerId));
            
            console.log(`Successfully deleted customer ${customer.name} and all related data`);
            
        } catch (error) {
            console.error('Error deleting customer and related data:', error);
            this.showError('Failed to delete customer and related data');
        } finally {
            this.showLoading(false);
        }
    }

    getCustomers() {
        return this.customers;
    }

    getActiveCustomers() {
        return this.customers.filter(customer => customer.status === 'active');
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.toggle('active', show);
        }
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconName = type === 'success' ? 'check-circle' : 
                        type === 'error' ? 'x-circle' : 
                        type === 'warning' ? 'alert-triangle' : 'info';
        
        toast.innerHTML = `
            <i class="toast-icon" data-feather="${iconName}"></i>
            <div class="toast-content">${message}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i data-feather="x"></i>
            </button>
        `;
        
        toastContainer.appendChild(toast);
        
        // Replace feather icons
        feather.replace();
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 4000);
    }

    async sendRegistrationNotification(customerData) {
        if (!customerData.tg_chat_id) {
            console.log('No Telegram chat ID for customer:', customerData.name);
            return;
        }

        try {
            const message = `🥛 SUDHA SAGAR DAIRY

🎉 नमस्कार ${customerData.name}!

आपका registration हमारे SUDHA SAGAR DAIRY में हो गया है! ✅

📋 आपकी Details:
👤 नाम: ${customerData.name}
📱 मोबाइल: ${customerData.phone}
🥛 Daily Quantity: ${customerData.daily_qty}L
💰 Rate: ₹${customerData.rate}/L
${customerData.address ? `📍 Address: ${customerData.address}
` : ''}📊 Status: ${customerData.status}
📅 Registration Date: ${this.formatDate(customerData.created_at)}

🌟 SUDHA SAGAR DAIRY की तरफ से आपका हार्दिक स्वागत है!

✨ हमारी Services:
• Fresh & Pure Milk Daily
• Home Delivery
• Flexible Timing
• Quality Guaranteed

📞 किसी भी सवाल के लिए संपर्क करें: 9413577474

शुक्रिया! 🙏

- Team SUDHA SAGAR DAIRY`;

            const TELEGRAM_BOT_TOKEN = '8414963882:AAHAxN6adnkt5HKV1yXhpGZVpwGv3rNd2yQ';
            const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
            
            const response = await fetch(telegramUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: customerData.tg_chat_id,
                    text: message,
                    parse_mode: 'HTML'
                })
            });

            if (response.ok) {
                console.log(`Registration notification sent to ${customerData.name} (${customerData.tg_chat_id})`);
            } else {
                console.error('Telegram API error:', await response.text());
            }
        } catch (error) {
            console.error('Error sending registration notification:', error);
        }
    }

    async sendUpdateNotification(customerData) {
        if (!customerData.tg_chat_id) {
            console.log('No Telegram chat ID for customer:', customerData.name);
            return;
        }

        try {
            const message = `🔄 SUDHA SAGAR DAIRY - Details Updated

📢 नमस्कार ${customerData.name}!

आपकी details successfully update हो गई हैं! ✅

📋 Updated Details:
👤 नाम: ${customerData.name}
📱 मोबाइल: ${customerData.phone}
🥛 Daily Quantity: ${customerData.daily_qty}L
💰 Rate: ₹${customerData.rate}/L
${customerData.address ? `📍 Address: ${customerData.address}\n` : ''}📊 Status: ${customerData.status}
🕒 Last Updated: ${this.formatDate(customerData.updated_at)}

✨ यदि कोई भी details गलत है या कोई समस्या है तो कृपया तुरंत संपर्क करें।

📞 Contact: 9413577474

धन्यवाद! 🙏

- Team SUDHA SAGAR DAIRY`;

            const TELEGRAM_BOT_TOKEN = '8414963882:AAHAxN6adnkt5HKV1yXhpGZVpwGv3rNd2yQ';
            const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
            
            const response = await fetch(telegramUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: customerData.tg_chat_id,
                    text: message,
                    parse_mode: 'HTML'
                })
            });

            if (response.ok) {
                console.log(`Update notification sent to ${customerData.name} (${customerData.tg_chat_id})`);
            } else {
                console.error('Telegram API error:', await response.text());
            }
        } catch (error) {
            console.error('Error sending update notification:', error);
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
}

// Create global customer manager instance
const customerManager = new CustomerManager();
window.customerManager = customerManager;

export default customerManager;
