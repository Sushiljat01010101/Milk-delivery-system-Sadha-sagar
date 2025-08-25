import { db, functions } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    query, 
    where, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

class ReportsManager {
    constructor() {
        this.customers = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadCustomers();
        this.setCurrentMonth();
    }

    setupEventListeners() {
        // Generate report button
        const generateBtn = document.getElementById('generate-report-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', this.generateReport.bind(this));
        }

        // Send all reports button
        const sendAllBtn = document.getElementById('send-all-reports-btn');
        if (sendAllBtn) {
            sendAllBtn.addEventListener('click', this.sendAllReports.bind(this));
        }
    }

    setCurrentMonth() {
        const monthInput = document.getElementById('report-month');
        if (monthInput) {
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            monthInput.value = currentMonth;
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

            this.populateCustomerDropdown();
        } catch (error) {
            console.error('Error loading customers:', error);
            this.showError('Failed to load customers');
        }
    }

    populateCustomerDropdown() {
        const customerSelect = document.getElementById('report-customer');
        if (!customerSelect) return;

        customerSelect.innerHTML = '<option value="">Select a customer</option>';
        
        this.customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.name;
            customerSelect.appendChild(option);
        });
    }

    async generateReport() {
        const customerId = document.getElementById('report-customer').value;
        const monthInput = document.getElementById('report-month').value;

        if (!customerId || !monthInput) {
            this.showError('Please select both customer and month');
            return;
        }

        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) {
            this.showError('Customer not found');
            return;
        }

        try {
            this.showLoading(true);

            // Parse month input (YYYY-MM)
            const [year, month] = monthInput.split('-');
            const startDate = `${year}-${month}-01`;
            const endDate = `${year}-${month}-${this.getLastDayOfMonth(parseInt(year), parseInt(month))}`;

            // Fetch deliveries for the month
            const deliveriesRef = collection(db, 'deliveries');
            const q = query(
                deliveriesRef,
                where('customer_id', '==', customerId)
            );

            const snapshot = await getDocs(q);
            const deliveries = [];
            snapshot.forEach((doc) => {
                const delivery = doc.data();
                // Filter by date range manually
                if (delivery.date >= startDate && delivery.date <= endDate) {
                    deliveries.push(delivery);
                }
            });
            
            // Sort by date
            deliveries.sort((a, b) => a.date.localeCompare(b.date));

            // Generate report
            const report = this.createReportText(customer, deliveries, monthInput);
            
            // Show preview
            this.showReportPreview(report);

            // Send via Telegram
            if (customer.tg_chat_id) {
                await this.sendReportViaTelegram(customer.tg_chat_id, report);
                this.showSuccess('Report generated and sent via Telegram successfully!');
            } else {
                this.showError('Report generated but customer has no Telegram chat ID for sending');
            }

        } catch (error) {
            console.error('Error generating report:', error);
            this.showError('Failed to generate report');
        } finally {
            this.showLoading(false);
        }
    }

    createReportText(customer, deliveries, monthInput) {
        const [year, month] = monthInput.split('-');
        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
        
        const deliveredDeliveries = deliveries.filter(d => d.status === 'delivered');
        const skippedDeliveries = deliveries.filter(d => d.status === 'skipped');
        
        const totalDays = deliveredDeliveries.length;
        const totalQuantity = deliveredDeliveries.reduce((sum, d) => sum + d.qty, 0);
        const totalAmount = deliveredDeliveries.reduce((sum, d) => sum + d.amount, 0);
        const skippedDays = skippedDeliveries.length;

        let report = `🥛 SUDHA SAGAR DAIRY\n\n📄 ${monthName} ${year} Report – ${customer.name}\n\n`;
        report += `📊 Summary:\n`;
        report += `• कुल दिन Delivered: ${totalDays}\n`;
        report += `• कुल दिन Skipped: ${skippedDays}\n`;
        report += `• Total Quantity: ${totalQuantity.toFixed(1)} L\n`;
        report += `• Total Amount: ₹${totalAmount}\n\n`;

        if (deliveredDeliveries.length > 0) {
            report += `📅 Delivery Details:\n`;
            deliveredDeliveries.forEach(delivery => {
                const date = new Date(delivery.date).toLocaleDateString('en-IN');
                report += `${date}: ${delivery.qty}L - ₹${delivery.amount}\n`;
            });
        }

        if (skippedDeliveries.length > 0) {
            report += `\n❌ Skipped Days:\n`;
            skippedDeliveries.forEach(delivery => {
                const date = new Date(delivery.date).toLocaleDateString('en-IN');
                report += `${date}: Skipped\n`;
            });
        }

        report += `\nकोई भी query के लिए: 9413577474\n\nधन्यवाद! 🙏\n\n- SUDHA SAGAR DAIRY`;

        return report;
    }

    showReportPreview(reportText) {
        const previewDiv = document.getElementById('report-preview');
        const contentDiv = document.getElementById('report-content');
        
        if (previewDiv && contentDiv) {
            contentDiv.textContent = reportText;
            previewDiv.style.display = 'block';
        }
    }

    async sendReportViaTelegram(chatId, reportText) {
        try {
            const TELEGRAM_BOT_TOKEN = '8091841977:AAHpSvX3OMAhoOzSy1cDMhaOZB0EUf1k3Bs';
            const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
            
            const response = await fetch(telegramUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: reportText,
                    parse_mode: 'HTML'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Telegram API error:', errorText);
                throw new Error('Failed to send report via Telegram');
            }

            console.log(`Report sent successfully to chat ID: ${chatId}`);
        } catch (error) {
            console.error('Error sending report via Telegram:', error);
            throw error;
        }
    }

    getLastDayOfMonth(year, month) {
        return new Date(year, month, 0).getDate();
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.toggle('active', show);
        }
    }

    showError(message) {
        alert(`Error: ${message}`);
    }

    async sendAllReports() {
        const monthInput = document.getElementById('report-month').value;

        if (!monthInput) {
            this.showError('Please select a month');
            return;
        }

        if (!confirm('Send reports to all customers with Telegram Chat ID?')) {
            return;
        }

        try {
            this.showLoading(true);

            // Get customers with Telegram Chat ID
            const customersWithTelegram = this.customers.filter(customer => 
                customer.tg_chat_id && customer.tg_chat_id.trim() !== ''
            );

            if (customersWithTelegram.length === 0) {
                this.showError('No customers have Telegram Chat ID');
                return;
            }

            let successCount = 0;
            let failCount = 0;

            // Parse month input (YYYY-MM)
            const [year, month] = monthInput.split('-');
            const startDate = `${year}-${month}-01`;
            const endDate = `${year}-${month}-${this.getLastDayOfMonth(parseInt(year), parseInt(month))}`;

            for (const customer of customersWithTelegram) {
                try {
                    // Fetch deliveries for this customer and month
                    const deliveriesRef = collection(db, 'deliveries');
                    const q = query(
                        deliveriesRef,
                        where('customer_id', '==', customer.id)
                    );

                    const snapshot = await getDocs(q);
                    const deliveries = [];
                    snapshot.forEach((doc) => {
                        const delivery = doc.data();
                        // Filter by date range manually
                        if (delivery.date >= startDate && delivery.date <= endDate) {
                            deliveries.push(delivery);
                        }
                    });

                    // Generate report for this customer
                    const report = this.createReportText(customer, deliveries, monthInput);
                    
                    // Send via Telegram
                    await this.sendReportViaTelegram(customer.tg_chat_id, report);
                    
                    successCount++;
                    console.log(`Report sent to ${customer.name}`);

                } catch (error) {
                    console.error(`Failed to send report to ${customer.name}:`, error);
                    failCount++;
                }

                // Small delay between sends to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            const totalCustomers = customersWithTelegram.length;
            let message = `Reports sent to ${successCount}/${totalCustomers} customers`;
            
            if (failCount > 0) {
                message += `. ${failCount} failed.`;
                this.showError(message);
            } else {
                this.showSuccess(message);
            }

        } catch (error) {
            console.error('Error sending all reports:', error);
            this.showError('Failed to send reports to all customers');
        } finally {
            this.showLoading(false);
        }
    }

    showSuccess(message) {
        alert(`Success: ${message}`);
    }
}

// Create global reports manager instance
const reportsManager = new ReportsManager();
window.reportsManager = reportsManager;

export default reportsManager;
