import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, query, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class BroadcastManager {
    constructor() {
        this.customers = [];
        this.telegramCustomers = [];
        this.isInitialized = false;
        this.TELEGRAM_BOT_TOKEN = '8414963882:AAHAxN6adnkt5HKV1yXhpGZVpwGv3rNd2yQ';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadCustomers();
        this.loadBroadcastHistory();
        this.isInitialized = true;
    }

    setupEventListeners() {
        // Message textarea validation
        const messageTextarea = document.getElementById('broadcast-message');
        messageTextarea.addEventListener('input', () => this.validateForm());

        // Image upload handling
        const imageInput = document.getElementById('broadcast-image');
        imageInput.addEventListener('change', (e) => this.handleImageUpload(e));

        // Remove image button
        const removeImageBtn = document.getElementById('remove-image');
        removeImageBtn.addEventListener('click', () => this.removeImage());

        // Action buttons
        const sendBtn = document.getElementById('send-broadcast-btn');
        sendBtn.addEventListener('click', () => this.sendBroadcast());

        const clearBtn = document.getElementById('clear-broadcast-btn');
        clearBtn.addEventListener('click', () => this.clearForm());

        const refreshBtn = document.getElementById('refresh-recipients');
        refreshBtn.addEventListener('click', () => this.loadCustomers());
    }

    async loadCustomers() {
        try {
            this.showLoading(true);
            
            const customersRef = collection(db, 'customers');
            const snapshot = await getDocs(customersRef);
            
            this.customers = [];
            snapshot.forEach((doc) => {
                this.customers.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Filter customers with Telegram IDs
            this.telegramCustomers = this.customers.filter(customer => 
                customer.tg_chat_id && customer.tg_chat_id.trim() !== ''
            );

            this.updateRecipientsInfo();
            this.displayRecipientsList();
            this.validateForm();

        } catch (error) {
            console.error('Error loading customers:', error);
            this.showError('Failed to load customers');
        } finally {
            this.showLoading(false);
        }
    }

    updateRecipientsInfo() {
        document.getElementById('total-customers-count').textContent = this.customers.length;
        document.getElementById('telegram-customers-count').textContent = this.telegramCustomers.length;
    }

    displayRecipientsList() {
        const recipientsList = document.getElementById('recipients-list');
        
        if (this.telegramCustomers.length === 0) {
            recipientsList.innerHTML = '<p class="no-recipients">No customers have Telegram Chat ID configured</p>';
            return;
        }

        recipientsList.innerHTML = this.telegramCustomers.map(customer => `
            <div class="recipient-item">
                <div class="recipient-info">
                    <span class="recipient-name">${customer.name}</span>
                    <span class="recipient-phone">${customer.phone}</span>
                </div>
                <div class="recipient-chat-id">${customer.tg_chat_id}</div>
            </div>
        `).join('');
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showError('Please select a valid image file');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('Image size should be less than 10MB');
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('image-preview');
            const previewImg = document.getElementById('preview-img');
            
            previewImg.src = e.target.result;
            preview.style.display = 'block';
            
            this.validateForm();
        };
        reader.readAsDataURL(file);
    }

    removeImage() {
        const imageInput = document.getElementById('broadcast-image');
        const preview = document.getElementById('image-preview');
        const previewImg = document.getElementById('preview-img');
        
        imageInput.value = '';
        previewImg.src = '';
        preview.style.display = 'none';
        
        this.validateForm();
    }

    validateForm() {
        const message = document.getElementById('broadcast-message').value.trim();
        const imageInput = document.getElementById('broadcast-image');
        const hasImage = imageInput.files.length > 0;
        const sendBtn = document.getElementById('send-broadcast-btn');
        
        // Enable send button if there's a message or image and there are recipients
        const isValid = (message || hasImage) && this.telegramCustomers.length > 0;
        sendBtn.disabled = !isValid;
    }

    async sendBroadcast() {
        const message = document.getElementById('broadcast-message').value.trim();
        const imageInput = document.getElementById('broadcast-image');
        const imageFile = imageInput.files[0];

        if (!message && !imageFile) {
            this.showError('Please enter a message or select an image');
            return;
        }

        if (this.telegramCustomers.length === 0) {
            this.showError('No customers with Telegram Chat ID found');
            return;
        }

        try {
            // Show progress
            this.showProgress(true);
            this.updateProgress(0, this.telegramCustomers.length);

            let successCount = 0;
            let failCount = 0;

            // If there's an image, convert it to base64 for sending
            let imageData = null;
            if (imageFile) {
                imageData = await this.fileToBase64(imageFile);
            }

            for (let i = 0; i < this.telegramCustomers.length; i++) {
                const customer = this.telegramCustomers[i];
                
                try {
                    if (imageFile && message) {
                        // Send image with caption
                        await this.sendTelegramPhoto(customer.tg_chat_id, imageData, message);
                    } else if (imageFile) {
                        // Send image only
                        await this.sendTelegramPhoto(customer.tg_chat_id, imageData);
                    } else {
                        // Send message only
                        await this.sendTelegramMessage(customer.tg_chat_id, message);
                    }
                    
                    successCount++;
                    this.addProgressLog(`✅ Sent to ${customer.name}`, 'success');
                    
                } catch (error) {
                    failCount++;
                    this.addProgressLog(`❌ Failed to send to ${customer.name}`, 'error');
                    console.error(`Failed to send to ${customer.name}:`, error);
                }

                // Update progress
                this.updateProgress(i + 1, this.telegramCustomers.length);
                
                // Add delay between sends to avoid rate limiting
                if (i < this.telegramCustomers.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // Save broadcast to history
            await this.saveBroadcastHistory(message, imageFile?.name, successCount, failCount);

            // Show final result
            if (failCount === 0) {
                this.showSuccess(`Broadcast sent successfully to all ${successCount} customers!`);
            } else {
                this.showError(`Broadcast completed: ${successCount} successful, ${failCount} failed`);
            }

            // Clear form after successful broadcast
            if (successCount > 0) {
                setTimeout(() => {
                    this.clearForm();
                    this.loadBroadcastHistory();
                }, 2000);
            }

        } catch (error) {
            console.error('Error sending broadcast:', error);
            this.showError('Failed to send broadcast');
        } finally {
            setTimeout(() => {
                this.showProgress(false);
            }, 3000);
        }
    }

    async sendTelegramMessage(chatId, message) {
        const telegramUrl = `https://api.telegram.org/bot${this.TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });

        if (!response.ok) {
            throw new Error(`Telegram API error: ${await response.text()}`);
        }

        return response.json();
    }

    async sendTelegramPhoto(chatId, imageData, caption = '') {
        const telegramUrl = `https://api.telegram.org/bot${this.TELEGRAM_BOT_TOKEN}/sendPhoto`;
        
        const formData = new FormData();
        formData.append('chat_id', chatId);
        
        // Convert base64 to blob
        const byteCharacters = atob(imageData.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {type: 'image/jpeg'});
        
        formData.append('photo', blob, 'broadcast_image.jpg');
        
        if (caption) {
            formData.append('caption', caption);
            formData.append('parse_mode', 'HTML');
        }

        const response = await fetch(telegramUrl, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Telegram API error: ${await response.text()}`);
        }

        return response.json();
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    async saveBroadcastHistory(message, imageName, successCount, failCount) {
        try {
            const broadcast = {
                message: message || '',
                imageName: imageName || '',
                successCount,
                failCount,
                totalRecipients: this.telegramCustomers.length,
                timestamp: new Date(),
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, 'broadcasts'), broadcast);
        } catch (error) {
            console.error('Error saving broadcast history:', error);
        }
    }

    async loadBroadcastHistory() {
        try {
            const broadcastsRef = collection(db, 'broadcasts');
            const q = query(broadcastsRef, orderBy('timestamp', 'desc'), limit(10));
            const snapshot = await getDocs(q);
            
            const historyList = document.getElementById('history-list');
            
            if (snapshot.empty) {
                historyList.innerHTML = '<p class="no-history">No broadcast history found</p>';
                return;
            }

            historyList.innerHTML = '';
            snapshot.forEach((doc) => {
                const broadcast = doc.data();
                this.addHistoryItem(broadcast);
            });

        } catch (error) {
            console.error('Error loading broadcast history:', error);
        }
    }

    addHistoryItem(broadcast) {
        const historyList = document.getElementById('history-list');
        const date = new Date(broadcast.timestamp?.toDate ? broadcast.timestamp.toDate() : broadcast.timestamp);
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-header">
                <div class="history-date">${date.toLocaleString()}</div>
                <div class="history-stats">
                    ${broadcast.successCount}/${broadcast.totalRecipients} sent
                </div>
            </div>
            <div class="history-content">
                ${broadcast.message ? `<div class="history-message">${broadcast.message}</div>` : ''}
                ${broadcast.imageName ? `<div class="history-image">📷 ${broadcast.imageName}</div>` : ''}
            </div>
        `;
        
        historyList.appendChild(historyItem);
    }

    showProgress(show) {
        const progress = document.getElementById('broadcast-progress');
        progress.style.display = show ? 'block' : 'none';
        
        if (show) {
            document.getElementById('progress-log').innerHTML = '';
        }
    }

    updateProgress(sent, total) {
        document.getElementById('progress-sent').textContent = sent;
        document.getElementById('progress-total').textContent = total;
        
        const percentage = total > 0 ? (sent / total) * 100 : 0;
        document.getElementById('progress-fill').style.width = `${percentage}%`;
    }

    addProgressLog(message, type = 'info') {
        const log = document.getElementById('progress-log');
        const logItem = document.createElement('div');
        logItem.className = `progress-log-item ${type}`;
        logItem.textContent = message;
        log.appendChild(logItem);
        log.scrollTop = log.scrollHeight;
    }

    clearForm() {
        document.getElementById('broadcast-message').value = '';
        this.removeImage();
        this.validateForm();
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        loading.style.display = show ? 'flex' : 'none';
    }

    showSuccess(message) {
        // Create and show success message
        this.showNotification(message, 'success');
    }

    showError(message) {
        // Create and show error message
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }

        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    refresh() {
        if (this.isInitialized) {
            this.loadCustomers();
            this.loadBroadcastHistory();
        }
    }
}

// Create global instance
window.broadcastManager = new BroadcastManager();

export default BroadcastManager;