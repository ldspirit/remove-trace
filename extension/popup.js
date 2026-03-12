// Popup script for Remove Trace extension

const $ = (sel) => document.querySelector(sel);
const log = (msg, type = 'info') => {
  const el = $('#log');
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  el.prepend(entry);
};

let serverUrl = 'http://localhost:3000';
let connected = false;
let currentTabInfo = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved server URL
  const stored = await chrome.storage.local.get(['serverUrl']);
  if (stored.serverUrl) {
    serverUrl = stored.serverUrl;
    $('#serverUrl').value = serverUrl;
  }

  // Test connection on load
  await testConnection();

  // Detect current page context
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    detectPageContext(tab.url, tab.id);
  }

  // Event listeners
  $('#testConnection').addEventListener('click', async () => {
    serverUrl = $('#serverUrl').value.replace(/\/+$/, '');
    await chrome.storage.local.set({ serverUrl });
    await testConnection();
  });

  $('#scrapeFriends').addEventListener('click', () => scrapeFriends());
  $('#scrapeActivity').addEventListener('click', () => scrapeActivity());
  $('#scrapeActivityLog').addEventListener('click', () => scrapeActivityLog());
});

async function testConnection() {
  const statusEl = $('#connectionStatus');
  try {
    const res = await apiRequest('GET', '/api/stats');
    connected = true;
    statusEl.innerHTML = `
      <div class="status-dot dot-green"></div>
      <span>Connected - ${res.friends?.total || 0} friends tracked</span>
    `;
    log(`Connected to ${serverUrl}`, 'success');
    updateButtons();
  } catch (err) {
    connected = false;
    statusEl.innerHTML = `
      <div class="status-dot dot-red"></div>
      <span>Cannot connect - is the app running?</span>
    `;
    log(`Connection failed: ${err.message}`, 'error');
    updateButtons();
  }
}

function detectPageContext(url, tabId) {
  const fbUrl = new URL(url);
  const path = fbUrl.pathname;
  const section = $('#contextSection');
  const info = $('#contextInfo');

  if (!url.includes('facebook.com')) {
    section.style.display = 'none';
    currentTabInfo = null;
    updateButtons();
    return;
  }

  section.style.display = 'block';

  if (path === '/friends' || path === '/friends/list' || path === '/friends/list/') {
    currentTabInfo = { type: 'friends_list', tabId };
    info.innerHTML = '<strong>Friends List</strong> - Ready to import friends';
  } else if (path.startsWith('/allactivity') || path.includes('/activity_log') || path.includes('/content_log')) {
    currentTabInfo = { type: 'activity_log', tabId };
    info.innerHTML = '<strong>Activity Log</strong> - Ready to scan your activity';
  } else if (path.match(/^\/[a-zA-Z0-9.]+\/?$/) || path.match(/^\/profile\.php/)) {
    const username = path.replace(/^\//, '').replace(/\/$/, '');
    currentTabInfo = { type: 'profile', tabId, username, profileUrl: url };
    info.innerHTML = `<strong>Profile:</strong> ${username}`;
  } else {
    currentTabInfo = { type: 'facebook_other', tabId };
    info.innerHTML = '<strong>Facebook</strong> - Navigate to Friends List, a profile, or Activity Log';
  }

  updateButtons();
}

function updateButtons() {
  const onFriendsList = currentTabInfo?.type === 'friends_list';
  const onProfile = currentTabInfo?.type === 'profile';
  const onActivityLog = currentTabInfo?.type === 'activity_log';

  $('#scrapeFriends').disabled = !connected || !onFriendsList;
  $('#scrapeActivity').disabled = !connected || !onProfile;
  $('#scrapeActivityLog').disabled = !connected || !onActivityLog;

  $('#scrapeFriendsHelp').textContent = onFriendsList
    ? 'Ready to scrape friends from this page'
    : 'Navigate to facebook.com/friends/list first';

  $('#scrapeActivityHelp').textContent = onProfile
    ? `Ready to scan activity for ${currentTabInfo.username}`
    : 'Navigate to a friend\'s profile first';

  $('#scrapeActivityLogHelp').textContent = onActivityLog
    ? 'Ready to scan your activity log'
    : 'Navigate to facebook.com/allactivity first';
}

async function scrapeFriends() {
  if (!currentTabInfo?.tabId) return;
  log('Scraping friends list...', 'info');
  $('#scrapeFriends').disabled = true;

  try {
    const results = await chrome.tabs.sendMessage(currentTabInfo.tabId, {
      action: 'SCRAPE_FRIENDS'
    });

    if (results.error) {
      log(`Scrape error: ${results.error}`, 'error');
      return;
    }

    log(`Found ${results.friends.length} friends on page`, 'success');

    // Get existing friends to avoid duplicates
    const existing = await apiRequest('GET', '/api/friends');
    const existingUrls = new Set(existing.map(f => normalizeProfileUrl(f.profileUrl)));

    let imported = 0;
    let skipped = 0;
    for (const friend of results.friends) {
      const normalized = normalizeProfileUrl(friend.profileUrl);
      if (existingUrls.has(normalized)) {
        skipped++;
        continue;
      }
      try {
        await apiRequest('POST', '/api/friends', {
          name: friend.name,
          profileUrl: friend.profileUrl,
        });
        imported++;
        existingUrls.add(normalized);
      } catch (err) {
        log(`Failed to import ${friend.name}: ${err.message}`, 'error');
      }
    }

    log(`Imported ${imported} friends, skipped ${skipped} duplicates`, 'success');
    await testConnection(); // Refresh count
  } catch (err) {
    log(`Scrape failed: ${err.message}`, 'error');
  } finally {
    updateButtons();
  }
}

async function scrapeActivity() {
  if (!currentTabInfo?.tabId) return;
  log(`Scanning activity on profile...`, 'info');
  $('#scrapeActivity').disabled = true;

  try {
    // Find or create the friend in the app
    const profileUrl = currentTabInfo.profileUrl;
    const existing = await apiRequest('GET', `/api/friends?search=${encodeURIComponent(currentTabInfo.username)}`);
    let friend = existing.find(f => normalizeProfileUrl(f.profileUrl) === normalizeProfileUrl(profileUrl));

    if (!friend) {
      // Scrape the friend's name from the page
      const nameResult = await chrome.tabs.sendMessage(currentTabInfo.tabId, {
        action: 'GET_PROFILE_NAME'
      });
      friend = await apiRequest('POST', '/api/friends', {
        name: nameResult.name || currentTabInfo.username,
        profileUrl: profileUrl,
      });
      log(`Created friend: ${friend.name}`, 'success');
    }

    // Scrape interactions from the profile page
    const results = await chrome.tabs.sendMessage(currentTabInfo.tabId, {
      action: 'SCRAPE_PROFILE_ACTIVITY'
    });

    if (results.error) {
      log(`Scrape error: ${results.error}`, 'error');
      return;
    }

    if (results.items.length === 0) {
      log('No activity items found on this page. Try scrolling down first to load more content.', 'info');
      return;
    }

    // Post items to the app
    const items = results.items.map(item => ({
      type: item.type,
      contentPreview: item.contentPreview || '',
      facebookUrl: item.facebookUrl || '',
      interactionDate: item.date || null,
      discoveredVia: 'extension',
    }));

    await apiRequest('POST', `/api/friends/${friend.id}/items`, items);
    log(`Imported ${items.length} activity items for ${friend.name}`, 'success');
  } catch (err) {
    log(`Scan failed: ${err.message}`, 'error');
  } finally {
    updateButtons();
  }
}

async function scrapeActivityLog() {
  if (!currentTabInfo?.tabId) return;
  log('Scanning activity log...', 'info');
  $('#scrapeActivityLog').disabled = true;

  try {
    const results = await chrome.tabs.sendMessage(currentTabInfo.tabId, {
      action: 'SCRAPE_ACTIVITY_LOG'
    });

    if (results.error) {
      log(`Scrape error: ${results.error}`, 'error');
      return;
    }

    log(`Found ${results.items.length} activity entries`, 'success');

    // Group items by friend profile URL
    const byFriend = {};
    for (const item of results.items) {
      const key = item.friendProfileUrl || 'unknown';
      if (!byFriend[key]) byFriend[key] = { name: item.friendName, items: [] };
      byFriend[key].items.push(item);
    }

    // Get existing friends
    const existing = await apiRequest('GET', '/api/friends');
    const friendMap = {};
    for (const f of existing) {
      friendMap[normalizeProfileUrl(f.profileUrl)] = f;
    }

    let totalImported = 0;
    for (const [profileUrl, data] of Object.entries(byFriend)) {
      if (profileUrl === 'unknown') continue;

      let friend = friendMap[normalizeProfileUrl(profileUrl)];
      if (!friend) {
        friend = await apiRequest('POST', '/api/friends', {
          name: data.name || 'Unknown',
          profileUrl: profileUrl,
        });
        friendMap[normalizeProfileUrl(profileUrl)] = friend;
      }

      const items = data.items.map(item => ({
        type: item.type || 'comment',
        contentPreview: item.contentPreview || '',
        facebookUrl: item.facebookUrl || '',
        interactionDate: item.date || null,
        discoveredVia: 'extension',
      }));

      await apiRequest('POST', `/api/friends/${friend.id}/items`, items);
      totalImported += items.length;
    }

    log(`Imported ${totalImported} items across ${Object.keys(byFriend).length} friends`, 'success');
  } catch (err) {
    log(`Scan failed: ${err.message}`, 'error');
  } finally {
    updateButtons();
  }
}

function normalizeProfileUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname.replace(/\/+$/, '').toLowerCase();
  } catch {
    return url.toLowerCase().replace(/\/+$/, '');
  }
}

async function apiRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'API_REQUEST', method, endpoint, body, serverUrl },
      (response) => {
        if (chrome.runtime.lastError) {
          // Fallback: direct fetch from popup (works for localhost)
          directFetch(method, endpoint, body).then(resolve).catch(reject);
          return;
        }
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      }
    );
  });
}

async function directFetch(method, endpoint, body) {
  const url = `${serverUrl}${endpoint}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
