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

// Listen for when a tab is updated (e.g., new URL loaded)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    try {
        // We only want to run our script when the page is fully loaded
        // and has a valid URL.
        if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
            // Get all saved rules
            chrome.storage.sync.get({ rules: [] }, (data) => {
                if (chrome.runtime.lastError) {
                    console.error('chrome.storage.sync.get error:', chrome.runtime.lastError.message);
                    return;
                }
                try {
                    if (!data || !Array.isArray(data.rules)) {
                        console.error('Extension: Rules data missing or malformed:', data);
                        return;
                    }
                    // Only match enabled rules (default true if missing)
                    const matchingRule = data.rules.find(rule => tab.url.includes(rule.url) && (rule.enabled === undefined || rule.enabled === true));
                    if (typeof matchingRule === 'undefined') {
                        console.log('No matching rule found for URL:', tab.url);
                    }
                    if (matchingRule) {
                        // If the tab's URL matches a rule, inject our function
                        chrome.scripting.executeScript({
                            target: { tabId: tabId },
                            func: removeElement,
                            args: [matchingRule.selector] // Pass the selector as an argument
                        }, (injectionResults) => {
                            if (chrome.runtime.lastError) {
                                console.error('chrome.scripting.executeScript error:', chrome.runtime.lastError.message);
                                return;
                            }
                            if (!injectionResults || injectionResults.length === 0 || typeof injectionResults[0].result === 'undefined') {
                                console.error('Script injection failed or returned no result:', injectionResults);
                                return;
                            }
                            const result = injectionResults[0].result;
                            if (result === true) {
                                // If successful, create a notification
                                chrome.notifications.create({
                                    type: 'basic',
                                    iconUrl: 'icons/icon48.png',
                                    title: 'Element Removed',
                                    message: `Removed element '${matchingRule.selector}' from this page.`
                                }, (notificationId) => {
                                    if (chrome.runtime.lastError) {
                                        console.error('chrome.notifications.create error:', chrome.runtime.lastError.message);
                                    }
                                });
                            } else {
                                console.warn('Element not found or could not be removed for selector:', matchingRule.selector, 'in tab:', tab.url);
                            }
                        });
                    }
                } catch (innerErr) {
                    console.error('Error during rule processing or script injection:', innerErr);
                }
            });
        }
    } catch (err) {
        console.error('Error in tabs.onUpdated listener:', err);
    }
});
