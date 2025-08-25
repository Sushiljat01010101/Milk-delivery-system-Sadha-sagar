import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    updateDoc,
    deleteDoc,
    doc, 
    getDocs, 
    query, 
    where, 
    orderBy,
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

class PaymentManager {
    constructor() {
        this.customers = [];
        this.deliveries = [];
        this.payments = [];
        this.currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        this.filteredPayments = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setCurrentMonth();
        this.loadData();
    }

    setupEventListeners() {
        // Month selector
        const monthInput = document.getElementById('payment-month');
        if (monthInput) {
            monthInput.addEventListener('change', this.handleMonthChange.bind(this));
        }

        // Refresh button
        const refreshBtn = document.getElementById('refresh-payments');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', this.loadData.bind(this));
        }

        // Payment status filter
        const statusFilter = document.getElementById('payment-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', this.applyFilters.bind(this));
        }

        // Search input
        const searchInput = document.getElementById('payment-search');
        if (searchInput) {
            searchInput.addEventListener('input', this.applyFilters.bind(this));
        }

        // Payment reminders button
        const reminderBtn = document.getElementById('send-payment-reminders');
        if (reminderBtn) {
            reminderBtn.addEventListener('click', this.sendPaymentReminders.bind(this));
        }
    }

    setCurrentMonth() {
        const monthInput = document.getElementById('payment-month');
        if (monthInput) {
            monthInput.value = this.currentMonth;
        }
    }

    handleMonthChange(e) {
        this.currentMonth = e.target.value;
        this.loadData();
    }

    async loadData() {
        try {
            this.showLoading(true);
            await Promise.all([
                this.loadCustomers(),
                this.loadDeliveries(),
                this.loadPayments()
            ]);
            this.calculatePaymentData();
            this.applyFilters();
        } catch (error) {
            console.error('Error loading payment data:', error);
            this.showError('Failed to load payment data');
        } finally {
            this.showLoading(false);
        }
    }

    async loadCustomers() {
        try {
            const customersRef = collection(db, 'customers');
            const q = query(customersRef, orderBy('name'));
            const snapshot = await getDocs(q);
            
            this.customers = [];
            snapshot.forEach((doc) => {
                this.customers.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    }

    async loadDeliveries() {
        try {
            const deliveriesRef = collection(db, 'deliveries');
            const startDate = `${this.currentMonth}-01`;
            const endDate = `${this.currentMonth}-31`;
            
            const q = query(
                deliveriesRef,
                where('date', '>=', startDate),
                where('date', '<=', endDate)
            );
            
            const snapshot = await getDocs(q);
            
            this.deliveries = [];
            snapshot.forEach((doc) => {
                this.deliveries.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
        } catch (error) {
            console.error('Error loading deliveries:', error);
        }
    }

    async loadPayments() {
        try {
            const paymentsRef = collection(db, 'payments');
            const q = query(
                paymentsRef,
                where('month', '==', this.currentMonth)
            );
            
            const snapshot = await getDocs(q);
            
            this.payments = [];
            snapshot.forEach((doc) => {
                this.payments.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
        } catch (error) {
            console.error('Error loading payments:', error);
        }
    }

    calculatePaymentData() {
        this.paymentData = [];
        
        this.customers.forEach(customer => {
            // Get customer's deliveries for the month
            const customerDeliveries = this.deliveries.filter(d => d.customer_id === customer.id);
            
            // Calculate totals
            const totalDelivered = customerDeliveries
                .filter(d => d.status === 'delivered')
                .reduce((sum, d) => sum + d.qty, 0);
            
            const totalAmount = customerDeliveries
                .filter(d => d.status === 'delivered')
                .reduce((sum, d) => sum + d.amount, 0);
            
            const daysSkipped = customerDeliveries
                .filter(d => d.status === 'skipped').length;
            
            const daysDelivered = customerDeliveries
                .filter(d => d.status === 'delivered').length;
            
            // Get payment info
            const payment = this.payments.find(p => p.customer_id === customer.id);
            const paidAmount = payment ? payment.paid_amount : 0;
            const paymentStatus = this.getPaymentStatus(totalAmount, paidAmount);
            
            this.paymentData.push({
                customer: customer,
                totalMilk: totalDelivered,
                totalAmount: totalAmount,
                paidAmount: paidAmount,
                balanceAmount: totalAmount - paidAmount,
                daysDelivered: daysDelivered,
                daysSkipped: daysSkipped,
                paymentStatus: paymentStatus,
                paymentDate: payment ? payment.payment_date : null,
                paymentId: payment ? payment.id : null
            });
        });
        
        this.updateStats();
    }

    getPaymentStatus(totalAmount, paidAmount) {
        if (paidAmount === 0) return 'pending';
        if (paidAmount >= totalAmount) return 'paid';
        return 'partial';
    }

    updateStats() {
        const totalRevenue = this.paymentData.reduce((sum, data) => sum + data.totalAmount, 0);
        const totalPaid = this.paymentData.reduce((sum, data) => sum + data.paidAmount, 0);
        const paidCustomers = this.paymentData.filter(data => data.paymentStatus === 'paid').length;
        const pendingPayments = this.paymentData.filter(data => data.paymentStatus === 'pending').length;
        const totalMilk = this.paymentData.reduce((sum, data) => sum + data.totalMilk, 0);

        document.getElementById('total-monthly-revenue').textContent = `₹${totalRevenue}`;
        document.getElementById('paid-customers').textContent = paidCustomers;
        document.getElementById('pending-payments').textContent = pendingPayments;
        document.getElementById('total-milk-delivered').textContent = `${totalMilk}L`;
    }

    applyFilters() {
        const searchTerm = document.getElementById('payment-search')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('payment-status-filter')?.value || '';
        
        this.filteredPayments = this.paymentData.filter(data => {
            const matchesSearch = data.customer.name.toLowerCase().includes(searchTerm) ||
                                data.customer.phone.includes(searchTerm);
            const matchesStatus = !statusFilter || data.paymentStatus === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
        
        this.renderPaymentTable();
    }

    renderPaymentTable() {
        const tableContainer = document.getElementById('payments-table');
        if (!tableContainer) return;

        if (this.filteredPayments.length === 0) {
            tableContainer.innerHTML = `
                <div class="empty-state">
                    <i data-feather="users"></i>
                    <h3>No payment data found</h3>
                    <p>No customers match the current filters.</p>
                </div>
            `;
            feather.replace();
            return;
        }

        const tableHTML = `
            <table class="payment-table">
                <thead>
                    <tr>
                        <th>Customer</th>
                        <th>Days Delivered</th>
                        <th>Days Skipped</th>
                        <th>Total Milk (L)</th>
                        <th>Total Amount</th>
                        <th>Paid Amount</th>
                        <th>Balance</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.filteredPayments.map(data => `
                        <tr class="payment-row">
                            <td>
                                <div class="customer-info">
                                    <div class="customer-name">${data.customer.name}</div>
                                    <div class="customer-phone">${data.customer.phone}</div>
                                </div>
                            </td>
                            <td>${data.daysDelivered}</td>
                            <td>${data.daysSkipped}</td>
                            <td>${data.totalMilk.toFixed(1)}</td>
                            <td>₹${data.totalAmount}</td>
                            <td>₹${data.paidAmount}</td>
                            <td>₹${data.balanceAmount}</td>
                            <td>
                                <span class="payment-status status-${data.paymentStatus}">
                                    ${data.paymentStatus.charAt(0).toUpperCase() + data.paymentStatus.slice(1)}
                                </span>
                            </td>
                            <td>
                                <div class="payment-actions">
                                    <button class="btn btn-primary btn-small" onclick="paymentManager.recordPayment('${data.customer.id}', ${data.totalAmount}, ${data.paidAmount})">
                                        <i data-feather="plus"></i>
                                        Record Payment
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        tableContainer.innerHTML = tableHTML;
        feather.replace();
    }

    async recordPayment(customerId, totalAmount, currentPaid) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;

        const balance = totalAmount - currentPaid;
        const amount = prompt(`Record payment for ${customer.name}\nBalance Amount: ₹${balance}\n\nEnter payment amount:`);
        
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            this.showError('Please enter a valid payment amount');
            return;
        }

        const paymentAmount = parseFloat(amount);
        const newPaidAmount = currentPaid + paymentAmount;

        try {
            this.showLoading(true);

            const paymentData = {
                customer_id: customerId,
                month: this.currentMonth,
                paid_amount: newPaidAmount,
                total_amount: totalAmount,
                payment_date: new Date().toISOString().split('T')[0],
                last_payment_amount: paymentAmount,
                updated_at: new Date().toISOString()
            };

            // Check if payment record exists
            const existingPayment = this.payments.find(p => p.customer_id === customerId);
            
            if (existingPayment) {
                // Update existing payment
                const paymentRef = doc(db, 'payments', existingPayment.id);
                await updateDoc(paymentRef, paymentData);
            } else {
                // Create new payment record
                paymentData.created_at = new Date().toISOString();
                await addDoc(collection(db, 'payments'), paymentData);
            }

            // Send payment recorded notification
            if (customer.tg_chat_id) {
                await this.sendPaymentRecordedNotification(customer, paymentAmount, newPaidAmount, totalAmount, this.currentMonth);
            }

            // Check if payment is now complete and send completion notification
            if (newPaidAmount >= totalAmount && customer.tg_chat_id) {
                await this.sendPaymentCompletionNotification(customer, totalAmount, this.currentMonth);
            }

            this.showSuccess(`Payment of ₹${paymentAmount} recorded for ${customer.name}`);
            await this.loadData(); // Refresh data

        } catch (error) {
            console.error('Error recording payment:', error);
            this.showError('Failed to record payment');
        } finally {
            this.showLoading(false);
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.toggle('active', show);
        }
    }

    showError(message) {
        if (window.app) {
            window.app.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }

    showSuccess(message) {
        if (window.app) {
            window.app.showNotification(message, 'success');
        } else {
            alert(message);
        }
    }

    async sendPaymentRecordedNotification(customer, paymentAmount, totalPaid, totalAmount, month) {
        if (!customer.tg_chat_id) {
            console.log('No Telegram chat ID for customer:', customer.name);
            return;
        }

        try {
            const monthName = new Date(month + '-01').toLocaleDateString('en-IN', { 
                month: 'long', 
                year: 'numeric' 
            });

            const balance = totalAmount - totalPaid;
            const status = balance <= 0 ? 'Paid' : `Balance: ₹${balance}`;

            const message = `🥛 SUDHA SAGAR DAIRY\n\n💰 ${customer.name}\n\n${monthName} का payment received!\n\n✅ Received: ₹${paymentAmount}\n📊 Total Paid: ₹${totalPaid}\n💸 Total Amount: ₹${totalAmount}\n📋 ${status}\n\nकोई भी query के लिए: 9413577474\n\nधन्यवाद! 🙏\n\n- SUDHA SAGAR DAIRY`;

            const TELEGRAM_BOT_TOKEN = '8091841977:AAHpSvX3OMAhoOzSy1cDMhaOZB0EUf1k3Bs';
            const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
            
            const response = await fetch(telegramUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: customer.tg_chat_id,
                    text: message,
                    parse_mode: 'HTML'
                })
            });

            if (response.ok) {
                console.log('Payment recorded notification sent to:', customer.name);
            } else {
                console.error('Failed to send payment recorded notification');
            }
        } catch (error) {
            console.error('Error sending payment recorded notification:', error);
        }
    }

    async sendPaymentCompletionNotification(customer, totalAmount, month) {
        if (!customer.tg_chat_id) {
            console.log('No Telegram chat ID for customer:', customer.name);
            return;
        }

        try {
            const monthName = new Date(month + '-01').toLocaleDateString('en-IN', { 
                month: 'long', 
                year: 'numeric' 
            });

            const message = `🥛 SUDHA SAGAR DAIRY\n\n🎉 ${customer.name}\n\nआपका ${monthName} का पूरा payment complete हो गया है!\n\n💰 Total Amount: ₹${totalAmount}\n✅ Status: Paid\n\nकोई भी query के लिए: 9413577474\n\nधन्यवाद! 🙏\n\n- SUDHA SAGAR DAIRY`;

            const TELEGRAM_BOT_TOKEN = '8091841977:AAHpSvX3OMAhoOzSy1cDMhaOZB0EUf1k3Bs';
            const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
            
            const response = await fetch(telegramUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: customer.tg_chat_id,
                    text: message,
                    parse_mode: 'HTML'
                })
            });

            if (response.ok) {
                console.log('Payment completion notification sent to:', customer.name);
            } else {
                console.error('Failed to send payment completion notification');
            }
        } catch (error) {
            console.error('Error sending payment completion notification:', error);
        }
    }

    async sendPaymentReminders() {
        if (!this.paymentData || this.paymentData.length === 0) {
            this.showError('No payment data available. Please refresh the data first.');
            return;
        }

        // Filter customers with pending or partial payments who have Telegram IDs
        const eligibleCustomers = this.paymentData.filter(data => 
            (data.paymentStatus === 'pending' || data.paymentStatus === 'partial') && 
            data.customer.tg_chat_id && 
            data.customer.tg_chat_id.trim() !== ''
        );

        if (eligibleCustomers.length === 0) {
            this.showError('No customers with pending/partial payments have Telegram Chat ID configured.');
            return;
        }

        // Confirm with admin
        const confirmMessage = `Send payment reminders to ${eligibleCustomers.length} customers with pending/partial payments?`;
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            this.showLoading(true);
            
            let successCount = 0;
            let failCount = 0;

            for (const data of eligibleCustomers) {
                try {
                    await this.sendPaymentReminderToCustomer(data);
                    successCount++;
                    console.log(`Payment reminder sent to ${data.customer.name}`);
                    
                    // Add delay between sends to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    failCount++;
                    console.error(`Failed to send reminder to ${data.customer.name}:`, error);
                }
            }

            // Show results
            if (failCount === 0) {
                this.showSuccess(`Payment reminders sent successfully to all ${successCount} customers!`);
            } else {
                this.showError(`Reminders sent: ${successCount} successful, ${failCount} failed`);
            }

        } catch (error) {
            console.error('Error sending payment reminders:', error);
            this.showError('Failed to send payment reminders');
        } finally {
            this.showLoading(false);
        }
    }

    async sendPaymentReminderToCustomer(paymentData) {
        const { customer, totalAmount, paidAmount, balanceAmount, daysDelivered, totalMilk } = paymentData;
        
        if (!customer.tg_chat_id) {
            throw new Error('No Telegram chat ID');
        }

        try {
            const monthName = new Date(this.currentMonth + '-01').toLocaleDateString('en-IN', { 
                month: 'long', 
                year: 'numeric' 
            });

            const statusText = paymentData.paymentStatus === 'pending' ? 'Payment Pending' : 'Partial Payment';
            const dueDateText = this.getPaymentDueDate();

            const message = `🥛 SUDHA SAGAR DAIRY

⚠️ Payment Reminder - ${customer.name}

📅 Month: ${monthName}
💸 Status: ${statusText}

📊 Payment Details:
• Total Amount: ₹${totalAmount}
• Paid Amount: ₹${paidAmount}
• Balance Due: ₹${balanceAmount}

📋 Service Details:
• Days Delivered: ${daysDelivered}
• Total Milk: ${totalMilk.toFixed(1)}L
• Rate: ₹${customer.rate}/L

⏰ Due Date: ${dueDateText}

कृपया जल्द से जल्द payment करें। धन्यवाद! 🙏

Payment के लिए contact करें: 9413577474
- SUDHA SAGAR DAIRY`;

            const TELEGRAM_BOT_TOKEN = '8091841977:AAHpSvX3OMAhoOzSy1cDMhaOZB0EUf1k3Bs';
            const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
            
            const response = await fetch(telegramUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: customer.tg_chat_id,
                    text: message,
                    parse_mode: 'HTML'
                })
            });

            if (!response.ok) {
                throw new Error(`Telegram API error: ${await response.text()}`);
            }

            return response.json();
        } catch (error) {
            throw new Error(`Failed to send reminder: ${error.message}`);
        }
    }

    getPaymentDueDate() {
        // Calculate due date (e.g., 5th of next month)
        const currentDate = new Date();
        const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 5);
        
        return nextMonth.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }

    formatDate(dateString) {
        if (!dateString) return 'Not set';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
}

// Create global payment manager instance
const paymentManager = new PaymentManager();
window.paymentManager = paymentManager;

export default paymentManager;