// Modern ShortHub Extension Popup
class ModernShortHubPopup {
  constructor() {
    this.currentChannelData = null;
    this.isLoading = false;
    this.init();
  }

  async init() {
    this.setupTabNavigation();
    this.setupEventListeners();
    await this.loadConfiguration();
    await this.analyzeCurrentPage();
  }

  setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.dataset.tab;
        
        // Remove active classes
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active classes
        button.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
      });
    });
  }

  setupEventListeners() {
    // Form handling
    document.getElementById('type-select').addEventListener('change', (e) => {
      this.handleTypeChange(e.target.value);
    });

    // Enable/disable add button based on form validation
    ['tag-select', 'type-select', 'domain-input'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        this.validateForm();
      });
    });

    // Add channel button
    document.getElementById('add-channel-btn').addEventListener('click', () => {
      this.addChannel();
    });

    // Open app button
    document.getElementById('open-app-btn').addEventListener('click', () => {
      this.openShortHubApp();
    });

    // Configuration form
    document.getElementById('config-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveConfiguration();
    });

    // Test connection
    document.getElementById('test-connection-btn').addEventListener('click', () => {
      this.testConnection();
    });
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
    document.getElementById('channel-name').textContent = channelData.name;
    document.getElementById('subscriber-count').textContent = 
      `${this.formatSubscriberCount(channelData.subscriberCount)} subscribers`;
    
    // Update avatar with first letter of channel name
    const avatar = document.getElementById('channel-avatar');
    avatar.innerHTML = channelData.name.charAt(0).toUpperCase();
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

  handleTypeChange(type) {
    const domainGroup = document.getElementById('domain-group');
    const domainInput = document.getElementById('domain-input');
    
    if (type === 'Only') {
      domainGroup.classList.remove('hidden');
      domainInput.required = true;
    } else {
      domainGroup.classList.add('hidden');
      domainInput.required = false;
      domainInput.value = '';
    }
    
    this.validateForm();
  }

  validateForm() {
    const tag = document.getElementById('tag-select').value;
    const type = document.getElementById('type-select').value;
    const domain = document.getElementById('domain-input').value;
    const addBtn = document.getElementById('add-channel-btn');
    
    let isValid = tag && type && this.currentChannelData;
    
    // If type is "Only", domain is required
    if (type === 'Only' && !domain.trim()) {
      isValid = false;
    }
    
    addBtn.disabled = !isValid;
  }

  async addChannel() {
    if (!this.currentChannelData) {
      this.showMessage('No channel data available', 'error');
      return;
    }

    const tag = document.getElementById('tag-select').value;
    const type = document.getElementById('type-select').value;
    const domain = document.getElementById('domain-input').value.trim();

    if (!tag || !type) {
      this.showMessage('Please fill all required fields', 'error');
      return;
    }

    if (type === 'Only' && !domain) {
      this.showMessage('Domain is required for "Only" type', 'error');
      return;
    }

    try {
      this.setLoading(true);
      
      const channelData = {
        youtube_url: this.currentChannelData.url,
        username: this.currentChannelData.name,
        subscriber_count: this.currentChannelData.subscriberCount,
        tag: tag,
        type: type,
        domain: type === 'Only' ? domain : null
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

  async loadConfiguration() {
    try {
      const result = await chrome.storage.sync.get(['supabaseUrl', 'supabaseKey', 'youtubeApiKey']);
      
      if (result.supabaseUrl) {
        document.getElementById('supabase-url').value = result.supabaseUrl;
      }
      if (result.supabaseKey) {
        document.getElementById('supabase-key').value = result.supabaseKey;
      }
      if (result.youtubeApiKey) {
        document.getElementById('youtube-api-key').value = result.youtubeApiKey;
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  }

  async saveConfiguration() {
    const supabaseUrl = document.getElementById('supabase-url').value.trim();
    const supabaseKey = document.getElementById('supabase-key').value.trim();
    const youtubeApiKey = document.getElementById('youtube-api-key').value.trim();

    if (!supabaseUrl || !supabaseKey) {
      this.showMessage('Supabase URL and Key are required', 'error');
      return;
    }

    try {
      this.setLoading(true);
      
      await chrome.storage.sync.set({
        supabaseUrl: supabaseUrl,
        supabaseKey: supabaseKey,
        youtubeApiKey: youtubeApiKey
      });

      // Update background script configuration
      const response = await chrome.runtime.sendMessage({
        action: 'updateConfiguration',
        data: {
          supabaseUrl: supabaseUrl,
          supabaseKey: supabaseKey,
          youtubeApiKey: youtubeApiKey
        }
      });

      if (response.success) {
        this.showMessage('Configuration saved successfully!', 'success');
      } else {
        this.showMessage(response.error || 'Failed to save configuration', 'error');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      this.showMessage('Failed to save configuration', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  async testConnection() {
    try {
      this.setLoading(true);
      
      const response = await chrome.runtime.sendMessage({
        action: 'testConnection'
      });

      if (response.success) {
        this.showMessage('Connection successful!', 'success');
      } else {
        this.showMessage(response.error || 'Connection failed', 'error');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      this.showMessage('Connection test failed', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  openShortHubApp() {
    chrome.tabs.create({
      url: 'http://localhost:3000' // Update with your app URL
    });
  }

  resetForm() {
    document.getElementById('tag-select').value = '';
    document.getElementById('type-select').value = '';
    document.getElementById('domain-input').value = '';
    document.getElementById('domain-group').classList.add('hidden');
    this.validateForm();
  }

  setLoading(loading) {
    this.isLoading = loading;
    const addBtn = document.getElementById('add-channel-btn');
    
    if (loading) {
      addBtn.innerHTML = `
        <div class="loading-spinner"></div>
        Processing...
      `;
      addBtn.disabled = true;
    } else {
      addBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
        </svg>
        Add to ShortHub
      `;
      this.validateForm();
    }
  }

  showMessage(message, type) {
    const container = document.getElementById('message-container');
    
    // Remove existing messages
    container.innerHTML = '';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
    
    const icon = type === 'error' ? '⚠️' : '✅';
    messageDiv.innerHTML = `
      <span>${icon}</span>
      <span>${message}</span>
    `;
    
    container.appendChild(messageDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      messageDiv.remove();
    }, 5000);
  }

  formatSubscriberCount(count) {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
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