let socket;

const authModal = document.getElementById('auth-modal');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authDesc = document.getElementById('auth-desc');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const toggleAuth = document.getElementById('toggle-auth');
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');

const mainApp = document.getElementById('main-app');
const currentUsernameDisplay = document.getElementById('current-username');
const logoutBtn = document.getElementById('logout-btn');

const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const uploadBtn = document.getElementById('upload-btn');
const imageInput = document.getElementById('image-input');
const messagesContainer = document.getElementById('messages');
const connectionDot = document.getElementById('connection-dot');
const chatWindow = document.getElementById('chat-window');

const onlineCount = document.getElementById('online-count');
const onlineUsersList = document.getElementById('online-users-list');
const typingIndicator = document.getElementById('typing-indicator');
const typingText = document.getElementById('typing-text');

let currentUser = '';
let currentUserId = '';
let currentRoom = 'global';
let chatHistory = {}; 
let unreadCounts = {}; 
let isLoginMode = true;
let typingTimeout;

// SVGs
const ICONS = {
    sent: `<svg class="status-icon status-sent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    delivered: `<svg class="status-icon status-delivered" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 13 12 18 22 8"></polyline><polyline points="2 13 7 18 12 13"></polyline></svg>`,
    read: `<svg class="status-icon status-read" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 13 12 18 22 8"></polyline><polyline points="2 13 7 18 12 13"></polyline></svg>`
};

// Auth Logic
toggleAuth.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    authTitle.textContent = isLoginMode ? 'Welcome back' : 'Create Account';
    authDesc.textContent = isLoginMode ? 'Please login to enter the harbor.' : 'Join the OceanTalk community.';
    authSubmitBtn.textContent = isLoginMode ? 'Login' : 'Sign Up';
    toggleAuth.textContent = isLoginMode ? 'Sign Up' : 'Login';
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/signup';
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.username);
            localStorage.setItem('userId', data.userId);
            currentUser = data.username;
            currentUserId = data.userId;
            initSocket(data.token);
            showApp(data.username);
        } else {
            alert(data.message || 'Authentication failed');
        }
    } catch (err) {
        console.error('Auth error:', err);
    }
});

function showApp(username) {
    currentUsernameDisplay.textContent = username;
    authModal.classList.add('hidden');
    mainApp.classList.remove('hidden');
    setTimeout(() => messageInput.focus(), 500);
}

function initSocket(token) {
    socket = io({ auth: { token } });

    socket.on('connect', () => {
        connectionDot.classList.add('connected');
        socket.emit('get messages', currentRoom);
    });

    socket.on('connect_error', (err) => {
        if (err.message.includes('Authentication error')) logout();
    });

    socket.on('previous messages', ({ roomId, messages }) => {
        chatHistory[roomId] = messages;
        if (roomId === currentRoom) {
            unreadCounts[roomId] = 0;
            updateUnreadUI(roomId);
            renderHistory(roomId);
        }
    });

    socket.on('chat message', (msg) => {
        if (!chatHistory[msg.roomId]) chatHistory[msg.roomId] = [];
        chatHistory[msg.roomId].push(msg);
        
        if (msg.roomId === currentRoom) {
            addMessage(msg);
            if (msg.username !== currentUser) {
                socket.emit('mark as read', msg.roomId);
            }
        } else {
            unreadCounts[msg.roomId] = (unreadCounts[msg.roomId] || 0) + 1;
            updateUnreadUI(msg.roomId);
        }
    });

    socket.on('messages read', ({ roomId, reader }) => {
        if (reader !== currentUser) {
            if (chatHistory[roomId]) {
                chatHistory[roomId].forEach(m => {
                    if (m.username === currentUser) m.status = 'read';
                });
            }
            if (roomId === currentRoom) renderHistory(roomId);
        }
    });

    socket.on('online users', (users) => updateOnlineUsers(users));

    socket.on('typing', ({ username, roomId }) => {
        if (roomId === currentRoom) {
            typingText.textContent = `${username} is typing`;
            typingIndicator.classList.remove('hidden');
        }
    });

    socket.on('stop typing', ({ roomId }) => {
        if (roomId === currentRoom) typingIndicator.classList.add('hidden');
    });
}

function updateUnreadUI(roomId) {
    const count = unreadCounts[roomId] || 0;
    const item = document.querySelector(`[data-room-id="${roomId}"]`);
    if (item) {
        let badge = item.querySelector('.unread-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.classList.add('unread-badge');
            item.appendChild(badge);
        }
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    }
}

function updateOnlineUsers(users) {
    onlineCount.textContent = users.length;
    onlineUsersList.innerHTML = '';
    
    users.forEach(user => {
        if (user.id === currentUserId) return;
        const userEl = document.createElement('li');
        userEl.classList.add('online-user');
        const dmRoomId = getDmRoomId(currentUserId, user.id);
        userEl.setAttribute('data-room-id', dmRoomId);
        if (currentRoom === dmRoomId) userEl.classList.add('active');
        
        userEl.innerHTML = `
            <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
            <div class="user-name">${user.username}</div>
            <div class="user-status-dot"></div>
            <span class="unread-badge ${unreadCounts[dmRoomId] ? '' : 'hidden'}">${unreadCounts[dmRoomId] || 0}</span>
        `;
        
        userEl.onclick = () => switchRoom(dmRoomId, user.username);
        onlineUsersList.appendChild(userEl);
    });
}

function getDmRoomId(id1, id2) {
    return `dm_${[id1, id2].sort().join('_')}`;
}

function switchRoom(roomId, roomName) {
    if (currentRoom === roomId) return;
    unreadCounts[roomId] = 0;
    updateUnreadUI(roomId);

    document.querySelectorAll('.room-item, .online-user').forEach(el => el.classList.remove('active'));
    if (roomId === 'global') document.querySelector('[data-room-id="global"]').classList.add('active');

    currentRoom = roomId;
    typingIndicator.classList.add('hidden');
    messagesContainer.innerHTML = '<div class="system-message">Loading messages...</div>';
    
    socket.emit('join room', roomId);
    socket.emit('get messages', roomId);
    
    messageInput.placeholder = `Message ${roomName}...`;
    messageInput.focus();
}

document.querySelector('[data-room-id="global"]').onclick = () => switchRoom('global', 'Global Harbor');

function logout() {
    localStorage.clear();
    location.reload();
}
logoutBtn.addEventListener('click', logout);

// Media Upload Logic
uploadBtn.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Simulation/Placeholder for Cloudinary
    // In a real app, you'd use: 
    // const formData = new FormData();
    // formData.append('file', file);
    // formData.append('upload_preset', 'your_preset');
    // const res = await fetch('https://api.cloudinary.com/v1_1/your_cloud/image/upload', { method: 'POST', body: formData });
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const base64Image = event.target.result;
        socket.emit('chat message', {
            roomId: currentRoom,
            messageType: 'image',
            mediaUrl: base64Image, // Sending base64 for simulation purposes
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    };
    reader.readAsDataURL(file);
    imageInput.value = ''; // Reset
});

messageInput.addEventListener('input', () => {
    if (!socket) return;
    socket.emit('typing', currentRoom);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => socket.emit('stop typing', currentRoom), 2000);
});

window.addEventListener('load', () => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const userId = localStorage.getItem('userId');
    if (token && username && userId) {
        currentUser = username;
        currentUserId = userId;
        showApp(username);
        initSocket(token);
    }
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = messageInput.value.trim();
    if (msg && socket) {
        socket.emit('chat message', {
            roomId: currentRoom,
            text: msg,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        messageInput.value = '';
        socket.emit('stop typing', currentRoom);
        clearTimeout(typingTimeout);
    }
});

function renderHistory(roomId) {
    messagesContainer.innerHTML = '';
    const history = chatHistory[roomId] || [];
    if (history.length === 0) {
        const welcome = document.createElement('div');
        welcome.classList.add('system-message');
        welcome.textContent = roomId === 'global' ? 'Welcome to the harbor.' : 'Beginning of private conversation.';
        messagesContainer.appendChild(welcome);
    } else {
        history.forEach(msg => addMessage(msg));
    }
}

function addMessage(msg) {
    const messageElement = document.createElement('div');
    const isSent = msg.username === currentUser;
    messageElement.classList.add('message', isSent ? 'sent' : 'received');
    
    const statusIcon = isSent ? ICONS[msg.status || 'sent'] : '';
    
    let content = '';
    if (msg.messageType === 'image') {
        content = `<img src="${msg.mediaUrl}" class="message-image" alt="Uploaded Image">`;
    } else {
        content = `<div class="msg-content">${msg.text}</div>`;
    }
    
    messageElement.innerHTML = `
        ${!isSent ? `<div class="username">${msg.username}</div>` : ''}
        ${content}
        <div class="msg-footer">
            <span class="msg-time">${msg.timestamp}</span>
            ${isSent ? `<span class="msg-status">${statusIcon}</span>` : ''}
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}
