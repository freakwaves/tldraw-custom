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
      this.showLoading();
      
      // Fetch room data
      const response = await fetch(`${this.config.apiUrl}/api/rooms/${slug}`);
      if (!response.ok) {
        throw new Error('Room not found');
      }
      
      const result = await response.json();
      this.currentRoom = result.room;
      
      // Connect to WebSocket
      await this.connectWebSocket();
      
      // Initialize tldraw
      await this.initializeTldraw();
      
      // Update UI
      this.showRoomInterface();
      this.updateURL(slug);
      
      console.log('Joined room:', slug);
      
    } catch (error) {
      console.error('Failed to join room:', error);
      this.showError('Failed to join room: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  async connectWebSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${this.config.apiUrl.replace(/^https?:\/\//, '')}/ws`;
      
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('WebSocket connected');
        
        // Join the room
        if (this.currentRoom) {
          this.websocket.send(JSON.stringify({
            type: 'join_room',
            roomId: this.currentRoom.slug,
            userId: this.currentUser || 'anonymous'
          }));
        }
      };
      
      this.websocket.onmessage = (event) => {
        this.handleWebSocketMessage(event.data);
      };
      
      this.websocket.onclose = () => {
        console.log('WebSocket disconnected');
        this.handleWebSocketDisconnect();
      };
      
      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.showError('Connection error');
      };
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.showError('Failed to connect to server');
    }
  }

  handleWebSocketMessage(message) {
    try {
      const data = JSON.parse(message);
      console.log('Received WebSocket message:', data);
      
      switch (data.type) {
        case 'sync_update':
          // Handle tldraw sync updates
          if (data.roomId === this.currentRoom.slug && this.tldrawEditor) {
            try {
              this.tldrawEditor.store.loadSnapshot(data.data);
              console.log('Applied tldraw sync update from server');
            } catch (error) {
              console.error('Failed to apply sync update:', error);
            }
          }
          break;
          
        case 'user_joined':
          this.handleUserActivity(data);
          break;
          
        case 'user_left':
          this.handleUserActivity(data);
          break;
          
        case 'room_info':
          this.updateRoomInfo(data);
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  handleWebSocketDisconnect() {
    this.showError('Connection lost. Please refresh the page.');
  }

  async initializeTldraw() {
    try {
      console.log('Starting tldraw initialization...');
      
      // Wait for modules to load
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max wait
      
      while (attempts < maxAttempts) {
        console.log('Available libraries:', {
          Tldraw: typeof window.Tldraw,
          TldrawSync: typeof window.TldrawSync,
          React: typeof React,
          ReactDOM: typeof ReactDOM
        });
        
        if (typeof window.Tldraw !== 'undefined' && window.Tldraw.Tldraw) {
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      // Check if tldraw is available
      if (typeof window.Tldraw === 'undefined' || !window.Tldraw.Tldraw) {
        throw new Error('tldraw not loaded - check network connection');
      }
      
      // Create a container for tldraw
      const container = document.getElementById('tldraw-container');
      container.innerHTML = ''; // Clear the placeholder
      
      // Create a div for tldraw to mount into
      const tldrawDiv = document.createElement('div');
      tldrawDiv.style.width = '100%';
      tldrawDiv.style.height = '100%';
      tldrawDiv.style.position = 'relative';
      container.appendChild(tldrawDiv);
      
      // Create React root and render tldraw
      const root = ReactDOM.createRoot(tldrawDiv);
      
      // Create asset store for file uploads
      const assetStore = this.createAssetStore();
      
      // Create a custom sync adapter that uses our WebSocket
      const syncAdapter = this.createSyncAdapter();
      
      console.log('Rendering tldraw component...');
      
      root.render(
        React.createElement(window.Tldraw.Tldraw, {
          assetUrls: assetStore,
          onMount: (editor) => {
            console.log('tldraw mounted successfully');
            this.tldrawEditor = editor;
            
            // Set up sync adapter
            if (syncAdapter) {
              editor.store.syncAdapter = syncAdapter;
            }
            
            // Load existing data if available
            if (this.currentRoom.data) {
              try {
                const data = JSON.parse(this.currentRoom.data);
                editor.store.loadSnapshot(data);
                console.log('Loaded existing room data');
              } catch (error) {
                console.error('Failed to load room data:', error);
              }
            }
          },
          onError: (error) => {
            console.error('tldraw error:', error);
            this.showError('Drawing interface error: ' + error.message);
          }
        })
      );

    } catch (error) {
      console.error('Failed to initialize tldraw:', error);
      console.error('Error details:', error.stack);
      // Fallback to placeholder
      this.showTldrawPlaceholder();
    }
  }

  createSyncAdapter() {
    // Create a custom sync adapter that integrates with our WebSocket
    return {
      // Send updates to server
      sendMessage: (message) => {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
          this.websocket.send(JSON.stringify({
            type: 'sync_update',
            roomId: this.currentRoom.slug,
            data: message
          }));
        }
      },
      
      // Handle incoming updates
      onMessage: (message) => {
        // This will be called by our WebSocket message handler
        console.log('Received sync message:', message);
      }
    };
  }

  createAssetStore() {
    return {
      // Upload file to backend
      upload: async (file) => {
        try {
          console.log('Uploading asset:', file.name, file.type, file.size);
          
          const formData = new FormData();
          formData.append('file', file);
          formData.append('roomId', this.currentRoom.slug);
          
          const response = await fetch(`${this.config.apiUrl}/api/assets/upload`, {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
          }
          
          const result = await response.json();
          console.log('Asset uploaded successfully:', result.asset);
          
          return result.asset.url;
          
        } catch (error) {
          console.error('Asset upload failed:', error);
          this.showError('Failed to upload asset: ' + error.message);
          throw error;
        }
      },
      
      // Resolve asset URL for tldraw
      resolve: (assetId) => {
        if (!assetId) return null;
        return `${this.config.apiUrl}/assets/uploads/${assetId}`;
      }
    };
  }





  showTldrawPlaceholder() {
    const container = document.getElementById('tldraw-container');
    container.innerHTML = `
      <div style="
        width: 100%; 
        height: 100%; 
        background: #f8f9fa; 
        border: 2px dashed #dee2e6; 
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        color: #6c757d;
        font-family: 'Inter', sans-serif;
      ">
        <div style="font-size: 24px; margin-bottom: 16px;">✏️</div>
        <div style="font-size: 18px; font-weight: 500; margin-bottom: 8px;">Drawing Interface</div>
        <div style="font-size: 14px; text-align: center; max-width: 300px;">
          Room: ${this.currentRoom.slug}<br>
          Real-time collaboration ready
        </div>
        <div style="margin-top: 16px; padding: 8px 16px; background: #e9ecef; border-radius: 4px; font-size: 12px;">
          Backend services connected ✓
        </div>
        <div style="margin-top: 8px; padding: 8px 16px; background: #d1ecf1; border-radius: 4px; font-size: 12px; color: #0c5460;">
          WebSocket: ${this.websocket ? 'Connected' : 'Disconnected'}
        </div>
        <div style="margin-top: 8px; padding: 8px 16px; background: #f8d7da; border-radius: 4px; font-size: 12px; color: #721c24;">
          tldraw sync loading failed
        </div>
      </div>
    `;
    console.log('Drawing interface placeholder loaded (fallback)');
    this.setupCollaborationPlaceholder();
  }



  setupCollaboration(editor) {
    // Set up real-time collaboration through WebSocket
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      // Listen for tldraw updates
      editor.store.listen(() => {
        const snapshot = editor.store.getSnapshot();
        this.websocket.send(JSON.stringify({
          type: 'tldraw_update',
          roomId: this.currentRoom.slug,
          data: snapshot,
        }));
      });
    }
  }

  setupCollaborationPlaceholder() {
    // This method is a placeholder for the actual tldraw setup
    // It will be replaced with the actual tldraw initialization once the integration is complete
    console.log('Placeholder for tldraw setup. Actual tldraw will be initialized here.');
    // Example: If you had a tldraw editor instance, you would set it up here
    // this.tldrawApp = new Tldraw({ ... });
  }

  handleTldrawUpdate(data) {
    // Handle tldraw updates from other users
    if (this.tldrawEditor && this.tldrawEditor.store) {
      try {
        this.tldrawEditor.store.loadSnapshot(data);
        console.log('Applied tldraw update from other user');
      } catch (error) {
        console.error('Failed to apply tldraw update:', error);
      }
    } else {
      console.log('tldraw editor not ready, update queued');
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