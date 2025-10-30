// This function will be injected into the target page
function removeElement(selector) {
    try {
        const element = document.querySelector(selector);
        if (element) {
            element.remove();
            return true; // Indicate success
        }
        return false; // Indicate element not found
    } catch (e) {
        console.error(`Element Remover Error: ${e.message}`);
        return false;
    }
}

// Content script logic as a string
const removalScript = `(selectors) => {
  function runRemoval() {
    try {
      selectors.split(',').map(s => s.trim()).forEach(selector => {
        const nodes = document.querySelectorAll(selector);
        nodes.forEach(node => node && node.remove());
      });
    } catch(e) {
      console.error('Element Remover ContentScript Error:', e.message);
    }
  }
  runRemoval();
  // React/SPA: Watch for DOM or route changes
  const observer = new MutationObserver(runRemoval);
  observer.observe(document.documentElement || document.body, {childList:true, subtree:true});
  // (Optionally add routechange/pushState listeners here)
}`;

function injectScript(tabId, selectors) {
  chrome.scripting.executeScript({
    target: {tabId: tabId},
    func: eval(removalScript),
    args: [selectors]
  }, (results) => {
    if (chrome.runtime.lastError) {
      console.error('content script injection error:', chrome.runtime.lastError.message);
    }
  });
}

// Watch both tab update and SPA navigation
function applyRulesForTab(tabId, url) {
  chrome.storage.sync.get({ rules: [] }, (data) => {
    const enabledRule = data.rules.find(rule => url.includes(rule.url) && (rule.enabled === undefined || rule.enabled === true));
    if (enabledRule) {
      injectScript(tabId, enabledRule.selector);
    }
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    applyRulesForTab(tabId, tab.url);
  }
});

// SPA navigations (pushState)
chrome.webNavigation.onHistoryStateUpdated.addListener(details => {
  chrome.tabs.get(details.tabId, tab => {
    if (tab.url && tab.url.startsWith('http')) {
      applyRulesForTab(tab.id, tab.url);
    }
  });
}, {url: [{schemes: ['http', 'https']}],});
