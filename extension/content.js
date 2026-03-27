// Content script for Remove Trace - runs on facebook.com
// Scrapes friends list, profile activity, and activity log

(() => {
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case 'SCRAPE_FRIENDS':
        scrapeFriendsList().then(sendResponse);
        return true;
      case 'GET_PROFILE_NAME':
        sendResponse({ name: getProfileName() });
        return false;
      case 'SCRAPE_PROFILE_ACTIVITY':
        scrapeProfileActivity().then(sendResponse);
        return true;
      case 'SCRAPE_ACTIVITY_LOG':
        scrapeActivityLog().then(sendResponse);
        return true;
    }
  });

  // ========== FRIENDS LIST SCRAPING ==========
  // Works on facebook.com/friends/list
  async function scrapeFriendsList() {
    try {
      const friends = [];
      const seen = new Set();

      // Facebook renders friends as links with profile photos
      // Strategy: find all links that point to user profiles within the friends list area
      const allLinks = document.querySelectorAll('a[href]');

      for (const link of allLinks) {
        const href = link.href;
        if (!href || !href.includes('facebook.com')) continue;

        // Skip non-profile links
        const url = new URL(href);
        const path = url.pathname.replace(/\/+$/, '');

        // Match profile URLs: /username or /profile.php?id=xxx
        const isProfile = (
          (path.match(/^\/[a-zA-Z0-9.]+$/) && !isReservedPath(path)) ||
          path === '/profile.php'
        );
        if (!isProfile) continue;

        // Avoid duplicates
        const normalizedPath = path.toLowerCase();
        if (seen.has(normalizedPath)) continue;

        // Get the friend's name from the link text or nearby elements
        const name = extractNameFromElement(link);
        if (!name || name.length < 2) continue;

        seen.add(normalizedPath);
        friends.push({
          name: name,
          profileUrl: `https://www.facebook.com${path}`,
        });
      }

      return { friends };
    } catch (err) {
      return { error: err.message, friends: [] };
    }
  }

  // ========== PROFILE NAME ==========
  function getProfileName() {
    // Try various selectors Facebook uses for profile names
    // The main profile name is typically in an h1 or a prominent heading
    const selectors = [
      'h1',                    // Most common for profile names
      '[data-testid="profile_name"]',
      'title',
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.textContent.trim();
        // Filter out generic page titles
        if (text && text !== 'Facebook' && text.length > 1 && text.length < 100) {
          // Remove " | Facebook" suffix from title
          return text.replace(/\s*[|–-]\s*Facebook.*$/i, '').trim();
        }
      }
    }

    return '';
  }

  // ========== PROFILE ACTIVITY SCRAPING ==========
  // Scans visible content on a friend's profile page
  async function scrapeProfileActivity() {
    try {
      const items = [];
      const seenUrls = new Set();

      // Scrape posts/comments visible on the profile
      // Facebook renders posts in divs with role="article" or similar
      const posts = document.querySelectorAll('[role="article"], [data-testid="Keycommand_wrapper_feed"]');

      for (const post of posts) {
        // Try to find the permalink for this post
        const postLinks = post.querySelectorAll('a[href*="/posts/"], a[href*="/photos/"], a[href*="/videos/"], a[href*="story_fbid"], a[href*="/reel/"]');
        let postUrl = '';
        for (const pl of postLinks) {
          const href = cleanFbUrl(pl.href);
          if (href && !seenUrls.has(href)) {
            postUrl = href;
            break;
          }
        }

        // Get post text content
        const textEls = post.querySelectorAll('[data-ad-preview="message"], [data-testid="post_message"], div[dir="auto"]');
        let contentPreview = '';
        for (const tel of textEls) {
          const text = tel.textContent.trim();
          if (text.length > 5 && text.length < 500) {
            contentPreview = text.substring(0, 200);
            break;
          }
        }

        // Determine type based on content
        let type = 'post';
        if (postUrl.includes('/photos/') || postUrl.includes('/photo')) type = 'tag';
        if (postUrl.includes('/videos/') || postUrl.includes('/reel/')) type = 'post';

        // Try to find date
        const timeEl = post.querySelector('abbr[data-utime], a[href*="story_fbid"] span, [role="link"] span');
        const date = timeEl ? parseDate(timeEl) : null;

        if (postUrl && !seenUrls.has(postUrl)) {
          seenUrls.add(postUrl);
          items.push({ type, contentPreview, facebookUrl: postUrl, date });
        } else if (contentPreview && !postUrl) {
          items.push({ type, contentPreview, facebookUrl: '', date });
        }
      }

      // Also look for comments by the current user
      const comments = document.querySelectorAll('[role="article"] [role="article"]');
      for (const comment of comments) {
        const text = comment.textContent.trim().substring(0, 200);
        if (text.length > 3) {
          const links = comment.querySelectorAll('a[href*="comment_id"]');
          const commentUrl = links.length > 0 ? cleanFbUrl(links[0].href) : '';
          if (commentUrl && !seenUrls.has(commentUrl)) {
            seenUrls.add(commentUrl);
            items.push({
              type: 'comment',
              contentPreview: text,
              facebookUrl: commentUrl,
              date: null,
            });
          }
        }
      }

      return { items };
    } catch (err) {
      return { error: err.message, items: [] };
    }
  }

  // ========== ACTIVITY LOG SCRAPING ==========
  // Works on facebook.com/allactivity
  async function scrapeActivityLog() {
    try {
      const items = [];

      // Activity log renders entries as list items or rows
      // Each entry typically has: an action description, a link to the content, a date
      const entries = document.querySelectorAll(
        '[role="listitem"], [role="row"], [data-testid*="activity"]'
      );

      // If structured entries not found, fall back to scanning all links
      if (entries.length === 0) {
        return scrapeActivityLogFallback();
      }

      for (const entry of entries) {
        const item = parseActivityEntry(entry);
        if (item) items.push(item);
      }

      return { items };
    } catch (err) {
      return { error: err.message, items: [] };
    }
  }

  function scrapeActivityLogFallback() {
    const items = [];
    const seen = new Set();

    // Find all actionable links in the activity log area
    const links = document.querySelectorAll('a[href]');

    for (const link of links) {
      const href = link.href;
      if (!href.includes('facebook.com')) continue;

      // Look for content links (posts, comments, photos)
      const isContent = (
        href.includes('/posts/') ||
        href.includes('/photos/') ||
        href.includes('/comment') ||
        href.includes('story_fbid') ||
        href.includes('/videos/')
      );
      if (!isContent) continue;

      const cleanUrl = cleanFbUrl(href);
      if (seen.has(cleanUrl)) continue;
      seen.add(cleanUrl);

      // Determine type from URL
      let type = 'post';
      if (href.includes('/comment')) type = 'comment';
      if (href.includes('/photos/')) type = 'tag';

      // Get text context from surrounding elements
      const parent = link.closest('[role="listitem"], [role="row"], li, tr') || link.parentElement;
      const text = parent ? parent.textContent.trim().substring(0, 200) : link.textContent.trim();

      // Try to find friend profile link nearby
      let friendName = '';
      let friendProfileUrl = '';
      if (parent) {
        const profileLinks = parent.querySelectorAll('a[href]');
        for (const pl of profileLinks) {
          const plPath = new URL(pl.href).pathname.replace(/\/+$/, '');
          if (plPath.match(/^\/[a-zA-Z0-9.]+$/) && !isReservedPath(plPath) && pl !== link) {
            friendName = pl.textContent.trim();
            friendProfileUrl = `https://www.facebook.com${plPath}`;
            break;
          }
        }
      }

      items.push({
        type,
        contentPreview: text,
        facebookUrl: cleanUrl,
        friendName,
        friendProfileUrl,
        date: null,
      });
    }

    return { items };
  }

  function parseActivityEntry(entry) {
    const links = entry.querySelectorAll('a[href]');
    let contentUrl = '';
    let friendProfileUrl = '';
    let friendName = '';

    for (const link of links) {
      const href = link.href;
      if (!href.includes('facebook.com')) continue;

      const path = new URL(href).pathname.replace(/\/+$/, '');

      if (href.includes('/posts/') || href.includes('/photos/') || href.includes('/comment') || href.includes('story_fbid')) {
        contentUrl = cleanFbUrl(href);
      } else if (path.match(/^\/[a-zA-Z0-9.]+$/) && !isReservedPath(path)) {
        friendName = link.textContent.trim();
        friendProfileUrl = `https://www.facebook.com${path}`;
      }
    }

    if (!contentUrl && !friendProfileUrl) return null;

    let type = 'post';
    const text = entry.textContent.toLowerCase();
    if (text.includes('commented') || text.includes('replied')) type = 'comment';
    else if (text.includes('liked') || text.includes('reacted')) type = 'like';
    else if (text.includes('tagged')) type = 'tag';
    else if (text.includes('shared')) type = 'post';
    else if (text.includes('mentioned')) type = 'mention';

    const contentPreview = entry.textContent.trim().substring(0, 200);
    const timeEl = entry.querySelector('abbr, time, [data-utime]');
    const date = timeEl ? parseDate(timeEl) : null;

    return {
      type,
      contentPreview,
      facebookUrl: contentUrl,
      friendName,
      friendProfileUrl,
      date,
    };
  }

  // ========== HELPERS ==========

  const RESERVED_PATHS = new Set([
    '/friends', '/messages', '/notifications', '/settings', '/groups',
    '/marketplace', '/watch', '/gaming', '/events', '/pages',
    '/saved', '/offers', '/ads', '/stories', '/reels',
    '/bookmarks', '/fundraisers', '/weather', '/memories',
    '/allactivity', '/help', '/privacy', '/policies',
    '/login', '/recover', '/signup', '/checkpoint',
    '/photo', '/photos', '/video', '/videos',
    '/hashtag', '/search', '/public', '/permalink',
  ]);

  function isReservedPath(path) {
    const clean = path.toLowerCase().replace(/\/+$/, '');
    return RESERVED_PATHS.has(clean) || clean.includes('/');
  }

  function extractNameFromElement(link) {
    // Try direct text content
    let name = link.textContent.trim();

    // If the link only has an image, look for aria-label or nearby text
    if (!name || name.length < 2) {
      name = link.getAttribute('aria-label') || '';
    }

    // Check for a nearby span or heading with text
    if (!name || name.length < 2) {
      const parent = link.parentElement;
      if (parent) {
        const span = parent.querySelector('span');
        if (span) name = span.textContent.trim();
      }
    }

    // Clean up the name
    name = name.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    // Filter out obviously non-name text
    if (name.length > 60) return '';
    if (name.match(/^\d+$/)) return '';

    return name;
  }

  function cleanFbUrl(url) {
    try {
      const u = new URL(url);
      // Remove tracking params but keep content identifiers
      const clean = new URL(u.origin + u.pathname);
      for (const [key, val] of u.searchParams) {
        if (['story_fbid', 'id', 'comment_id', 'photo_id', 'v'].includes(key)) {
          clean.searchParams.set(key, val);
        }
      }
      return clean.toString();
    } catch {
      return url;
    }
  }

  function parseDate(el) {
    // Try data-utime attribute (Unix timestamp)
    const utime = el.getAttribute('data-utime');
    if (utime) {
      return new Date(parseInt(utime) * 1000).toISOString();
    }

    // Try datetime attribute
    const datetime = el.getAttribute('datetime');
    if (datetime) {
      return new Date(datetime).toISOString();
    }

    // Try title attribute (often has full date)
    const title = el.getAttribute('title');
    if (title) {
      const d = new Date(title);
      if (!isNaN(d.getTime())) return d.toISOString();
    }

    return null;
  }
})();
