// Content script for YouTube pages
class ShortHubExtension {
  constructor() {
    this.init();
  }

  init() {
    // Wait for YouTube to load and handle navigation
    this.observeNavigation();
    this.handleCurrentPage();
  }

  // Handle YouTube's SPA navigation
  observeNavigation() {
    let lastUrl = location.href;
    
    // Listen for navigation changes
    const observer = new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        setTimeout(() => this.handleCurrentPage(), 1000); // Wait for page to load
      }
    });

    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
  }

  // Determine page type and inject appropriate button
  handleCurrentPage() {
    const url = window.location.href;
    
    if (this.isChannelPage(url)) {
      this.injectChannelButton();
    } else if (this.isShortPage(url)) {
      this.injectShortButton();
    }
  }

  // Check if current page is a channel page
  isChannelPage(url) {
    return url.includes('/channel/') || 
           url.includes('/c/') || 
           url.includes('/user/') || 
           url.includes('/@');
  }

  // Check if current page is a short
  isShortPage(url) {
    return url.includes('/shorts/');
  }

  // Inject button on channel pages
  async injectChannelButton() {
    // Wait for the subscription button area to load
    const targetSelector = '.yt-flexible-actions-view-model-wiz__action';
    const target = await this.waitForElement(targetSelector);
    
    if (!target || this.buttonExists()) return;

    const channelData = this.extractChannelData();
    const button = this.createShortHubButton('channel', channelData);
    
    // Insert button next to subscribe button
    target.parentNode.insertBefore(button, target.nextSibling);
  }

  // Inject button on short pages
  async injectShortButton() {
    // Wait for the channel name in shorts
    const targetSelector = '.ytReelChannelBarViewModelChannelName';
    const target = await this.waitForElement(targetSelector);
    
    if (!target || this.buttonExists()) return;

    const shortData = await this.extractShortData();
    const button = this.createShortHubButton('short', shortData);
    
    // Insert button next to channel name
    target.parentNode.insertBefore(button, target.nextSibling);
  }

  // Create the ShortHub button
  createShortHubButton(type, data) {
    const button = document.createElement('button');
    button.className = 'shorthub-extension-btn';
    button.id = 'shorthub-extension-btn';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="30" fill="#FF0000" stroke="#CC0000" stroke-width="2"/>
        <g transform="translate(32,32)">
          <path d="M 0,-20 A 20,20 0 0,1 14.14,-14.14" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <polygon points="14.14,-14.14 18,-18 18,-10 10,-10" fill="white"/>
          <path d="M 0,20 A 20,20 0 0,1 -14.14,14.14" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <polygon points="-14.14,14.14 -18,18 -18,10 -10,10" fill="white"/>
        </g>
        <g transform="translate(32,32)">
          <circle cx="0" cy="0" r="12" fill="white"/>
          <polygon points="-4,-6 -4,6 8,0" fill="#FF0000"/>
        </g>
      </svg>
      <span>Add to ShortHub</span>
    `;
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleButtonClick(type, data);
    });
    
    return button;
  }

  // Handle button click - open modal
  handleButtonClick(type, data) {
    this.showModal(type, data);
  }

  // Extract channel data from channel page
  extractChannelData() {
    const channelName = this.getChannelName();
    const subscriberCount = this.getSubscriberCount();
    const channelUrl = this.getCurrentChannelUrl();
    
    return {
      name: channelName,
      subscribers: subscriberCount,
      url: channelUrl,
      type: 'channel'
    };
  }

  // Extract data from short page
  async extractShortData() {
    const channelName = this.getShortChannelName();
    const channelUrl = await this.getChannelUrlFromShort();
    const subscriberCount = 0; // Will be fetched when we have the channel URL
    
    return {
      name: channelName,
      subscribers: subscriberCount,
      url: channelUrl,
      type: 'short'
    };
  }

  // Get channel name from channel page
  getChannelName() {
    const selectors = [
      '.ytd-channel-name #text',
      '.ytd-channel-name .style-scope',
      '#channel-name #text',
      '[data-testid="channel-name"] #text'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }
    
    return 'Unknown Channel';
  }

  // Get subscriber count
  getSubscriberCount() {
    const selectors = [
      '#subscriber-count',
      '.ytd-c4-tabbed-header-renderer #subscriber-count',
      '[data-testid="subscriber-count"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        return this.parseSubscriberCount(element.textContent.trim());
      }
    }
    
    return 0;
  }

  // Get channel name from short page
  getShortChannelName() {
    const element = document.querySelector('.ytReelChannelBarViewModelChannelName');
    return element ? element.textContent.trim() : 'Unknown Channel';
  }

  // Get current channel URL
  getCurrentChannelUrl() {
    const url = window.location.href;
    
    // If we're already on a channel page, return current URL
    if (this.isChannelPage(url)) {
      return url;
    }
    
    return url;
  }

  // Get channel URL from short (more complex - need to find channel link)
  async getChannelUrlFromShort() {
    // Look for channel link in the short page
    const channelLinkSelectors = [
      '.ytReelChannelBarViewModelChannelName a',
      '[data-testid="channel-link"]',
      'a[href*="/channel/"]',
      'a[href*="/@"]'
    ];
    
    for (const selector of channelLinkSelectors) {
      const element = document.querySelector(selector);
      if (element && element.href) {
        return element.href;
      }
    }
    
    // Fallback: try to construct from current URL or use API
    return window.location.origin + '/channel/UNKNOWN';
  }

  // Parse subscriber count (1.5M -> 1500000)
  parseSubscriberCount(text) {
    const match = text.match(/([\d.,]+)\s*([KMB]?)/i);
    if (!match) return 0;
    
    let number = parseFloat(match[1].replace(/,/g, ''));
    const suffix = match[2].toUpperCase();
    
    switch (suffix) {
      case 'K': return Math.floor(number * 1000);
      case 'M': return Math.floor(number * 1000000);
      case 'B': return Math.floor(number * 1000000000);
      default: return Math.floor(number);
    }
  }

  // Show modal for tag/type selection
  showModal(type, data) {
    // Remove existing modal if any
    this.removeModal();
    
    const modal = this.createModal(type, data);
    document.body.appendChild(modal);
    
    // Focus management
    setTimeout(() => {
      const firstInput = modal.querySelector('select, input');
      if (firstInput) firstInput.focus();
    }, 100);
  }

  // Create modal HTML
  createModal(type, data) {
    const modal = document.createElement('div');
    modal.className = 'shorthub-modal';
    modal.innerHTML = `
      <div class="shorthub-modal-backdrop">
        <div class="shorthub-modal-content">
          <div class="shorthub-modal-header">
            <h3>Add to ShortHub</h3>
            <button class="shorthub-modal-close">&times;</button>
          </div>
          
          <div class="shorthub-modal-body">
            <div class="channel-info">
              <strong>${data.name}</strong>
              ${data.subscribers > 0 ? `<span>${this.formatSubscriberCount(data.subscribers)} subscribers</span>` : ''}
            </div>
            
            <form class="shorthub-form">
              <div class="form-group">
                <label for="tag">Tag</label>
                <select id="tag" required>
                  <option value="">Select tag...</option>
                  <option value="VF">VF</option>
                  <option value="VOSTFR">VOSTFR</option>
                  <option value="VA">VA</option>
                  <option value="VOSTA">VOSTA</option>
                  <option value="VO">VO</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="type">Type</label>
                <select id="type" required>
                  <option value="">Select type...</option>
                  <option value="Mix">Mix</option>
                  <option value="Only">Only</option>
                </select>
              </div>
              
              <div class="form-group" id="domain-group" style="display: none;">
                <label for="domain">Domain</label>
                <input type="text" id="domain" placeholder="Gaming, Tech, Music...">
              </div>
            </form>
          </div>
          
          <div class="shorthub-modal-footer">
            <button type="button" class="btn-cancel">Cancel</button>
            <button type="button" class="btn-save">Add Channel</button>
          </div>
        </div>
      </div>
    `;
    
    // Event listeners
    this.attachModalEventListeners(modal, type, data);
    
    return modal;
  }

  // Attach event listeners to modal
  attachModalEventListeners(modal, type, data) {
    // Close button
    modal.querySelector('.shorthub-modal-close').addEventListener('click', () => {
      this.removeModal();
    });
    
    // Cancel button
    modal.querySelector('.btn-cancel').addEventListener('click', () => {
      this.removeModal();
    });
    
    // Close on backdrop click
    modal.querySelector('.shorthub-modal-backdrop').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.removeModal();
      }
    });
    
    // Type change - show/hide domain field
    modal.querySelector('#type').addEventListener('change', (e) => {
      const domainGroup = modal.querySelector('#domain-group');
      domainGroup.style.display = e.target.value === 'Only' ? 'block' : 'none';
      
      if (e.target.value === 'Only') {
        modal.querySelector('#domain').required = true;
      } else {
        modal.querySelector('#domain').required = false;
      }
    });
    
    // Save button
    modal.querySelector('.btn-save').addEventListener('click', () => {
      this.saveChannel(modal, type, data);
    });
    
    // Enter key to save
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.saveChannel(modal, type, data);
      }
    });
  }

  // Save channel to database
  async saveChannel(modal, type, data) {
    const tag = modal.querySelector('#tag').value;
    const channelType = modal.querySelector('#type').value;
    const domain = modal.querySelector('#domain').value;
    
    // Validation
    if (!tag || !channelType) {
      this.showError(modal, 'Please fill all required fields');
      return;
    }
    
    if (channelType === 'Only' && !domain) {
      this.showError(modal, 'Domain is required for "Only" type');
      return;
    }
    
    const saveBtn = modal.querySelector('.btn-save');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
    
    try {
      // Prepare channel data
      const channelData = {
        youtube_url: data.url,
        username: data.name,
        subscriber_count: data.subscribers,
        tag: tag,
        type: channelType,
        domain: channelType === 'Only' ? domain : null
      };
      
      // Send to background script to save to database
      const response = await chrome.runtime.sendMessage({
        action: 'saveChannel',
        data: channelData
      });
      
      if (response.success) {
        this.showSuccess('Channel added successfully!');
        this.removeModal();
      } else {
        this.showError(modal, response.error || 'Failed to save channel');
      }
      
    } catch (error) {
      console.error('Error saving channel:', error);
      this.showError(modal, 'Failed to save channel');
    } finally {
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }
  }

  // Utility functions
  formatSubscriberCount(count) {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }

  showError(modal, message) {
    const existing = modal.querySelector('.error-message');
    if (existing) existing.remove();
    
    const error = document.createElement('div');
    error.className = 'error-message';
    error.textContent = message;
    
    const body = modal.querySelector('.shorthub-modal-body');
    body.appendChild(error);
  }

  showSuccess(message) {
    // Simple success notification
    const notification = document.createElement('div');
    notification.className = 'shorthub-success-notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  removeModal() {
    const modal = document.querySelector('.shorthub-modal');
    if (modal) {
      modal.remove();
    }
  }

  buttonExists() {
    return document.querySelector('#shorthub-extension-btn') !== null;
  }

  // Wait for element to appear in DOM
  waitForElement(selector, timeout = 10000) {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(document, {
        childList: true,
        subtree: true
      });
      
      // Timeout fallback
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }
}

// Initialize extension
const shortHubExtension = new ShortHubExtension();