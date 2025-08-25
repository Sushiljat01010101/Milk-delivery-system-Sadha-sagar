# Overview

This is SUDHA SAGAR - a milk delivery management system built as a web application for managing daily milk deliveries to customers. The system provides an admin interface to track customers, manage daily deliveries, generate reports, and send automated notifications via Telegram. It features a dashboard with analytics, customer management, delivery tracking, and monthly reporting capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Single Page Application (SPA)**: Built with vanilla JavaScript using ES6 modules for component organization
- **Component-based structure**: Modular design with separate managers for auth, customers, deliveries, reports, and dashboard
- **Real-time updates**: Uses Firebase Firestore real-time listeners for live data synchronization
- **Responsive design**: CSS-based responsive layout with custom CSS variables for theming
- **Chart visualization**: Integrated Chart.js for dashboard analytics and reporting

## Backend Architecture
- **Firebase Backend-as-a-Service**: Leverages Firebase for all backend services
- **Firebase Authentication**: Admin login system with email/password authentication
- **Cloud Firestore**: NoSQL database for storing customers, deliveries, and related data
- **Firebase Cloud Functions**: Serverless functions for backend logic and integrations
- **Firebase Hosting**: Static file hosting with SPA routing configuration

## Data Storage
- **Firestore Collections**: 
  - `customers`: Customer information including name, phone, address, rates, and Telegram chat IDs
  - `deliveries`: Daily delivery records with status, quantity, amount, and timestamps
- **Real-time synchronization**: All data updates are immediately reflected across connected clients
- **Offline capability**: Firestore provides offline support for data access

## Authentication & Authorization
- **Firebase Authentication**: Secure admin-only access using email/password
- **Session management**: Automatic session handling with auth state persistence
- **Protected routes**: All application features require authentication

## External Dependencies

### Firebase Services
- **Firebase Authentication**: User authentication and session management
- **Cloud Firestore**: Real-time NoSQL database
- **Firebase Cloud Functions**: Serverless backend functions
- **Firebase Hosting**: Web application hosting with SPA routing

### Third-party APIs
- **Telegram Bot API**: For sending delivery notifications to customers via Telegram messages
- **Chart.js**: Client-side charting library for dashboard analytics and reports

### Development Tools
- **Feather Icons**: Icon library for UI elements
- **Axios**: HTTP client for API requests in Cloud Functions
- **Firebase Admin SDK**: Server-side Firebase operations in Cloud Functions

### Configuration Requirements
- Firebase project configuration with API keys and project settings
- Telegram Bot Token for notification functionality
- Firestore security rules and indexes configuration