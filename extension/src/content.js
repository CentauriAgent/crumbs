/**
 * Crumbs — Content Script
 *
 * Extracts page metadata and sends it to the popup on request.
 * Optionally shows a subtle crumbs badge on pages with bookmarks.
 */

function extractMetadata() {
  const getMeta = (name) => {
    const el =
      document.querySelector(`meta[property="${name}"]`) ||
      document.querySelector(`meta[name="${name}"]`);
    return el ? el.getAttribute('content') : '';
  };

  // Get favicon
  let favicon = '';
  const iconLink =
    document.querySelector('link[rel="icon"]') ||
    document.querySelector('link[rel="shortcut icon"]');
  if (iconLink) {
    favicon = iconLink.href;
  } else {
    favicon = new URL('/favicon.ico', window.location.origin).href;
  }

  return {
    url: window.location.href,
    title: document.title || '',
    description: getMeta('og:description') || getMeta('description') || '',
    ogImage: getMeta('og:image') || '',
    favicon,
  };
}

// Listen for metadata requests from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_METADATA') {
    sendResponse(extractMetadata());
  }
  return false;
});
