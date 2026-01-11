// Build script to inject config from .env into background.js
const fs = require('fs');
const path = require('path');

// Read .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parse .env file
const config = {};
envContent.split('\n').forEach(line => {
  const trimmedLine = line.trim();

  // Skip empty lines and comments
  if (!trimmedLine || trimmedLine.startsWith('#')) {
    return;
  }

  // Parse KEY=VALUE
  const [key, ...valueParts] = trimmedLine.split('=');
  const value = valueParts.join('=').trim();

  if (key && value) {
    config[key.trim()] = value;
  }
});

// Only export client-safe variables (NOT the JWT secrets!)
const clientConfig = {
  YOUTUBE_API_KEY: config.YOUTUBE_API_KEY || '',
  GRAPHQL_ENDPOINT: config.GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
};

// Create dist folder if it doesn't exist
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

// Generate config injection code
const configInjection = `const CONFIG = ${JSON.stringify(clientConfig, null, 2)};`;

// Read source background.js
const backgroundSourcePath = path.join(__dirname, 'background', 'background.js');
const backgroundSource = fs.readFileSync(backgroundSourcePath, 'utf8');

// Inject config into background.js
const backgroundWithConfig = backgroundSource.replace(
  '/* CONFIG_INJECTION_POINT */',
  configInjection
);

// Write injected background.js to dist
const distBackgroundPath = path.join(distPath, 'background');
if (!fs.existsSync(distBackgroundPath)) {
  fs.mkdirSync(distBackgroundPath, { recursive: true });
}

fs.writeFileSync(
  path.join(distBackgroundPath, 'background.js'),
  backgroundWithConfig
);

// Also create config.js for popup
const popupConfigContent = `// Auto-generated config from .env - DO NOT EDIT MANUALLY
const CONFIG = ${JSON.stringify(clientConfig, null, 2)};

// Make available globally for popup
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
`;

const distPopupPath = path.join(distPath, 'popup');
if (!fs.existsSync(distPopupPath)) {
  fs.mkdirSync(distPopupPath, { recursive: true });
}

fs.writeFileSync(
  path.join(distPopupPath, 'config.js'),
  popupConfigContent
);

console.log('✅ Configuration injected into background.js successfully!');
console.log('✅ Configuration file created for popup successfully!');
console.log('📝 Config:', clientConfig);
console.log('⚠️  Remember: JWT token must be obtained after login (not from .env)');
