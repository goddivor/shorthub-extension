// Modern ShortHub Extension Popup (Simplified - Config from .env)
class ModernShortHubPopup {
  constructor() {
    this.currentChannelData = null;
    this.isLoading = false;
    this.hasAuthToken = false;
    this.userInfo = null;
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.checkAuthentication();
  }

  async checkAuthentication() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getUserInfo'
      });

      this.hasAuthToken = response.hasAuth;
      this.userInfo = response.user;

      if (this.hasAuthToken && this.userInfo) {
        // User is authenticated
        this.showAuthenticatedInterface();
        await this.analyzeCurrentPage();
      } else {
        // User needs to login
        this.showLoginInterface();
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      this.showLoginInterface();
    }
  }

  showLoginInterface() {
    // Hide authenticated sections
    document.getElementById('user-info-section').classList.add('hidden');
    document.getElementById('status-section').classList.add('hidden');
    document.getElementById('channel-section').classList.add('hidden');

    // Show login section
    document.getElementById('login-section').classList.remove('hidden');
  }

  showAuthenticatedInterface() {
    // Hide login section
    document.getElementById('login-section').classList.add('hidden');

    // Show authenticated sections
    document.getElementById('user-info-section').classList.remove('hidden');
    document.getElementById('status-section').classList.remove('hidden');

    // Update user info display
    this.updateUserInfoDisplay();
  }

  updateUserInfoDisplay() {
    if (!this.userInfo) return;

    document.getElementById('user-name').textContent = this.userInfo.username;
    document.getElementById('user-role').textContent = this.userInfo.role;

    // Update avatar with first letter of username
    const avatar = document.getElementById('user-avatar');
    avatar.textContent = this.userInfo.username.charAt(0).toUpperCase();
  }

  setupEventListeners() {
    // Login form
    document.getElementById('login-btn').addEventListener('click', () => {
      this.handleLogin();
    });

    document.getElementById('login-username').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('login-password').focus();
      }
    });

    document.getElementById('login-password').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleLogin();
      }
    });

    // Advanced options toggle
    document.getElementById('advanced-toggle').addEventListener('click', () => {
      this.toggleAdvancedOptions();
    });

    // Manual token
    document.getElementById('save-manual-token-btn').addEventListener('click', () => {
      this.saveManualToken();
    });

    document.getElementById('manual-token-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.saveManualToken();
      }
    });

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', () => {
      this.handleLogout();
    });

    // Content type change
    document.getElementById('content-type-select').addEventListener('change', () => {
      this.validateForm();
    });

    // Add channel button
    document.getElementById('add-channel-btn').addEventListener('click', () => {
      this.addChannel();
    });

    // Open app button
    document.getElementById('open-app-btn').addEventListener('click', () => {
      this.openShortHubApp();
    });
  }

  async handleLogin() {
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      this.showLoginMessage('Veuillez entrer votre nom d\'utilisateur et mot de passe', 'error');
      return;
    }

    try {
      this.setLoginLoading(true);

      const response = await chrome.runtime.sendMessage({
        action: 'login',
        username: username,
        password: password
      });

      if (response.success) {
        this.hasAuthToken = true;
        this.userInfo = response.user;
        this.showLoginMessage(response.message, 'success');

        // Wait a bit then show authenticated interface
        setTimeout(() => {
          this.showAuthenticatedInterface();
          this.analyzeCurrentPage();
        }, 1000);
      } else {
        this.showLoginMessage(response.error || 'Échec de la connexion', 'error');
      }
    } catch (error) {
      console.error('Error during login:', error);
      this.showLoginMessage('Erreur lors de la connexion', 'error');
    } finally {
      this.setLoginLoading(false);
    }
  }

  async handleLogout() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'logout'
      });

      if (response.success) {
        this.hasAuthToken = false;
        this.userInfo = null;
        this.currentChannelData = null;

        // Reset form
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';

        // Show login interface
        this.showLoginInterface();
        this.showLoginMessage('Déconnexion réussie', 'success');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  toggleAdvancedOptions() {
    const toggle = document.getElementById('advanced-toggle');
    const content = document.getElementById('advanced-content');

    toggle.classList.toggle('active');
    content.classList.toggle('hidden');
  }

  async saveManualToken() {
    const tokenInput = document.getElementById('manual-token-input');
    const token = tokenInput.value.trim();

    if (!token) {
      this.showLoginMessage('Veuillez entrer un token JWT', 'error');
      return;
    }

    try {
      this.setLoginLoading(true);

      const response = await chrome.runtime.sendMessage({
        action: 'setAuthToken',
        token: token
      });

      if (response.success) {
        this.hasAuthToken = true;
        this.userInfo = response.user;
        this.showLoginMessage(response.message, 'success');

        // Wait a bit then show authenticated interface
        setTimeout(() => {
          this.showAuthenticatedInterface();
          this.analyzeCurrentPage();
        }, 1000);
      } else {
        this.showLoginMessage(response.error || 'Token invalide', 'error');
      }
    } catch (error) {
      console.error('Error saving manual token:', error);
      this.showLoginMessage('Erreur lors de la validation du token', 'error');
    } finally {
      this.setLoginLoading(false);
    }
  }

  async analyzeCurrentPage() {
    try {
      this.updateStatus('Analyzing current page...', 'loading');

      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !this.isYouTubePage(tab.url)) {
        this.updateStatus('Not a YouTube page', 'error');
        this.showChannelSection(false);
        return;
      }

      this.updateStatus('YouTube page detected', 'success');

      // Extract channel info from URL
      const channelData = await this.extractChannelFromUrl(tab.url);

      if (channelData) {
        this.currentChannelData = channelData;
        this.updateChannelDisplay(channelData);
        this.showChannelSection(true);
        this.updateStatus('Channel found!', 'success');
      } else {
        this.updateStatus('Could not extract channel info', 'error');
        this.showChannelSection(false);
      }
    } catch (error) {
      console.error('Error analyzing page:', error);
      this.updateStatus('Error analyzing page', 'error');
      this.showChannelSection(false);
    }
  }

  async extractChannelFromUrl(url) {
    try {
      // Send message to background script to get channel data using YouTube API
      const response = await chrome.runtime.sendMessage({
        action: 'extractChannelFromUrl',
        url: url
      });

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to extract channel data');
      }
    } catch (error) {
      console.error('Error extracting channel data:', error);
      return null;
    }
  }

  isYouTubePage(url) {
    if (!url) return false;
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      return ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(hostname);
    } catch (error) {
      return false;
    }
  }

  updateStatus(text, type) {
    const statusElement = document.getElementById('page-status');
    const statusText = document.getElementById('status-text');

    statusText.textContent = text;

    // Update status styling
    statusElement.className = 'page-status';
    if (type === 'success') {
      statusElement.classList.add('youtube');
    } else if (type === 'error') {
      statusElement.classList.add('not-youtube');
    } else {
      statusElement.classList.add('not-youtube'); // loading state
    }
  }

  updateChannelDisplay(channelData) {
    document.getElementById('channel-name').textContent = channelData.channelName || channelData.name || 'Unknown Channel';
    document.getElementById('subscriber-count').textContent =
      this.formatSubscriberCount(channelData.subscriberCount) + ' subscribers';

    // Update avatar with first letter of channel name or profile image
    const avatar = document.getElementById('channel-avatar');
    const channelName = channelData.channelName || channelData.name || 'U';

    if (channelData.profileImageUrl) {
      avatar.innerHTML = '<img src="' + channelData.profileImageUrl + '" alt="' + channelName + '" style="width: 100%; height: 100%; object-fit: cover; border-radius: 16px;">';
    } else {
      avatar.innerHTML = channelName.charAt(0).toUpperCase();
    }
  }

  showChannelSection(show) {
    const section = document.getElementById('channel-section');
    if (show) {
      section.classList.remove('hidden');
      section.classList.add('slide-in');
    } else {
      section.classList.add('hidden');
    }
  }

  validateForm() {
    const contentType = document.getElementById('content-type-select').value;
    const addBtn = document.getElementById('add-channel-btn');

    const isValid = contentType && this.currentChannelData && this.hasAuthToken;

    addBtn.disabled = !isValid;
  }

  async addChannel() {
    if (!this.currentChannelData) {
      this.showMessage('No channel data available', 'error');
      return;
    }

    if (!this.hasAuthToken) {
      this.showMessage('Veuillez d\'abord configurer votre token d\'authentification', 'error');
      this.showTokenSetup();
      return;
    }

    const contentType = document.getElementById('content-type-select').value;

    if (!contentType) {
      this.showMessage('Please select a content type', 'error');
      return;
    }

    try {
      this.setLoading(true);

      const channelData = {
        youtubeUrl: this.currentChannelData.url,
        contentType: contentType
      };

      const response = await chrome.runtime.sendMessage({
        action: 'saveChannel',
        data: channelData
      });

      if (response.success) {
        this.showMessage('Channel added successfully!', 'success');
        this.resetForm();
      } else {
        this.showMessage(response.error || 'Failed to add channel', 'error');
      }
    } catch (error) {
      console.error('Error adding channel:', error);
      this.showMessage('Failed to add channel', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  openShortHubApp() {
    // Try to use the endpoint from config
    const appUrl = 'https://short-hub.vercel.app/'; // Update with your production URL
    chrome.tabs.create({ url: appUrl });
  }

  resetForm() {
    document.getElementById('content-type-select').value = '';
    this.validateForm();
  }

  setLoading(loading) {
    this.isLoading = loading;
    const addBtn = document.getElementById('add-channel-btn');

    if (loading) {
      addBtn.innerHTML = '<div class="loading-spinner"></div>Processing...';
      addBtn.disabled = true;
    } else {
      addBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>Ajouter à ShortHub';
      this.validateForm();
    }
  }

  setLoginLoading(loading) {
    const loginBtn = document.getElementById('login-btn');
    const saveManualTokenBtn = document.getElementById('save-manual-token-btn');

    if (loading) {
      loginBtn.innerHTML = '<div class="loading-spinner"></div>Connexion...';
      loginBtn.disabled = true;
      saveManualTokenBtn.disabled = true;
    } else {
      loginBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 17l5-5-5-5v10z"/><path d="M0 0h24v24H0z" fill="none"/></svg>Se connecter';
      loginBtn.disabled = false;
      saveManualTokenBtn.disabled = false;
    }
  }

  showLoginMessage(message, type) {
    const container = document.getElementById('login-message-container');

    // Remove existing messages
    container.innerHTML = '';

    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'error-message' : 'success-message';

    const icon = type === 'error' ? '⚠️' : '✅';
    messageDiv.innerHTML = '<span>' + icon + '</span><span>' + message + '</span>';

    container.appendChild(messageDiv);

    // Auto remove after 5 seconds
    setTimeout(() => {
      messageDiv.remove();
    }, 5000);
  }

  showMessage(message, type) {
    const container = document.getElementById('message-container');

    // Remove existing messages
    container.innerHTML = '';

    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'error-message' : 'success-message';

    const icon = type === 'error' ? '⚠️' : '✅';
    messageDiv.innerHTML = '<span>' + icon + '</span><span>' + message + '</span>';

    container.appendChild(messageDiv);

    // Auto remove after 5 seconds
    setTimeout(() => {
      messageDiv.remove();
    }, 5000);
  }

  formatSubscriberCount(count) {
    if (!count) return '0';
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ModernShortHubPopup();
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.close();
  }
});
