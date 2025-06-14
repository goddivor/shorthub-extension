// ShortHub Extension Popup Script
class ShortHubPopup {
  constructor() {
    this.init();
  }

  async init() {
    this.setupTabNavigation();
    this.setupEventListeners();
    await this.loadConfiguration();
    await this.checkConnectionStatus();
    await this.loadStats();
  }

  // Setup tab navigation
  setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.dataset.tab;
        
        // Remove active class from all tabs and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        button.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
      });
    });
  }

  // Setup event listeners
  setupEventListeners() {
    // Dashboard actions
    document.getElementById('open-app').addEventListener('click', () => {
      this.openShortHubApp();
    });

    document.getElementById('refresh-stats').addEventListener('click', () => {
      this.loadStats();
    });

    // Configuration form
    document.getElementById('config-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveConfiguration();
    });

    document.getElementById('test-connection').addEventListener('click', () => {
      this.testConnection();
    });

    // Password toggle
    document.getElementById('toggle-key').addEventListener('click', () => {
      this.togglePasswordVisibility();
    });
  }

  // Load configuration from storage
  async loadConfiguration() {
    try {
      const result = await chrome.storage.sync.get(['supabaseUrl', 'supabaseKey']);
      
      if (result.supabaseUrl) {
        document.getElementById('supabase-url').value = result.supabaseUrl;
      }
      
      if (result.supabaseKey) {
        document.getElementById('supabase-key').value = result.supabaseKey;
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  }

  // Check connection status
  async checkConnectionStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getConfiguration' });
      
      const statusIndicator = document.getElementById('connection-status');
      const statusText = statusIndicator.querySelector('.status-text');
      
      if (response.success && response.data.configured) {
        // Test actual connection
        const testResult = await chrome.runtime.sendMessage({ action: 'testConnection' });
        
        if (testResult.success) {
          statusIndicator.className = 'status-indicator connected';
          statusText.textContent = 'Connected to ShortHub database';
        } else {
          statusIndicator.className = 'status-indicator error';
          statusText.textContent = 'Connection failed';
        }
      } else {
        statusIndicator.className = 'status-indicator warning';
        statusText.textContent = 'Configuration required';
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      const statusIndicator = document.getElementById('connection-status');
      const statusText = statusIndicator.querySelector('.status-text');
      statusIndicator.className = 'status-indicator error';
      statusText.textContent = 'Connection error';
    }
  }

  // Load stats from database
  async loadStats() {
    try {
      this.showLoading(true);
      
      const response = await chrome.runtime.sendMessage({ action: 'getStats' });
      
      if (response.success) {
        document.getElementById('channels-count').textContent = response.data.channels || '0';
        document.getElementById('shorts-count').textContent = response.data.shorts || '0';
        document.getElementById('validated-count').textContent = response.data.validated || '0';
      } else {
        // Show placeholder values if stats can't be loaded
        document.getElementById('channels-count').textContent = '-';
        document.getElementById('shorts-count').textContent = '-';
        document.getElementById('validated-count').textContent = '-';
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      this.showToast('Failed to load statistics', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // Save configuration
  async saveConfiguration() {
    const supabaseUrl = document.getElementById('supabase-url').value.trim();
    const supabaseKey = document.getElementById('supabase-key').value.trim();

    // Validation
    if (!supabaseUrl || !supabaseKey) {
      this.showToast('Please fill in all fields', 'error');
      return;
    }

    if (!this.isValidSupabaseUrl(supabaseUrl)) {
      this.showToast('Invalid Supabase URL format', 'error');
      return;
    }

    try {
      this.showLoading(true);
      
      const response = await chrome.runtime.sendMessage({
        action: 'updateConfiguration',
        data: {
          supabaseUrl: supabaseUrl,
          supabaseKey: supabaseKey
        }
      });

      if (response.success) {
        this.showToast('Configuration saved successfully!', 'success');
        
        // Show connection test result
        this.displayConnectionResult(response.connectionTest);
        
        // Refresh connection status and stats
        await this.checkConnectionStatus();
        await this.loadStats();
      } else {
        this.showToast(response.error || 'Failed to save configuration', 'error');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      this.showToast('Failed to save configuration', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // Test connection manually
  async testConnection() {
    const supabaseUrl = document.getElementById('supabase-url').value.trim();
    const supabaseKey = document.getElementById('supabase-key').value.trim();

    if (!supabaseUrl || !supabaseKey) {
      this.showToast('Please fill in the configuration fields first', 'warning');
      return;
    }

    try {
      this.showLoading(true);
      
      // First save the configuration temporarily
      const response = await chrome.runtime.sendMessage({
        action: 'updateConfiguration',
        data: {
          supabaseUrl: supabaseUrl,
          supabaseKey: supabaseKey
        }
      });

      if (response.success) {
        this.displayConnectionResult(response.connectionTest);
      } else {
        this.displayConnectionResult({
          success: false,
          error: response.error || 'Configuration error'
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      this.displayConnectionResult({
        success: false,
        error: 'Failed to test connection'
      });
    } finally {
      this.showLoading(false);
    }
  }

  // Display connection test result
  displayConnectionResult(result) {
    const resultDiv = document.getElementById('connection-result');
    const resultContent = resultDiv.querySelector('.result-content');
    
    resultDiv.style.display = 'block';
    
    if (result.success) {
      resultDiv.className = 'connection-result success';
      resultContent.textContent = '✅ ' + (result.message || 'Connection successful!');
    } else {
      resultDiv.className = 'connection-result error';
      resultContent.textContent = '❌ ' + (result.error || 'Connection failed');
    }

    // Hide result after 5 seconds
    setTimeout(() => {
      resultDiv.style.display = 'none';
    }, 5000);
  }

  // Toggle password visibility
  togglePasswordVisibility() {
    const passwordInput = document.getElementById('supabase-key');
    const toggleButton = document.getElementById('toggle-key');
    const showText = toggleButton.querySelector('.show-text');
    const hideText = toggleButton.querySelector('.hide-text');

    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      showText.style.display = 'none';
      hideText.style.display = 'inline';
    } else {
      passwordInput.type = 'password';
      showText.style.display = 'inline';
      hideText.style.display = 'none';
    }
  }

  // Open ShortHub web app
  openShortHubApp() {
    // Try to get the app URL from configuration or use default
    const defaultAppUrl = 'http://localhost:3000'; // Development URL
    
    chrome.tabs.create({
      url: defaultAppUrl
    });
  }

  // Validate Supabase URL format
  isValidSupabaseUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('supabase.co') || 
             urlObj.hostname.includes('supabase.com') ||
             urlObj.hostname === 'localhost'; // Allow localhost for development
    } catch (error) {
      return false;
    }
  }

  // Show/hide loading overlay
  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = show ? 'flex' : 'none';
  }

  // Show toast notification
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // Get current active tab information
  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab;
    } catch (error) {
      console.error('Error getting current tab:', error);
      return null;
    }
  }

  // Check if current tab is YouTube
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

  // Handle extension icon click from different contexts
  async handleQuickAdd() {
    const tab = await this.getCurrentTab();
    
    if (!tab || !this.isYouTubePage(tab.url)) {
      this.showToast('Please navigate to a YouTube page first', 'warning');
      return;
    }

    // Inject content script if not already present
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
    } catch (error) {
      // Content script not loaded, inject it
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      });
    }

    // Close popup and let content script handle the interaction
    window.close();
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ShortHubPopup();
});

// Handle messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'channelSaved') {
    // Refresh stats when a channel is saved
    const popup = new ShortHubPopup();
    popup.loadStats();
    popup.showToast('Channel added successfully!', 'success');
  }
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Escape to close
  if (e.key === 'Escape') {
    window.close();
  }
  
  // Ctrl/Cmd + Enter to save configuration
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    const configTab = document.getElementById('config');
    if (configTab.classList.contains('active')) {
      e.preventDefault();
      document.getElementById('config-form').dispatchEvent(new Event('submit'));
    }
  }
});