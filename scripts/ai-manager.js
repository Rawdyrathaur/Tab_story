/**
 * Tab Story - AI Manager
 * Handles Chrome AI APIs (Summarizer, Prompt, Writer, Rewriter, Translator)
 */

class AIManager {
  constructor() {
    this.summarizer = null;
    this.promptAPI = null;
    this.writer = null;
    this.rewriter = null;
    this.translator = null;
    this.isAvailable = false;
    this.init();
  }

  /**
   * Initialize AI capabilities
   */
  async init() {
    try {
      // Check if Chrome AI APIs are available
      this.isAvailable = 'ai' in window && window.ai;

      if (this.isAvailable) {
        console.log('Chrome AI APIs available - Using native AI features');
        await this.checkCapabilities();
      } else {
        console.log('Chrome AI not available - Using smart fallback mode');
        console.log('Fallback features still provide intelligent tab organization');
      }
    } catch (error) {
      console.log('AI Manager initialized in fallback mode');
      this.isAvailable = false;
    }
  }

  /**
   * Check which AI capabilities are available
   */
  async checkCapabilities() {
    try {
      // Check Summarizer API
      if (window.ai && window.ai.summarizer) {
        const summarizerAvailability = await window.ai.summarizer.capabilities();
        if (summarizerAvailability.available === 'readily') {
          console.log('Summarizer API available');
        }
      }

      // Check Prompt API
      if (window.ai && window.ai.languageModel) {
        const promptAvailability = await window.ai.languageModel.capabilities();
        if (promptAvailability.available === 'readily') {
          console.log('Prompt API available');
        }
      }

      // Check Writer API
      if (window.ai && window.ai.writer) {
        console.log('Writer API available');
      }

      // Check Rewriter API
      if (window.ai && window.ai.rewriter) {
        console.log('Rewriter API available');
      }

      // Check Translator API
      if (window.ai && window.ai.translator) {
        console.log('Translator API available');
      }
    } catch (error) {
      console.error('Error checking AI capabilities:', error);
    }
  }

  /**
   * ========================================
   * SUMMARIZER API - Best fit for Tab Memory
   * ========================================
   */

  /**
   * Summarize tab content
   * @param {string} content - The content to summarize
   * @param {string} type - Summary type: 'tl;dr', 'key-points', 'teaser', 'headline'
   * @param {string} format - Format: 'plain-text', 'markdown'
   * @param {string} length - Length: 'short', 'medium', 'long'
   */
  async summarizeContent(content, options = {}) {
    try {
      if (!window.ai || !window.ai.summarizer) {
        throw new Error('Summarizer API not available');
      }

      const {
        type = 'tl;dr',
        format = 'plain-text',
        length = 'medium'
      } = options;

      // Create summarizer instance
      if (!this.summarizer) {
        this.summarizer = await window.ai.summarizer.create({
          type,
          format,
          length
        });
      }

      // Generate summary
      const summary = await this.summarizer.summarize(content);
      return {
        success: true,
        summary,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Summarization failed:', error);
      return {
        success: false,
        error: error.message,
        summary: this.generateFallbackSummary(content)
      };
    }
  }

  /**
   * Summarize tab with different types
   */
  async summarizeTab(tabContent, summaryType = 'tl;dr') {
    const summaryTypes = {
      'tl;dr': { type: 'tl;dr', length: 'short' },
      'key-points': { type: 'key-points', length: 'medium' },
      'teaser': { type: 'teaser', length: 'short' },
      'headline': { type: 'headline', length: 'short' }
    };

    const options = summaryTypes[summaryType] || summaryTypes['tl;dr'];
    return await this.summarizeContent(tabContent, options);
  }

  /**
   * ========================================
   * PROMPT API - For Intent Clustering
   * ========================================
   */

  /**
   * Use Prompt API to cluster tabs by intent/topic
   * @param {Array} tabs - Array of tab objects with titles and URLs
   */
  async clusterTabsByIntent(tabs) {
    try {
      if (!window.ai || !window.ai.languageModel) {
        throw new Error('Prompt API not available');
      }

      // Create prompt session
      if (!this.promptAPI) {
        this.promptAPI = await window.ai.languageModel.create({
          temperature: 0.3,
          topK: 3
        });
      }

      // Prepare tab information
      const tabList = tabs.map((tab, idx) =>
        `${idx + 1}. ${tab.title} - ${tab.url}`
      ).join('\n');

      // Prompt for clustering
      const prompt = `Analyze these browser tabs and group them by common intent or topic. Return only the groups as a JSON array.

Tabs:
${tabList}

Provide a JSON response in this format:
[
  {
    "intent": "Job Search",
    "description": "Searching for software engineering positions",
    "tabIndices": [1, 3, 5]
  },
  {
    "intent": "Learning",
    "description": "Educational resources and tutorials",
    "tabIndices": [2, 4]
  }
]`;

      const response = await this.promptAPI.prompt(prompt);

      // Parse JSON response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const clusters = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          clusters
        };
      }

      return {
        success: false,
        error: 'Failed to parse clustering response'
      };
    } catch (error) {
      console.error('Intent clustering failed:', error);
      return {
        success: false,
        error: error.message,
        clusters: this.generateFallbackClusters(tabs)
      };
    }
  }

  /**
   * Suggest intent based on tab content
   */
  async suggestIntent(tabTitle, tabUrl, tabContent = '') {
    try {
      if (!window.ai || !window.ai.languageModel) {
        throw new Error('Prompt API not available');
      }

      if (!this.promptAPI) {
        this.promptAPI = await window.ai.languageModel.create({
          temperature: 0.5,
          topK: 5
        });
      }

      const prompt = `Based on this browser tab information, suggest a concise intent or purpose (2-4 words):

Title: ${tabTitle}
URL: ${tabUrl}
${tabContent ? `Content preview: ${tabContent.substring(0, 200)}` : ''}

Provide only the intent phrase, nothing else.`;

      const intent = await this.promptAPI.prompt(prompt);
      return {
        success: true,
        intent: intent.trim()
      };
    } catch (error) {
      console.error('Intent suggestion failed:', error);
      return {
        success: false,
        error: error.message,
        intent: this.generateFallbackIntent(tabTitle, tabUrl)
      };
    }
  }

  /**
   * ========================================
   * WRITER API - Generate Notes/Reports
   * ========================================
   */

  /**
   * Generate notes or reports about tab groups
   */
  async generateReport(projectTitle, tabs) {
    try {
      if (!window.ai || !window.ai.writer) {
        throw new Error('Writer API not available');
      }

      if (!this.writer) {
        this.writer = await window.ai.writer.create({
          tone: 'formal',
          length: 'medium'
        });
      }

      const tabList = tabs.map(tab => `- ${tab.title}: ${tab.url}`).join('\n');

      const prompt = `Write a brief summary report for this research project:

Project: ${projectTitle}
Tabs explored:
${tabList}

Generate a concise summary of what was researched.`;

      const report = await this.writer.write(prompt);
      return {
        success: true,
        report
      };
    } catch (error) {
      console.error('Report generation failed:', error);
      return {
        success: false,
        error: error.message,
        report: `Research project: ${projectTitle}\nTabs: ${tabs.length}`
      };
    }
  }

  /**
   * ========================================
   * REWRITER API - Paraphrase Summaries
   * ========================================
   */

  /**
   * Rewrite or paraphrase tab summaries
   */
  async rewriteSummary(text, tone = 'more-casual') {
    try {
      if (!window.ai || !window.ai.rewriter) {
        throw new Error('Rewriter API not available');
      }

      if (!this.rewriter) {
        this.rewriter = await window.ai.rewriter.create({
          tone, // 'more-casual', 'more-formal', 'shorter', 'longer'
          length: 'as-is'
        });
      }

      const rewritten = await this.rewriter.rewrite(text);
      return {
        success: true,
        rewritten
      };
    } catch (error) {
      console.error('Rewriting failed:', error);
      return {
        success: false,
        error: error.message,
        rewritten: text
      };
    }
  }

  /**
   * ========================================
   * TRANSLATOR API - Multilingual Support
   * ========================================
   */

  /**
   * Translate tab summaries
   */
  async translateText(text, targetLanguage = 'es') {
    try {
      if (!window.ai || !window.ai.translator) {
        throw new Error('Translator API not available');
      }

      // Create translator for target language
      const translator = await window.ai.translator.create({
        sourceLanguage: 'en',
        targetLanguage
      });

      const translated = await translator.translate(text);
      return {
        success: true,
        translated,
        targetLanguage
      };
    } catch (error) {
      console.error('Translation failed:', error);
      return {
        success: false,
        error: error.message,
        translated: text
      };
    }
  }

  /**
   * ========================================
   * FALLBACK METHODS (When AI not available)
   * ========================================
   */

  /**
   * Generate fallback summary (simple extraction)
   */
  generateFallbackSummary(content) {
    // Take first 150 characters
    const firstPart = content.substring(0, 150).trim();
    // Try to end at a sentence
    const lastPeriod = firstPart.lastIndexOf('.');
    if (lastPeriod > 50) {
      return firstPart.substring(0, lastPeriod + 1);
    }
    return firstPart + '...';
  }

  /**
   * Generate fallback intent based on URL/title patterns
   */
  generateFallbackIntent(title, url) {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();

    // Common patterns
    if (urlLower.includes('github.com') || titleLower.includes('github')) {
      return 'Development';
    }
    if (urlLower.includes('stackoverflow') || titleLower.includes('stack overflow')) {
      return 'Problem Solving';
    }
    if (urlLower.includes('linkedin') || urlLower.includes('indeed') ||
        titleLower.includes('job') || titleLower.includes('career')) {
      return 'Job Search';
    }
    if (urlLower.includes('youtube') || urlLower.includes('tutorial') ||
        titleLower.includes('learn')) {
      return 'Learning';
    }
    if (urlLower.includes('amazon') || urlLower.includes('shop') ||
        titleLower.includes('buy')) {
      return 'Shopping';
    }
    if (urlLower.includes('news') || urlLower.includes('article')) {
      return 'Reading';
    }

    // Default: extract domain
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain.split('.')[0].charAt(0).toUpperCase() +
             domain.split('.')[0].slice(1);
    } catch {
      return 'Browsing';
    }
  }

  /**
   * Generate fallback clusters (simple domain-based)
   */
  generateFallbackClusters(tabs) {
    const domainMap = {};

    tabs.forEach((tab, idx) => {
      try {
        const domain = new URL(tab.url).hostname;
        if (!domainMap[domain]) {
          domainMap[domain] = [];
        }
        domainMap[domain].push(idx);
      } catch (error) {
        // Invalid URL, skip
      }
    });

    return Object.entries(domainMap).map(([domain, indices]) => ({
      intent: domain.replace('www.', ''),
      description: `Tabs from ${domain}`,
      tabIndices: indices
    }));
  }

  /**
   * ========================================
   * UTILITY METHODS
   * ========================================
   */

  /**
   * Check if AI features are available
   */
  isAIAvailable() {
    return this.isAvailable;
  }

  /**
   * Destroy AI sessions
   */
  async cleanup() {
    try {
      if (this.summarizer) {
        await this.summarizer.destroy();
        this.summarizer = null;
      }
      if (this.promptAPI) {
        await this.promptAPI.destroy();
        this.promptAPI = null;
      }
      if (this.writer) {
        await this.writer.destroy();
        this.writer = null;
      }
      if (this.rewriter) {
        await this.rewriter.destroy();
        this.rewriter = null;
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.AIManager = AIManager;
}
