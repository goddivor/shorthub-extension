// Modern ShortHub Extension Background Script
// CONFIG will be injected here during build from .env
/* CONFIG_INJECTION_POINT */

class ModernShortHubBackground {
  constructor() {
    this.graphqlEndpoint = CONFIG.GRAPHQL_ENDPOINT;
    this.youtubeApiKey = CONFIG.YOUTUBE_API_KEY;
    this.authToken = null;
    this.userInfo = null;
    this.init();
  }

  init() {
    // Load auth token from storage
    this.loadAuthToken();

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  // Load auth token from storage
  async loadAuthToken() {
    try {
      const result = await chrome.storage.sync.get(['authToken', 'userInfo']);
      this.authToken = result.authToken;
      this.userInfo = result.userInfo;

      console.log('ShortHub: Auth token loaded', {
        hasToken: !!this.authToken,
        user: this.userInfo?.username,
        endpoint: this.graphqlEndpoint
      });
    } catch (error) {
      console.error('ShortHub: Failed to load auth token:', error);
    }
  }

  // Handle messages from popup
  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'login':
          const loginResult = await this.login(request.username, request.password);
          sendResponse(loginResult);
          break;

        case 'logout':
          const logoutResult = await this.logout();
          sendResponse(logoutResult);
          break;

        case 'getUserInfo':
          sendResponse({
            success: true,
            user: this.userInfo,
            hasAuth: !!this.authToken
          });
          break;

        case 'extractChannelFromUrl':
          const channelData = await this.extractChannelFromUrl(request.url);
          sendResponse(channelData);
          break;

        case 'saveChannel':
          const saveResult = await this.saveChannel(request.data);
          sendResponse(saveResult);
          break;

        case 'setAuthToken':
          const setResult = await this.setAuthToken(request.token);
          sendResponse(setResult);
          break;

        case 'getAuthToken':
          sendResponse({ success: true, token: this.authToken });
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

  // Login with username and password
  async login(username, password) {
    try {
      if (!this.graphqlEndpoint) {
        return {
          success: false,
          error: 'GraphQL endpoint not configured'
        };
      }

      // GraphQL login mutation
      const mutation = `
        mutation Login($username: String!, $password: String!) {
          login(username: $username, password: $password) {
            token
            refreshToken
            user {
              id
              username
              role
              email
            }
          }
        }
      `;

      const variables = {
        username,
        password
      };

      const response = await fetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: mutation,
          variables
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        const errorMessage = result.errors[0]?.message || 'Login failed';
        throw new Error(errorMessage);
      }

      // Save auth token and user info
      const { token, refreshToken, user } = result.data.login;

      await chrome.storage.sync.set({
        authToken: token,
        refreshToken: refreshToken,
        userInfo: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email
        }
      });

      this.authToken = token;
      this.userInfo = {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email
      };

      console.log('ShortHub: Login successful', {
        username: user.username,
        role: user.role
      });

      return {
        success: true,
        message: `Connecté en tant que ${user.username}`,
        user: this.userInfo
      };

    } catch (error) {
      console.error('ShortHub: Login error:', error);
      return {
        success: false,
        error: error.message || 'Échec de la connexion'
      };
    }
  }

  // Logout and clear auth data
  async logout() {
    try {
      await chrome.storage.sync.remove(['authToken', 'refreshToken', 'userInfo']);
      this.authToken = null;
      this.userInfo = null;

      console.log('ShortHub: Logout successful');

      return {
        success: true,
        message: 'Déconnexion réussie'
      };
    } catch (error) {
      console.error('ShortHub: Logout error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Set auth token (for manual token entry)
  async setAuthToken(token) {
    try {
      // Test the token first
      const response = await fetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: `query { me { id username role email } }`
        })
      });

      if (!response.ok) {
        throw new Error('Token invalide');
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error('Token invalide ou expiré');
      }

      const user = result.data.me;

      // Save token and user info
      await chrome.storage.sync.set({
        authToken: token,
        userInfo: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email
        }
      });

      this.authToken = token;
      this.userInfo = {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email
      };

      return {
        success: true,
        message: `Token validé - Connecté en tant que ${user.username}`,
        user: this.userInfo
      };
    } catch (error) {
      console.error('Error setting auth token:', error);
      return {
        success: false,
        error: error.message
      };
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
          channelName: channelData.name,
          channelId: channelId,
          url: `https://www.youtube.com/channel/${channelId}`,
          subscriberCount: channelData.subscriberCount,
          profileImageUrl: channelData.profileImageUrl
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
        description: channel.snippet.description,
        profileImageUrl: channel.snippet.thumbnails?.high?.url ||
                        channel.snippet.thumbnails?.medium?.url ||
                        channel.snippet.thumbnails?.default?.url
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
          channelName: channelName,
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

  // Save channel to GraphQL backend
  async saveChannel(channelData) {
    try {
      // Check configuration
      if (!this.graphqlEndpoint || !this.authToken) {
        return {
          success: false,
          error: 'Backend not configured. Please set your auth token first.'
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

      // Prepare GraphQL mutation
      const mutation = `
        mutation CreateSourceChannel($input: CreateSourceChannelInput!) {
          createSourceChannel(input: $input) {
            id
            channelId
            channelName
            profileImageUrl
            contentType
            createdAt
          }
        }
      `;

      const variables = {
        input: {
          youtubeUrl: channelData.youtubeUrl,
          contentType: channelData.contentType
        }
      };

      // Send mutation to GraphQL endpoint
      const response = await fetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          query: mutation,
          variables: variables
        })
      });

      if (!response.ok) {
        throw new Error(`GraphQL error: ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        const errorMessage = result.errors[0]?.message || 'Unknown GraphQL error';
        throw new Error(errorMessage);
      }

      return {
        success: true,
        data: result.data.createSourceChannel
      };

    } catch (error) {
      console.error('Error saving channel:', error);
      return {
        success: false,
        error: `Failed to save channel: ${error.message}`
      };
    }
  }

  // Validate channel data
  validateChannelData(data) {
    const required = ['youtubeUrl', 'contentType'];

    for (const field of required) {
      if (!data[field]) {
        return {
          valid: false,
          error: `Missing required field: ${field}`
        };
      }
    }

    // Validate contentType
    const validContentTypes = [
      'VA_SANS_EDIT',
      'VA_AVEC_EDIT',
      'VF_SANS_EDIT',
      'VF_AVEC_EDIT',
      'VO_SANS_EDIT',
      'VO_AVEC_EDIT'
    ];

    if (!validContentTypes.includes(data.contentType)) {
      return {
        valid: false,
        error: 'Invalid content type. Must be one of: ' + validContentTypes.join(', ')
      };
    }

    return { valid: true };
  }

  // Test GraphQL connection
  async testConnection() {
    try {
      if (!this.graphqlEndpoint || !this.authToken) {
        return {
          success: false,
          error: 'GraphQL endpoint or auth token missing'
        };
      }

      // Simple query to test connection
      const query = `
        query {
          me {
            id
            username
            role
          }
        }
      `;

      const response = await fetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Connection failed: ${response.status} ${response.statusText}`
        };
      }

      const result = await response.json();

      if (result.errors) {
        return {
          success: false,
          error: result.errors[0]?.message || 'Authentication failed'
        };
      }

      return {
        success: true,
        message: `Connected as ${result.data.me.username} (${result.data.me.role})`,
        user: result.data.me
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
    console.log('GraphQL Endpoint:', CONFIG.GRAPHQL_ENDPOINT);
    console.log('YouTube API configured:', !!CONFIG.YOUTUBE_API_KEY);

    // Open popup to configure auth token
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
