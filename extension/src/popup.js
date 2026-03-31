/**
 * Crumbs — Popup Script
 *
 * Main extension UI: shows page info, crumb count, save form or existing state.
 */

const $ = (sel) => document.querySelector(sel);
const content = $('#content');

// Settings button
$('#settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// State
let metadata = null;
let status = null;
let recentTags = [];
let isPrivate = false;

async function init() {
  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
      showError('Cannot save bookmarks for browser internal pages.');
      return;
    }

    // Get metadata from content script
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_METADATA' });
      metadata = response;
    } catch {
      // Content script not available — use tab info
      metadata = {
        url: tab.url,
        title: tab.title || '',
        description: '',
        ogImage: '',
        favicon: tab.favIconUrl || '',
      };
    }

    // Get status from background
    status = await chrome.runtime.sendMessage({ type: 'GET_STATUS', url: metadata.url });

    // Load recent tags
    const { recentTags: tags } = await chrome.storage.local.get('recentTags');
    recentTags = tags || [];

    render();
  } catch (err) {
    showError(err.message || 'Something went wrong');
  }
}

function render() {
  if (!status.loggedIn) {
    renderLoginPrompt();
    return;
  }

  if (status.alreadySaved) {
    renderAlreadySaved();
    return;
  }

  renderSaveForm();
}

function renderLoginPrompt() {
  content.innerHTML = `
    ${renderPageInfo()}
    ${renderCountBar()}
    <div class="login-prompt">
      <p>Add your Nostr key to start dropping crumbs.</p>
      <button class="setup-btn" id="setupBtn">Set Up Crumbs</button>
    </div>
    ${renderFooter()}
  `;
  content.querySelector('#setupBtn')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

function renderAlreadySaved() {
  // Parse tags from existing event
  const existingTags = (status.existingEvent?.tags || [])
    .filter(t => t[0] === 't')
    .map(t => t[1]);

  content.innerHTML = `
    ${renderPageInfo()}
    ${renderCountBar()}
    <div class="already-saved">
      <div class="check">🍞</div>
      <p>You already dropped a crumb here!</p>
      ${existingTags.length > 0 ? `
        <div class="tags">
          ${existingTags.map(t => `<span class="tag-pill">${t}</span>`).join('')}
        </div>
      ` : ''}
    </div>
    ${renderFooter()}
  `;
}

function renderSaveForm() {
  content.innerHTML = `
    ${renderPageInfo()}
    ${renderCountBar()}
    <div class="form">
      <div class="form-group">
        <label>Title</label>
        <input type="text" id="titleInput" value="${escapeAttr(metadata.title)}" placeholder="Page title">
      </div>
      <div class="form-group">
        <label>Note <span style="opacity:0.5">(optional)</span></label>
        <textarea id="descInput" rows="2" placeholder="Why is this worth saving?">${escapeHtml(metadata.description)}</textarea>
      </div>
      <div class="form-group">
        <label>Tags <span style="opacity:0.5">(comma-separated)</span></label>
        <input type="text" id="tagsInput" placeholder="nostr, bitcoin, reading">
        <div class="tag-suggestions" id="tagSuggestions"></div>
      </div>
      <div class="form-group">
        <div class="privacy-toggle">
          <div class="toggle" id="privacyToggle"></div>
          <span class="privacy-label"><span class="icon">🌐</span> <span id="privacyText">Public</span></span>
        </div>
      </div>
      <button class="submit-btn" id="submitBtn">Drop a Crumb 🍞</button>
      <div id="formError" class="error-msg" style="display:none"></div>
    </div>
    ${renderFooter()}
  `;

  // Wire up events
  const tagsInput = $('#tagsInput');
  const suggestionsEl = $('#tagSuggestions');
  const privacyToggle = $('#privacyToggle');
  const privacyText = $('#privacyText');
  const submitBtn = $('#submitBtn');

  // Show tag suggestions
  renderTagSuggestions(suggestionsEl, tagsInput);

  tagsInput.addEventListener('input', () => {
    renderTagSuggestions(suggestionsEl, tagsInput);
  });

  // Privacy toggle
  privacyToggle.addEventListener('click', () => {
    isPrivate = !isPrivate;
    privacyToggle.classList.toggle('active', isPrivate);
    privacyText.textContent = isPrivate ? 'Private 🔒' : 'Public';
    document.querySelector('.privacy-label .icon').textContent = isPrivate ? '🔒' : '🌐';
  });

  // Submit
  submitBtn.addEventListener('click', handleSubmit);
}

function renderTagSuggestions(container, input) {
  const currentTags = parseTags(input.value);
  const suggestions = recentTags
    .filter(t => !currentTags.includes(t))
    .slice(0, 8);

  if (suggestions.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = suggestions
    .map(t => `<span class="tag-suggestion" data-tag="${escapeAttr(t)}">${escapeHtml(t)}</span>`)
    .join('');

  container.querySelectorAll('.tag-suggestion').forEach(el => {
    el.addEventListener('click', () => {
      const existing = input.value.trim();
      input.value = existing ? `${existing}, ${el.dataset.tag}` : el.dataset.tag;
      renderTagSuggestions(container, input);
    });
  });
}

async function handleSubmit() {
  const submitBtn = $('#submitBtn');
  const errorEl = $('#formError');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';
  errorEl.style.display = 'none';

  const title = $('#titleInput').value.trim();
  const description = $('#descInput').value.trim();
  const tags = parseTags($('#tagsInput').value);

  try {
    const result = await chrome.runtime.sendMessage({
      type: 'SAVE_BOOKMARK',
      payload: {
        url: metadata.url,
        title,
        description,
        tags,
        isPrivate,
      },
    });

    if (result.error) {
      throw new Error(result.error);
    }

    // Success!
    showSuccess(result);
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Drop a Crumb 🍞';
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  }
}

function showSuccess(result) {
  const successRelays = result.relays?.bookmark?.successes?.length || 0;

  content.innerHTML = `
    ${renderPageInfo()}
    <div class="success-state">
      <div class="bread">🍞</div>
      <p>Crumb dropped!</p>
      <p class="sub">Published to ${successRelays} relay${successRelays !== 1 ? 's' : ''}</p>
    </div>
    ${renderFooter()}
  `;

  // Auto-close after 2s
  setTimeout(() => window.close(), 2000);
}

function showError(msg) {
  content.innerHTML = `
    <div class="error-msg">${escapeHtml(msg)}</div>
  `;
}

// Helper renderers
function renderPageInfo() {
  if (!metadata) return '';
  const favicon = metadata.favicon
    ? `<img src="${escapeAttr(metadata.favicon)}" onerror="this.style.display='none'">`
    : '';
  const shortUrl = metadata.url.length > 60
    ? metadata.url.slice(0, 57) + '…'
    : metadata.url;
  const shortTitle = metadata.title.length > 80
    ? metadata.title.slice(0, 77) + '…'
    : metadata.title;

  return `
    <div class="page-info">
      ${favicon}
      <div>
        <div class="page-title">${escapeHtml(shortTitle || 'Untitled page')}</div>
        <div class="page-url">${escapeHtml(shortUrl)}</div>
      </div>
    </div>
  `;
}

function renderCountBar() {
  if (!status || status.count === 0) return '';
  return `
    <div class="count-bar">
      🍞 <span class="count">${status.count}</span> crumb${status.count !== 1 ? 's' : ''} here
    </div>
  `;
}

function renderFooter() {
  if (!metadata) return '';
  const encodedUrl = encodeURIComponent(metadata.url);
  return `
    <div class="footer">
      <a href="https://crumbs.wtf/url?url=${encodedUrl}" target="_blank">
        See all crumbs for this page →
      </a>
    </div>
  `;
}

// Utilities
function parseTags(str) {
  return str.split(',')
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// GO
init();
