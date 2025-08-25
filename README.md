# 🥛 SUDHA SAGAR - Milk Delivery Management System

SUDHA SAGAR is a comprehensive web-based milk delivery management system built with JavaScript, Firebase, and modern web technologies. This system helps SUDHA SAGAR dairy business manage customers, track daily deliveries, handle payments, and send automated notifications via Telegram.

## ✨ Features

### 📊 Dashboard
- Real-time overview of business metrics
- Daily delivery statistics
- Revenue tracking
- Customer status overview
- Interactive charts for trends analysis

### 👥 Customer Management
- Add, edit, and manage customers
- Customer status tracking (Active/Inactive)
- Search and filter functionality
- Automatic date tracking (when customer was added)
- Customer details: name, phone, daily quantity, rate, Telegram chat ID

### 🚛 Delivery Management
- Daily delivery tracking
- Date-wise delivery management
- Mark deliveries as delivered/skipped
- Quantity adjustment for each delivery
- Search customers by name in deliveries
- Bulk operations (Mark all delivered)

### 💰 Payment Management
- Monthly payment tracking
- Customer-wise payment history
- Payment status monitoring (Paid/Pending/Partial)
- Record payments with automatic balance calculation
- Monthly revenue reports
- Search and filter payments

### 📱 Telegram Integration
- Automated delivery notifications
- Payment received notifications
- Payment completion notifications
- Payment reminder notifications
- Broadcast messaging to all customers
- Multi-language support (Hindi/English)

### 📢 Broadcast System
- Send messages to all customers via Telegram
- Image attachment support with messages
- Real-time recipient tracking
- Progress monitoring during broadcast
- Broadcast history tracking
- Automatic filtering of customers with Telegram IDs

### 🔔 Payment Reminders
- Automated payment reminders for pending/partial payments
- Detailed payment information in reminders
- Smart filtering of eligible customers
- Bulk reminder sending with progress tracking
- Due date calculation and notification

### 📈 Reports
- Monthly customer reports
- Revenue analysis
- Delivery statistics
- Automated report generation and sharing

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Firebase Firestore (NoSQL Database)
- **Authentication**: Firebase Auth
- **Real-time Updates**: Firebase real-time listeners
- **Notifications**: Telegram Bot API
- **Charts**: Chart.js
- **Icons**: Feather Icons

## 🚀 Getting Started

### Prerequisites

1. Node.js (for package management)
2. Firebase project with Firestore enabled
3. Telegram Bot (for notifications)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/milk-delivery-system.git
   cd milk-delivery-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Configuration**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database
   - Enable Authentication (Email/Password)
   - Copy your Firebase config and update `js/firebase-config.js`

4. **Telegram Bot Setup**
   - Create a bot via [@BotFather](https://t.me/BotFather) on Telegram
   - Get your bot token
   - Update the bot token in `js/deliveries.js` and `js/payments.js`

5. **Start the application**
   ```bash
   python3 -m http.server 5000
   ```
   or use any local server of your choice.

6. **Access the application**
   Open your browser and navigate to `http://localhost:5000`

## 📋 Database Structure

### Collections

#### Customers
```javascript
{
  id: "auto-generated",
  name: "Customer Name",
  phone: "1234567890",
  daily_qty: 2.5,
  rate: 60,
  tg_chat_id: "telegram_chat_id",
  status: "active", // or "inactive"
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z"
}
```

#### Deliveries
```javascript
{
  id: "auto-generated",
  customer_id: "customer_document_id",
  date: "2024-01-01",
  qty: 2.5,
  rate: 60,
  amount: 150,
  status: "delivered", // "delivered", "skipped", "pending"
  created_at: "2024-01-01T00:00:00.000Z"
}
```

#### Payments
```javascript
{
  id: "auto-generated",
  customer_id: "customer_document_id",
  month: "2024-01", // YYYY-MM format
  paid_amount: 1500,
  total_amount: 1800,
  payment_date: "2024-01-15",
  last_payment_amount: 500,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z"
}
```

#### Broadcasts
```javascript
{
  id: "auto-generated",
  message: "Broadcast message content",
  imageName: "image_filename.jpg", // optional
  successCount: 15,
  failCount: 2,
  totalRecipients: 17,
  timestamp: "2024-01-01T00:00:00.000Z",
  createdAt: "2024-01-01T00:00:00.000Z"
}
```

## 🔧 Configuration

### Firebase Setup
1. Update `js/firebase-config.js` with your Firebase configuration:
```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### Telegram Bot Configuration
Update the bot token in the respective files:
- `js/deliveries.js` (line ~340)
- `js/payments.js` (line ~408, ~447, ~572)
- `js/broadcast.js` (line ~11)

```javascript
const TELEGRAM_BOT_TOKEN = 'your-bot-token';
```

## 📱 Usage

### Admin Login
1. Create an admin user in Firebase Authentication
2. Use the email and password to login to the system

### Adding Customers
1. Navigate to Customers section
2. Click "Add Customer"
3. Fill in customer details including Telegram chat ID for notifications
4. Save the customer

### Managing Deliveries
1. Go to Deliveries section
2. Select the date
3. Mark deliveries as delivered or skipped
4. Adjust quantities if needed
5. Customers will receive automatic Telegram notifications

### Payment Management
1. Access Payment Management section
2. Select the month to view
3. Record payments for customers
4. Monitor payment status and balances
5. Send payment reminders to customers with pending/partial payments
6. Customers receive payment notifications automatically

### Broadcast Messaging
1. Navigate to the Broadcast section
2. Type your message in the text area
3. Optionally attach an image
4. Review the list of recipients (customers with Telegram IDs)
5. Click "Send Broadcast" to deliver messages
6. Monitor progress and view delivery results
7. Check broadcast history for previous messages

### Payment Reminders
1. Go to Payment Management section
2. Select the desired month
3. Click "Send Payment Reminders" button
4. System automatically filters customers with pending/partial payments
5. Confirm the action to send reminders
6. Monitor the delivery progress and results

## 🎯 Features in Detail

### Automatic Notifications
- **Delivery Notifications**: Sent when milk is delivered or skipped
- **Payment Notifications**: Sent when payment is recorded
- **Completion Notifications**: Sent when monthly payment is fully completed
- **Payment Reminders**: Sent to customers with pending or partial payments
- **Broadcast Messages**: Admin can send custom messages to all customers
- **Registration Notifications**: Sent when new customers are added

### Advanced Communication Features
- **Bulk Messaging**: Send messages to all customers simultaneously
- **Image Support**: Attach images to broadcast messages
- **Progress Tracking**: Real-time monitoring of message delivery
- **Delivery History**: Track all broadcast messages and their success rates
- **Smart Filtering**: Automatically target only customers with Telegram IDs

### Real-time Updates
- Dashboard statistics update in real-time
- Customer and delivery data sync across all admin sessions
- Instant notification delivery

### Responsive Design
- Mobile-friendly interface
- Works on tablets and desktop
- Touch-friendly controls

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Bug Reports & Feature Requests

Please use the [GitHub Issues](https://github.com/yourusername/milk-delivery-system/issues) page to report bugs or request new features.

## 📞 Support

For support and questions, please contact:
- Email: your-email@example.com
- Telegram: @yourusername

## 🙏 Acknowledgments

- Firebase for providing excellent backend services
- Telegram for bot API
- Chart.js for beautiful charts
- Feather Icons for clean iconography

---

**Made with ❤️ for small business owners**