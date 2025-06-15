// Modern ShortHub Extension Background Script
class ModernShortHubBackground {
  constructor() {
    this.supabaseUrl = null;
    this.supabaseKey = null;
    this.youtubeApiKey = null;
    this.init();
  }

  init() {
    // Load configuration on startup
    this.loadConfiguration();
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  // Load configuration from storage
  async loadConfiguration() {
    try {
      const result = await chrome.storage.sync.get(['supabaseUrl', 'supabaseKey', 'youtubeApiKey']);
      this.supabaseUrl = result.supabaseUrl;
      this.supabaseKey = result.supabaseKey;
      this.youtubeApiKey = result.youtubeApiKey;
      
      console.log('ShortHub: Configuration loaded', {
        hasUrl: !!this.supabaseUrl,
        hasKey: !!this.supabaseKey,
        hasYouTubeKey: !!this.youtubeApiKey
      });
    } catch (error) {
      console.error('ShortHub: Failed to load configuration:', error);
    }
  }

  // Handle messages from popup
  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'extractChannelFromUrl':
          const channelData = await this.extractChannelFromUrl(request.url);
          sendResponse(channelData);
          break;
          
        case 'saveChannel':
          const saveResult = await this.saveChannel(request.data);
          sendResponse(saveResult);
          break;
          
        case 'updateConfiguration':
          const updateResult = await this.updateConfiguration(request.data);
          sendResponse(updateResult);
          break;
          
        case 'testConnection':
          const testResult = await this.testConnection();
          sendResponse(testResult);
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('ShortHub: Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // Extract channel data from YouTube URL
  async extractChannelFromUrl(url) {
    try {
      // Parse different YouTube URL formats
      const channelInfo = this.parseYouTubeUrl(url);
      
      if (!channelInfo) {
        return {
          success: false,
          error: 'Could not parse YouTube URL'
        };
      }

      // If we have YouTube API key, use it to get accurate data
      if (this.youtubeApiKey) {
        const apiData = await this.getChannelDataFromAPI(channelInfo);
        if (apiData.success) {
          return apiData;
        }
      }

      // Fallback: extract from URL patterns
      const fallbackData = this.extractFromUrlPattern(channelInfo, url);
      return fallbackData;

    } catch (error) {
      console.error('Error extracting channel from URL:', error);
      return {
        success: false,
        error: `Failed to extract channel data: ${error.message}`
      };
    }
  }

  // Parse YouTube URL to extract channel identifier
  parseYouTubeUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      // Different YouTube URL patterns
      const patterns = [
        // Channel ID: /channel/UC...
        {
          regex: /^\/channel\/([a-zA-Z0-9_-]+)/,
          type: 'channelId',
          extract: (match) => match[1]
        },
        // Custom URL: /c/channelname
        {
          regex: /^\/c\/([a-zA-Z0-9_-]+)/,
          type: 'customUrl',
          extract: (match) => match[1]
        },
        // User: /user/username
        {
          regex: /^\/user\/([a-zA-Z0-9_-]+)/,
          type: 'username',
          extract: (match) => match[1]
        },
        // Handle: /@channelhandle
        {
          regex: /^\/@([a-zA-Z0-9_.-]+)/,
          type: 'handle',
          extract: (match) => match[1]
        },
        // Video URL: /watch?v=... (extract channel from here if possible)
        {
          regex: /^\/watch/,
          type: 'video',
          extract: () => urlObj.searchParams.get('v')
        },
        // Shorts URL: /shorts/...
        {
          regex: /^\/shorts\/([a-zA-Z0-9_-]+)/,
          type: 'short',
          extract: (match) => match[1]
        }
      ];

      for (const pattern of patterns) {
        const match = pathname.match(pattern.regex);
        if (match) {
          return {
            type: pattern.type,
            value: pattern.extract(match),
            originalUrl: url
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error parsing YouTube URL:', error);
      return null;
    }
  }

  // Get channel data using YouTube API
  async getChannelDataFromAPI(channelInfo) {
    try {
      if (!this.youtubeApiKey) {
        throw new Error('YouTube API key not configured');
      }

      let channelId = null;

      // If we don't have direct channel ID, we need to search for it
      if (channelInfo.type === 'channelId') {
        channelId = channelInfo.value;
      } else if (channelInfo.type === 'video' || channelInfo.type === 'short') {
        // Get channel ID from video
        channelId = await this.getChannelIdFromVideo(channelInfo.value);
      } else {
        // Search for channel by custom URL, username, or handle
        channelId = await this.searchChannelId(channelInfo.value, channelInfo.type);
      }

      if (!channelId) {
        throw new Error('Could not find channel ID');
      }

      // Get channel details
      const channelData = await this.getChannelDetails(channelId);
      
      return {
        success: true,
        data: {
          name: channelData.name,
          url: `https://www.youtube.com/channel/${channelId}`,
          subscriberCount: channelData.subscriberCount,
          channelId: channelId
        }
      };

    } catch (error) {
      console.error('Error getting channel data from API:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get channel ID from video ID
  async getChannelIdFromVideo(videoId) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${this.youtubeApiKey}`
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        throw new Error('Video not found');
      }

      return data.items[0].snippet.channelId;
    } catch (error) {
      console.error('Error getting channel ID from video:', error);
      throw error;
    }
  }

  // Search for channel ID by name/handle
  async searchChannelId(query, type) {
    try {
      // For handles, add @ if not present
      if (type === 'handle' && !query.startsWith('@')) {
        query = '@' + query;
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=1&key=${this.youtubeApiKey}`
      );

      if (!response.ok) {
        throw new Error(`YouTube API search error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        throw new Error('Channel not found in search');
      }

      return data.items[0].snippet.channelId;
    } catch (error) {
      console.error('Error searching for channel:', error);
      throw error;
    }
  }

  // Get detailed channel information
  async getChannelDetails(channelId) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${this.youtubeApiKey}`
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        throw new Error('Channel details not found');
      }

      const channel = data.items[0];
      
      return {
        name: channel.snippet.title,
        subscriberCount: parseInt(channel.statistics.subscriberCount) || 0,
        description: channel.snippet.description
      };
    } catch (error) {
      console.error('Error getting channel details:', error);
      throw error;
    }
  }

  // Fallback method to extract basic info from URL patterns
  extractFromUrlPattern(channelInfo, originalUrl) {
    try {
      let channelName = 'Unknown Channel';
      let channelUrl = originalUrl;

      // Try to extract name from URL
      switch (channelInfo.type) {
        case 'customUrl':
        case 'username':
          channelName = channelInfo.value;
          break;
        case 'handle':
          channelName = '@' + channelInfo.value;
          break;
        case 'channelId':
          channelName = 'Channel ' + channelInfo.value.substring(0, 8);
          break;
      }

      // Normalize channel URL
      if (channelInfo.type === 'channelId') {
        channelUrl = `https://www.youtube.com/channel/${channelInfo.value}`;
      } else if (channelInfo.type === 'handle') {
        channelUrl = `https://www.youtube.com/@${channelInfo.value}`;
      } else if (channelInfo.type === 'customUrl') {
        channelUrl = `https://www.youtube.com/c/${channelInfo.value}`;
      } else if (channelInfo.type === 'username') {
        channelUrl = `https://www.youtube.com/user/${channelInfo.value}`;
      }

      return {
        success: true,
        data: {
          name: channelName,
          url: channelUrl,
          subscriberCount: 0, // Cannot get subscriber count without API
          extractedFromUrl: true
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to extract from URL pattern'
      };
    }
  }

  // Save channel to Supabase database
  async saveChannel(channelData) {
    try {
      // Check configuration
      if (!this.supabaseUrl || !this.supabaseKey) {
        return {
          success: false,
          error: 'Database not configured. Please set up Supabase connection in settings.'
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
      const exists = await this.checkChannelExists(channelData.youtube_url);
      if (exists) {
        return {
          success: false,
          error: 'This channel is already in your database.'
        };
      }

      // Save to database
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
        throw new Error(errorData.message || `Database error: ${response.status}`);
      }

      const savedChannel = await response.json();
      
      return {
        success: true,
        data: savedChannel
      };

    } catch (error) {
      console.error('Error saving channel:', error);
      return {
        success: false,
        error: `Failed to save channel: ${error.message}`
      };
    }
  }

  // Check if channel already exists
  async checkChannelExists(youtubeUrl) {
    try {
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
        console.warn('Could not check channel existence:', response.statusText);
        return false;
      }

      const channels = await response.json();
      return channels && channels.length > 0;
    } catch (error) {
      console.warn('Error checking channel existence:', error);
      return false;
    }
  }

  // Validate channel data
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

    return { valid: true };
  }

  // Update configuration
  async updateConfiguration(config) {
    try {
      await chrome.storage.sync.set({
        supabaseUrl: config.supabaseUrl,
        supabaseKey: config.supabaseKey,
        youtubeApiKey: config.youtubeApiKey
      });

      // Update local variables
      this.supabaseUrl = config.supabaseUrl;
      this.supabaseKey = config.supabaseKey;
      this.youtubeApiKey = config.youtubeApiKey;

      return {
        success: true,
        message: 'Configuration updated successfully'
      };
    } catch (error) {
      console.error('Error updating configuration:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Test database connection
  async testConnection() {
    try {
      if (!this.supabaseUrl || !this.supabaseKey) {
        return {
          success: false,
          error: 'Supabase configuration missing'
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
        message: 'Database connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: `Connection error: ${error.message}`
      };
    }
  }
}

// Initialize background script
const modernShortHubBackground = new ModernShortHubBackground();

// Handle installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('ShortHub Extension installed');
    
    // Open welcome/setup page
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup/popup.html')
    });
  } else if (details.reason === 'update') {
    console.log('ShortHub Extension updated to version', chrome.runtime.getManifest().version);
  }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModernShortHubBackground;
}