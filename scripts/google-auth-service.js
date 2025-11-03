/**
 * Google Auth Service
 * Handles Google OAuth authentication
 */

class GoogleAuthService {
  constructor() {
    this.isAuth = false;
    this.userInfo = null;
  }

  async init() {
    // Check if user is already authenticated
    const result = await chrome.storage.local.get(['googleAuth']);
    if (result.googleAuth) {
      this.isAuth = result.googleAuth.isAuthenticated || false;
      this.userInfo = result.googleAuth.userInfo || null;
    }
  }

  async isAuthenticated() {
    return this.isAuth;
  }

  async getUserInfo() {
    return this.userInfo;
  }

  async signIn() {
    try {
      // Get OAuth token from Chrome identity API
      const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(token);
          }
        });
      });

      if (!token) {
        throw new Error('Failed to get auth token');
      }

      // Fetch user info from Google
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const userInfo = await response.json();

      // Store auth state
      this.isAuth = true;
      this.userInfo = userInfo;

      await chrome.storage.local.set({
        googleAuth: {
          isAuthenticated: true,
          userInfo: userInfo,
          token: token
        }
      });

      console.log('Google sign in successful');
      return { success: true, userInfo };
    } catch (error) {
      console.error('Google sign in failed:', error);
      return { success: false, error: error.message };
    }
  }

  async signOut() {
    try {
      // Get stored token
      const result = await chrome.storage.local.get(['googleAuth']);
      const token = result.googleAuth?.token;

      if (token) {
        // Revoke token
        await new Promise((resolve) => {
          chrome.identity.removeCachedAuthToken({ token }, () => {
            resolve();
          });
        });
      }

      // Clear auth state
      this.isAuth = false;
      this.userInfo = null;

      await chrome.storage.local.set({
        googleAuth: {
          isAuthenticated: false,
          userInfo: null,
          token: null
        }
      });

      console.log('Google sign out successful');
      return { success: true };
    } catch (error) {
      console.error('Google sign out failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getToken() {
    try {
      const result = await chrome.storage.local.get(['googleAuth']);
      return result.googleAuth?.token || null;
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.GoogleAuthService = GoogleAuthService;
}
