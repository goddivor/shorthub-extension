// Background script for ShortHub Extension
class ShortHubBackground {
  constructor() {
    this.supabaseUrl = null;
    this.supabaseKey = null;
    this.init();
  }

  init() {
    // Load configuration on startup
    this.loadConfiguration();
    
    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Listen for extension icon click
    chrome.action.onClicked.addListener((tab) => {
      this.handleActionClick(tab);
    });
  }

  // Load Supabase configuration from storage
  async loadConfiguration() {
    try {
      const result = await chrome.storage.sync.get(['supabaseUrl', 'supabaseKey']);
      this.supabaseUrl = result.supabaseUrl;
      this.supabaseKey = result.supabaseKey;
      
      console.log('ShortHub: Configuration loaded', {
        hasUrl: !!this.supabaseUrl,
        hasKey: !!this.supabaseKey
      });
    } catch (error) {
      console.error('ShortHub: Failed to load configuration:', error);
    }
  }

  // Handle messages from content script
  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'saveChannel':
          const result = await this.saveChannel(request.data);
          sendResponse(result);
          break;
          
        case 'getConfiguration':
          sendResponse({
            success: true,
            data: {
              hasUrl: !!this.supabaseUrl,
              hasKey: !!this.supabaseKey,
              configured: !!(this.supabaseUrl && this.supabaseKey)
            }
          });
          break;
          
        case 'updateConfiguration':
          const updateResult = await this.updateConfiguration(request.data);
          sendResponse(updateResult);
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('ShortHub: Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // Save channel to Supabase database
  async saveChannel(channelData) {
    try {
      // Check if configuration is available
      if (!this.supabaseUrl || !this.supabaseKey) {
        return {
          success: false,
          error: 'Supabase configuration not found. Please configure the extension first.'
        };
      }

      // Validate channel data
      const validation = this.validateChannelData(channelData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Check if channel already exists
      const existingChannel = await this.checkChannelExists(channelData.youtube_url);
      if (existingChannel) {
        return {
          success: false,
          error: 'This channel is already in your ShortHub database.'
        };
      }

      // Save to Supabase
      const response = await fetch(`${this.supabaseUrl}/rest/v1/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(channelData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const savedChannel = await response.json();
      
      return {
        success: true,
        data: savedChannel
      };

    } catch (error) {
      console.error('ShortHub: Error saving channel:', error);
      return {
        success: false,
        error: `Failed to save channel: ${error.message}`
      };
    }
  }

  // Check if channel already exists in database
  async checkChannelExists(youtubeUrl) {
    try {
      if (!this.supabaseUrl || !this.supabaseKey) {
        return false;
      }

      const response = await fetch(
        `${this.supabaseUrl}/rest/v1/channels?youtube_url=eq.${encodeURIComponent(youtubeUrl)}&select=id`,
        {
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`
          }
        }
      );

      if (!response.ok) {
        console.error('ShortHub: Error checking channel existence:', response.statusText);
        return false;
      }

      const channels = await response.json();
      return channels && channels.length > 0;

    } catch (error) {
      console.error('ShortHub: Error checking channel existence:', error);
      return false;
    }
  }

  // Validate channel data before saving
  validateChannelData(data) {
    const required = ['youtube_url', 'username', 'tag', 'type'];
    
    for (const field of required) {
      if (!data[field]) {
        return {
          valid: false,
          error: `Missing required field: ${field}`
        };
      }
    }

    // Validate tag
    const validTags = ['VF', 'VOSTFR', 'VA', 'VOSTA', 'VO'];
    if (!validTags.includes(data.tag)) {
      return {
        valid: false,
        error: 'Invalid tag. Must be one of: ' + validTags.join(', ')
      };
    }

    // Validate type
    const validTypes = ['Mix', 'Only'];
    if (!validTypes.includes(data.type)) {
      return {
        valid: false,
        error: 'Invalid type. Must be either "Mix" or "Only"'
      };
    }

    // If type is "Only", domain is required
    if (data.type === 'Only' && !data.domain) {
      return {
        valid: false,
        error: 'Domain is required when type is "Only"'
      };
    }

    // Validate YouTube URL format
    if (!this.isValidYouTubeUrl(data.youtube_url)) {
      return {
        valid: false,
        error: 'Invalid YouTube URL format'
      };
    }

    return { valid: true };
  }

  // Validate YouTube URL format
  isValidYouTubeUrl(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Check if it's a YouTube domain
      const validDomains = ['youtube.com', 'www.youtube.com', 'm.youtube.com'];
      if (!validDomains.includes(hostname)) {
        return false;
      }

      // Check if it's a valid channel URL pattern
      const pathname = urlObj.pathname;
      const validPatterns = [
        /^\/channel\/[a-zA-Z0-9_-]+/,
        /^\/c\/[a-zA-Z0-9_-]+/,
        /^\/user\/[a-zA-Z0-9_-]+/,
        /^\/@[a-zA-Z0-9_-]+/
      ];

      return validPatterns.some(pattern => pattern.test(pathname));
    } catch (error) {
      return false;
    }
  }

  // Update extension configuration
  async updateConfiguration(config) {
    try {
      await chrome.storage.sync.set({
        supabaseUrl: config.supabaseUrl,
        supabaseKey: config.supabaseKey
      });

      // Update local variables
      this.supabaseUrl = config.supabaseUrl;
      this.supabaseKey = config.supabaseKey;

      // Test connection
      const testResult = await this.testConnection();
      
      return {
        success: true,
        connectionTest: testResult
      };
    } catch (error) {
      console.error('ShortHub: Error updating configuration:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Test Supabase connection
  async testConnection() {
    try {
      if (!this.supabaseUrl || !this.supabaseKey) {
        return {
          success: false,
          error: 'Configuration missing'
        };
      }

      const response = await fetch(`${this.supabaseUrl}/rest/v1/channels?select=count&limit=1`, {
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`
        }
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Connection failed: ${response.status} ${response.statusText}`
        };
      }

      return {
        success: true,
        message: 'Connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Handle extension icon click
  handleActionClick(tab) {
    // Open configuration popup or perform default action
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup/popup.html')
    });
  }

  // Extract YouTube channel data using YouTube API (optional)
  async extractChannelData(channelUrl) {
    try {
      // This would require YouTube API key configuration
      // For now, we'll extract what we can from the page itself
      // via the content script
      
      return {
        success: true,
        message: 'Channel data extraction not implemented yet'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get extension statistics
  async getStats() {
    try {
      if (!this.supabaseUrl || !this.supabaseKey) {
        return {
          success: false,
          error: 'Configuration not available'
        };
      }

      // Get total channels count
      const channelsResponse = await fetch(
        `${this.supabaseUrl}/rest/v1/channels?select=count`,
        {
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`
          }
        }
      );

      // Get total shorts rolls count
      const shortsResponse = await fetch(
        `${this.supabaseUrl}/rest/v1/shorts_rolls?select=count`,
        {
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`
          }
        }
      );

      const stats = {
        channels: 0,
        shorts: 0,
        validated: 0
      };

      if (channelsResponse.ok) {
        const channelsData = await channelsResponse.json();
        stats.channels = channelsData.length || 0;
      }

      if (shortsResponse.ok) {
        const shortsData = await shortsResponse.json();
        stats.shorts = shortsData.length || 0;
        stats.validated = shortsData.filter(s => s.validated).length || 0;
      }

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      console.error('ShortHub: Error getting stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Initialize background script
const shortHubBackground = new ShortHubBackground();

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShortHubBackground;
}