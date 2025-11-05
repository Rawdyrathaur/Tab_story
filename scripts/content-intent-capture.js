/**
 * Tab Story - Content Script for Intent Capture
 * Injects intent capture modal into new tabs
 */

// Check if already injected
if (!window.tabMemoryAssistantInjected) {
  window.tabMemoryAssistantInjected = true;

  // Only inject on actual web pages, not Chrome pages
  const isValidPage = !window.location.href.startsWith('chrome://') &&
                      !window.location.href.startsWith('chrome-extension://') &&
                      !window.location.href.startsWith('about:');

  if (isValidPage) {
    console.log('[Tab Memory] Content script loaded on:', window.location.href);

    // Listen for intent capture request from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'showIntentCapture') {
        showIntentCaptureModal();
        sendResponse({ success: true });
      }
    });

    /**
     * Show intent capture modal
     */
    function showIntentCaptureModal() {
      // Check if modal already exists
      if (document.getElementById('tab-memory-intent-modal')) {
        return;
      }

      // Create modal HTML
      const modalHTML = `
        <div id="tab-memory-intent-modal" style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          animation: fadeIn 0.3s ease;
        ">
          <div style="
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 24px;
            max-width: 400px;
            width: 90%;
            animation: slideUp 0.3s ease;
          ">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 20px; color: #1C1B1F;">🧠 What are you working on?</h2>
              <button id="tab-memory-close-btn" style="
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #49454E;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background 0.2s;
              " onmouseover="this.style.background='#F5F5F5'" onmouseout="this.style.background='none'">✕</button>
            </div>

            <p style="margin: 0 0 16px 0; color: #49454E; font-size: 14px;">
              Describe your intent to help organize this tab:
            </p>

            <input
              id="tab-memory-intent-input"
              type="text"
              placeholder='e.g., "Job Search", "Research", "Shopping"'
              style="
                width: 100%;
                padding: 12px;
                border: 2px solid #E0E0E0;
                border-radius: 8px;
                font-size: 14px;
                box-sizing: border-box;
                outline: none;
                transition: border-color 0.2s;
              "
              onfocus="this.style.borderColor='#1F6FED'"
              onblur="this.style.borderColor='#E0E0E0'"
            />

            <div id="tab-memory-recent-intents" style="margin-top: 16px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #49454E; font-weight: 500;">Quick select:</p>
              <div id="tab-memory-chips" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>
            </div>

            <div style="display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end;">
              <button id="tab-memory-skip-btn" style="
                padding: 10px 20px;
                background: transparent;
                border: 1px solid #E0E0E0;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                color: #1F6FED;
                transition: all 0.2s;
              " onmouseover="this.style.background='#F5F5F5'" onmouseout="this.style.background='transparent'">Skip</button>
              <button id="tab-memory-save-btn" style="
                padding: 10px 20px;
                background: #1F6FED;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                color: white;
                transition: background 0.2s;
              " onmouseover="this.style.background='#1557C9'" onmouseout="this.style.background='#1F6FED'">Save Intent</button>
            </div>
          </div>
        </div>

        <style>
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        </style>
      `;

      // Insert modal into page
      document.body.insertAdjacentHTML('beforeend', modalHTML);

      // Get elements
      const modal = document.getElementById('tab-memory-intent-modal');
      const input = document.getElementById('tab-memory-intent-input');
      const saveBtn = document.getElementById('tab-memory-save-btn');
      const skipBtn = document.getElementById('tab-memory-skip-btn');
      const closeBtn = document.getElementById('tab-memory-close-btn');
      const chipsContainer = document.getElementById('tab-memory-chips');

      // Focus input
      input.focus();

      // Load recent intents
      loadRecentIntents(chipsContainer, input);

      // Event listeners
      saveBtn.addEventListener('click', () => saveIntent(input.value));
      skipBtn.addEventListener('click', closeModal);
      closeBtn.addEventListener('click', closeModal);

      // Close on backdrop click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });

      // Save on Enter key
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          saveIntent(input.value);
        }
      });

      // Close on Escape key
      document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
          closeModal();
          document.removeEventListener('keydown', escapeHandler);
        }
      });
    }

    /**
     * Load recent intents as chips
     */
    async function loadRecentIntents(container, input) {
      try {
        const response = await chrome.runtime.sendMessage({ action: 'getRecentIntents' });
        if (response && response.intents) {
          response.intents.slice(0, 5).forEach(intent => {
            const chip = document.createElement('button');
            chip.textContent = intent;
            chip.style.cssText = `
              padding: 6px 12px;
              background: #F5F5F5;
              border: 1px solid #E0E0E0;
              border-radius: 16px;
              cursor: pointer;
              font-size: 12px;
              color: #1C1B1F;
              transition: all 0.2s;
            `;
            chip.onmouseover = () => {
              chip.style.background = '#E3F2FD';
              chip.style.borderColor = '#1F6FED';
            };
            chip.onmouseout = () => {
              chip.style.background = '#F5F5F5';
              chip.style.borderColor = '#E0E0E0';
            };
            chip.onclick = () => {
              input.value = intent;
              input.focus();
            };
            container.appendChild(chip);
          });
        }
      } catch (error) {
        console.error('[Tab Memory] Failed to load recent intents:', error);
      }
    }

    /**
     * Save intent
     */
    async function saveIntent(intent) {
      const intentText = intent.trim();

      if (!intentText) {
        alert('Please enter an intent!');
        return;
      }

      try {
        // Send intent to background script
        await chrome.runtime.sendMessage({
          action: 'saveTabWithIntent',
          intent: intentText,
          url: window.location.href,
          title: document.title
        });

        // Show success message
        showToast('Intent saved! 🎉');

        // Close modal
        closeModal();
      } catch (error) {
        console.error('[Tab Memory] Failed to save intent:', error);
        alert('Failed to save intent. Please try again.');
      }
    }

    /**
     * Close modal
     */
    function closeModal() {
      const modal = document.getElementById('tab-memory-intent-modal');
      if (modal) {
        modal.style.animation = 'fadeOut 0.2s ease';
        setTimeout(() => modal.remove(), 200);
      }
    }

    /**
     * Show toast notification
     */
    function showToast(message) {
      const toast = document.createElement('div');
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: #1C1B1F;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 9999999;
        animation: slideUpFade 0.3s ease;
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }

    // Add fadeOut animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      @keyframes slideUpFade {
        from { transform: translateX(-50%) translateY(20px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
}
