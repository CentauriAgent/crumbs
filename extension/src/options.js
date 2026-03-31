/**
 * Crumbs — Options Page Script
 *
 * Handles identity setup, relay config, and defaults.
 */

import { nip19 } from 'nostr-tools';
import { getPublicKey } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

const $ = (sel) => document.querySelector(sel);

const DEFAULT_RELAYS = [
  'wss://relay.ditto.pub',
  'wss://nos.lol',
  'wss://relay.primal.net',
];

// Load existing settings
async function loadSettings() {
  const data = await chrome.storage.local.get([
    'nsec_hex', 'bunker_url', 'relays', 'default_private',
  ]);

  // Show masked nsec if stored
  if (data.nsec_hex) {
    $('#nsecInput').placeholder = '••••••••••••••••• (key saved)';
  }

  if (data.bunker_url) {
    $('#bunkerInput').value = data.bunker_url;
  }

  // Relays
  const relays = data.relays || DEFAULT_RELAYS;
  $('#relaysInput').value = relays.join('\n');

  // Privacy default
  const isPrivate = !!data.default_private;
  updatePrivacyToggle(isPrivate);
}

// Save identity
$('#saveIdentityBtn').addEventListener('click', async () => {
  const nsecRaw = $('#nsecInput').value.trim();
  const bunkerUrl = $('#bunkerInput').value.trim();
  const statusEl = $('#identityStatus');

  try {
    if (bunkerUrl) {
      // Save bunker URL (NIP-46 — simplified, just store for now)
      await chrome.storage.local.set({ bunker_url: bunkerUrl });
      showStatus(statusEl, 'Bunker URL saved.', 'success');
      return;
    }

    if (!nsecRaw) {
      showStatus(statusEl, 'Enter an nsec or hex private key.', 'error');
      return;
    }

    let hexKey;

    // Parse nsec or hex
    if (nsecRaw.startsWith('nsec1')) {
      const decoded = nip19.decode(nsecRaw);
      if (decoded.type !== 'nsec') throw new Error('Invalid nsec');
      hexKey = bytesToHex(decoded.data);
    } else if (/^[0-9a-f]{64}$/i.test(nsecRaw)) {
      hexKey = nsecRaw.toLowerCase();
    } else {
      throw new Error('Invalid key format. Use nsec1... or 64-char hex.');
    }

    // Validate by deriving pubkey
    const sk = hexToBytes(hexKey);
    const pubkey = getPublicKey(sk);
    const npub = nip19.npubEncode(pubkey);

    // Store hex key
    await chrome.storage.local.set({ nsec_hex: hexKey });

    // Clear input and show success
    $('#nsecInput').value = '';
    $('#nsecInput').placeholder = '••••••••••••••••• (key saved)';

    showStatus(statusEl, `Identity saved! ${npub.slice(0, 12)}...${npub.slice(-4)}`, 'success');
  } catch (err) {
    showStatus(statusEl, err.message, 'error');
  }
});

// Test connection
$('#testBtn').addEventListener('click', async () => {
  const statusEl = $('#identityStatus');
  const profileCard = $('#profileCard');

  try {
    const { nsec_hex } = await chrome.storage.local.get('nsec_hex');
    if (!nsec_hex) {
      showStatus(statusEl, 'No key saved. Save your identity first.', 'error');
      return;
    }

    const sk = hexToBytes(nsec_hex);
    const pubkey = getPublicKey(sk);
    const npub = nip19.npubEncode(pubkey);

    showStatus(statusEl, 'Fetching profile from relays…', 'success');

    // Fetch profile from relays
    const relays = await getRelayList();
    const profile = await fetchProfile(pubkey, relays);

    if (profile) {
      const meta = JSON.parse(profile.content || '{}');
      $('#profileName').textContent = meta.display_name || meta.name || 'Anonymous';
      $('#profileNpub').textContent = `${npub.slice(0, 16)}...${npub.slice(-8)}`;
      if (meta.picture) {
        $('#profileAvatar').src = meta.picture;
        $('#profileAvatar').style.display = 'block';
      } else {
        $('#profileAvatar').style.display = 'none';
      }
      profileCard.classList.add('visible');
      showStatus(statusEl, '✓ Connected! Profile found.', 'success');
    } else {
      profileCard.classList.remove('visible');
      showStatus(statusEl, `✓ Key valid (${npub.slice(0, 16)}...) but no profile found on relays.`, 'success');
    }
  } catch (err) {
    profileCard.classList.remove('visible');
    showStatus(statusEl, `Error: ${err.message}`, 'error');
  }
});

// Save relays
$('#saveRelaysBtn').addEventListener('click', async () => {
  const statusEl = $('#relayStatus');
  const raw = $('#relaysInput').value.trim();
  const relays = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('wss://') || l.startsWith('ws://'));

  if (relays.length === 0) {
    showStatus(statusEl, 'Add at least one relay URL (wss://...)', 'error');
    return;
  }

  await chrome.storage.local.set({ relays });
  showStatus(statusEl, `Saved ${relays.length} relay${relays.length > 1 ? 's' : ''}.`, 'success');
});

// Privacy toggle
const privacyToggle = $('#defaultPrivacyToggle');
let defaultPrivate = false;

privacyToggle.addEventListener('click', async () => {
  defaultPrivate = !defaultPrivate;
  updatePrivacyToggle(defaultPrivate);
  await chrome.storage.local.set({ default_private: defaultPrivate });
});

function updatePrivacyToggle(isPrivate) {
  defaultPrivate = isPrivate;
  privacyToggle.classList.toggle('active', isPrivate);
  $('#defaultPrivacyLabel').textContent = isPrivate ? 'Private by default 🔒' : 'Public by default';
}

// Helpers
function showStatus(el, msg, type) {
  el.textContent = msg;
  el.className = `status-msg ${type}`;
}

async function getRelayList() {
  const { relays } = await chrome.storage.local.get('relays');
  return (relays && relays.length > 0) ? relays : DEFAULT_RELAYS;
}

function fetchProfile(pubkey, relays) {
  return new Promise((resolve) => {
    let found = null;
    let pending = relays.length;

    const done = () => {
      if (--pending <= 0) resolve(found);
    };

    for (const url of relays) {
      try {
        const ws = new WebSocket(url);
        const subId = 'profile_' + Math.random().toString(36).slice(2, 8);
        const timeout = setTimeout(() => {
          try { ws.close(); } catch {}
          done();
        }, 5000);

        ws.onopen = () => {
          ws.send(JSON.stringify(['REQ', subId, { kinds: [0], authors: [pubkey], limit: 1 }]));
        };

        ws.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data);
            if (data[0] === 'EVENT' && data[1] === subId) {
              if (!found || data[2].created_at > found.created_at) {
                found = data[2];
              }
            } else if (data[0] === 'EOSE') {
              clearTimeout(timeout);
              ws.close();
              done();
            }
          } catch {}
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          try { ws.close(); } catch {}
          done();
        };
      } catch {
        done();
      }
    }
  });
}

// Init
loadSettings();
