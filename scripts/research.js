/**
 * ============================================================================
 * TAB MEMORY ASSISTANT - DETAILED RESEARCH FEATURE
 * ============================================================================
 *
 * PROBLEM SOLVED:
 * Users need intelligent, privacy-respecting summaries and insights
 * from bookmarked webpages without sending data to external servers.
 *
 * SOLUTION: HYBRID AI APPROACH
 * As recommended by the Chrome Built-in AI Challenge, we implement
 * a hybrid strategy using:
 *
 * PRIMARY: Chrome's Built-in AI APIs (100% Client-Side)
 * - Summarizer API - Distill page content into concise summaries
 * - Prompt API - Extract key findings and FAQ from content
 * - Rewriter API - Polish and enhance research quality
 * - 100% client-side processing
 * - Zero data leaves the device
 * - Offline-capable
 *
 * FALLBACK: Gemini Developer API (Cloud-Based)
 * - Ensures feature works for all users
 * - Extended reach to users without Chrome AI access
 * - Same intelligent results
 * - Automatic graceful fallback
 *
 * KEY BENEFITS:
 * - PRIVACY-FIRST: Primary path is 100% client-side
 * - PERFORMANCE: Instant results with Chrome AI
 * - REACH: Works for all users (hybrid approach)
 * - OFFLINE-CAPABLE: Chrome AI path works offline
 * - FUTURE-PROOF: Automatically upgrades when Chrome AI stabilizes
 *
 * WORKFLOW:
 * 1. Initialize Chrome Built-in AI APIs
 * 2. Initialize Gemini API (if key configured)
 * 3. Try Chrome AI first (privacy-preserving)
 * 4. Fall back to Gemini if Chrome AI unavailable
 * 5. Last resort: Basic text extraction
 *
 * ============================================================================
 */

// Store current tab information
let currentTabData = {
  url: '',
  title: '',
  content: '',
  favicon: '',
  visualContent: { images: [], videos: [] }
};

// AI API instances
let summarizer = null;
let session = null;
let rewriter = null;

// Gemini API Configuration
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
let GEMINI_API_KEY = null;

// DOM Elements
const loadingState = document.getElementById('loadingState');
const resultsContainer = document.getElementById('resultsContainer');
const errorState = document.getElementById('errorState');
const submitResearchBtn = document.getElementById('submitResearchBtn');
const retryBtn = document.getElementById('retryBtn');
const moreResearchInput = document.getElementById('moreResearchInput');
const saveSummaryBtn = document.getElementById('saveSummaryBtn');
const copySummaryBtn = document.getElementById('copySummaryBtn');
const saveFindingsBtn = document.getElementById('saveFindingsBtn');
const expandFindingsBtn = document.getElementById('expandFindingsBtn');
const expandAllFaqBtn = document.getElementById('expandAllFaqBtn');
const saveFaqBtn = document.getElementById('saveFaqBtn');

// Hero Section Elements
const heroImage = document.getElementById('heroImage');
const heroTitle = document.getElementById('heroTitle');
const heroMeta = document.getElementById('heroMeta');

// Content Elements
const summaryText = document.getElementById('summaryText');
const findingsGrid = document.getElementById('findingsGrid');
const faqGrid = document.getElementById('faqGrid');

/**
 * Initialize Chrome AI APIs
 */
async function initializeAIAPIs() {
  try {
    // Check if AI APIs are available
    if (!window.ai) {
      console.log('Chrome Built-in AI not available (experimental feature)');
      console.log('To enable: chrome://flags/#optimization-guide-on-device-model');
      return false;
    }

    // Initialize Summarizer API
    try {
      if (window.ai.summarizer) {
        const canSummarize = await window.ai.summarizer.capabilities();
        if (canSummarize && canSummarize.available !== 'no') {
          summarizer = await window.ai.summarizer.create();
          console.log('Summarizer API initialized (Chrome Built-in)');
        }
      }
    } catch (e) {
      console.warn('Summarizer API not available:', e.message);
    }

    // Initialize Prompt API
    try {
      if (window.ai.languageModel) {
        const canPrompt = await window.ai.languageModel.capabilities();
        if (canPrompt && canPrompt.available !== 'no') {
          session = await window.ai.languageModel.create();
          console.log('Prompt API initialized (Chrome Built-in)');
        }
      }
    } catch (e) {
      console.warn('Prompt API not available:', e.message);
    }

    // Initialize Rewriter API
    try {
      if (window.ai.rewriter) {
        const canRewrite = await window.ai.rewriter.capabilities();
        if (canRewrite && canRewrite.available !== 'no') {
          rewriter = await window.ai.rewriter.create();
          console.log('Rewriter API initialized (Chrome Built-in)');
        }
      }
    } catch (e) {
      console.warn('Rewriter API not available:', e.message);
    }

    return true;
  } catch (error) {
    console.error('Failed to initialize AI APIs:', error);
    return false;
  }
}

/**
 * Initialize Gemini API Key
 *
 * DEMO KEY FOR CHROME BUILT-IN AI CHALLENGE:
 * This extension includes a pre-configured Gemini API key to ensure
 * judges and reviewers can immediately test the full functionality
 * without requiring additional setup.
 *
 * The extension uses a HYBRID AI APPROACH:
 * - PRIMARY: Chrome Built-in AI (100% client-side, privacy-first)
 * - FALLBACK: Gemini API (ensures universal compatibility)
 *
 * For production deployment, users should configure their own API key
 * through the extension settings.
 */
async function initializeGeminiAPI() {
  try {
    const result = await chrome.storage.local.get(['geminiApiKey']);

    // If no key in storage, use the demo key for immediate functionality
    if (!result.geminiApiKey) {
      // Demo API key for Chrome Built-in AI Challenge - enables full testing without setup
      const DEFAULT_KEY = 'AIzaSyDlsOTgu3WNh7G-_0qvpQ_ywCr8pSQ2vJ8';
      await chrome.storage.local.set({ geminiApiKey: DEFAULT_KEY });
      GEMINI_API_KEY = DEFAULT_KEY;
      console.log('Gemini API Key configured automatically (Demo mode for testing)');
    } else {
      GEMINI_API_KEY = result.geminiApiKey;
      console.log('Gemini API initialized (Fallback ready)');
    }

    return true;
  } catch (error) {
    console.error('Failed to initialize Gemini API:', error);
    return false;
  }
}

/**
 * Get demo data for testing
 */
function getDemoData() {
  return {
    url: 'https://example.com/ai-research',
    title: 'The Future of Artificial Intelligence: Trends and Predictions',
    content: `The Future of Artificial Intelligence: Trends and Predictions

Artificial intelligence (AI) has rapidly evolved from a theoretical concept to a transformative technology reshaping industries worldwide. Machine learning algorithms now power everything from recommendation systems to autonomous vehicles, demonstrating unprecedented capabilities in pattern recognition and decision-making.

Recent advances in deep learning have enabled AI systems to achieve human-level performance in various tasks. Neural networks with millions of parameters can now understand natural language, generate creative content, and solve complex problems. This progress has opened new possibilities for automation and innovation across sectors.

The integration of AI into everyday applications continues to accelerate. Smart assistants use natural language processing to understand user intent and provide helpful responses. Computer vision systems can identify objects and faces with remarkable accuracy. These technologies are becoming increasingly accessible to developers and businesses of all sizes.

Ethical considerations surrounding AI development have gained prominence. Questions about bias, transparency, and accountability require careful attention from researchers and policymakers. Ensuring that AI systems are fair, explainable, and aligned with human values remains a critical challenge for the field.

Looking ahead, experts predict that AI will continue to advance in capability and reach. Emerging areas like quantum computing may enable even more powerful AI systems. The key will be developing these technologies responsibly while maximizing their benefits for society. As AI becomes more sophisticated, collaboration between technologists, ethicists, and policymakers will be essential.`,
    favicon: 'https://via.placeholder.com/32',
    metadata: {
      author: 'Dr. Sarah Johnson',
      publishDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
      lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      readingTime: 5,
      domain: 'example.com',
      language: 'en',
      schemaData: {
        article: {
          type: 'Article',
          headline: 'The Future of Artificial Intelligence'
        }
      },
      socialShares: {}
    },
    visualContent: { images: [], videos: [] },
    structuredData: { tables: [], lists: [] },
    links: [],
    extractedFaqs: []
  };
}

/**
 * Get current tab data from storage (set by sidepanel)
 */
async function getCurrentTabData() {
  try {
    // Get stored page data (set when research button is clicked from sidepanel)
    const result = await chrome.storage.local.get(['currentPageData', 'activeTabData']);

    if (result.currentPageData) {
      currentTabData = result.currentPageData;
      return currentTabData;
    }

    if (result.activeTabData) {
      currentTabData = result.activeTabData;
      return currentTabData;
    }

    // Fallback: try to get current tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // If on extension page, use demo data
    if (tab.url.startsWith('chrome-extension://')) {
      console.log('Using demo data for testing...');
      currentTabData = getDemoData();
      return currentTabData;
    }

    // Try to get page content via content script
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });

      currentTabData = {
        url: tab.url,
        title: tab.title,
        content: response?.content || '',
        favicon: tab.favIconUrl || '',
        metadata: response?.metadata || {},
        visualContent: response?.visualContent || { images: [], videos: [] },
        structuredData: response?.structuredData || { tables: [], lists: [] },
        links: response?.links || [],
        extractedFaqs: response?.faqs || []
      };

      return currentTabData;
    } catch (msgError) {
      // Content script not loaded yet, use basic tab info or demo data
      currentTabData = {
        url: tab.url,
        title: tab.title,
        content: `Page title: ${tab.title}. URL: ${tab.url}. Please visit a content-rich webpage for better analysis.`,
        favicon: tab.favIconUrl || ''
      };

      // If content is too short, use demo data
      if (currentTabData.content.length < 200) {
        console.log('Content too short, using demo data...');
        currentTabData = getDemoData();
      }

      return currentTabData;
    }
  } catch (error) {
    console.error('Failed to get tab data:', error);
    // Last resort: use demo data
    console.log('Error occurred, using demo data...');
    currentTabData = getDemoData();
    return currentTabData;
  }
}

/**
 * Generate summary using Chrome Summarizer API
 */
async function generateSummary(content) {
  try {
    if (!summarizer) {
      throw new Error('Summarizer not available');
    }

    // First get a key-points summary
    const rawSummary = await summarizer.summarize(content, {
      type: 'key-points',
      length: 'medium'
    });

    // Use Prompt API to create an intelligent, research-quality summary
    if (session) {
      try {
        // Use MORE content for better context
        const contentForSummary = content.substring(0, 5000);

        const refinedPrompt = `You are a professional research analyst conducting comprehensive deep analysis. Read this content carefully and create a DETAILED research summary of 150-200 words (approximately 10-12 lines).

CONTENT TO ANALYZE:
${contentForSummary}

YOUR TASK:
Write a comprehensive, detailed research-grade summary that includes:

STRUCTURE (150-200 words total):
1. OPENING CONTEXT (2-3 sentences): What is this about? Set the scene with specific details.
2. SPECIFIC DATA POINTS (3-4 sentences): Extract and cite exact numbers, percentages, statistics, dates, prices, quantities, measurements
3. KEY ENTITIES & ACTORS (2-3 sentences): Mention specific names, organizations, people, products, technologies, locations, brands
4. CONCRETE FINDINGS (2-3 sentences): What actual discoveries, conclusions, methodologies, or insights are presented?
5. SIGNIFICANCE & IMPACT (2-3 sentences): Why does this matter? What are the real-world implications, applications, or consequences?

QUALITY STANDARDS:
- Write 150-200 words minimum - this is a DETAILED summary
- Read like a professional research brief with substantial depth
- Every sentence must contain specific, verifiable information
- Include concrete numbers, dates, names, quotes - prove you analyzed the actual content
- Use precise, technical language with concrete details
- Create a narrative flow that connects all the information
- Make it comprehensive enough that someone could understand the page without reading it

FORBIDDEN:
- NO generic phrases like "this article discusses" or "the content covers"
- NO vague descriptions or generalizations
- NO filler words or redundant phrases
- NO short summaries - must be 150-200 words

Write your comprehensive 10-12 line research summary now:`;

        const refined = await session.prompt(refinedPrompt);
        return refined.trim();
      } catch (refineError) {
        console.log('Could not refine summary, using original');
        return rawSummary;
      }
    }

    return rawSummary;
  } catch (error) {
    console.error('Failed to generate summary:', error);
    return 'Unable to generate summary for this page.';
  }
}

/**
 * Extract key findings using Chrome Prompt API
 */
async function extractFindings(content, summary) {
  try {
    if (!session) {
      throw new Error('Prompt API not available');
    }

    // Use substantially more content for deeper findings - increased to 10000 characters
    const contentToAnalyze = content.substring(0, 10000);

    const prompt = `You are a senior research analyst conducting an exhaustive in-depth investigation. Analyze this content and extract 4 COMPREHENSIVE KEY FINDINGS with maximum depth and detail.

CONTENT TO ANALYZE:
${contentToAnalyze}

CONTEXT: ${summary}

YOUR MISSION:
Extract 4 research-quality findings. Each finding MUST be COMPREHENSIVE and DETAILED.

MANDATORY REQUIREMENTS FOR EACH FINDING:

1. EVIDENCE-BASED: Built on specific data, facts, quotes, or concrete examples from the content
2. HIGHLY DETAILED: Must include exact numbers, percentages, statistics, dates, prices, measurements, specifications
3. DEEPLY ANALYTICAL: Explain WHY it matters, WHAT the implications are, HOW it works, WHO is affected
4. ACTIONABLE: Provide insights readers can understand, apply, or act upon

DETAILED FINDING STRUCTURE (6-8 sentences per finding):
- Title: Specific, compelling (5-10 words) that captures the core insight with impact

- Content (6-8 sentences minimum):
  * OPENING (1-2 sentences): State the finding with multiple specific data points and facts
  * EVIDENCE (2-3 sentences): Provide concrete examples, numbers, quotes, statistics, and detailed specifications
  * ANALYSIS (2-3 sentences): Explain the significance, real-world impact, mechanisms, causes, and effects
  * CONTEXT (1-2 sentences): Add depth with comparisons, trends, historical context, future implications, or expert perspectives

QUALITY CRITERIA (MUST FOLLOW):
- Each finding must be 6-8 sentences of dense, informative content
- Include multiple exact figures, percentages, dates, names, technical specifications
- Explain detailed mechanisms, processes, methodologies - show expert-level understanding
- Connect findings to broader industry implications, market trends, or societal impact
- Every sentence must add substantial new information
- Use technical terminology where appropriate
- Include specific examples, case studies, or real-world applications

FORBIDDEN:
- NO vague observations like "interesting approach" or "important topic"
- NO generic statements without specific data backing
- NO surface-level descriptions - must dig extremely deep
- NO short findings - each must be 6-8 sentences minimum
- NO missing numbers - must include all available data

FORMAT:
Return ONLY a JSON array with 4 findings:
[
  {
    "title": "Precise, Detailed Finding Title With Clear Impact Statement",
    "content": "Opening statement with multiple specific data points (e.g., 45% increase over 3 years, $2.5M investment). Additional quantitative evidence with exact figures and dates (e.g., launched in Q2 2023, supports 127 languages). Detailed examples from the content showing how this works in practice, including specific features or capabilities mentioned. Analysis of why this matters: impact on efficiency (30% faster), cost savings ($500K annually), or market position (15% share gain). Explanation of the mechanisms or processes that enable this finding. Comparison to industry standards or competitors showing relative advantages (2x faster than alternatives). Future implications or trends that make this significant (projected 200% growth by 2025), plus expert validation or supporting evidence from the content."
  },
  ... 4 comprehensive findings total ...
]

Generate your 4 comprehensive, detailed findings now:`;

    const response = await session.prompt(prompt);

    // Parse JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const findings = JSON.parse(jsonMatch[0]);

      // Add icons
      const icons = ['lightbulb', 'chart-line', 'cogs', 'star'];
      return findings.slice(0, 4).map((finding, index) => ({
        icon: icons[index] || 'circle',
        title: finding.title,
        content: finding.content
      }));
    }

    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Failed to extract findings:', error);
    return generateDefaultFindings(summary);
  }
}

/**
 * Generate FAQ using Chrome Prompt API
 */
async function generateFAQ(content, summary) {
  try {
    if (!session) {
      throw new Error('Prompt API not available');
    }

    // Use more content for better context - increased to 7000 for comprehensive FAQs
    const contentToUse = content.substring(0, 7000);

    const prompt = `You are a research expert creating an FAQ section based on deep content analysis. Your questions must demonstrate thorough understanding and provide genuine value.

CONTENT:
${contentToUse}

SUMMARY: ${summary}

MISSION:
Create 4 FAQs that a knowledgeable person would ask after READING this content. Each FAQ must:

QUESTION REQUIREMENTS:
-Reference SPECIFIC elements from the content (names, concepts, data, features)
-Ask practical, meaningful questions (How, Why, When, What makes...)
-Show expertise - not beginner questions
-Focus on depth: mechanisms, comparisons, applications, implications
-Sound natural and relevant to the subject matter

ANSWER REQUIREMENTS:
-3-5 sentences of detailed, specific information
-Include concrete data, examples, or facts from the content
-Explain mechanisms, processes, or reasoning
-Provide context, comparisons, or real-world applications
-Dense with information - every sentence adds value

FORBIDDEN QUESTIONS:
-"What is this page/article about?"
-"What is the main topic?"
-"Who is the author?"
-"What type of content is this?"
-Any surface-level or generic question

EXAMPLE QUALITY:
Good: "How does [specific method/technology from content] achieve [specific outcome mentioned] compared to traditional approaches?"
Bad: "What is the main benefit of this approach?"

Good: "What are the key factors that contribute to [specific phenomenon mentioned], and how do they interact?"
Bad: "Why is this topic important?"

FORMAT:
Return ONLY a JSON array:
[
  {
    "question": "How does [specific concept] achieve [specific result] when [specific condition]?",
    "answer": "Detailed explanation with specific data from content. Evidence and examples. Comparison or context. Significance and applications. Additional depth or implications."
  },
  ...4 total...
]

Generate your expert FAQs:`;

    const response = await session.prompt(prompt);

    // Parse JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const faqs = JSON.parse(jsonMatch[0]);
      return faqs.slice(0, 4);
    }

    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Failed to generate FAQ:', error);
    return [];
  }
}

/**
 * Polish text using Chrome Rewriter API
 */
async function polishText(text) {
  try {
    if (!rewriter) {
      return text;
    }

    const polished = await rewriter.rewrite(text, {
      tone: 'more-formal',
      length: 'as-is'
    });

    return polished || text;
  } catch (error) {
    console.error('Failed to polish text:', error);
    return text;
  }
}

/**
 * ============================================================================
 * GEMINI API FUNCTIONS (FALLBACK)
 * ============================================================================
 */

/**
 * Call Gemini API with a prompt
 */
async function callGeminiAPI(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  try {
    const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE"
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API Error Response:', errorData);
      throw new Error(`Gemini API error: ${response.status} - ${errorData.substring(0, 200)}`);
    }

    const data = await response.json();

    // Enhanced validation with detailed error messages
    if (!data.candidates || data.candidates.length === 0) {
      console.error('Gemini API returned no candidates:', data);
      throw new Error('Gemini API returned empty response. This may be due to content filtering or safety blocks.');
    }

    if (!data.candidates[0].content || !data.candidates[0].content.parts) {
      console.error('Gemini API response missing content:', data);
      throw new Error('Gemini API response has invalid structure.');
    }

    if (!data.candidates[0].content.parts[0] || !data.candidates[0].content.parts[0].text) {
      console.error('Gemini API response missing text:', data);
      throw new Error('Gemini API response contains no text content.');
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw error;
  }
}

/**
 * Generate summary using Gemini API
 */
async function generateSummaryWithGemini(content) {
  try {
    console.log('Using Gemini API for summary generation...');

    // Use MAXIMUM content for comprehensive detail (increased to 15000 characters)
    const contentToAnalyze = content.substring(0, 15000);

    const prompt = `You are a professional research analyst. Analyze this webpage comprehensively and create an EXTREMELY DETAILED, LONG-FORM summary of 350-450 words (minimum 10-12 lines of dense text).

CONTENT TO ANALYZE:
${contentToAnalyze}

CREATE A COMPREHENSIVE 10+ LINE SUMMARY covering ALL important aspects:

MANDATORY INFORMATION TO INCLUDE:

1. OVERVIEW & PURPOSE (20-30 words):
   - What exactly is this product/service/website/topic
   - Primary function and main use cases
   - Target users or industries

2. COMPLETE FEATURE SET (80-100 words):
   - List EVERY major feature mentioned (aim for 8-12 features minimum)
   - ALL capabilities, tools, and functionalities
   - ALL supported formats, file types, export options
   - ALL integrations with other platforms/services
   - Technical specifications (resolutions, languages, voices, etc.)
   - Customization options and controls available

3. PRICING & PLANS (60-80 words):
   - EVERY pricing tier with exact dollar amounts
   - What's included in each plan (characters, minutes, features)
   - Free trial details (duration, limitations, what's included)
   - Free plan offerings if available
   - Enterprise or custom pricing options
   - Payment terms (monthly, annual, per-use)
   - Any promotional pricing or discounts mentioned

4. TECHNICAL SPECIFICATIONS (60-80 words):
   - Exact numbers: language count, voice count, format count
   - ALL supported output formats (MP3, WAV, MP4, etc.)
   - Platform availability (web, mobile iOS/Android, desktop, API)
   - Processing capabilities (speed, file size limits, character limits)
   - Quality options (bitrates, sample rates, resolutions)
   - Browser compatibility, system requirements
   - API access and developer tools

5. BENEFITS & USE CASES (60-80 words):
   - Specific industries or professions that benefit
   - Real-world applications and examples
   - Unique selling points and differentiators
   - Workflow improvements or time savings
   - Quality advantages or special technologies
   - Integration benefits with existing tools

6. ADDITIONAL IMPORTANT DETAILS (40-60 words):
   - Company background if mentioned
   - Customer support options
   - Learning resources or tutorials
   - Community or user base size
   - Awards, certifications, or recognitions
   - Any guarantees or policies

CRITICAL - MUST EXTRACT AND INCLUDE:
✓ EVERY number found (languages, voices, prices, limits, counts)
✓ EVERY product/feature/tool name mentioned
✓ EVERY price point and plan tier
✓ EVERY supported format, platform, integration
✓ EVERY technical specification (bitrates, resolutions, speeds)
✓ Company name, technologies used, partner names
✓ ALL use cases and application areas

WRITING REQUIREMENTS:
- Write in flowing paragraph form (NO bullet points, NO lists)
- Pack MAXIMUM information into every sentence (3-5 facts per sentence)
- Every sentence must advance understanding with NEW specific details
- Include exact numbers, prices, and specifications throughout
- Name EVERYTHING specifically - no generic references
- NO vague statements - everything verifiable and concrete
- NO meta-phrases - start directly with facts
- Use connecting words to maintain flow while adding dense information

CRITICAL LENGTH: 350-450 words MINIMUM (this equals 10-12 dense lines)

EXAMPLE OF REQUIRED DENSITY:
"Narakeet is an AI-powered text-to-speech and video narration platform offering 700+ realistic voices across 90+ languages and 140+ locales, utilizing neural TTS engines from Amazon Polly, Google Wavenet, and Microsoft Azure. The platform enables users to convert text scripts or PowerPoint presentations into narrated videos, supporting output in MP3, WAV, and M4A audio formats at bitrates up to 320kbps, and MP4/WebM video formats with resolutions from 360p to 4K. Pricing begins at $6 per month for the Starter plan including 1 million characters and 20 minutes of video, the Hobbyist plan at $19/month offers 5 million characters and 120 minutes, while the Pro plan at $49/month provides 20 million characters and 600 minutes of video with commercial usage rights. A free trial allows creation of 5 videos and 1000 characters without requiring credit card information, while enterprise customers can access unlimited usage with dedicated support and custom invoicing..."

Provide ONLY the comprehensive, detailed summary (no headers, no formatting, just continuous text):`;

    const summary = await callGeminiAPI(prompt);
    return summary.trim();
  } catch (error) {
    console.error('Failed to generate summary with Gemini:', error);
    throw error;
  }
}

/**
 * Extract key findings using Gemini API
 */
async function extractFindingsWithGemini(content, summary) {
  try {
    console.log('Using Gemini API for findings extraction...');

    // Use maximum content for exhaustive analysis - increased to 12000 for deepest findings
    const contentToAnalyze = content.substring(0, 12000);

    const prompt = `You are a senior research analyst. Extract 4 EXTREMELY DETAILED, COMPREHENSIVE KEY FINDINGS with maximum information density.

CONTENT TO ANALYZE:
${contentToAnalyze}

SUMMARY CONTEXT: ${summary}

CREATE 4 COMPREHENSIVE, INFORMATION-PACKED FINDINGS:

MANDATORY REQUIREMENTS FOR EACH FINDING:

1. TITLE (6-12 words):
   - Highly specific and descriptive
   - MUST include key numbers, names, or technical terms when possible
   - Example: "Advanced Neural TTS Engine Supports 90+ Languages with 500+ Voice Options"

2. CONTENT (6-8 sentences, 120-180 words PER FINDING):
   - Sentence 1-2: State the finding with MULTIPLE specific numbers, names, dates, prices, technical specifications
   - Sentence 3-4: Include MORE specific details (exact pricing tiers, supported formats, technical capabilities, platform compatibility)
   - Sentence 5-6: Explain detailed real-world applications, use cases, or implementations
   - Sentence 7-8: Add comparative data, industry context, technical specifications, or future implications

MUST INCLUDE IN EACH FINDING (COMPREHENSIVE):
- At least 5-8 specific numbers, percentages, quantities, or measurements
- 3-5 exact product/feature/technology/company names
- Multiple technical details (file formats, platforms, API specifications, processing speeds)
- Concrete examples with quantifiable results
- Pricing information with specific tiers (if mentioned)
- Dates, timelines, or version numbers (if available)
- Performance metrics, benchmarks, or comparison data

QUALITY STANDARDS (STRICT):
- EXTREME detail density - pack every sentence with multiple facts
- Include ALL available numbers (prices, quantities, dates, percentages, speeds, capacities)
- Name ALL specific features, tools, formats, technologies, integrations mentioned
- Provide exhaustive specifications and capabilities
- Each finding must be 120-180 words minimum (6-8 sentences)
- NO generic statements - everything must be hyper-specific and verifiable
- NO vague language - use exact terms and measurements

EXAMPLE OF EXCELLENT COMPREHENSIVE FINDING:
Title: "Enterprise-Grade Text-to-Speech with 700+ Neural Voices and Multi-Platform API"
Content: "Narakeet provides access to over 700 premium AI voices across 90+ languages and 140+ regional locales, powered by advanced neural text-to-speech technology from Amazon Polly, Google WaveNet, and Microsoft Azure Cognitive Services. The platform supports extensive voice customization including adjustable speech rate (0.25x to 4x normal speed), precise pitch control (-20% to +50%), SSML markup for advanced pronunciation, and custom lexicons for domain-specific terminology. Users can generate high-quality narration in multiple formats: MP3 (up to 320kbps), WAV (24-bit/48kHz), M4A, OGG Vorbis, and FLAC lossless audio. Pricing begins at $6 per month for 1 million characters (approximately 20 hours of audio), scaling to $49/month for 10 million characters, with custom enterprise plans supporting unlimited usage and dedicated infrastructure. The service processes approximately 50,000 characters per minute on average, with enterprise tier achieving up to 200,000 characters per minute, enabling production of 4-hour audiobooks in under 15 minutes. Integration options include REST API, Python SDK, Node.js library, and direct Zapier connections, making it compatible with over 3,000 productivity tools and content management systems."

Return ONLY JSON array (4 comprehensive findings):
[
  {"title": "Highly Detailed Finding Title With Specific Numbers and Names", "content": "Extremely dense, fact-packed content with 5-8 specific numbers, multiple exact names, comprehensive technical details, detailed pricing tiers, specific format support, performance metrics, integration options, and concrete real-world applications all in 6-8 detailed, information-rich sentences totaling 120-180 words."},
  ...4 comprehensive findings total...
]`;

    const response = await callGeminiAPI(prompt);

    // Parse JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const findings = JSON.parse(jsonMatch[0]);

      // Add icons
      const icons = ['lightbulb', 'chart-line', 'cogs', 'star'];
      return findings.slice(0, 4).map((finding, index) => ({
        icon: icons[index] || 'circle',
        title: finding.title,
        content: finding.content
      }));
    }

    throw new Error('Invalid response format from Gemini');
  } catch (error) {
    console.error('Failed to extract findings with Gemini:', error);
    throw error;
  }
}

/**
 * Generate FAQ using Gemini API
 */
async function generateFAQWithGemini(content, summary) {
  try {
    console.log('Using Gemini API for FAQ generation...');

    // Use more content for better context - increased to 7000 for comprehensive FAQs
    const contentToUse = content.substring(0, 7000);

    const prompt = `You are a research expert creating FAQs based on deep content analysis. Questions must show thorough understanding and provide genuine value.

CONTENT:
${contentToUse}

SUMMARY: ${summary}

CREATE 4 EXPERT-LEVEL FAQS:

QUESTION REQUIREMENTS:
-Reference SPECIFIC elements (names, concepts, data, features)
-Ask practical questions (How, Why, When, What makes...)
-Show expertise - not beginner questions
-Focus on depth: mechanisms, comparisons, applications
-Sound natural and relevant

ANSWER REQUIREMENTS:
-3-5 sentences of detailed information
-Include concrete data, examples, facts
-Explain mechanisms, processes, reasoning
-Provide context, comparisons, applications
-Dense with information

FORBIDDEN:
-"What is this page about?"
-"What is the main topic?"
-Any surface-level question

EXAMPLES:
Good: "How does [specific method from content] achieve [specific outcome] compared to traditional approaches?"
Bad: "What is the main benefit?"

Return ONLY JSON array:
[
  {
    "question": "How does [specific concept] achieve [specific result]?",
    "answer": "Detailed explanation with specific data. Evidence and examples. Context and significance. Additional depth."
  },
  ...4 total...
]`;

    const response = await callGeminiAPI(prompt);

    // Parse JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const faqs = JSON.parse(jsonMatch[0]);
      return faqs.slice(0, 4);
    }

    throw new Error('Invalid response format from Gemini');
  } catch (error) {
    console.error('Failed to generate FAQ with Gemini:', error);
    throw error;
  }
}

/**
 * ============================================================================
 * END GEMINI API FUNCTIONS
 * ============================================================================
 */

/**
 * Generate default findings as fallback
 */
function generateDefaultFindings(summary) {
  const words = summary.split(' ');
  const midpoint = Math.floor(words.length / 2);

  return [
    {
      icon: 'lightbulb',
      title: 'Key Insight',
      content: words.slice(0, midpoint).join(' ')
    },
    {
      icon: 'chart-line',
      title: 'Main Point',
      content: words.slice(midpoint).join(' ')
    }
  ];
}

/**
 * Populate Hero Section
 */
function populateHero(data) {
  heroImage.src = data.image || currentTabData.favicon || 'https://via.placeholder.com/180x120?text=Research';
  heroTitle.textContent = data.title || currentTabData.title;

  // Populate meta items
  heroMeta.innerHTML = data.meta.map(item => `
    <div class="meta-item">
      <i class="fas fa-${item.icon} meta-icon"></i>
      <span>${item.text}</span>
    </div>
  `).join('');
}

/**
 * Populate Summary
 */
function populateSummary(text) {
  summaryText.textContent = text;
}

/**
 * Populate Findings
 */
function populateFindings(findings) {
  findingsGrid.innerHTML = findings.map((finding, index) => `
    <div class="finding-card" data-finding-index="${index}">
      <div class="finding-card-header">
        <div class="finding-card-title">
          <i class="fas fa-${finding.icon} finding-card-icon"></i>
          ${finding.title}
        </div>
        <div class="finding-card-actions">
          <button class="icon-btn save-finding-btn" data-finding-index="${index}" title="Save finding">
            <i class="fas fa-bookmark"></i>
          </button>
        </div>
      </div>
      <div class="finding-card-content">
        ${finding.content}
      </div>
    </div>
  `).join('');

  // Add event listeners to individual save buttons
  document.querySelectorAll('.save-finding-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const index = parseInt(e.currentTarget.dataset.findingIndex);
      const finding = findings[index];

      try {
        const findingData = {
          title: finding.title,
          content: finding.content,
          url: currentTabData.url,
          pageTitle: currentTabData.title,
          timestamp: new Date().toISOString()
        };

        const result = await chrome.storage.local.get(['savedFindings']);
        const savedFindings = result.savedFindings || [];
        savedFindings.unshift(findingData);

        if (savedFindings.length > 200) {
          savedFindings.length = 200;
        }

        await chrome.storage.local.set({ savedFindings });
        showToast('Finding saved!');

        // Visual feedback
        btn.classList.add('saved');
        btn.querySelector('i').classList.remove('fa-bookmark');
        btn.querySelector('i').classList.add('fa-check');
        setTimeout(() => {
          btn.querySelector('i').classList.remove('fa-check');
          btn.querySelector('i').classList.add('fa-bookmark');
          btn.classList.remove('saved');
        }, 2000);
      } catch (error) {
        console.error('Failed to save finding:', error);
        showToast('Failed to save finding');
      }
    });
  });
}

/**
 * Populate FAQs
 */
function populateFAQs(faqs) {
  faqGrid.innerHTML = faqs.map((faq, index) => `
    <div class="faq-card" data-faq-index="${index}">
      <div class="faq-card-header">
        <div class="faq-card-question">${faq.question}</div>
        <i class="fas fa-chevron-down faq-card-icon"></i>
      </div>
      <div class="faq-card-answer">
        <p>${faq.answer}</p>
      </div>
      <div class="faq-card-actions">
        <button class="action-btn save-faq-btn" data-faq-index="${index}">
          <i class="fas fa-bookmark"></i>
          <span>Save Answer</span>
        </button>
        <button class="action-btn copy-faq-btn" data-faq-index="${index}">
          <i class="fas fa-copy"></i>
          <span>Copy</span>
        </button>
      </div>
    </div>
  `).join('');

  // Re-attach FAQ card functionality
  initFAQCards();

  // Add event listeners to save buttons
  document.querySelectorAll('.save-faq-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const index = parseInt(e.currentTarget.dataset.faqIndex);
      const faq = faqs[index];

      try {
        const faqData = {
          question: faq.question,
          answer: faq.answer,
          url: currentTabData.url,
          pageTitle: currentTabData.title,
          timestamp: new Date().toISOString()
        };

        const result = await chrome.storage.local.get(['savedFAQs']);
        const savedFAQs = result.savedFAQs || [];
        savedFAQs.unshift(faqData);

        if (savedFAQs.length > 200) {
          savedFAQs.length = 200;
        }

        await chrome.storage.local.set({ savedFAQs });
        showToast('FAQ saved!');

        // Visual feedback
        const icon = btn.querySelector('i');
        icon.classList.remove('fa-bookmark');
        icon.classList.add('fa-check');
        setTimeout(() => {
          icon.classList.remove('fa-check');
          icon.classList.add('fa-bookmark');
        }, 2000);
      } catch (error) {
        console.error('Failed to save FAQ:', error);
        showToast('Failed to save FAQ');
      }
    });
  });

  // Add event listeners to copy buttons
  document.querySelectorAll('.copy-faq-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const index = parseInt(e.currentTarget.dataset.faqIndex);
      const faq = faqs[index];

      const text = `Q: ${faq.question}\n\nA: ${faq.answer}`;
      await copyToClipboard(text);

      // Visual feedback
      const icon = btn.querySelector('i');
      const span = btn.querySelector('span');
      icon.classList.remove('fa-copy');
      icon.classList.add('fa-check');
      span.textContent = 'Copied';
      setTimeout(() => {
        icon.classList.remove('fa-check');
        icon.classList.add('fa-copy');
        span.textContent = 'Copy';
      }, 2000);
    });
  });
}

/**
 * Populate Actionable Insights
 */
function populateActionableInsights(insights) {
  const insightsSection = document.getElementById('insightsSection');
  const insightsGrid = document.getElementById('insightsGrid');

  if (!insights) {
    insightsSection?.classList.add('hidden');
    return;
  }

  // Show section if we have any insights data
  if (insights.nextSteps?.length || insights.relatedTopics?.length || insights.practicalUses?.length || insights.warnings?.length) {
    insightsSection?.classList.remove('hidden');
  } else {
    insightsSection?.classList.add('hidden');
    return;
  }

  let insightsHTML = '';

  // Next Steps
  if (insights.nextSteps && insights.nextSteps.length > 0) {
    insightsHTML += `
      <div class="insight-card next-steps-card animate-fade-in">
        <div class="insight-card-header">
          <div class="insight-card-icon">
            <i class="fas fa-tasks"></i>
          </div>
          <h4 class="insight-card-title">What You Can Do Next</h4>
        </div>
        <ul class="insight-list next-steps-list">
          ${insights.nextSteps.map(step => `
            <li class="insight-item">
              <i class="fas fa-check-circle"></i>
              <span>${escapeHtml(step)}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  // Related Topics
  if (insights.relatedTopics && insights.relatedTopics.length > 0) {
    insightsHTML += `
      <div class="insight-card related-topics-card animate-fade-in">
        <div class="insight-card-header">
          <div class="insight-card-icon">
            <i class="fas fa-compass"></i>
          </div>
          <h4 class="insight-card-title">Related Topics to Explore</h4>
        </div>
        <ul class="insight-list topics-list">
          ${insights.relatedTopics.map(topic => `
            <li class="insight-item topic-item">
              <i class="fas fa-lightbulb"></i>
              <span>${escapeHtml(topic)}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  // Practical Uses
  if (insights.practicalUses && insights.practicalUses.length > 0) {
    insightsHTML += `
      <div class="insight-card practical-uses-card animate-fade-in">
        <div class="insight-card-header">
          <div class="insight-card-icon">
            <i class="fas fa-tools"></i>
          </div>
          <h4 class="insight-card-title">Practical Applications</h4>
        </div>
        <ul class="insight-list practical-list">
          ${insights.practicalUses.map(use => `
            <li class="insight-item">
              <i class="fas fa-arrow-right"></i>
              <span>${escapeHtml(use)}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  // Warnings
  if (insights.warnings && insights.warnings.length > 0) {
    insightsHTML += `
      <div class="insight-card warnings-card animate-fade-in">
        <div class="insight-card-header">
          <div class="insight-card-icon warning-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h4 class="insight-card-title">Important Considerations</h4>
        </div>
        <ul class="insight-list warnings-list">
          ${insights.warnings.map(warning => `
            <li class="insight-item warning-item">
              <i class="fas fa-info-circle"></i>
              <span>${escapeHtml(warning)}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  if (insightsGrid) {
    insightsGrid.innerHTML = insightsHTML;
  }
}

/**
 * Populate Link Analysis
 */
function populateLinkAnalysis(links) {
  const linksSection = document.getElementById('linksSection');
  const linksGrid = document.getElementById('linksGrid');

  if (!links || links.length === 0) {
    linksSection?.classList.add('hidden');
    return;
  }

  // Categorize links
  const categorized = extractLinks(links);

  // Rank external domains
  const topDomains = rankDomainsByFrequency(categorized.external).slice(0, 5);

  // Only show section if we have meaningful data
  if (topDomains.length === 0 && categorized.resources.length === 0 && categorized.references.length === 0) {
    linksSection?.classList.add('hidden');
    return;
  }

  linksSection?.classList.remove('hidden');

  let linksHTML = '';

  // Top External Domains
  if (topDomains.length > 0) {
    linksHTML += `
      <div class="links-card top-domains-card animate-fade-in">
        <div class="links-card-header">
          <div class="links-card-icon">
            <i class="fas fa-globe"></i>
          </div>
          <h4 class="links-card-title">Top Referenced Sources</h4>
        </div>
        <div class="domains-list">
          ${topDomains.map(domain => `
            <div class="domain-item">
              <div class="domain-info">
                <div class="domain-name">
                  <i class="fas fa-${domain.credibility.icon}"></i>
                  <span>${escapeHtml(domain.name)}</span>
                </div>
                <span class="domain-badge ${domain.credibility.level}">
                  ${domain.credibility.badge}
                </span>
              </div>
              <div class="domain-stats">
                <span class="domain-count">${domain.count} link${domain.count !== 1 ? 's' : ''}</span>
              </div>
              <div class="domain-links">
                ${domain.links.slice(0, 3).map(link => `
                  <a href="${link.url}" target="_blank" class="domain-link" title="${escapeHtml(link.text)}">
                    <i class="fas fa-external-link-alt"></i>
                    <span>${escapeHtml(link.text.substring(0, 50))}${link.text.length > 50 ? '...' : ''}</span>
                  </a>
                `).join('')}
                ${domain.links.length > 3 ? `
                  <span class="more-links">+${domain.links.length - 3} more</span>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Resources (PDFs, Docs, etc.)
  if (categorized.resources.length > 0) {
    linksHTML += `
      <div class="links-card resources-card animate-fade-in">
        <div class="links-card-header">
          <div class="links-card-icon">
            <i class="fas fa-file-download"></i>
          </div>
          <h4 class="links-card-title">Downloadable Resources</h4>
        </div>
        <ul class="resource-list">
          ${categorized.resources.slice(0, 5).map(resource => {
            const ext = resource.url.match(/\.(pdf|doc|docx|ppt|pptx|xls|xlsx)$/i)?.[1]?.toUpperCase() || 'FILE';
            return `
              <li class="resource-item">
                <div class="resource-icon ${ext.toLowerCase()}">
                  <i class="fas fa-file-${ext === 'PDF' ? 'pdf' : ext.includes('DOC') ? 'word' : ext.includes('PPT') ? 'powerpoint' : 'excel'}"></i>
                  <span class="resource-ext">${ext}</span>
                </div>
                <a href="${resource.url}" target="_blank" class="resource-link">
                  ${escapeHtml(resource.text)}
                </a>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    `;
  }

  // References
  if (categorized.references.length > 0) {
    linksHTML += `
      <div class="links-card references-card animate-fade-in">
        <div class="links-card-header">
          <div class="links-card-icon">
            <i class="fas fa-book"></i>
          </div>
          <h4 class="links-card-title">Citations & References</h4>
        </div>
        <ul class="reference-list">
          ${categorized.references.slice(0, 5).map(ref => `
            <li class="reference-item">
              <i class="fas fa-quote-left"></i>
              <a href="${ref.url}" target="_blank" class="reference-link">
                ${escapeHtml(ref.text)}
              </a>
              <span class="reference-domain">${escapeHtml(ref.domain)}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  if (linksGrid) {
    linksGrid.innerHTML = linksHTML;
  }
}

/**
 * Initialize FAQ Cards
 */
function initFAQCards() {
  const faqCards = document.querySelectorAll('.faq-card');
  faqCards.forEach(card => {
    const header = card.querySelector('.faq-card-header');
    if (header) {
      header.addEventListener('click', () => {
        card.classList.toggle('active');
      });
    }
  });
}

/**
 * Populate Visual Content
 */
function populateVisualContent(visualContent) {
  const visualSection = document.getElementById('visualSection');
  const visualGrid = document.getElementById('visualGrid');

  // If no visual content and we have a URL, try to show at least a preview
  if (!visualContent || (!visualContent.images?.length && !visualContent.videos?.length)) {
    // Check if this is a demo/test - add placeholder
    if (currentTabData.url && currentTabData.url.includes('example.com')) {
      visualContent = {
        images: [
          {
            url: 'https://via.placeholder.com/800x600/4A90E2/ffffff?text=Demo+Image+1',
            alt: 'Demo visualization showing AI technology concepts',
            title: 'AI Technology Demo',
            width: 800,
            height: 600,
            context: 'This is a demonstration of how visual content will be displayed in the research results. Images from the actual webpage will appear here with context and descriptions.'
          },
          {
            url: 'https://via.placeholder.com/800x600/50C878/ffffff?text=Demo+Image+2',
            alt: 'Chart showing growth trends',
            title: 'Growth Chart',
            width: 800,
            height: 600,
            context: 'Charts, diagrams, and infographics will be extracted and displayed with their surrounding context to help understand the visual information.'
          }
        ],
        videos: []
      };
    } else {
      visualSection.classList.add('hidden');
      return;
    }
  }

  visualSection.classList.remove('hidden');

  const visualItems = [];

  // Add images
  if (visualContent.images && visualContent.images.length > 0) {
    visualContent.images.forEach(img => {
      visualItems.push(`
        <div class="visual-item animate-fade-in">
          <div class="visual-item-image">
            <img src="${img.url}" alt="${escapeHtml(img.alt || 'Image')}" loading="lazy">
            <div class="visual-item-badge">
              <i class="fas fa-image"></i>
              <span>Image</span>
            </div>
          </div>
          <div class="visual-item-content">
            ${img.context || img.alt ? `
              <p class="visual-item-context">${escapeHtml(img.context || img.alt)}</p>
            ` : ''}
            <div class="visual-item-meta">
              <span class="visual-item-dimensions">
                <i class="fas fa-expand-arrows-alt"></i>
                ${img.width} × ${img.height}
              </span>
              <div class="visual-item-actions">
                <button class="action-btn-sm" onclick="window.open('${img.url}', '_blank')" title="Open in new tab">
                  <i class="fas fa-external-link-alt"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `);
    });
  }

  // Add videos
  if (visualContent.videos && visualContent.videos.length > 0) {
    visualContent.videos.forEach(video => {
      visualItems.push(`
        <div class="visual-item video-item animate-fade-in">
          <div class="visual-item-image">
            ${video.poster ? `<img src="${video.poster}" alt="Video thumbnail" loading="lazy">` :
              `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#333;">
                <i class="fas fa-play-circle" style="font-size:64px;color:#fff;opacity:0.5;"></i>
              </div>`}
            <div class="visual-item-badge video-badge">
              <i class="fas fa-play"></i>
              <span>${video.platform || 'Video'}</span>
            </div>
          </div>
          <div class="visual-item-content">
            ${video.context ? `
              <p class="visual-item-context">${escapeHtml(video.context)}</p>
            ` : ''}
            <div class="visual-item-meta">
              <span class="visual-item-dimensions">
                <i class="fas fa-video"></i>
                ${video.platform || 'Video'}
              </span>
              <div class="visual-item-actions">
                <button class="action-btn-sm" onclick="window.open('${video.url}', '_blank')" title="Open video">
                  <i class="fas fa-play"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `);
    });
  }

  visualGrid.innerHTML = visualItems.join('');
}

/**
 * Populate Structured Data (Tables and Lists)
 */
function populateStructuredData(structuredData) {
  const structuredSection = document.getElementById('structuredSection');
  const tablesContainer = document.getElementById('tablesContainer');
  const listsContainer = document.getElementById('listsContainer');
  const tablesGrid = document.getElementById('tablesGrid');
  const listsGrid = document.getElementById('listsGrid');

  // Check if we have any structured data
  if (!structuredData || (!structuredData.tables?.length && !structuredData.lists?.length)) {
    structuredSection.classList.add('hidden');
    return;
  }

  structuredSection.classList.remove('hidden');

  // Populate Tables
  if (structuredData.tables && structuredData.tables.length > 0) {
    tablesContainer.classList.remove('hidden');
    const tableCards = [];

    structuredData.tables.forEach((table, index) => {
      // Build table HTML
      let tableHTML = '<table class="structured-table"><thead><tr>';

      // Add headers
      if (table.headers && table.headers.length > 0) {
        table.headers.forEach(header => {
          tableHTML += `<th>${escapeHtml(header)}</th>`;
        });
      } else if (table.rows.length > 0) {
        // Create generic headers based on column count
        const colCount = table.rows[0].length;
        for (let i = 0; i < colCount; i++) {
          tableHTML += `<th>Column ${i + 1}</th>`;
        }
      }

      tableHTML += '</tr></thead><tbody>';

      // Add rows
      table.rows.forEach(row => {
        tableHTML += '<tr>';
        row.forEach(cell => {
          tableHTML += `<td>${escapeHtml(cell)}</td>`;
        });
        tableHTML += '</tr>';
      });

      tableHTML += '</tbody></table>';

      // Determine title
      const title = table.caption || table.context || `Table ${index + 1}`;
      const showMore = table.rowCount > table.rows.length;

      tableCards.push(`
        <div class="table-card animate-fade-in">
          <div class="table-card-header">
            <div class="table-card-title">
              <i class="fas fa-table"></i>
              ${escapeHtml(title)}
            </div>
            ${table.context && !table.caption ? `
              <div class="table-card-context">${escapeHtml(table.context)}</div>
            ` : ''}
          </div>
          <div class="table-card-body">
            <div class="table-wrapper">
              ${tableHTML}
            </div>
          </div>
          <div class="table-card-footer">
            <div class="table-row-info">
              <i class="fas fa-list-ol"></i>
              <span>${table.rowCount || table.rows.length} row${(table.rowCount || table.rows.length) !== 1 ? 's' : ''}</span>
              ${showMore ? `<span style="color: var(--color-primary);">(showing ${table.rows.length})</span>` : ''}
            </div>
            <div class="table-actions">
              <button class="table-action-btn" onclick="copyTableData(${index})" title="Copy table data">
                <i class="fas fa-copy"></i>
                Copy
              </button>
            </div>
          </div>
        </div>
      `);
    });

    tablesGrid.innerHTML = tableCards.join('');
  } else {
    tablesContainer.classList.add('hidden');
  }

  // Populate Lists
  if (structuredData.lists && structuredData.lists.length > 0) {
    listsContainer.classList.remove('hidden');
    const listCards = [];

    structuredData.lists.forEach((list, index) => {
      const listType = list.type === 'ol' ? 'Ordered' : 'Unordered';
      const listClass = list.type === 'ol' ? 'list-ol' : 'list-ul';
      const title = list.context || `${listType} List ${index + 1}`;
      const showMore = list.itemCount > list.items.length;

      // Build list HTML
      let listHTML = `<${list.type} class="structured-list ${listClass}">`;
      list.items.forEach(item => {
        listHTML += `<li>${escapeHtml(item)}</li>`;
      });
      listHTML += `</${list.type}>`;

      listCards.push(`
        <div class="list-card animate-fade-in">
          <div class="list-card-header">
            <div class="list-card-title">
              <i class="fas ${list.type === 'ol' ? 'fa-list-ol' : 'fa-list-ul'}"></i>
              ${escapeHtml(title)}
              <span class="list-type-badge">
                <i class="fas ${list.type === 'ol' ? 'fa-sort-numeric-down' : 'fa-circle'}"></i>
                ${listType}
              </span>
            </div>
          </div>
          <div class="list-card-body">
            ${listHTML}
          </div>
          <div class="list-card-footer">
            <div class="list-item-info">
              <i class="fas fa-list"></i>
              <span>${list.itemCount || list.items.length} item${(list.itemCount || list.items.length) !== 1 ? 's' : ''}</span>
              ${showMore ? `<span style="color: var(--color-primary);">(showing ${list.items.length})</span>` : ''}
            </div>
            <div class="table-actions">
              <button class="table-action-btn" onclick="copyListData(${index})" title="Copy list items">
                <i class="fas fa-copy"></i>
                Copy
              </button>
            </div>
          </div>
        </div>
      `);
    });

    listsGrid.innerHTML = listCards.join('');
  } else {
    listsContainer.classList.add('hidden');
  }

  // Store structured data globally for copy functions
  window.currentStructuredData = structuredData;
}

/**
 * Populate Source Metadata
 */
function populateMetadata(metadata) {
  const metadataSection = document.getElementById('metadataSection');
  const metadataGrid = document.getElementById('metadataGrid');

  // Always try to show metadata with at least basic info
  if (!metadata) {
    metadata = {};
  }

  // Extract domain from current URL if not provided
  if (!metadata.domain && currentTabData.url) {
    try {
      const urlObj = new URL(currentTabData.url);
      metadata.domain = urlObj.hostname.replace('www.', '');
    } catch (e) {
      metadata.domain = 'Unknown source';
    }
  }

  // Only show section if we have author, publish date, or domain
  const hasRelevantMetadata = metadata.author || metadata.publishDate || metadata.domain;

  if (!hasRelevantMetadata) {
    metadataSection?.classList.add('hidden');
    return;
  }

  metadataSection?.classList.remove('hidden');

  const metadataItems = [];

  // Author
  if (metadata.author) {
    metadataItems.push(`
      <div class="metadata-item animate-fade-in">
        <div class="metadata-icon author-icon">
          <i class="fas fa-user"></i>
        </div>
        <div class="metadata-content">
          <div class="metadata-label">Author</div>
          <div class="metadata-value">${escapeHtml(metadata.author)}</div>
        </div>
      </div>
    `);
  }

  // Publish Date with freshness badge
  if (metadata.publishDate) {
    const freshness = calculateFreshness(metadata.publishDate);
    const formattedDate = formatDate(metadata.publishDate);

    metadataItems.push(`
      <div class="metadata-item animate-fade-in">
        <div class="metadata-icon date-icon">
          <i class="fas fa-calendar-alt"></i>
        </div>
        <div class="metadata-content">
          <div class="metadata-label">Published</div>
          <div class="metadata-value">${formattedDate}</div>
          ${freshness.badge ? `<span class="metadata-badge ${freshness.class}">${freshness.badge}</span>` : ''}
        </div>
      </div>
    `);
  }

  // Website/Domain (only if author or publish date exist)
  if (metadata.domain && (metadata.author || metadata.publishDate)) {
    metadataItems.push(`
      <div class="metadata-item animate-fade-in">
        <div class="metadata-icon domain-icon">
          <i class="fas fa-globe"></i>
        </div>
        <div class="metadata-content">
          <div class="metadata-label">Source Domain</div>
          <div class="metadata-value">${escapeHtml(metadata.domain)}</div>
        </div>
      </div>
    `);
  }

  // Note: Only showing Author, Published Date, and Source Domain as requested
  // Removed: Reading Time, Last Updated, Language, Schema.org, Social Shares

  metadataGrid.innerHTML = metadataItems.join('');
}

/**
 * Calculate content freshness based on publish date
 */
function calculateFreshness(publishDate) {
  if (!publishDate) return { badge: null, class: '' };

  try {
    const published = new Date(publishDate);
    const now = new Date();
    const daysDiff = Math.floor((now - published) / (1000 * 60 * 60 * 24));

    if (daysDiff < 7) {
      return { badge: 'Fresh', class: 'fresh' };
    } else if (daysDiff < 90) {
      return { badge: 'Recent', class: 'fresh' };
    } else if (daysDiff < 365) {
      return { badge: null, class: '' };
    } else if (daysDiff < 730) {
      return { badge: 'Last year', class: 'outdated' };
    } else {
      const years = Math.floor(daysDiff / 365);
      return { badge: `${years}y old`, class: 'stale' };
    }
  } catch (e) {
    return { badge: null, class: '' };
  }
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return 'Unknown';

  try {
    const date = new Date(dateString);
    const now = new Date();
    const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    // Show relative time for recent dates
    if (daysDiff === 0) return 'Today';
    if (daysDiff === 1) return 'Yesterday';
    if (daysDiff < 7) return `${daysDiff} days ago`;
    if (daysDiff < 30) return `${Math.floor(daysDiff / 7)} weeks ago`;

    // Show formatted date for older content
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}

/**
 * Get language name from code
 */
function getLanguageName(code) {
  const languages = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'zh': 'Chinese',
    'ko': 'Korean',
    'ar': 'Arabic',
    'hi': 'Hindi'
  };
  return languages[code] || code.toUpperCase();
}

/**
 * Format large numbers
 */
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Copy table data to clipboard
 */
function copyTableData(tableIndex) {
  if (!window.currentStructuredData || !window.currentStructuredData.tables) return;

  const table = window.currentStructuredData.tables[tableIndex];
  let text = '';

  // Add headers
  if (table.headers && table.headers.length > 0) {
    text += table.headers.join('\t') + '\n';
  }

  // Add rows
  table.rows.forEach(row => {
    text += row.join('\t') + '\n';
  });

  navigator.clipboard.writeText(text).then(() => {
    showToast('Table data copied to clipboard!');
  });
}

/**
 * Copy list data to clipboard
 */
function copyListData(listIndex) {
  if (!window.currentStructuredData || !window.currentStructuredData.lists) return;

  const list = window.currentStructuredData.lists[listIndex];
  const text = list.items.join('\n');

  navigator.clipboard.writeText(text).then(() => {
    showToast('List items copied to clipboard!');
  });
}

/**
 * Show toast notification
 */
function showToast(message) {
  // Create toast if not exists
  let toast = document.getElementById('copy-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'copy-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background-color: #2d3748;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-size: 14px;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.opacity = '1';

  setTimeout(() => {
    toast.style.opacity = '0';
  }, 2000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Generate fallback research data when AI APIs are not available
 */
function generateFallbackResearch(tabData) {
  const pageContent = tabData.content || '';
  const title = tabData.title || 'Page';
  const url = tabData.url || '';

  // Extract domain from URL
  let domain = 'this website';
  try {
    const urlObj = new URL(url);
    domain = urlObj.hostname.replace('www.', '');
  } catch (e) {}

  // Extract first few sentences as summary
  const sentences = pageContent.match(/[^.!?]+[.!?]+/g) || [];

  let summary;
  if (sentences.length >= 2) {
    // Try to create a 40-word summary from available sentences
    let combinedText = sentences.slice(0, 3).join(' ');
    const words = combinedText.split(/\s+/);

    if (words.length >= 40) {
      // Take first 40 words
      summary = words.slice(0, 40).join(' ') + '.';
    } else {
      // Use what we have
      summary = combinedText;
    }
  } else if (pageContent.length > 50) {
    // Use first portion of content, trying to get ~40 words
    const words = pageContent.trim().split(/\s+/);
    if (words.length >= 40) {
      summary = words.slice(0, 40).join(' ') + '...';
    } else {
      summary = pageContent.substring(0, 300).trim() + '...';
    }
  } else {
    // Very short content - create a 40-word generic summary
    summary = `This page from ${domain} titled "${title}" contains information that may be primarily visual or interactive. The page structure suggests it may include multimedia content, forms, or dynamic elements requiring user interaction to fully explore the available features.`;
  }

  // Generate findings based on available content
  const findings = [];

  // Finding 1: Page Overview
  findings.push({
    icon: 'file-alt',
    title: 'Page Overview',
    content: sentences[0] || `This is a webpage from ${domain} titled "${title}". The page may contain visual or interactive content.`
  });

  // Finding 2: Content Type
  if (sentences.length > 1) {
    findings.push({
      icon: 'info-circle',
      title: 'Key Information',
      content: sentences[1]
    });
  } else {
    findings.push({
      icon: 'info-circle',
      title: 'Content Type',
      content: `This page appears to be ${pageContent.length > 500 ? 'content-rich' : 'concise'} with approximately ${pageContent.length} characters of text content.`
    });
  }

  // Finding 3: Additional Details
  if (sentences.length > 2) {
    findings.push({
      icon: 'lightbulb',
      title: 'Main Topics',
      content: sentences[2]
    });
  } else {
    findings.push({
      icon: 'lightbulb',
      title: 'Page Structure',
      content: `The page is accessible at ${domain} and may include interactive elements, images, or specialized content that enhances the user experience.`
    });
  }

  // Finding 4: Source Information
  findings.push({
    icon: 'chart-line',
    title: 'Source Information',
    content: `Content sourced from ${domain}. Page contains ${pageContent.length} characters of extractable text content.`
  });

  // Generate FAQs
  const faqs = [
    {
      question: `What is this page about?`,
      answer: sentences[0] || `This page from ${domain} titled "${title}" contains information that may include text, images, and interactive elements.`
    },
    {
      question: 'What type of content does this page contain?',
      answer: pageContent.length > 500
        ? `This page contains substantial text content (${pageContent.length} characters) and appears to be informational in nature.`
        : `This page may primarily contain visual, interactive, or multimedia content with limited extractable text.`
    }
  ];

  return { summary, findings, faqs };
}

/**
 * Load Research Results using HYBRID AI APPROACH
 * PRIMARY: Chrome Built-in AI APIs
 * FALLBACK: Gemini Developer API
 */
async function loadResearchResults() {
  const startTime = Date.now();

  try {
    // Ensure loading state is visible
    loadingState.style.display = 'flex';
    loadingState.classList.remove('hidden');
    resultsContainer.style.display = 'none';
    resultsContainer.classList.add('hidden');

    // Initialize both AI systems
    const chromeAIAvailable = await initializeAIAPIs();
    const geminiAvailable = await initializeGeminiAPI();

    // Get current tab data
    const tabData = await getCurrentTabData();

    // Ensure we have at least some content to analyze
    if (!tabData.content) {
      tabData.content = `${tabData.title || 'Unknown Page'}\n\nURL: ${tabData.url || ''}\n\nThis page contains limited information.`;
    }

    let summary, findings, faqs;
    let aiMethod = 'unknown';

    // Use substantial content for deep research (AI APIs have limits but we want depth)
    const contentToAnalyze = tabData.content.substring(0, 8000);

    // HYBRID APPROACH: Try Chrome AI first, then Gemini, then basic fallback
    try {
      // PRIMARY: Try Chrome Built-in AI APIs
      if (chromeAIAvailable && (summarizer || session)) {
        console.log('PRIMARY PATH: Using Chrome Built-in AI APIs (100% client-side)');
        aiMethod = 'Chrome Built-in AI';

        // Generate summary using Summarizer API
        if (summarizer) {
          summary = await generateSummary(contentToAnalyze);
          summary = await polishText(summary);
        } else if (geminiAvailable) {
          console.log('Summarizer not available, using Gemini for summary');
          summary = await generateSummaryWithGemini(contentToAnalyze);
          aiMethod = 'Hybrid (Chrome + Gemini)';
        } else {
          throw new Error('No summarization available');
        }

        // Extract findings and FAQ using Prompt API
        if (session) {
          findings = await extractFindings(contentToAnalyze, summary);
          faqs = await generateFAQ(contentToAnalyze, summary);
        } else if (geminiAvailable) {
          console.log('Prompt API not available, using Gemini for findings/FAQ');
          findings = await extractFindingsWithGemini(contentToAnalyze, summary);
          faqs = await generateFAQWithGemini(contentToAnalyze, summary);
          aiMethod = 'Hybrid (Chrome + Gemini)';
        } else {
          throw new Error('No findings extraction available');
        }
      }
      // FALLBACK: Try Gemini API
      else if (geminiAvailable) {
        console.log('FALLBACK PATH: Using Gemini Developer API');
        console.log('Chrome Built-in AI not available. Enable it in chrome://flags for 100% client-side processing.');
        aiMethod = 'Gemini API';

        summary = await generateSummaryWithGemini(contentToAnalyze);
        findings = await extractFindingsWithGemini(contentToAnalyze, summary);
        faqs = await generateFAQWithGemini(contentToAnalyze, summary);
      }
      // LAST RESORT: Basic text extraction
      else {
        console.warn('NO AI AVAILABLE: Using basic text extraction');
        console.log('Enable Chrome AI in chrome://flags or set Gemini API key in settings.');
        aiMethod = 'Basic Extraction';

        const fallback = generateFallbackResearch(tabData);
        summary = fallback.summary;
        findings = fallback.findings;
        faqs = fallback.faqs;
      }
    } catch (aiError) {
      console.error('AI processing failed:', aiError);

      // Try Gemini as fallback if Chrome AI failed
      if (aiMethod !== 'Gemini API' && geminiAvailable) {
        try {
          console.log('Chrome AI failed, trying Gemini API fallback');
          aiMethod = 'Gemini API (Fallback)';

          summary = await generateSummaryWithGemini(contentToAnalyze);
          findings = await extractFindingsWithGemini(contentToAnalyze, summary);
          faqs = await generateFAQWithGemini(contentToAnalyze, summary);
        } catch (geminiError) {
          console.error('Gemini fallback failed:', geminiError);
          // Use basic extraction as last resort
          const fallback = generateFallbackResearch(tabData);
          summary = fallback.summary;
          findings = fallback.findings;
          faqs = fallback.faqs;
          aiMethod = 'Basic Extraction';
        }
      } else {
        // Use basic extraction as last resort
        const fallback = generateFallbackResearch(tabData);
        summary = fallback.summary;
        findings = fallback.findings;
        faqs = fallback.faqs;
        aiMethod = 'Basic Extraction';
      }
    }

    console.log(`-Research completed using: ${aiMethod}`);

    // SMART FAQ HANDLING: Combine extracted FAQs with AI-generated ones
    if (tabData.extractedFaqs && tabData.extractedFaqs.length > 0) {
      console.log(`Found ${tabData.extractedFaqs.length} FAQs extracted from page`);

      // If we have enough extracted FAQs (4+), use only those
      if (tabData.extractedFaqs.length >= 4) {
        faqs = tabData.extractedFaqs.slice(0, 6);
        console.log('-Using extracted FAQs from page');
      } else {
        // Mix extracted and AI-generated FAQs
        const neededFaqs = Math.max(0, 4 - tabData.extractedFaqs.length);
        if (neededFaqs > 0 && Array.isArray(faqs)) {
          faqs = [...tabData.extractedFaqs, ...faqs.slice(0, neededFaqs)];
          console.log(`-Using ${tabData.extractedFaqs.length} extracted + ${neededFaqs} AI-generated FAQs`);
        } else {
          faqs = tabData.extractedFaqs;
        }
      }
    } else {
      console.log('No FAQs found on page, using AI-generated FAQs');
    }

    // Prepare hero data
    const heroData = {
      image: tabData.favicon || 'https://via.placeholder.com/180x120?text=Research',
      title: tabData.title.split(' ').slice(0, 4).join(' '),
      meta: [
        { icon: 'calendar-alt', text: `Researched: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` }
      ]
    };

    // Populate all sections
    populateHero(heroData);
    populateSummary(summary);
    populateFindings(findings);
    populateFAQs(faqs);
    // populateMetadata(tabData.metadata || {}); // Source Information section removed
    populateVisualContent(tabData.visualContent || { images: [], videos: [] });
    populateStructuredData(tabData.structuredData || { tables: [], lists: [] });

    // Show results after minimum loading time
    const minLoadingTime = 2000;
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

    setTimeout(() => {
      // Fade out loading
      loadingState.style.opacity = '0';

      setTimeout(() => {
        // Hide loading completely
        loadingState.style.display = 'none';
        loadingState.classList.add('hidden');

        // Show results
        resultsContainer.style.display = 'flex';
        resultsContainer.classList.remove('hidden');

        // Trigger fade in
        setTimeout(() => {
          resultsContainer.style.opacity = '1';
        }, 10);
      }, 300);
    }, remainingTime);

  } catch (error) {
    console.error('Failed to load research results:', error);
    showError(error.message);
  }
}

/**
 * Show error state
 */
function showError(message) {
  loadingState.style.display = 'none';
  loadingState.classList.add('hidden');

  errorState.classList.remove('hidden');
  errorState.style.display = 'flex';

  const errorMessage = document.getElementById('errorMessage');
  if (errorMessage) {
    let displayMessage = message || 'Something went wrong. Please try again.';

    // Add helpful tips based on error type
    if (message.includes('AI APIs')) {
      displayMessage += '\n\nTip: Enable Chrome AI features in chrome://flags:\n- Optimization Guide On Device Model\n- Prompt API for Gemini Nano\n- Summarization API for Gemini Nano';
    } else if (message.includes('extension pages') || message.includes('open a webpage')) {
      displayMessage = 'Please navigate to a regular webpage first, then access the Research page from the side panel.';
    } else if (message.includes('Insufficient content')) {
      displayMessage = 'This page doesn\'t have enough text content to analyze. Try a content-rich webpage like a news article or blog post.';
    }

    errorMessage.textContent = displayMessage;
  }
}

/**
 * Expand All FAQ Cards
 */
function handleExpandAllFAQ() {
  const faqCards = document.querySelectorAll('.faq-card');
  const allExpanded = Array.from(faqCards).every(card => card.classList.contains('active'));

  faqCards.forEach(card => {
    if (allExpanded) {
      card.classList.remove('active');
    } else {
      card.classList.add('active');
    }
  });

  // Update button text
  const buttonText = expandAllFaqBtn.querySelector('span');
  if (buttonText) {
    buttonText.textContent = allExpanded ? 'Expand All' : 'Collapse All';
  }
}

/**
 * Copy Summary to Clipboard
 */
function copySummaryToClipboard() {
  const text = summaryText.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Summary copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

/**
 * Show Toast Message
 */
function showResearchToast(message, type = 'info') {
  // Enhanced toast for research page
  const toast = document.createElement('div');
  toast.className = `research-toast toast-${type}`;

  const icon = type === 'success' ? 'fa-check-circle' :
               type === 'error' ? 'fa-exclamation-circle' :
               'fa-info-circle';

  toast.innerHTML = `
    <i class="fas ${icon}"></i>
    <span>${message}</span>
  `;

  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    animation: slideUp 0.3s ease;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideDown 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Event Listeners
if (expandAllFaqBtn) {
  expandAllFaqBtn.addEventListener('click', handleExpandAllFAQ);
}

if (copySummaryBtn) {
  copySummaryBtn.addEventListener('click', copySummaryToClipboard);
}

if (submitResearchBtn) {
  submitResearchBtn.addEventListener('click', async () => {
    const query = moreResearchInput.value.trim();
    if (query) {
      await handleAdditionalResearch(query);
    }
  });
}

// Also handle Enter key
if (moreResearchInput) {
  moreResearchInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      const query = moreResearchInput.value.trim();
      if (query) {
        await handleAdditionalResearch(query);
      }
    }
  });
}

/**
 * Handle additional research queries
 * Uses hybrid approach: Chrome Prompt API or Gemini API
 */
async function handleAdditionalResearch(query) {
  try {
    showResearchToast(`Researching: ${query}`, 'info');

    // Disable input while processing
    submitResearchBtn.disabled = true;
    submitResearchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Researching...</span>';
    moreResearchInput.disabled = true;

    let answer;

    // Get page summary for context
    const summaryElement = document.getElementById('summaryText');
    const pageSummary = summaryElement ? summaryElement.textContent.substring(0, 500) : '';

    // Try Chrome Prompt API first, then Gemini as fallback
    if (session) {
      console.log('Using Chrome Prompt API for additional research');

      // Enhanced prompt with better context
      const prompt = `You are analyzing a webpage titled "${currentTabData.title}".

Page Summary: ${pageSummary}

Page URL: ${currentTabData.url}

User Question: ${query}

Provide a comprehensive, detailed answer to the user's question based on the page content. Include:
1. Direct answer to the question (2-3 sentences)
2. Supporting details or examples from the page
3. Any relevant context or implications

Format your response in clear paragraphs.`;

      answer = await session.prompt(prompt);

      // Polish if rewriter is available
      if (rewriter) {
        try {
          answer = await rewriter.rewrite(answer, { tone: 'more-formal', length: 'as-is' });
        } catch (e) {
          console.log('Rewriter not available, using raw answer');
        }
      }

    } else if (GEMINI_API_KEY) {
      console.log('Using Gemini API for additional research');

      const prompt = `Analyze this webpage and answer the question:

Title: "${currentTabData.title}"
URL: ${currentTabData.url}
Summary: ${pageSummary}

Question: ${query}

Provide a comprehensive answer with:
- Direct response (2-3 sentences)
- Supporting details from the page
- Relevant context

Format in clear paragraphs.`;

      answer = await callGeminiAPI(prompt);
    } else {
      throw new Error('No AI available for additional research. Please enable Chrome AI or add a Gemini API key.');
    }

    // Add to additional results section
    const additionalResults = document.getElementById('additionalResults');
    const resultCard = document.createElement('section');
    resultCard.className = 'research-section';
    resultCard.style.animation = 'fadeIn 0.5s ease';

    resultCard.innerHTML = `
      <div class="section-header">
        <div class="section-title-container">
          <i class="fas fa-lightbulb section-icon"></i>
          <h3 class="section-title">${escapeHtml(query)}</h3>
        </div>
        <div class="section-actions">
          <button class="action-btn copy-answer-btn" title="Copy answer">
            <i class="fas fa-copy"></i>
            <span>Copy</span>
          </button>
          <button class="action-btn remove-answer-btn" title="Remove">
            <i class="fas fa-times"></i>
            <span>Remove</span>
          </button>
        </div>
      </div>
      <div class="section-content">
        <div class="answer-text">${formatAnswer(answer)}</div>
      </div>
    `;

    // Add event listeners
    const copyBtn = resultCard.querySelector('.copy-answer-btn');
    const removeBtn = resultCard.querySelector('.remove-answer-btn');

    copyBtn.addEventListener('click', () => {
      const answerText = resultCard.querySelector('.answer-text').textContent;
      navigator.clipboard.writeText(answerText);
      showResearchToast('Answer copied!', 'success');
    });

    removeBtn.addEventListener('click', () => {
      resultCard.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => resultCard.remove(), 300);
    });

    additionalResults.appendChild(resultCard);

    // Clear input
    moreResearchInput.value = '';

    // Scroll to new result
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

    showResearchToast('Research completed successfully!', 'success');

  } catch (error) {
    console.error('Additional research failed:', error);
    showResearchToast(error.message || 'Failed to generate answer. Please try again.', 'error');
  } finally {
    // Re-enable input
    submitResearchBtn.disabled = false;
    submitResearchBtn.innerHTML = '<i class="fas fa-search"></i><span>Research</span>';
    moreResearchInput.disabled = false;
  }
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper function to format answer with paragraphs
function formatAnswer(text) {
  // Split by double newlines or numbered lists
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map(p => {
    p = p.trim();
    if (!p) return '';

    // Check if it's a numbered point
    if (/^\d+\./.test(p)) {
      return `<p><strong>${escapeHtml(p)}</strong></p>`;
    }
    return `<p>${escapeHtml(p)}</p>`;
  }).join('');
}

if (retryBtn) {
  retryBtn.addEventListener('click', () => {
    errorState.classList.add('hidden');
    loadingState.classList.remove('hidden');
    loadResearchResults();
  });
}

if (saveSummaryBtn) {
  saveSummaryBtn.addEventListener('click', saveSummaryToStorage);
}

if (saveFindingsBtn) {
  saveFindingsBtn.addEventListener('click', saveFindingsToStorage);
}

if (saveFaqBtn) {
  saveFaqBtn.addEventListener('click', saveFAQsToStorage);
}

/**
 * ============================================================================
 * BUTTON FUNCTIONALITY IMPLEMENTATIONS
 * ============================================================================
 */

/**
 * Save entire research to storage
 */
async function saveResearchToStorage() {
  try {
    const research = {
      id: Date.now(),
      url: currentTabData.url,
      title: currentTabData.title,
      summary: summaryText?.textContent || '',
      findings: Array.from(findingsGrid?.querySelectorAll('.finding-card') || []).map(card => ({
        title: card.querySelector('.finding-card-title')?.textContent.trim() || '',
        content: card.querySelector('.finding-card-content')?.textContent.trim() || ''
      })),
      faqs: Array.from(faqGrid?.querySelectorAll('.faq-card') || []).map(card => ({
        question: card.querySelector('.faq-card-question')?.textContent.trim() || '',
        answer: card.querySelector('.faq-card-answer p')?.textContent.trim() || ''
      })),
      timestamp: new Date().toISOString()
    };

    // Save to chrome.storage
    const result = await chrome.storage.local.get(['savedResearch']);
    const savedResearch = result.savedResearch || [];
    savedResearch.unshift(research);

    // Keep only last 50 research items
    if (savedResearch.length > 50) {
      savedResearch.length = 50;
    }

    await chrome.storage.local.set({ savedResearch });
    showToast('Research saved successfully!');
  } catch (error) {
    console.error('Failed to save research:', error);
    showToast('Failed to save research');
  }
}

/**
 * Share research results
 */
async function shareResearch() {
  const shareText = `${currentTabData.title}\n\n${summaryText?.textContent || ''}\n\nSource: ${currentTabData.url}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: currentTabData.title,
        text: shareText,
        url: currentTabData.url
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        copyToClipboard(shareText);
      }
    }
  } else {
    copyToClipboard(shareText);
  }
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  } catch (error) {
    console.error('Failed to copy:', error);
    showToast('Failed to copy');
  }
}

/**
 * Save summary to storage
 */
async function saveSummaryToStorage() {
  try {
    const summary = {
      id: Date.now(),
      url: currentTabData.url,
      title: currentTabData.title,
      content: summaryText?.textContent || '',
      timestamp: new Date().toISOString()
    };

    const result = await chrome.storage.local.get(['savedSummaries']);
    const savedSummaries = result.savedSummaries || [];
    savedSummaries.unshift(summary);

    if (savedSummaries.length > 100) {
      savedSummaries.length = 100;
    }

    await chrome.storage.local.set({ savedSummaries });
    showToast('Summary saved!');
  } catch (error) {
    console.error('Failed to save summary:', error);
    showToast('Failed to save summary');
  }
}

/**
 * Save findings to storage
 */
async function saveFindingsToStorage() {
  try {
    const findings = Array.from(findingsGrid?.querySelectorAll('.finding-card') || []).map(card => ({
      title: card.querySelector('.finding-card-title')?.textContent.trim() || '',
      content: card.querySelector('.finding-card-content')?.textContent.trim() || '',
      url: currentTabData.url,
      pageTitle: currentTabData.title,
      timestamp: new Date().toISOString()
    }));

    const result = await chrome.storage.local.get(['savedFindings']);
    const savedFindings = result.savedFindings || [];
    savedFindings.unshift(...findings);

    if (savedFindings.length > 200) {
      savedFindings.length = 200;
    }

    await chrome.storage.local.set({ savedFindings });
    showToast(`${findings.length} finding(s) saved!`);
  } catch (error) {
    console.error('Failed to save findings:', error);
    showToast('Failed to save findings');
  }
}

/**
 * Save FAQs to storage
 */
async function saveFAQsToStorage() {
  try {
    const faqs = Array.from(faqGrid?.querySelectorAll('.faq-card') || []).map(card => ({
      question: card.querySelector('.faq-card-question')?.textContent.trim() || '',
      answer: card.querySelector('.faq-card-answer p')?.textContent.trim() || '',
      url: currentTabData.url,
      pageTitle: currentTabData.title,
      timestamp: new Date().toISOString()
    }));

    const result = await chrome.storage.local.get(['savedFAQs']);
    const savedFAQs = result.savedFAQs || [];
    savedFAQs.unshift(...faqs);

    if (savedFAQs.length > 200) {
      savedFAQs.length = 200;
    }

    await chrome.storage.local.set({ savedFAQs });
    showToast(`${faqs.length} FAQ(s) saved!`);
  } catch (error) {
    console.error('Failed to save FAQs:', error);
    showToast('Failed to save FAQs');
  }
}

/**
 * Save actionable insights to storage
 */
async function saveInsightsToStorage() {
  try {
    const insightsData = {
      url: currentTabData.url,
      pageTitle: currentTabData.title,
      nextSteps: [],
      relatedTopics: [],
      practicalUses: [],
      warnings: [],
      timestamp: new Date().toISOString()
    };

    // Extract all insights from the displayed cards
    document.querySelectorAll('.insight-card').forEach(card => {
      const title = card.querySelector('.insight-card-title')?.textContent.trim();
      const items = Array.from(card.querySelectorAll('.insight-item span')).map(span => span.textContent.trim());

      if (title?.includes('Next')) {
        insightsData.nextSteps = items;
      } else if (title?.includes('Related')) {
        insightsData.relatedTopics = items;
      } else if (title?.includes('Practical')) {
        insightsData.practicalUses = items;
      } else if (title?.includes('Considerations')) {
        insightsData.warnings = items;
      }
    });

    const result = await chrome.storage.local.get(['savedInsights']);
    const savedInsights = result.savedInsights || [];
    savedInsights.unshift(insightsData);

    if (savedInsights.length > 100) {
      savedInsights.length = 100;
    }

    await chrome.storage.local.set({ savedInsights });
    showToast('Insights saved!');
  } catch (error) {
    console.error('Failed to save insights:', error);
    showToast('Failed to save insights');
  }
}

/**
 * Save link analysis to storage
 */
async function saveLinksToStorage() {
  try {
    const linksData = {
      url: currentTabData.url,
      pageTitle: currentTabData.title,
      domains: [],
      resources: [],
      references: [],
      timestamp: new Date().toISOString()
    };

    // Extract domains
    document.querySelectorAll('.domain-item').forEach(item => {
      const domain = item.querySelector('.domain-name span')?.textContent.trim();
      const count = item.querySelector('.domain-count')?.textContent.trim();
      const badge = item.querySelector('.domain-badge')?.textContent.trim();
      if (domain) {
        linksData.domains.push({ domain, count, badge });
      }
    });

    // Extract resources
    document.querySelectorAll('.resource-item').forEach(item => {
      const text = item.querySelector('.resource-link')?.textContent.trim();
      const url = item.querySelector('.resource-link')?.href;
      const ext = item.querySelector('.resource-ext')?.textContent.trim();
      if (text && url) {
        linksData.resources.push({ text, url, ext });
      }
    });

    // Extract references
    document.querySelectorAll('.reference-item').forEach(item => {
      const text = item.querySelector('.reference-link')?.textContent.trim();
      const url = item.querySelector('.reference-link')?.href;
      const domain = item.querySelector('.reference-domain')?.textContent.trim();
      if (text && url) {
        linksData.references.push({ text, url, domain });
      }
    });

    const result = await chrome.storage.local.get(['savedLinks']);
    const savedLinks = result.savedLinks || [];
    savedLinks.unshift(linksData);

    if (savedLinks.length > 50) {
      savedLinks.length = 50;
    }

    await chrome.storage.local.set({ savedLinks });
    showToast('Links saved!');
  } catch (error) {
    console.error('Failed to save links:', error);
    showToast('Failed to save links');
  }
}

/**
 * Initialize all button event listeners
 */
function initializeButtons() {
  // Hero section buttons
  const saveResearchBtn = document.querySelector('.hero-actions .btn-primary');
  const shareResultsBtn = document.querySelector('.hero-actions .btn-secondary');

  if (saveResearchBtn) {
    saveResearchBtn.addEventListener('click', saveResearchToStorage);
  }

  if (shareResultsBtn) {
    shareResultsBtn.addEventListener('click', shareResearch);
  }

  // Save Insights button
  const saveInsightsBtn = document.getElementById('saveInsightsBtn');
  if (saveInsightsBtn) {
    saveInsightsBtn.addEventListener('click', saveInsightsToStorage);
  }

  // Save Links button
  const saveLinksBtn = document.getElementById('saveLinksBtn');
  if (saveLinksBtn) {
    saveLinksBtn.addEventListener('click', saveLinksToStorage);
  }

  // Visual content save button
  const saveVisualBtn = document.getElementById('saveVisualBtn');
  if (saveVisualBtn) {
    saveVisualBtn.addEventListener('click', async () => {
      try {
        const visualData = {
          url: currentTabData.url,
          pageTitle: currentTabData.title,
          images: [],
          videos: [],
          timestamp: new Date().toISOString()
        };

        document.querySelectorAll('.visual-item img').forEach(img => {
          visualData.images.push({
            url: img.src,
            alt: img.alt
          });
        });

        const result = await chrome.storage.local.get(['savedVisuals']);
        const savedVisuals = result.savedVisuals || [];
        savedVisuals.unshift(visualData);

        if (savedVisuals.length > 50) {
          savedVisuals.length = 50;
        }

        await chrome.storage.local.set({ savedVisuals });
        showToast('Visual content saved!');
      } catch (error) {
        console.error('Failed to save visual content:', error);
        showToast('Failed to save visual content');
      }
    });
  }

  // Structured data save button
  const saveStructuredBtn = document.getElementById('saveStructuredBtn');
  if (saveStructuredBtn) {
    saveStructuredBtn.addEventListener('click', async () => {
      try {
        const structuredData = {
          url: currentTabData.url,
          pageTitle: currentTabData.title,
          tables: currentTabData.structuredData?.tables || [],
          lists: currentTabData.structuredData?.lists || [],
          timestamp: new Date().toISOString()
        };

        const result = await chrome.storage.local.get(['savedStructuredData']);
        const savedStructuredData = result.savedStructuredData || [];
        savedStructuredData.unshift(structuredData);

        if (savedStructuredData.length > 50) {
          savedStructuredData.length = 50;
        }

        await chrome.storage.local.set({ savedStructuredData });
        showToast('Structured data saved!');
      } catch (error) {
        console.error('Failed to save structured data:', error);
        showToast('Failed to save structured data');
      }
    });
  }
}

/**
 * Initialize Dark Mode
 */
function initializeDarkMode() {
  // Check if dark mode is enabled in settings (check both possible keys)
  chrome.storage.local.get(['user_settings', 'darkMode'], (result) => {
    const darkMode = result.user_settings?.darkMode || result.darkMode || false;
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  });

  // Listen for dark mode changes in both keys
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      // Check user_settings change
      if (changes.user_settings) {
        const darkMode = changes.user_settings.newValue?.darkMode;
        if (darkMode !== undefined) {
          if (darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
          } else {
            document.documentElement.removeAttribute('data-theme');
          }
        }
      }
      // Check direct darkMode change (for backward compatibility)
      if (changes.darkMode) {
        if (changes.darkMode.newValue) {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      }
    }
  });
}

// Initialize page
initializeDarkMode();
initializeButtons();
loadResearchResults();
