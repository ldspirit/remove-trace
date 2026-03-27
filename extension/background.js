// Background service worker for Remove Trace extension
// Handles communication between content scripts and the local app

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'API_REQUEST') {
    handleApiRequest(message)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true; // Keep message channel open for async response
  }
});

async function handleApiRequest({ method, endpoint, body, serverUrl }) {
  const url = `${serverUrl}${endpoint}`;
  const options = {
    method: method || 'GET',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}
