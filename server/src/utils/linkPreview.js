// =============================================================================
// LINK PREVIEW UTILITY
// =============================================================================
// Extracts URLs from text and fetches metadata (Open Graph tags, title, etc.)
// for generating link previews in chat messages.
// =============================================================================

// Regular expression to match URLs in text
const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;

/**
 * Extract URLs from text content
 * @param {string} text - The text to search for URLs
 * @returns {string[]} Array of URLs found in the text
 */
export function extractUrls(text) {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  return matches || [];
}

/**
 * Parse meta tags from HTML content
 * @param {string} html - The HTML content to parse
 * @param {string} url - The original URL (for resolving relative paths)
 * @returns {Object} Extracted metadata
 */
function parseMetaTags(html, url) {
  const metadata = {
    url,
    title: null,
    description: null,
    image: null,
    siteName: null,
    favicon: null,
  };

  try {
    // Extract title - try og:title first, then regular title tag
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    metadata.title = ogTitleMatch?.[1] || titleMatch?.[1] || null;

    // Extract description - try og:description first, then meta description
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    metadata.description = ogDescMatch?.[1] || descMatch?.[1] || null;

    // Extract image - og:image
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogImageMatch?.[1]) {
      metadata.image = resolveUrl(ogImageMatch[1], url);
    }

    // Extract site name - og:site_name
    const siteNameMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i);
    metadata.siteName = siteNameMatch?.[1] || null;

    // Extract favicon
    const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i) ||
                         html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);
    if (faviconMatch?.[1]) {
      metadata.favicon = resolveUrl(faviconMatch[1], url);
    } else {
      // Default to /favicon.ico
      try {
        const urlObj = new URL(url);
        metadata.favicon = `${urlObj.origin}/favicon.ico`;
      } catch {}
    }

    // Clean up HTML entities in text fields
    if (metadata.title) metadata.title = decodeHtmlEntities(metadata.title);
    if (metadata.description) metadata.description = decodeHtmlEntities(metadata.description);
    if (metadata.siteName) metadata.siteName = decodeHtmlEntities(metadata.siteName);

    // Truncate description if too long
    if (metadata.description && metadata.description.length > 200) {
      metadata.description = metadata.description.substring(0, 200) + '...';
    }

  } catch (error) {
    console.error('[LinkPreview] Error parsing HTML:', error.message);
  }

  return metadata;
}

/**
 * Resolve a potentially relative URL to an absolute URL
 * @param {string} relativeUrl - The URL to resolve
 * @param {string} baseUrl - The base URL
 * @returns {string} Absolute URL
 */
function resolveUrl(relativeUrl, baseUrl) {
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch {
    return relativeUrl;
  }
}

/**
 * Decode common HTML entities
 * @param {string} text - Text with HTML entities
 * @returns {string} Decoded text
 */
function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Fetch metadata for a URL
 * @param {string} url - The URL to fetch metadata for
 * @returns {Promise<Object|null>} Metadata object or null if failed
 */
export async function fetchLinkPreview(url) {
  console.log('[LinkPreview] Fetching preview for:', url);
  try {
    // Validate URL
    new URL(url);

    // Fetch the page with a timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    console.log('[LinkPreview] Making fetch request...');
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });

    console.log('[LinkPreview] Response status:', response.status);
    clearTimeout(timeout);

    // Check if response is HTML
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return null;
    }

    // Only read first 50KB to avoid huge pages
    const reader = response.body.getReader();
    const chunks = [];
    let totalSize = 0;
    const maxSize = 50 * 1024;

    while (totalSize < maxSize) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalSize += value.length;
    }
    reader.cancel();

    const html = new TextDecoder().decode(Buffer.concat(chunks.map(c => Buffer.from(c))));

    // Parse the HTML for metadata
    const metadata = parseMetaTags(html, url);
    console.log('[LinkPreview] Parsed metadata:', JSON.stringify(metadata, null, 2));

    // Only return if we have at least a title
    if (metadata.title) {
      console.log('[LinkPreview] Successfully extracted preview with title:', metadata.title);
      return metadata;
    }

    console.log('[LinkPreview] No title found, returning null');
    return null;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`[LinkPreview] Timeout fetching ${url}`);
    } else {
      console.log(`[LinkPreview] Error fetching ${url}:`, error.message);
    }
    return null;
  }
}

/**
 * Get link preview for the first URL in a text
 * @param {string} text - Text content that may contain URLs
 * @returns {Promise<Object|null>} Link preview data or null
 */
export async function getLinkPreviewForText(text) {
  console.log('[LinkPreview] Extracting URLs from text:', text);
  const urls = extractUrls(text);
  console.log('[LinkPreview] Found URLs:', urls);
  if (urls.length === 0) return null;

  // Only preview the first URL
  const preview = await fetchLinkPreview(urls[0]);
  console.log('[LinkPreview] Final preview result:', preview ? 'success' : 'null');
  return preview;
}
