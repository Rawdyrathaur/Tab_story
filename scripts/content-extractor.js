/**
 * Content Extractor - Content Script
 * Extracts page content for AI analysis
 */

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    try {
      const content = extractPageContent();
      const visualContent = extractVisualContent();
      const structuredData = extractStructuredData();
      const metadata = extractMetadata();
      const links = extractPageLinks();
      const faqs = extractFAQs();
      sendResponse({
        success: true,
        content,
        visualContent,
        structuredData,
        metadata,
        links,
        faqs
      });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep channel open for async response
  }
});

/**
 * Extract meaningful content from the page
 */
function extractPageContent() {
  // Remove script, style, and other non-content elements
  const elementsToRemove = ['script', 'style', 'noscript', 'iframe', 'svg'];
  const clonedBody = document.body.cloneNode(true);

  elementsToRemove.forEach(tag => {
    const elements = clonedBody.getElementsByTagName(tag);
    Array.from(elements).forEach(el => el.remove());
  });

  // Get text content
  let content = clonedBody.textContent || clonedBody.innerText || '';

  // Clean up whitespace
  content = content
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
    .trim();

  // Extract main content if possible
  const mainContent = extractMainContent(content);

  return mainContent || content;
}

/**
 * Try to extract main content from common container elements
 */
function extractMainContent(fallback) {
  // Common selectors for main content
  const selectors = [
    'main',
    'article',
    '[role="main"]',
    '.main-content',
    '#main-content',
    '.content',
    '#content',
    '.post-content',
    '.article-content'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      let text = element.textContent || element.innerText || '';
      text = text.replace(/\s+/g, ' ').trim();

      // Only use if it has substantial content
      if (text.length > 200) {
        return text;
      }
    }
  }

  return fallback;
}

// Also extract meta description as additional context
function getMetaDescription() {
  const metaDescription = document.querySelector('meta[name="description"]');
  return metaDescription ? metaDescription.getAttribute('content') : '';
}

/**
 * Extract visual content (images, videos) from the page
 */
function extractVisualContent() {
  const visualContent = {
    images: [],
    videos: []
  };

  try {
    // Extract significant images (skip small icons, avatars, ads)
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      // Skip small images (likely icons/logos)
      if (img.width > 200 && img.height > 100) {
        const context = getImageContext(img);
        visualContent.images.push({
          url: img.src,
          alt: img.alt || '',
          title: img.title || '',
          width: img.width,
          height: img.height,
          context: context
        });
      }
    });

    // Extract videos
    const videos = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]');
    videos.forEach(video => {
      const videoData = {
        type: video.tagName.toLowerCase(),
        context: getImageContext(video)
      };

      if (video.tagName === 'VIDEO') {
        videoData.url = video.src || video.querySelector('source')?.src || '';
        videoData.poster = video.poster || '';
      } else {
        videoData.url = video.src || '';
        videoData.platform = video.src.includes('youtube') ? 'YouTube' : 'Vimeo';
      }

      if (videoData.url) {
        visualContent.videos.push(videoData);
      }
    });

    // Limit to most relevant visual content
    visualContent.images = visualContent.images.slice(0, 6);
    visualContent.videos = visualContent.videos.slice(0, 3);

  } catch (error) {
    console.error('Error extracting visual content:', error);
  }

  return visualContent;
}

/**
 * Get text context around an image or video for better understanding
 */
function getImageContext(element) {
  try {
    // Try to find caption or description
    const parent = element.closest('figure, div, article, section');

    // Check for figcaption
    const caption = parent?.querySelector('figcaption, .caption, .image-caption');
    if (caption && caption.textContent.trim()) {
      return caption.textContent.trim().substring(0, 200);
    }

    // Check for alt or title
    if (element.alt && element.alt.length > 5) {
      return element.alt.substring(0, 200);
    }

    // Get surrounding text
    if (parent) {
      const textContent = parent.textContent || '';
      const cleaned = textContent.replace(/\s+/g, ' ').trim();
      return cleaned.substring(0, 200);
    }

    return '';
  } catch (error) {
    return '';
  }
}

/**
 * Extract structured data (tables and lists) from the page
 */
function extractStructuredData() {
  const structuredData = {
    tables: [],
    lists: []
  };

  try {
    // Extract tables with meaningful content
    const tables = document.querySelectorAll('table');
    tables.forEach((table, index) => {
      // Skip very small tables (likely layout tables)
      const rows = table.querySelectorAll('tr');
      if (rows.length < 2) return;

      const tableData = {
        id: `table-${index}`,
        headers: [],
        rows: [],
        caption: '',
        context: ''
      };

      // Get table caption if exists
      const caption = table.querySelector('caption');
      if (caption) {
        tableData.caption = caption.textContent.trim();
      }

      // Get headers from thead or first row
      const headerCells = table.querySelectorAll('thead th, thead td, tr:first-child th');
      if (headerCells.length > 0) {
        headerCells.forEach(cell => {
          tableData.headers.push(cell.textContent.trim());
        });
      }

      // Get data rows (skip header row if no thead)
      const dataRows = table.querySelectorAll('tbody tr, tr');
      const startIndex = (table.querySelector('thead') || headerCells.length > 0) ? 0 : 1;

      Array.from(dataRows).slice(startIndex).forEach(row => {
        const cells = row.querySelectorAll('td, th');
        if (cells.length > 0) {
          const rowData = [];
          cells.forEach(cell => {
            rowData.push(cell.textContent.trim());
          });
          tableData.rows.push(rowData);
        }
      });

      // Only include tables with actual data
      if (tableData.rows.length > 0) {
        // Get context around the table
        tableData.context = getTableContext(table);

        // Limit rows to prevent excessive data
        tableData.rows = tableData.rows.slice(0, 10);
        tableData.rowCount = dataRows.length - startIndex;

        structuredData.tables.push(tableData);
      }
    });

    // Extract meaningful lists (ul, ol)
    const lists = document.querySelectorAll('ul, ol');
    lists.forEach((list, index) => {
      // Skip navigation menus and very small lists
      if (list.closest('nav, header, footer, .menu, .navigation')) return;

      const items = list.querySelectorAll(':scope > li');
      if (items.length < 3) return; // Skip very short lists

      const listData = {
        id: `list-${index}`,
        type: list.tagName.toLowerCase(), // 'ul' or 'ol'
        items: [],
        context: ''
      };

      // Extract list items
      items.forEach(item => {
        const text = item.textContent.trim();
        if (text.length > 0 && text.length < 500) { // Skip very long items
          listData.items.push(text);
        }
      });

      // Only include lists with meaningful content
      if (listData.items.length >= 3) {
        // Get context around the list
        listData.context = getListContext(list);

        // Limit items
        listData.items = listData.items.slice(0, 15);
        listData.itemCount = items.length;

        structuredData.lists.push(listData);
      }
    });

    // Limit to most relevant structured data
    structuredData.tables = structuredData.tables.slice(0, 5);
    structuredData.lists = structuredData.lists.slice(0, 5);

  } catch (error) {
    console.error('Error extracting structured data:', error);
  }

  return structuredData;
}

/**
 * Get context around a table
 */
function getTableContext(table) {
  try {
    // Check for preceding heading
    let previousElement = table.previousElementSibling;
    while (previousElement) {
      if (/^H[1-6]$/i.test(previousElement.tagName)) {
        return previousElement.textContent.trim().substring(0, 150);
      }
      if (previousElement.querySelector('h1, h2, h3, h4, h5, h6')) {
        const heading = previousElement.querySelector('h1, h2, h3, h4, h5, h6');
        return heading.textContent.trim().substring(0, 150);
      }
      previousElement = previousElement.previousElementSibling;
      // Only check a few previous elements
      if (!previousElement || table.parentElement !== previousElement.parentElement) break;
    }

    // Try parent container heading
    const parent = table.closest('section, article, div');
    if (parent) {
      const heading = parent.querySelector('h1, h2, h3, h4, h5, h6');
      if (heading) {
        return heading.textContent.trim().substring(0, 150);
      }
    }

    return '';
  } catch (error) {
    return '';
  }
}

/**
 * Get context around a list
 */
function getListContext(list) {
  try {
    // Check for preceding heading
    let previousElement = list.previousElementSibling;
    while (previousElement) {
      if (/^H[1-6]$/i.test(previousElement.tagName)) {
        return previousElement.textContent.trim().substring(0, 150);
      }
      previousElement = previousElement.previousElementSibling;
      // Only check a few previous elements
      if (!previousElement || list.parentElement !== previousElement.parentElement) break;
    }

    // Try parent container heading
    const parent = list.closest('section, article, div');
    if (parent) {
      const heading = parent.querySelector('h1, h2, h3, h4, h5, h6');
      if (heading) {
        return heading.textContent.trim().substring(0, 150);
      }
    }

    return '';
  } catch (error) {
    return '';
  }
}

/**
 * Extract metadata about the page (author, date, credibility signals)
 */
function extractMetadata() {
  const metadata = {
    author: null,
    publishDate: null,
    lastUpdated: null,
    readingTime: 0,
    domain: '',
    schemaData: {},
    socialShares: {},
    language: 'en'
  };

  try {
    // Extract domain
    metadata.domain = window.location.hostname.replace('www.', '');

    // Extract author
    metadata.author = findAuthor();

    // Extract publish date
    metadata.publishDate = findPublishDate();

    // Extract last updated date
    metadata.lastUpdated = findLastUpdated();

    // Calculate reading time (based on word count)
    const textContent = document.body.textContent || '';
    const wordCount = textContent.trim().split(/\s+/).length;
    metadata.readingTime = Math.ceil(wordCount / 200); // Average reading speed

    // Extract language
    metadata.language = document.documentElement.lang ||
                       document.querySelector('meta[http-equiv="content-language"]')?.content ||
                       'en';

    // Extract Schema.org data
    metadata.schemaData = extractSchemaOrg();

    // Extract social share counts (if visible on page)
    metadata.socialShares = findSocialShares();

  } catch (error) {
    console.error('Error extracting metadata:', error);
  }

  return metadata;
}

/**
 * Find author information
 */
function findAuthor() {
  try {
    // Check meta tags
    const metaAuthor = document.querySelector('meta[name="author"], meta[property="article:author"]');
    if (metaAuthor && metaAuthor.content) {
      return metaAuthor.content.trim();
    }

    // Check schema.org Person
    const schemaPerson = document.querySelector('[itemtype*="Person"] [itemprop="name"]');
    if (schemaPerson) {
      return schemaPerson.textContent.trim();
    }

    // Check JSON-LD
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data.author) {
          if (typeof data.author === 'string') return data.author;
          if (data.author.name) return data.author.name;
        }
      } catch (e) {}
    }

    // Check common author selectors
    const authorSelectors = [
      '[rel="author"]',
      '.author-name',
      '.author',
      '.byline',
      '.post-author',
      '.article-author',
      '[itemprop="author"]'
    ];

    for (const selector of authorSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        if (text && text.length > 0 && text.length < 100) {
          // Clean up "By John Doe" -> "John Doe"
          return text.replace(/^by\s+/i, '').trim();
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Find publish date
 */
function findPublishDate() {
  try {
    // Check meta tags
    const metaPublished = document.querySelector(
      'meta[property="article:published_time"], meta[name="date"], meta[name="publishdate"]'
    );
    if (metaPublished && metaPublished.content) {
      return metaPublished.content;
    }

    // Check schema.org datePublished
    const schemaDate = document.querySelector('[itemprop="datePublished"]');
    if (schemaDate) {
      return schemaDate.getAttribute('content') || schemaDate.textContent.trim();
    }

    // Check JSON-LD
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data.datePublished) return data.datePublished;
      } catch (e) {}
    }

    // Check <time> elements
    const timeElements = document.querySelectorAll('time[datetime]');
    for (const time of timeElements) {
      const datetime = time.getAttribute('datetime');
      if (datetime) {
        // Prefer elements with publish-related classes
        if (time.className.match(/publish|date|time/i)) {
          return datetime;
        }
      }
    }

    // Return first time element if found
    if (timeElements.length > 0) {
      return timeElements[0].getAttribute('datetime');
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Find last updated date
 */
function findLastUpdated() {
  try {
    // Check meta tags
    const metaModified = document.querySelector(
      'meta[property="article:modified_time"], meta[name="last-modified"]'
    );
    if (metaModified && metaModified.content) {
      return metaModified.content;
    }

    // Check schema.org dateModified
    const schemaModified = document.querySelector('[itemprop="dateModified"]');
    if (schemaModified) {
      return schemaModified.getAttribute('content') || schemaModified.textContent.trim();
    }

    // Check JSON-LD
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data.dateModified) return data.dateModified;
      } catch (e) {}
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Extract Schema.org structured data
 */
function extractSchemaOrg() {
  const schemaData = {};

  try {
    // Parse JSON-LD
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    jsonLdScripts.forEach((script, index) => {
      try {
        const data = JSON.parse(script.textContent);
        if (data['@type']) {
          schemaData[`schema_${index}`] = {
            type: data['@type'],
            name: data.name || data.headline,
            description: data.description
          };
        }
      } catch (e) {}
    });

    // Extract microdata
    const itemScopes = document.querySelectorAll('[itemscope]');
    itemScopes.forEach((item, index) => {
      const itemType = item.getAttribute('itemtype');
      if (itemType && index < 3) { // Limit to first 3
        const name = item.querySelector('[itemprop="name"]')?.textContent;
        if (name) {
          schemaData[`microdata_${index}`] = {
            type: itemType.split('/').pop(),
            name: name.trim()
          };
        }
      }
    });
  } catch (error) {
    console.error('Error extracting schema data:', error);
  }

  return schemaData;
}

/**
 * Find social share counts if displayed on page
 */
function findSocialShares() {
  const shares = {};

  try {
    // Look for common social share counter selectors
    const shareSelectors = {
      facebook: ['.fb-share-button', '.facebook-share', '[data-share="facebook"]'],
      twitter: ['.twitter-share-button', '.tweet-button', '[data-share="twitter"]'],
      linkedin: ['.linkedin-share', '[data-share="linkedin"]'],
      pinterest: ['.pinterest-share', '[data-share="pinterest"]']
    };

    for (const [platform, selectors] of Object.entries(shareSelectors)) {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          // Try to find count in nearby element
          const countElement = element.querySelector('.count, .share-count, [data-count]');
          if (countElement) {
            const count = parseInt(countElement.textContent.replace(/,/g, ''));
            if (!isNaN(count)) {
              shares[platform] = count;
              break;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error finding social shares:', error);
  }

  return shares;
}

/**
 * Extract all links from the page
 */
function extractPageLinks() {
  const links = [];
  const seenUrls = new Set();

  try {
    // Get all links from the page
    const linkElements = document.querySelectorAll('a[href]');

    linkElements.forEach(link => {
      const href = link.href;
      const text = link.textContent.trim();

      // Skip invalid links
      if (!href || href.startsWith('javascript:') || href.startsWith('#')) {
        return;
      }

      // Skip duplicates
      if (seenUrls.has(href)) {
        return;
      }
      seenUrls.add(href);

      // Determine if this is a reference link
      const isReference = !!(
        link.closest('[class*="reference"], [class*="citation"], [id*="references"], [class*="bibliography"]') ||
        link.querySelector('[class*="citation"]') ||
        /\[\d+\]|\(\d+\)|ref-\d+/i.test(link.textContent)
      );

      // Get context around the link
      const context = getLinkContext(link);

      links.push({
        url: href,
        text: text || href,
        isReference,
        context
      });
    });

    // Limit to first 100 links to avoid excessive data
    return links.slice(0, 100);
  } catch (error) {
    console.error('Error extracting links:', error);
    return [];
  }
}

/**
 * Get context around a link
 */
function getLinkContext(linkElement) {
  try {
    // Try to find parent paragraph or container
    const parent = linkElement.closest('p, li, div, article, section');

    if (parent) {
      // Get surrounding text (max 100 characters)
      const text = parent.textContent.trim();
      return text.substring(0, 100);
    }

    return '';
  } catch (error) {
    return '';
  }
}

/**
 * Extract FAQs from the page
 */
function extractFAQs() {
  const faqs = [];

  try {
    // Strategy 1: Look for FAQ sections with structured Q&A
    const faqSections = document.querySelectorAll(
      '[class*="faq" i], [id*="faq" i], [class*="question" i], [id*="question" i]'
    );

    faqSections.forEach(section => {
      // Look for question-answer pairs
      const questions = section.querySelectorAll(
        '[class*="question" i], dt, .q, [itemprop="question"], h3, h4, summary'
      );

      questions.forEach((questionEl, index) => {
        const question = questionEl.textContent.trim();

        // Skip if too short or too long
        if (question.length < 10 || question.length > 200) return;

        // Find the answer (next sibling or itemprop)
        let answerEl = questionEl.nextElementSibling;

        // Check for itemprop answer
        const itemPropAnswer = questionEl.closest('[itemscope]')?.querySelector('[itemprop="answer"]');
        if (itemPropAnswer) {
          answerEl = itemPropAnswer.querySelector('[itemprop="text"]') || itemPropAnswer;
        }

        // Check for dd after dt
        if (questionEl.tagName === 'DT') {
          answerEl = questionEl.nextElementSibling;
          while (answerEl && answerEl.tagName !== 'DD') {
            answerEl = answerEl.nextElementSibling;
          }
        }

        // Check for details/summary pattern
        if (questionEl.tagName === 'SUMMARY') {
          const details = questionEl.closest('details');
          if (details) {
            answerEl = Array.from(details.children).find(el => el !== questionEl);
          }
        }

        if (answerEl) {
          const answer = answerEl.textContent.trim();

          // Skip if answer is too short or too long
          if (answer.length >= 20 && answer.length <= 1000) {
            faqs.push({
              question: question,
              answer: answer,
              source: 'extracted'
            });
          }
        }
      });
    });

    // Strategy 2: Look for Schema.org FAQPage structured data
    const faqSchemas = document.querySelectorAll('script[type="application/ld+json"]');
    faqSchemas.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);

        // Check if it's FAQPage type
        if (data['@type'] === 'FAQPage' && data.mainEntity) {
          data.mainEntity.forEach(item => {
            if (item['@type'] === 'Question' && item.acceptedAnswer) {
              faqs.push({
                question: item.name || item.text,
                answer: item.acceptedAnswer.text || item.acceptedAnswer.name,
                source: 'schema'
              });
            }
          });
        }

        // Also check for array of FAQs
        if (Array.isArray(data) && data[0]?.['@type'] === 'Question') {
          data.forEach(item => {
            if (item.acceptedAnswer) {
              faqs.push({
                question: item.name || item.text,
                answer: item.acceptedAnswer.text || item.acceptedAnswer.name,
                source: 'schema'
              });
            }
          });
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    });

    // Remove duplicates based on question text
    const uniqueFaqs = [];
    const seenQuestions = new Set();

    faqs.forEach(faq => {
      const normalizedQuestion = faq.question.toLowerCase().trim();
      if (!seenQuestions.has(normalizedQuestion)) {
        seenQuestions.add(normalizedQuestion);
        uniqueFaqs.push(faq);
      }
    });

    // Limit to 6 most relevant FAQs
    return uniqueFaqs.slice(0, 6);

  } catch (error) {
    console.error('Error extracting FAQs:', error);
    return [];
  }
}

// Log that content script is loaded
console.log('Tab Story: Content extractor loaded');
