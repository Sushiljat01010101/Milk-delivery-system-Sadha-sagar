import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    query, 
    where, 
    orderBy,
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

class DashboardManager {
    constructor() {
        this.charts = {};
        this.stats = {
            totalCustomers: 0,
            deliveredToday: 0,
            skippedToday: 0,
            pendingToday: 0,
            totalMilkToday: 0,
            totalRevenueToday: 0
        };
        this.init();
    }

    init() {
        this.updateCurrentDate();
        this.loadDashboardData();
        this.initializeCharts();
    }

    updateCurrentDate() {
        const dateElement = document.getElementById('current-date');
        if (dateElement) {
            const today = new Date();
            dateElement.textContent = today.toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }

    async loadDashboardData() {
        try {
            await Promise.all([
                this.loadStats(),
                this.loadChartData()
            ]);
            this.updateStatsDisplay();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    async loadStats() {
        const today = new Date().toISOString().split('T')[0];

        try {
            // Load total customers
            const customersRef = collection(db, 'customers');
            const activeCustomersQuery = query(customersRef, where('status', '==', 'active'));
            const customersSnapshot = await getDocs(activeCustomersQuery);
            this.stats.totalCustomers = customersSnapshot.size;

            // Load today's deliveries
            const deliveriesRef = collection(db, 'deliveries');
            const todayDeliveriesQuery = query(
                deliveriesRef,
                where('date', '==', today)
            );
            const deliveriesSnapshot = await getDocs(todayDeliveriesQuery);
            
            let deliveredCount = 0;
            let skippedCount = 0;
            let totalMilk = 0;
            let totalRevenue = 0;

            deliveriesSnapshot.forEach((doc) => {
                const delivery = doc.data();
                if (delivery.status === 'delivered') {
                    deliveredCount++;
                    totalMilk += delivery.qty;
                    totalRevenue += delivery.amount;
                } else if (delivery.status === 'skipped') {
                    skippedCount++;
                }
            });

            this.stats.deliveredToday = deliveredCount;
            this.stats.skippedToday = skippedCount;
            this.stats.pendingToday = Math.max(0, this.stats.totalCustomers - deliveredCount - skippedCount);
            this.stats.totalMilkToday = totalMilk;
            this.stats.totalRevenueToday = totalRevenue;

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateStatsDisplay() {
        // Update stat cards
        const updates = {
            'total-customers': this.stats.totalCustomers,
            'delivered-today': this.stats.deliveredToday,
            'skipped-today': this.stats.skippedToday,
            'pending-today': this.stats.pendingToday,
            'total-milk-today': `${this.stats.totalMilkToday.toFixed(1)}L`,
            'total-revenue-today': `₹${this.stats.totalRevenueToday}`
        };

        Object.entries(updates).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    async loadChartData() {
        try {
            await Promise.all([
                this.loadDailyTrendData(),
                this.loadMonthlyRevenueData()
            ]);
        } catch (error) {
            console.error('Error loading chart data:', error);
        }
    }

    async loadDailyTrendData() {
        try {
            // Get data for the last 7 days
            const days = [];
            const deliveredData = [];
            const skippedData = [];

            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateString = date.toISOString().split('T')[0];
                const dayName = date.toLocaleDateString('en-IN', { weekday: 'short' });
                
                days.push(dayName);

                // Get deliveries for this date - simplified query
                const deliveriesRef = collection(db, 'deliveries');
                const snapshot = await getDocs(deliveriesRef);

                let delivered = 0;
                let skipped = 0;

                snapshot.forEach((doc) => {
                    const delivery = doc.data();
                    if (delivery.date === dateString) {
                        if (delivery.status === 'delivered') {
                            delivered++;
                        } else if (delivery.status === 'skipped') {
                            skipped++;
                        }
                    }
                });

                deliveredData.push(delivered);
                skippedData.push(skipped);
            }

            this.updateDailyChart(days, deliveredData, skippedData);
        } catch (error) {
            console.error('Error loading daily trend data:', error);
        }
    }

    async loadMonthlyRevenueData() {
        try {
            // Get data for the last 6 months
            const months = [];
            const revenueData = [];

            // Get all deliveries once
            const deliveriesRef = collection(db, 'deliveries');
            const snapshot = await getDocs(deliveriesRef);
            
            const allDeliveries = [];
            snapshot.forEach((doc) => {
                allDeliveries.push(doc.data());
            });

            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const year = date.getFullYear();
                const month = date.getMonth() + 1;
                const monthName = date.toLocaleDateString('en-IN', { month: 'short' });
                
                months.push(monthName);

                // Get start and end dates for the month
                const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
                const lastDay = new Date(year, month, 0).getDate();
                const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

                // Filter deliveries for this month from all deliveries
                let revenue = 0;
                allDeliveries.forEach((delivery) => {
                    if (delivery.date >= startDate && delivery.date <= endDate && delivery.status === 'delivered') {
                        revenue += delivery.amount;
                    }
                });

                revenueData.push(revenue);
            }

            this.updateMonthlyChart(months, revenueData);
        } catch (error) {
            console.error('Error loading monthly revenue data:', error);
        }
    }

    initializeCharts() {
        this.initializeDailyChart();
        this.initializeMonthlyChart();
    }

    initializeDailyChart() {
        const ctx = document.getElementById('daily-chart');
        if (!ctx) return;

        this.charts.daily = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Delivered',
                        data: [],
                        backgroundColor: '#10b981',
                        borderColor: '#059669',
                        borderWidth: 1
                    },
                    {
                        label: 'Skipped',
                        data: [],
                        backgroundColor: '#ef4444',
                        borderColor: '#dc2626',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    }

    initializeMonthlyChart() {
        const ctx = document.getElementById('monthly-chart');
        if (!ctx) return;

        this.charts.monthly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Revenue (₹)',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value;
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    }

    updateDailyChart(labels, deliveredData, skippedData) {
        if (!this.charts.daily) return;

        this.charts.daily.data.labels = labels;
        this.charts.daily.data.datasets[0].data = deliveredData;
        this.charts.daily.data.datasets[1].data = skippedData;
        this.charts.daily.update();
    }

    updateMonthlyChart(labels, revenueData) {
        if (!this.charts.monthly) return;

        this.charts.monthly.data.labels = labels;
        this.charts.monthly.data.datasets[0].data = revenueData;
        this.charts.monthly.update();
    }

    refresh() {
        this.loadDashboardData();
    }

    destroy() {
        // Clean up charts
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        this.charts = {};
    }
}

// Create global dashboard manager instance
const dashboardManager = new DashboardManager();
window.dashboardManager = dashboardManager;

export default dashboardManager;
