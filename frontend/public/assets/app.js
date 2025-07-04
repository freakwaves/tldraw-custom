// Custom tldraw Application
class TldrawApp {
  constructor() {
    this.config = window.TLDRAW_CONFIG;
    this.currentRoom = null;
    this.currentUser = null;
    this.websocket = null;
    this.tldrawApp = null;
    this.participants = new Map();
    
    this.init();
  }

  async init() {
    try {
      // Show loading screen
      this.showLoading();
      
      // Initialize UI
      this.initializeUI();
      
      // Check for room in URL
      const roomSlug = this.getRoomFromURL();
      if (roomSlug) {
        await this.joinRoom(roomSlug);
      } else {
        // Show main interface
        this.hideLoading();
        this.showMainInterface();
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to initialize application');
    }
  }

  initializeUI() {
    // Bind event listeners
    this.bindEvents();
    
    // Initialize modals
    this.initializeModals();
  }

  bindEvents() {
    // Header buttons
    document.getElementById('new-room-btn').addEventListener('click', () => {
      this.showModal('new-room-modal');
    });

    document.getElementById('join-room-btn').addEventListener('click', () => {
      this.showModal('join-room-modal');
    });

    document.getElementById('settings-btn').addEventListener('click', () => {
      this.toggleSidebar();
    });

    // Room info buttons
    document.getElementById('copy-link-btn').addEventListener('click', () => {
      this.copyRoomLink();
    });

    document.getElementById('leave-room-btn').addEventListener('click', () => {
      this.leaveRoom();
    });

    // Modal buttons
    document.getElementById('create-room-btn').addEventListener('click', () => {
      this.createRoom();
    });

    document.getElementById('join-room-submit-btn').addEventListener('click', () => {
      this.joinRoomFromModal();
    });

    // Sidebar
    document.getElementById('close-sidebar-btn').addEventListener('click', () => {
      this.toggleSidebar();
    });

    document.getElementById('save-settings-btn').addEventListener('click', () => {
      this.saveRoomSettings();
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        this.hideAllModals();
      });
    });

    // Close modal when clicking overlay
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') {
        this.hideAllModals();
      }
    });
  }

  initializeModals() {
    // Auto-generate room slug from name
    const nameInput = document.getElementById('new-room-name');
    const slugInput = document.getElementById('new-room-slug');
    
    nameInput.addEventListener('input', () => {
      const slug = nameInput.value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      slugInput.value = slug;
    });
  }

  async createRoom() {
    const name = document.getElementById('new-room-name').value.trim();
    const slug = document.getElementById('new-room-slug').value.trim();
    const isPublic = document.getElementById('new-room-public').checked;

    if (!name || !slug) {
      this.showError('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          slug,
          isPublic,
          maxUsers: this.config.tldraw.defaultMaxUsers,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const data = await response.json();
      this.hideAllModals();
      await this.joinRoom(slug);
    } catch (error) {
      console.error('Error creating room:', error);
      this.showError('Failed to create room');
    }
  }

  async joinRoomFromModal() {
    const slug = document.getElementById('join-room-slug').value.trim();
    const userName = document.getElementById('user-name').value.trim();

    if (!slug || !userName) {
      this.showError('Please fill in all required fields');
      return;
    }

    this.currentUser = userName;
    this.hideAllModals();
    await this.joinRoom(slug);
  }

  async joinRoom(slug) {
    try {
      // Fetch room info
      const response = await fetch(`${this.config.apiUrl}/api/rooms/${slug}`);
      
      if (!response.ok) {
        throw new Error('Room not found');
      }

      const data = await response.json();
      this.currentRoom = data.room;

      // Update URL
      this.updateURL(slug);

      // Initialize WebSocket connection
      await this.connectWebSocket();

      // Initialize tldraw
      await this.initializeTldraw();

      // Show room interface
      this.showRoomInterface();

    } catch (error) {
      console.error('Error joining room:', error);
      this.showError('Failed to join room');
    }
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      this.websocket = new WebSocket(`${this.config.wsUrl}/ws`);

      this.websocket.onopen = () => {
        console.log('WebSocket connected');
        
        // Join room
        this.websocket.send(JSON.stringify({
          type: 'join_room',
          roomId: this.currentRoom.slug,
          userId: this.currentUser,
        }));

        resolve();
      };

      this.websocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.handleWebSocketMessage(message);
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.websocket.onclose = () => {
        console.log('WebSocket disconnected');
        this.handleWebSocketDisconnect();
      };
    });
  }

  handleWebSocketMessage(message) {
    switch (message.type) {
      case 'welcome':
        console.log('Connected to server:', message.message);
        break;

      case 'room_joined':
        console.log('Joined room:', message.roomName);
        this.updateRoomInfo(message);
        break;

      case 'user_joined':
        this.addParticipant(message.userId);
        break;

      case 'user_left':
        this.removeParticipant(message.userId);
        break;

      case 'tldraw_update':
        this.handleTldrawUpdate(message.data);
        break;

      case 'user_activity':
        this.handleUserActivity(message);
        break;

      case 'error':
        this.showError(message.message);
        break;
    }
  }

  handleWebSocketDisconnect() {
    this.showError('Connection lost. Please refresh the page.');
  }

  async initializeTldraw() {
    try {
      // Load tldraw dynamically
      const tldrawModule = await import('https://unpkg.com/@tldraw/tldraw@3.14.0/dist-esm/index.mjs');
      const Tldraw = tldrawModule.default || tldrawModule.Tldraw;
      
      // Initialize tldraw
      this.tldrawApp = new Tldraw({
        container: document.getElementById('tldraw-container'),
        roomId: this.currentRoom.slug,
        apiKey: 'your-api-key', // Optional for custom backend
        onMount: (app) => {
          console.log('tldraw mounted');
          
          // Load existing data if available
          if (this.currentRoom.data) {
            try {
              const data = JSON.parse(this.currentRoom.data);
              app.store.loadSnapshot(data);
            } catch (error) {
              console.error('Failed to load room data:', error);
            }
          }
        },
        onUpdate: (app) => {
          // Send updates to server
          if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
              type: 'tldraw_update',
              roomId: this.currentRoom.slug,
              data: app.store.getSnapshot(),
            }));
          }
        },
      });

    } catch (error) {
      console.error('Failed to initialize tldraw:', error);
      this.showError('Failed to load drawing interface');
    }
  }

  handleTldrawUpdate(data) {
    if (this.tldrawApp && this.tldrawApp.store) {
      this.tldrawApp.store.loadSnapshot(data);
    }
  }

  handleUserActivity(message) {
    // Handle user activity (cursor positions, etc.)
    console.log('User activity:', message);
  }

  updateRoomInfo(message) {
    document.getElementById('room-name').textContent = message.roomName || this.currentRoom.name;
    this.updateParticipantCount(message.participants?.length || 0);
  }

  addParticipant(userId) {
    this.participants.set(userId, { joinedAt: new Date() });
    this.updateParticipantCount(this.participants.size);
  }

  removeParticipant(userId) {
    this.participants.delete(userId);
    this.updateParticipantCount(this.participants.size);
  }

  updateParticipantCount(count) {
    document.getElementById('room-participants').textContent = `${count} participant${count !== 1 ? 's' : ''}`;
  }

  copyRoomLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      this.showSuccess('Room link copied to clipboard');
    }).catch(() => {
      this.showError('Failed to copy link');
    });
  }

  async leaveRoom() {
    if (this.websocket) {
      this.websocket.send(JSON.stringify({
        type: 'leave_room',
        roomId: this.currentRoom.slug,
        userId: this.currentUser,
      }));
      this.websocket.close();
    }

    this.currentRoom = null;
    this.currentUser = null;
    this.participants.clear();

    // Clean up tldraw
    if (this.tldrawApp) {
      this.tldrawApp.dispose();
      this.tldrawApp = null;
    }

    // Show main interface
    this.showMainInterface();
    this.updateURL();
  }

  async saveRoomSettings() {
    const name = document.getElementById('room-name-input').value.trim();
    const maxUsers = parseInt(document.getElementById('max-users-input').value);
    const isPublic = document.getElementById('public-room-checkbox').checked;

    try {
      const response = await fetch(`${this.config.apiUrl}/api/rooms/${this.currentRoom.slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          maxUsers,
          isPublic,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update room settings');
      }

      const data = await response.json();
      this.currentRoom = data.room;
      this.showSuccess('Room settings updated');
      this.toggleSidebar();
    } catch (error) {
      console.error('Error updating room settings:', error);
      this.showError('Failed to update room settings');
    }
  }

  // UI Methods
  showLoading() {
    document.getElementById('loading-screen').style.display = 'flex';
  }

  hideLoading() {
    document.getElementById('loading-screen').style.display = 'none';
  }

  showMainInterface() {
    document.getElementById('app').style.display = 'flex';
    document.getElementById('room-info').style.display = 'none';
  }

  showRoomInterface() {
    document.getElementById('room-info').style.display = 'block';
    this.hideLoading();
  }

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('show');
  }

  showModal(modalId) {
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById(modalId).style.display = 'block';
  }

  hideAllModals() {
    document.getElementById('modal-overlay').style.display = 'none';
    document.querySelectorAll('.modal').forEach(modal => {
      modal.style.display = 'none';
    });
  }

  // Utility Methods
  getRoomFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('room');
  }

  updateURL(roomSlug = null) {
    const url = new URL(window.location);
    if (roomSlug) {
      url.searchParams.set('room', roomSlug);
    } else {
      url.searchParams.delete('room');
    }
    window.history.replaceState({}, '', url);
  }

  showError(message) {
    // Simple error notification
    alert(`Error: ${message}`);
  }

  showSuccess(message) {
    // Simple success notification
    alert(`Success: ${message}`);
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TldrawApp();
}); 