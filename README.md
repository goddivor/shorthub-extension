# ShortHub Browser Extension

A Chrome/Firefox extension that allows you to add YouTube channels directly to your ShortHub database while browsing YouTube.

## 🌟 Features

- **One-Click Channel Addition**: Add any YouTube channel to ShortHub with a single click
- **Smart Button Injection**: Automatically detects YouTube channel and shorts pages
- **Form Integration**: Tag and categorize channels directly from YouTube
- **Real-time Sync**: Instantly saves to your Supabase database
- **Channel Detection**: Works on both channel pages and individual shorts
- **Duplicate Prevention**: Prevents adding the same channel twice

## 🎯 How It Works

### 1. **Channel Pages**
When you visit a YouTube channel page, the extension injects an "Add to ShortHub" button next to the subscribe button.

### 2. **YouTube Shorts**
When viewing a YouTube Short, the extension adds the button next to the channel name, automatically extracting the channel URL.

### 3. **Quick Configuration**
- Fill in tag (VF, VOSTFR, VA, VOSTA, VO)
- Select type (Mix or Only)
- Specify domain if type is "Only"
- Save directly to your database

## 🚀 Installation

### Development Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/shorthub-extension.git
   cd shorthub-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### Production Installation

1. Download the `.zip` file from the releases page
2. Extract the archive
3. Load unpacked extension in Chrome/Firefox

## ⚙️ Configuration

### 1. **Get Supabase Credentials**
- Go to your [Supabase Dashboard](https://supabase.com/dashboard)
- Select your ShortHub project
- Navigate to Settings → API
- Copy the "URL" and "anon public" key

### 2. **Configure Extension**
- Click the ShortHub extension icon
- Go to the "Settings" tab
- Enter your Supabase URL and API key
- Click "Test Connection" to verify
- Save configuration

### 3. **Database Setup**
Make sure your Supabase database has the required tables:

```sql
-- Channels table
CREATE TABLE channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  youtube_url TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  subscriber_count INTEGER DEFAULT 0,
  tag TEXT NOT NULL CHECK (tag IN ('VF', 'VOSTFR', 'VA', 'VOSTA', 'VO')),
  type TEXT NOT NULL CHECK (type IN ('Mix', 'Only')),
  domain TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shorts rolls table
CREATE TABLE shorts_rolls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  validated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  validated_at TIMESTAMP WITH TIME ZONE
);
```

## 🎮 Usage

### Adding a Channel

1. **Visit YouTube**: Navigate to any YouTube channel or short
2. **Click Button**: Look for the red "Add to ShortHub" button
3. **Fill Form**: 
   - Select appropriate tag (VF, VOSTFR, VA, VOSTA, VO)
   - Choose type (Mix for varied content, Only for specific domain)
   - If "Only", specify the domain (Gaming, Tech, Music, etc.)
4. **Save**: Click "Add Channel" to save to database

### Managing Extension

- **Dashboard**: View statistics and connection status
- **Settings**: Configure Supabase connection
- **Test Connection**: Verify database connectivity

## 🛠️ Development

### Project Structure
```
shorthub-extension/
├── manifest.json          # Extension manifest
├── content/
│   ├── content.js         # Main content script
│   └── content.css        # Injected styles
├── background/
│   └── background.js      # Service worker
├── popup/
│   ├── popup.html         # Extension popup
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic
├── icons/                 # Extension icons
└── package.json
```

### Scripts

```bash
# Development with file watching
npm run dev

# Build for production
npm run build

# Create distribution package
npm run package

# Run linting
npm run lint

# Run tests
npm run test
```

### Content Script Features

- **URL Detection**: Identifies channel and shorts pages
- **DOM Injection**: Safely injects buttons without breaking YouTube
- **Data Extraction**: Automatically extracts channel name and subscriber count
- **Navigation Handling**: Works with YouTube's SPA navigation
- **Error Handling**: Graceful failure with user feedback

### Background Script Features

- **Supabase Integration**: Direct API communication
- **Data Validation**: Ensures data integrity before saving
- **Duplicate Prevention**: Checks for existing channels
- **Configuration Management**: Secure storage of credentials
- **Connection Testing**: Real-time database connectivity verification

## 🎨 UI/UX

- **YouTube Native Design**: Buttons blend seamlessly with YouTube's interface
- **Red Color Scheme**: Consistent with YouTube and ShortHub branding
- **Responsive Modal**: Works on different screen sizes
- **Accessibility**: Keyboard navigation and screen reader support
- **Error Feedback**: Clear success/error messages

## 🔒 Security

- **Secure Storage**: Credentials stored in Chrome's sync storage
- **API Key Protection**: Keys are never exposed to content scripts
- **HTTPS Only**: All communications use secure protocols
- **Input Validation**: All user inputs are validated before processing
- **Minimal Permissions**: Only requests necessary permissions

## 🐛 Troubleshooting

### Button Not Appearing
- Refresh the YouTube page
- Check if you're on a supported page (channel or shorts)
- Verify the extension is enabled

### Connection Issues
- Verify Supabase URL format: `https://your-project.supabase.co`
- Check API key is correct (anon public key)
- Ensure database tables exist
- Test connection in extension settings

### Duplicate Channel Error
- Channel URL already exists in database
- Check your ShortHub app for existing entries
- Different URL formats for same channel count as duplicates

## 📝 Changelog

### v1.0.0 (Initial Release)
- ✅ Channel page button injection
- ✅ Shorts page button injection
- ✅ Supabase integration
- ✅ Configuration management
- ✅ Data validation
- ✅ Error handling
- ✅ Statistics dashboard

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- YouTube for the platform
- Supabase for the backend infrastructure
- Chrome Extensions team for the robust API
- ShortHub community for feedback and testing

---

**Need Help?** 
- 📧 Email: support@shorthub.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/shorthub-extension/issues)
- 💬 Discord: [ShortHub Community](https://discord.gg/shorthub)