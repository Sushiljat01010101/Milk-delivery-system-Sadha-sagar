const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin
admin.initializeApp();

// Telegram Bot Token
const TELEGRAM_BOT_TOKEN = '8414963882:AAHAxN6adnkt5HKV1yXhpGZVpwGv3rNd2yQ';
const ADMIN_CHAT_ID = '5861659575';

// Helper function to send admin notifications
async function sendAdminDeliveryNotification(customerName, customerPhone, date, quantity, rate, amount, status) {
    try {
        let adminMessage;
        
        if (status === 'delivered') {
            adminMessage = `📊 ADMIN NOTIFICATION\n\n✅ Delivery Completed\n👤 Customer: ${customerName}\n📱 Phone: ${customerPhone}\n📅 Date: ${formatDate(date)}\n🥛 Quantity: ${quantity} L\n💰 Rate: ₹${rate}/L\n💸 Amount: ₹${amount}\n\n✅ Customer notified via Telegram\n\n- SUDHA SAGAR DAIRY Admin`;
        } else if (status === 'skipped') {
            adminMessage = `📊 ADMIN NOTIFICATION\n\n⏭️ Delivery Skipped\n👤 Customer: ${customerName}\n📱 Phone: ${customerPhone}\n📅 Date: ${formatDate(date)}\n\n✅ Customer notified via Telegram\n\n- SUDHA SAGAR DAIRY Admin`;
        }
        
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        await axios.post(telegramUrl, {
            chat_id: ADMIN_CHAT_ID,
            text: adminMessage,
            parse_mode: 'HTML'
        });
        
        console.log(`Admin notification sent for ${customerName} delivery`);
    } catch (error) {
        console.error('Error sending admin notification:', error);
        // Don't throw error as admin notification failure shouldn't stop customer notification
    }
}

// Send delivery notification via Telegram
exports.sendDeliveryNotification = functions.https.onCall(async (data, context) => {
    // Verify the user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { chatId, customerName, date, quantity, rate, amount, status } = data;

    if (!chatId) {
        throw new functions.https.HttpsError('invalid-argument', 'Chat ID is required');
    }

    try {
        let message;
        
        if (status === 'delivered') {
            message = `🥛 SUDHA SAGAR\n\n👋 ${customerName}\nआज ${formatDate(date)} की डिलीवरी:\n• Quantity: ${quantity} L\n• Rate: ₹${rate}/L\n• Amount: ₹${amount}\n\nकोई भी query के लिए: 9413577474\n\nधन्यवाद 🙏\nSUDHA SAGAR DAIRY`;
        } else if (status === 'skipped') {
            message = `🥛 SUDHA SAGAR\n\nℹ️ ${customerName}\nआज ${formatDate(date)} की डिलीवरी Skipped कर दी गई।\n\nContact: 9413577474\n\nSUDHA SAGAR DAIRY`;
        } else {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid status');
        }

        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        await axios.post(telegramUrl, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        });

        console.log(`Notification sent to ${chatId} for ${customerName}`);

        // Send admin notification
        await sendAdminDeliveryNotification(customerName, data.customerPhone || 'N/A', date, quantity, rate, amount, status);
        
        return { success: true };
        
    } catch (error) {
        console.error('Error sending Telegram notification:', error);
        
        if (error.response && error.response.data) {
            console.error('Telegram API error:', error.response.data);
        }
        
        throw new functions.https.HttpsError('internal', 'Failed to send notification');
    }
});

// Send monthly report via Telegram
exports.sendMonthlyReport = functions.https.onCall(async (data, context) => {
    // Verify the user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { chatId, reportText } = data;

    if (!chatId || !reportText) {
        throw new functions.https.HttpsError('invalid-argument', 'Chat ID and report text are required');
    }

    try {
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        await axios.post(telegramUrl, {
            chat_id: chatId,
            text: reportText,
            parse_mode: 'HTML'
        });

        console.log(`Monthly report sent to ${chatId}`);
        return { success: true };
        
    } catch (error) {
        console.error('Error sending monthly report:', error);
        
        if (error.response && error.response.data) {
            console.error('Telegram API error:', error.response.data);
        }
        
        throw new functions.https.HttpsError('internal', 'Failed to send report');
    }
});

// Send daily summary to admin (optional feature)
exports.sendDailySummary = functions.pubsub.schedule('0 8 * * *')
    .timeZone('Asia/Kolkata')
    .onRun(async (context) => {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Get today's deliveries
            const deliveriesSnapshot = await admin.firestore()
                .collection('deliveries')
                .where('date', '==', today)
                .get();

            let delivered = 0;
            let skipped = 0;
            let totalRevenue = 0;

            deliveriesSnapshot.forEach(doc => {
                const delivery = doc.data();
                if (delivery.status === 'delivered') {
                    delivered++;
                    totalRevenue += delivery.amount;
                } else if (delivery.status === 'skipped') {
                    skipped++;
                }
            });

            // Get total active customers
            const customersSnapshot = await admin.firestore()
                .collection('customers')
                .where('status', '==', 'active')
                .get();

            const totalCustomers = customersSnapshot.size;
            const pending = totalCustomers - delivered - skipped;

            const summaryMessage = `🥛 SUDHA SAGAR DAIRY\n📊 Daily Summary - ${formatDate(today)}\n\n• Total Customers: ${totalCustomers}\n• Delivered: ${delivered}\n• Skipped: ${skipped}\n• Pending: ${pending}\n• Revenue: ₹${totalRevenue}\n\nSUDHA SAGAR DAIRY - Quality Milk Delivery`;

            // Send to admin (you can set admin chat ID in config)
            const adminChatId = functions.config().telegram?.admin_chat_id;
            if (adminChatId) {
                const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
                
                await axios.post(telegramUrl, {
                    chat_id: adminChatId,
                    text: summaryMessage,
                    parse_mode: 'HTML'
                });
            }

            console.log('Daily summary sent');
            return null;
            
        } catch (error) {
            console.error('Error sending daily summary:', error);
            return null;
        }
    });

// Helper function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('hi-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// Test Telegram bot connection
exports.testTelegramBot = functions.https.onCall(async (data, context) => {
    // Verify the user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    try {
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`;
        const response = await axios.get(telegramUrl);
        
        return {
            success: true,
            botInfo: response.data.result
        };
        
    } catch (error) {
        console.error('Error testing Telegram bot:', error);
        throw new functions.https.HttpsError('internal', 'Failed to connect to Telegram bot');
    }
});
