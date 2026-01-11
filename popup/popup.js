// Modern ShortHub Extension Popup (Simplified - Config from .env)
class ModernShortHubPopup {
  constructor() {
    this.currentChannelData = null;
    this.isLoading = false;
    this.hasAuthToken = false;
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.checkAuthToken();
    await this.analyzeCurrentPage();
  }

  async checkAuthToken() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getAuthToken'
      });

      this.hasAuthToken = !!response.token;

      if (!this.hasAuthToken) {
        this.showTokenSetup();
      }
    } catch (error) {
      console.error('Error checking auth token:', error);
      this.showTokenSetup();
    }
  }

  showTokenSetup() {
    const tokenSetupSection = document.getElementById('token-setup-section');
    tokenSetupSection.classList.remove('hidden');
  }

  hideTokenSetup() {
    const tokenSetupSection = document.getElementById('token-setup-section');
    tokenSetupSection.classList.add('hidden');
  }

  setupEventListeners() {
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

    // Save token button
    document.getElementById('save-token-btn').addEventListener('click', () => {
      this.saveAuthToken();
    });

    // Enter key in token input
    document.getElementById('auth-token-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.saveAuthToken();
      }
    });
  }

  async saveAuthToken() {
    const tokenInput = document.getElementById('auth-token-input');
    const token = tokenInput.value.trim();

    if (!token) {
      this.showMessage('Veuillez entrer un token JWT', 'error');
      return;
    }

    try {
      this.setLoading(true);

      const response = await chrome.runtime.sendMessage({
        action: 'setAuthToken',
        token: token
      });

      if (response.success) {
        this.hasAuthToken = true;
        this.hideTokenSetup();
        this.showMessage('Token enregistré avec succès!', 'success');

        // Test connection
        const testResponse = await chrome.runtime.sendMessage({
          action: 'testConnection'
        });

        if (testResponse.success) {
          this.showMessage(testResponse.message, 'success');
        } else {
          this.showMessage('Token enregistré mais connexion échouée: ' + testResponse.error, 'error');
        }
      } else {
        this.showMessage(response.error || 'Échec de l\'enregistrement du token', 'error');
      }
    } catch (error) {
      console.error('Error saving token:', error);
      this.showMessage('Erreur lors de l\'enregistrement', 'error');
    } finally {
      this.setLoading(false);
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
    const saveTokenBtn = document.getElementById('save-token-btn');

    if (loading) {
      addBtn.innerHTML = '<div class="loading-spinner"></div>Processing...';
      addBtn.disabled = true;
      if (saveTokenBtn) {
        saveTokenBtn.disabled = true;
      }
    } else {
      addBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>Add to ShortHub';
      this.validateForm();
      if (saveTokenBtn) {
        saveTokenBtn.disabled = false;
      }
    }
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
