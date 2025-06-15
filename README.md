# 🚀 ShortHub Extension v2.0

> Modern browser extension to streamline your YouTube Shorts workflow by adding channels directly from YouTube to your ShortHub database.

![ShortHub Extension](https://img.shields.io/badge/version-2.0.0-red?style=for-the-badge&logo=youtube)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Chrome](https://img.shields.io/badge/Chrome-supported-blue?style=for-the-badge&logo=googlechrome)
![Firefox](https://img.shields.io/badge/Firefox-supported-orange?style=for-the-badge&logo=firefox)

## ✨ What's New in v2.0

### 🎯 Complete Architecture Refactor
- **No more DOM injection** - Cleaner, more reliable approach
- **Smart URL analysis** - Works on any YouTube page without content scripts
- **Real-time channel detection** - Instant analysis when you open the popup
- **Modern UI/UX** - Beautiful, responsive design with YouTube colors

### 🔧 Enhanced Features
- **YouTube API Integration** - Accurate channel data extraction
- **Advanced URL Parsing** - Supports all YouTube URL formats
- **Intelligent Fallbacks** - Works even without API key
- **Better Error Handling** - Clear feedback and retry mechanisms

## 🎯 Features

### Core Functionality
- 🎬 **Universal YouTube Support** - Works on channels, videos, shorts
- 🔄 **Real-time Analysis** - Instant channel detection from any YouTube URL
- 📊 **Accurate Data** - Fetch real subscriber counts and channel info
- 🏷️ **Smart Tagging** - Organize by language (VF, VOSTFR, VA, VOSTA, VO)
- 🎯 **Type Classification** - Mix content or domain-specific channels
- 💾 **Supabase Integration** - Direct database storage

### User Experience
- 🎨 **Modern UI** - Clean, intuitive interface with YouTube branding
- ⚡ **Instant Feedback** - Real-time status updates and validation
- 🔧 **Easy Configuration** - Simple setup for database and API keys
- 📱 **Responsive Design** - Works perfectly on any screen size

## 🚀 Installation

### For Users
1. **Download** the latest release from [GitHub Releases](https://github.com/goddivor/shorthub-extension/releases)
2. **Unzip** the extension package
3. **Open** Chrome/Firefox extensions page
   - Chrome: `chrome://extensions/`
   - Firefox: `about:addons`
4. **Enable** Developer mode
5. **Load** the extension folder

### For Developers
```bash
# Clone the repository
git clone https://github.com/goddivor/shorthub-extension.git
cd shorthub-extension

# Install dependencies
npm install

# Build the extension
npm run build

# Start development with hot reload
npm run dev
```

## ⚙️ Configuration

### 1. Supabase Setup (Required)
```javascript
// Your Supabase project configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. YouTube API Key (Optional but Recommended)
```javascript
// For accurate channel data extraction
YOUTUBE_API_KEY=your-youtube-api-key-here
```

**Getting YouTube API Key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable YouTube Data API v3
4. Create credentials (API Key)
5. Restrict the key to YouTube Data API v3

## 🔧 Usage

### Adding a Channel
1. **Visit** any YouTube page (channel, video, or short)
2. **Click** the ShortHub extension icon
3. **Review** the detected channel information
4. **Select** language tag and type
5. **Add domain** if type is "Only"
6. **Click** "Add to ShortHub"

### Supported URL Formats
- `https://youtube.com/channel/UC...` - Direct channel ID
- `https://youtube.com/@username` - Channel handle
- `https://youtube.com/c/channelname` - Custom URL
- `https://youtube.com/user/username` - Legacy username
- `https://youtube.com/watch?v=...` - Video page
- `https://youtube.com/shorts/...` - Shorts page

## 🏗️ Architecture

### Background Script (`background/background.js`)
```typescript
class ModernShortHubBackground {
  // YouTube API integration
  extractChannelFromUrl(url: string)
  
  // Database operations
  saveChannel(channelData: ChannelData)
  
  // Configuration management
  updateConfiguration(config: Config)
}
```

### Popup Interface (`popup/popup.html`)
```typescript
class ModernShortHubPopup {
  // URL analysis and channel detection
  analyzeCurrentPage()
  
  // Form handling and validation
  validateForm()
  
  // User interaction management
  handleChannelAddition()
}
```

### Key Improvements Over v1.0
- ❌ **No Content Scripts** - Eliminated unreliable DOM injection
- ✅ **Pure Background Processing** - All logic in service worker
- ✅ **API-First Approach** - YouTube API for accurate data
- ✅ **Modern UI Components** - Custom-designed interface
- ✅ **Better Error Handling** - Comprehensive error management

## 📊 Data Schema

### Channel Object
```typescript
interface Channel {
  youtube_url: string      // Original YouTube URL
  username: string         // Channel name/handle
  subscriber_count: number // Current subscriber count
  tag: TagType            // VF | VOSTFR | VA | VOSTA | VO
  type: ChannelType       // Mix | Only
  domain?: string         // Required if type === 'Only'
}
```

## 🔒 Privacy & Security

- **No Data Collection** - Extension only stores what you configure
- **Local Storage** - Configuration stored locally in browser
- **Direct API Calls** - No intermediate servers
- **Minimal Permissions** - Only YouTube and configured domains

## 🛠️ Development

### Project Structure
```
shorthub-extension/
├── manifest.json          # Extension manifest
├── background/
│   └── background.js      # Service worker
├── popup/
│   └── popup.html         # Modern popup interface
├── icons/                 # Extension icons
└── dist/                  # Built extension
```

### Build Commands
```bash
npm run build      # Build for production
npm run dev        # Development with watch
npm run lint       # Code linting
npm run test       # Run tests
npm run package    # Create distribution zip
```

### Testing
```bash
# Unit tests
npm run test

# Extension validation
npm run validate

# Browser testing
npm run start:firefox  # Firefox development
npm run start:chrome   # Chrome instructions
```

## 🔄 Migration from v1.0

### What Changed
1. **No more content scripts** - Remove all DOM injection code
2. **New popup design** - Modern, responsive interface
3. **YouTube API integration** - More accurate data extraction
4. **Better configuration** - Streamlined setup process

### Migration Steps
1. **Uninstall** old extension
2. **Install** v2.0 extension
3. **Reconfigure** Supabase credentials
4. **Add** YouTube API key (optional)
5. **Test** with your favorite channels

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **YouTube API** - For providing comprehensive channel data
- **Supabase** - For the excellent database platform
- **Chrome Extensions Team** - For the robust extension platform
- **Our Contributors** - For making this project better

## 🔗 Links

- [Main ShortHub App](https://github.com/goddivor/shorthub)
- [Extension Store Page](https://chrome.google.com/webstore/detail/shorthub) (Coming Soon)
- [Documentation](https://docs.shorthub.dev)
- [Support](https://github.com/goddivor/shorthub-extension/issues)

---

**Made with ❤️ for YouTube creators by the ShortHub team**