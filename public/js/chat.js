class FlexBaseChat {
    constructor() {
        this.socket = null;
        this.currentChatId = null;
        this.currentChatType = null;
        this.typingTimeout = null;
        this.isTyping = false;
        this.chats = [];
        this.communityChat = null;
        this.messagesSent = new Set(); // Track sent messages to prevent duplicates
        this.lastMessageId = null; // Track last message to prevent duplicates

        this.initializeElements();
        this.initializeSocket();
        this.bindEvents();
        this.loadChats();
    }

    initializeElements() {
        // Search elements
        this.userSearchInput = document.getElementById('userSearch');
        this.searchResults = document.getElementById('searchResults');

        // Chat list elements
        this.chatsList = document.getElementById('chatsList');
        this.communityChatElement = document.getElementById('communityChat');
        this.memberCount = document.getElementById('memberCount');

        // Chat area elements
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.activeChat = document.getElementById('activeChat');
        this.activeChatAvatar = document.getElementById('activeChatAvatar');
        this.activeChatName = document.getElementById('activeChatName');
        this.activeChatStatus = document.getElementById('activeChatStatus');

        // Messages elements
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messagesList = document.getElementById('messagesList');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.typingAvatar = document.getElementById('typingAvatar');
        this.typingUsername = document.getElementById('typingUsername');

        // Input elements
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.attachButton = document.getElementById('attachButton');

        // Three dots menu
        this.chatOptions = document.getElementById('chatOptions');
        this.setupChatOptionsMenu();
    }

    // Setup three dots menu functionality
    setupChatOptionsMenu() {
        if (this.chatOptions) {
            this.chatOptions.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleChatOptionsMenu();
            });

            // Close menu when clicking outside
            document.addEventListener('click', () => {
                this.closeChatOptionsMenu();
            });
        }
    }

    toggleChatOptionsMenu() {
        // Create dropdown if it doesn't exist
        let dropdown = document.getElementById('chatOptionsDropdown');

        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'chatOptionsDropdown';
            dropdown.className = 'chat-options-dropdown';
            dropdown.innerHTML = `
                <div class="chat-option-item" onclick="window.flexBaseChat.muteChat()">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"/>
                    </svg>
                    Mute Chat
                </div>
                <div class="chat-option-item" onclick="window.flexBaseChat.clearChat()">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/>
                    </svg>
                    Clear Chat
                </div>
                <div class="chat-option-item" onclick="window.flexBaseChat.reportChat()">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>
                    </svg>
                    Report
                </div>
            `;

            // Position dropdown relative to button
            const rect = this.chatOptions.getBoundingClientRect();
            dropdown.style.position = 'absolute';
            dropdown.style.top = (rect.bottom + 5) + 'px';
            dropdown.style.right = '20px';
            dropdown.style.zIndex = '1000';

            document.body.appendChild(dropdown);
        }

        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }

    closeChatOptionsMenu() {
        const dropdown = document.getElementById('chatOptionsDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }

    // Chat options functions
    muteChat() {
        console.log('Mute chat functionality');
        this.closeChatOptionsMenu();
        // TODO: Implement mute functionality
        alert('Mute functionality - Coming soon!');
    }

    async clearChat() {
        if (!this.currentChatId) {
            alert('No chat selected to clear.');
            this.closeChatOptionsMenu();
            return;
        }

        const chatName = this.currentChatType === 'community' ? 'FlexBase Community' : this.activeChatName.textContent;

        if (confirm(`Are you sure you want to clear "${chatName}" chat? This action cannot be undone and will delete all messages permanently.`)) {
            try {
                // Show loading state
                const originalContent = this.messagesList.innerHTML;
                this.messagesList.innerHTML = `
                <div class="clearing-chat-state">
                    <div class="loading-spinner"></div>
                    <p>Clearing chat messages...</p>
                </div>
            `;

                const response = await fetch(`/api/chat/chats/${this.currentChatId}/clear`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();

                if (data.success) {
                    // Clear messages from UI permanently
                    this.messagesList.innerHTML = `
                    <div class="chat-cleared-message">
                        <div class="cleared-icon">🧹</div>
                        <p><strong>Chat cleared successfully!</strong></p>
                        <p class="cleared-subtitle">All messages have been permanently deleted.</p>
                    </div>
                `;

                    // Update chat in sidebar to show no last message
                    this.updateChatLastMessage(this.currentChatId, {
                        content: 'Chat cleared',
                        sender: { _id: window.currentUser.id },
                        createdAt: new Date()
                    });

                    // Show success message in console (this will now appear)
                    console.log(`✅ Chat "${chatName}" cleared successfully`);

                    // Show user-friendly notification
                    this.showNotification('Chat cleared successfully!', 'success');

                    // Emit to other users that chat was cleared
                    if (this.socket) {
                        this.socket.emit('chatCleared', {
                            chatId: this.currentChatId,
                            chatType: this.currentChatType
                        });
                    }

                } else {
                    // Restore original content on failure
                    this.messagesList.innerHTML = originalContent;
                    console.error('❌ Failed to clear chat:', data.message);
                    this.showNotification(data.message || 'Failed to clear chat. Please try again.', 'error');
                }

            } catch (error) {
                console.error('❌ Error clearing chat:', error);
                // Restore original content on error
                this.loadMessages(this.currentChatId);
                this.showNotification('Error clearing chat. Please check your connection and try again.', 'error');
            }
        }

        this.closeChatOptionsMenu();
    }

    // Helper method to show notifications
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `chat-notification ${type}`;
        notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span class="notification-message">${message}</span>
        </div>
    `;

        // Add to DOM
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);

        // Hide and remove notification after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 4000);
    }


    reportChat() {
        console.log('Report chat functionality');
        this.closeChatOptionsMenu();
        // TODO: Implement report functionality
        alert('Report functionality - Coming soon!');
    }

    initializeSocket() {
        this.socket = io({
            auth: {
                token: this.getCookie('token')
            }
        });

        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        // Handle new messages without duplicates
        this.socket.on('newMessage', (data) => {
            // Don't show message if it's from current user (already shown optimistically)
            if (data.senderId !== window.currentUser.id && data.chatId === this.currentChatId) {
                this.handleNewMessage(data);
            }

            // Always update chat in sidebar
            this.updateChatLastMessage(data.chatId, data.message);
        });

        // FIXED: Move chatCleared listener outside of newMessage
        this.socket.on('chatCleared', (data) => {
            if (data.chatId === this.currentChatId) {
                this.messagesList.innerHTML = `
                <div class="chat-cleared-message">
                    <div class="cleared-icon">🧹</div>
                    <p><strong>Chat cleared by @${data.clearedBy.username}</strong></p>
                    <p class="cleared-subtitle">All messages have been removed from this chat.</p>
                </div>
            `;

                this.showNotification(`Chat cleared by @${data.clearedBy.username}`, 'info');
            }

            // Update chat in sidebar
            this.updateChatLastMessage(data.chatId, {
                content: 'Chat cleared',
                sender: data.clearedBy,
                createdAt: new Date()
            });
        });

        this.socket.on('userTyping', (data) => {
            this.handleTypingIndicator(data);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });
    }


    // Get token from cookies
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    bindEvents() {
        // Search functionality
        this.userSearchInput.addEventListener('input', (e) => {
            this.handleUserSearch(e.target.value);
        });

        // Community chat click
        if (this.communityChatElement) {
            this.communityChatElement.addEventListener('click', () => {
                this.selectCommunityChat();
            });
        }

        // Message input events
        this.messageInput.addEventListener('input', () => {
            this.handleTyping();
            this.autoResizeTextarea();
        });

        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Send button
        this.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });

        // Click outside search results
        document.addEventListener('click', (e) => {
            if (!this.searchResults.contains(e.target) && e.target !== this.userSearchInput) {
                this.searchResults.style.display = 'none';
            }
        });
    }

    async loadChats() {
        try {
            const response = await fetch('/api/chat/chats', {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.success) {
                this.chats = data.chats;
                this.communityChat = data.communityChat;
                this.renderChats();
                this.updateMemberCount();
            }
        } catch (error) {
            console.error('Error loading chats:', error);
        }
    }

    renderChats() {
        this.chatsList.innerHTML = '';

        this.chats.forEach(chat => {
            const chatElement = this.createChatElement(chat);
            this.chatsList.appendChild(chatElement);
        });
    }

    createChatElement(chat) {
        const otherUser = chat.participants.find(p => p._id !== window.currentUser.id);
        const lastMessage = chat.lastMessage;

        const chatElement = document.createElement('div');
        chatElement.className = 'chat-item';
        chatElement.dataset.chatId = chat._id;
        chatElement.dataset.chatType = 'private';

        const timeAgo = lastMessage ? this.formatTimeAgo(new Date(lastMessage.createdAt)) : '';
        const messagePreview = lastMessage ?
            (lastMessage.sender._id === window.currentUser.id ? 'You: ' : '') + lastMessage.content :
            'Start a conversation...';

        chatElement.innerHTML = `
            <div class="chat-avatar">
                <img src="${otherUser?.profileImage || '/images/default-profile.jpg'}" alt="${otherUser?.username || 'User'}">
                <div class="online-indicator" style="display: none;"></div>
            </div>
            <div class="chat-info">
                <div class="chat-name">${otherUser?.username || 'User'}</div>
                <div class="chat-last-message">${this.escapeHtml(messagePreview)}</div>
            </div>
            <div class="chat-meta">
                <div class="chat-time">${timeAgo}</div>
                ${chat.unreadCount && chat.unreadCount > 0 ? `<div class="unread-badge">${chat.unreadCount}</div>` : ''}
            </div>
        `;

        chatElement.addEventListener('click', () => {
            this.selectChat(chat._id, 'private', otherUser);
        });

        return chatElement;
    }

    async selectChat(chatId, type, otherUser = null) {
        // Remove active class from all chats
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to selected chat
        const selectedChatElement = document.querySelector(`[data-chat-id="${chatId}"]`) ||
            (type === 'community' ? this.communityChatElement : null);
        if (selectedChatElement) {
            selectedChatElement.classList.add('active');
        }

        this.currentChatId = chatId;
        this.currentChatType = type;

        // Leave previous chat room
        if (this.socket && this.currentChatId) {
            this.socket.emit('leaveChat', this.currentChatId);
        }

        // Join new chat room
        if (this.socket) {
            this.socket.emit('joinChat', chatId);
        }

        // Show active chat
        this.welcomeScreen.style.display = 'none';
        this.activeChat.style.display = 'flex';

        // Update chat header
        if (type === 'community') {
            this.activeChatAvatar.src = '/images/tilted-sneaker.png';
            this.activeChatName.textContent = 'FlexBase Community';
            this.activeChatStatus.textContent = `${this.memberCount.textContent} members`;
        } else {
            this.activeChatAvatar.src = otherUser?.profileImage || '/images/default-profile.jpg';
            this.activeChatName.textContent = otherUser?.username || 'User';
            this.activeChatStatus.textContent = 'Online';
        }

        // Load messages
        await this.loadMessages(chatId);

        // Focus message input
        this.messageInput.focus();
    }

    async selectCommunityChat() {
        if (!this.communityChat) return;

        // Remove active from all chats
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active to community chat
        if (this.communityChatElement) {
            this.communityChatElement.classList.add('active');
        }

        await this.selectChat(this.communityChat._id, 'community');
    }

    async loadMessages(chatId) {
        try {
            const response = await fetch(`/api/chat/chats/${chatId}/messages`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.success) {
                this.renderMessages(data.messages);
                this.scrollToBottom();
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    renderMessages(messages) {
        this.messagesList.innerHTML = '';

        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            this.messagesList.appendChild(messageElement);
        });
    }

    createMessageElement(message) {
        const isOwn = message.sender._id === window.currentUser.id;
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isOwn ? 'own' : ''}`;
        messageElement.setAttribute('data-message-id', message._id);

        // Add temp ID for temporary messages
        if (message.isTemporary) {
            messageElement.setAttribute('data-temp-id', message._id);
            messageElement.classList.add('temporary');
        }

        const timeString = this.formatMessageTime(new Date(message.createdAt));

        messageElement.innerHTML = `
            ${!isOwn ? `<img src="${message.sender.profileImage || '/images/default-profile.jpg'}" alt="${message.sender.username}" class="message-avatar">` : ''}
            <div class="message-bubble">
                <div class="message-text">${this.escapeHtml(message.content)}</div>
                <div class="message-time">${timeString}</div>
            </div>
            ${isOwn ? `<img src="${window.currentUser.profileImage}" alt="You" class="message-avatar">` : ''}
        `;

        return messageElement;
    }

    async sendMessage() {
        const content = this.messageInput.value.trim();
        if (!content || !this.currentChatId) return;

        // Prevent double submission
        if (this.sendButton.disabled) return;
        this.sendButton.disabled = true;

        try {
            // Create temporary message ID to prevent duplicates
            const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

            // Add message to UI immediately (optimistic update)
            const tempMessage = {
                _id: tempId,
                content: content,
                sender: {
                    _id: window.currentUser.id,
                    username: window.currentUser.username,
                    profileImage: window.currentUser.profileImage
                },
                createdAt: new Date(),
                isTemporary: true
            };

            // Add to UI immediately
            const messageElement = this.createMessageElement(tempMessage);
            this.messagesList.appendChild(messageElement);
            this.scrollToBottom();

            // Clear input
            this.messageInput.value = '';
            this.autoResizeTextarea();

            const response = await fetch(`/api/chat/chats/${this.currentChatId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ content })
            });

            const data = await response.json();

            if (data.success) {
                // Remove temporary message
                messageElement.remove();

                // Add real message
                const realMessageElement = this.createMessageElement(data.message);
                this.messagesList.appendChild(realMessageElement);
                this.scrollToBottom();

                // Update chat in sidebar
                this.updateChatLastMessage(this.currentChatId, data.message);

                // Stop typing
                this.stopTyping();
            } else {
                // Remove temporary message on error
                messageElement.remove();
                console.error('Failed to send message:', data.message);
                alert('Failed to send message: ' + (data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error sending message:', error);
            // Remove temporary message on error
            const tempElement = this.messagesList.querySelector(`[data-temp-id="${tempId}"]`);
            if (tempElement) tempElement.remove();
            alert('Error sending message. Please try again.');
        } finally {
            this.sendButton.disabled = false;
        }
    }

    async handleUserSearch(query) {
        if (!query || query.length < 2) {
            this.searchResults.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`/api/chat/search-users?q=${encodeURIComponent(query)}`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.success) {
                this.renderSearchResults(data.users);
            }
        } catch (error) {
            console.error('Error searching users:', error);
        }
    }

    renderSearchResults(users) {
        if (users.length === 0) {
            this.searchResults.style.display = 'none';
            return;
        }

        this.searchResults.innerHTML = '';
        users.forEach(user => {
            const resultElement = document.createElement('div');
            resultElement.className = 'search-result-item';
            resultElement.innerHTML = `
                <img src="${user.profileImage || '/images/default-profile.jpg'}" alt="${user.username}" class="search-result-avatar">
                <div class="search-result-name">${this.escapeHtml(user.username)}</div>
            `;

            resultElement.addEventListener('click', () => {
                this.startChatWithUser(user);
                this.searchResults.style.display = 'none';
                this.userSearchInput.value = '';
            });

            this.searchResults.appendChild(resultElement);
        });

        this.searchResults.style.display = 'block';
    }

    async startChatWithUser(user) {
        try {
            const response = await fetch('/api/chat/chats/private', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ userId: user._id })
            });

            const data = await response.json();

            if (data.success) {
                // Add to chats list if new
                const existingChat = this.chats.find(c => c._id === data.chat._id);
                if (!existingChat) {
                    this.chats.unshift(data.chat);
                    this.renderChats();
                }

                // Select the chat
                await this.selectChat(data.chat._id, 'private', user);
            }
        } catch (error) {
            console.error('Error starting chat:', error);
        }
    }

    handleNewMessage(data) {
        if (data.chatId === this.currentChatId) {
            // Check if message already exists to prevent duplicates
            const existingMessage = this.messagesList.querySelector(`[data-message-id="${data.message._id}"]`);
            if (!existingMessage) {
                const messageElement = this.createMessageElement(data.message);
                this.messagesList.appendChild(messageElement);
                this.scrollToBottom();
            }
        }
    }

    handleTyping() {
        if (!this.isTyping && this.currentChatId) {
            this.isTyping = true;
            this.socket.emit('typing', { chatId: this.currentChatId, isTyping: true });
        }

        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.stopTyping();
        }, 1000);
    }

    stopTyping() {
        if (this.isTyping && this.currentChatId) {
            this.isTyping = false;
            this.socket.emit('typing', { chatId: this.currentChatId, isTyping: false });
        }
    }

    handleTypingIndicator(data) {
        if (data.chatId !== this.currentChatId || data.userId === window.currentUser.id) return;

        if (data.isTyping) {
            this.typingAvatar.src = data.profileImage || '/images/default-profile.jpg';
            this.typingUsername.textContent = data.username;
            this.typingIndicator.style.display = 'flex';
            this.scrollToBottom();
        } else {
            this.typingIndicator.style.display = 'none';
        }
    }

    updateChatLastMessage(chatId, message) {
        // Update community chat
        if (this.communityChat && chatId === this.communityChat._id) {
            const lastMessageEl = this.communityChatElement.querySelector('.chat-last-message');
            if (lastMessageEl) {
                const preview = message.sender._id === window.currentUser.id ? 'You: ' : `${message.sender.username}: `;
                lastMessageEl.textContent = preview + message.content;
            }
            return;
        }

        // Update private chat
        const chatElement = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (chatElement) {
            const lastMessageEl = chatElement.querySelector('.chat-last-message');
            const timeEl = chatElement.querySelector('.chat-time');

            if (lastMessageEl) {
                const preview = message.sender._id === window.currentUser.id ? 'You: ' : '';
                lastMessageEl.textContent = preview + message.content;
            }

            if (timeEl) {
                timeEl.textContent = this.formatTimeAgo(new Date(message.createdAt));
            }

            // Move chat to top
            this.chatsList.prepend(chatElement);
        }
    }

    // Update member count correctly
    updateMemberCount() {
        if (this.communityChat && this.memberCount) {
            // Get unique member count
            const uniqueMembers = [...new Set(this.communityChat.participants.map(p => p._id || p))];
            this.memberCount.textContent = uniqueMembers.length;
        }
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    formatTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'now';
        if (diffInSeconds < 3600) return Math.floor(diffInSeconds / 60) + 'm';
        if (diffInSeconds < 86400) return Math.floor(diffInSeconds / 3600) + 'h';
        if (diffInSeconds < 604800) return Math.floor(diffInSeconds / 86400) + 'd';
        return date.toLocaleDateString();
    }

    formatMessageTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.flexBaseChat = new FlexBaseChat();
});
