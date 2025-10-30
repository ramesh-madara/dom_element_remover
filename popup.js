document.addEventListener('DOMContentLoaded', () => {
    let urlInput, selectorInput, addRuleButton, addCurrentPageButton, rulesList, noRulesText;
    try {
        urlInput = document.getElementById('url');
        selectorInput = document.getElementById('selector');
        addRuleButton = document.getElementById('add-rule');
        addCurrentPageButton = document.getElementById('add-current-page');
        rulesList = document.getElementById('rules-list');
        noRulesText = document.getElementById('no-rules');
        if (!urlInput || !selectorInput || !addRuleButton || !addCurrentPageButton || !rulesList || !noRulesText) {
            throw new Error('One or more popup elements not found.');
        }
    } catch (popupInitErr) {
        console.error('Error initializing popup DOM elements:', popupInitErr);
        return;
    }

    // Load and display existing rules
    function loadRules() {
        try {
            chrome.storage.sync.get({ rules: [] }, (data) => {
                if (chrome.runtime.lastError) {
                    console.error('chrome.storage.sync.get error:', chrome.runtime.lastError.message);
                    return;
                }
                try {
                    rulesList.innerHTML = ''; // Clear existing list
                    if (!data || !Array.isArray(data.rules)) {
                        console.error('Malformed or missing rules data:', data);
                        rulesList.appendChild(noRulesText);
                        return;
                    }
                    if (data.rules.length === 0) {
                        rulesList.appendChild(noRulesText);
                    } else {
                        if (noRulesText.parentNode) {
                            noRulesText.parentNode.removeChild(noRulesText);
                        }
                        data.rules.forEach((rule, index) => {
                            try {
                                const ruleElement = createRuleElement(rule, index);
                                rulesList.appendChild(ruleElement);
                            } catch (ceErr) {
                                console.error('Error creating rule element:', ceErr);
                            }
                        });
                    }
                } catch (innerErr) {
                    console.error('Error while processing rules:', innerErr);
                }
            });
        } catch (outerErr) {
            console.error('Error in loadRules():', outerErr);
        }
    }

    // Create the HTML for a single rule
    function createRuleElement(rule, index) {
        try {
            const div = document.createElement('div');
            div.className = 'rule-item';
            const text = document.createElement('div');
            text.className = 'text';
            const urlEl = document.createElement('strong');
            urlEl.textContent = rule.url;
            urlEl.className = '';
            const selectorEl = document.createElement('span');
            selectorEl.textContent = rule.selector;
            selectorEl.className = '';
            text.appendChild(urlEl);
            text.appendChild(selectorEl);
            // Toggle checkbox for enable/disable
            const toggleLabel = document.createElement('label');
            toggleLabel.style.marginLeft = '1.25rem';
            toggleLabel.style.marginRight = '0.5rem';
            toggleLabel.style.display = 'flex';
            toggleLabel.style.alignItems = 'center';
            const toggle = document.createElement('input');
            toggle.type = 'checkbox';
            toggle.checked = (rule.enabled === undefined ? true : !!rule.enabled);
            toggle.title = toggle.checked ? 'Turn rule off' : 'Turn rule on';
            toggle.addEventListener('change', () => {
                try {
                    chrome.storage.sync.get({ rules: [] }, (data) => {
                        if (chrome.runtime.lastError) {
                            console.error('chrome.storage.sync.get (toggle) error:', chrome.runtime.lastError.message);
                            return;
                        }
                        const updatedRules = (data.rules || []).slice();
                        if (updatedRules[index]) {
                            updatedRules[index].enabled = toggle.checked;
                        }
                        chrome.storage.sync.set({ rules: updatedRules }, () => {
                            if (chrome.runtime.lastError) {
                                console.error('chrome.storage.sync.set (toggle) error:', chrome.runtime.lastError.message);
                            }
                            loadRules();
                        });
                    });
                } catch (e) {
                    console.error('Error toggling rule:', e);
                }
            });
            toggleLabel.appendChild(toggle);
            const toggleDesc = document.createElement('span');
            toggleDesc.textContent = toggle.checked ? 'On' : 'Off';
            toggleDesc.style.marginLeft = '0.4rem';
            toggleLabel.appendChild(toggleDesc);
            div.appendChild(text);
            div.appendChild(toggleLabel);
            // Remove button
            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.className = 'btn-remove';
            removeButton.dataset.index = index;
            removeButton.addEventListener('click', removeRule);
            div.appendChild(removeButton);
            return div;
        } catch (err) {
            console.error('createRuleElement error:', err);
            throw err;
        }
    }

    // Add a new rule to storage
    function addRule() {
        try {
            const url = urlInput.value.trim();
            const selector = selectorInput.value.trim();
            if (!url || !selector) {
                alert('Please fill in both the URL and Selector fields.');
                return;
            }
            chrome.storage.sync.get({ rules: [] }, (data) => {
                if (chrome.runtime.lastError) {
                    console.error('chrome.storage.sync.get (addRule) error:', chrome.runtime.lastError.message);
                    return;
                }
                try {
                    if (!data || !Array.isArray(data.rules)) {
                        console.error('Malformed rules data during addRule:', data);
                        alert('Error saving rule: storage data malformed.');
                        return;
                    }
                    // Add enabled true on creation
                    const newRules = [...data.rules, { url, selector, enabled: true }];
                    chrome.storage.sync.set({ rules: newRules }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('chrome.storage.sync.set (addRule) error:', chrome.runtime.lastError.message);
                            alert('Error saving rule.');
                            return;
                        }
                        urlInput.value = '';
                        selectorInput.value = '';
                        loadRules(); // Refresh the list
                    });
                } catch (e) {
                    console.error('addRule logic error:', e);
                }
            });
        } catch (err) {
            console.error('addRule outer error:', err);
        }
    }

    // Remove a rule from storage
    function removeRule(event) {
        try {
            const indexToRemove = parseInt(event.target.dataset.index, 10);
            chrome.storage.sync.get({ rules: [] }, (data) => {
                if (chrome.runtime.lastError) {
                    console.error('chrome.storage.sync.get (removeRule) error:', chrome.runtime.lastError.message);
                    return;
                }
                try {
                    if (!data || !Array.isArray(data.rules)) {
                        console.error('Malformed rules data during removeRule:', data);
                        alert('Error removing rule: storage data malformed.');
                        return;
                    }
                    const newRules = data.rules.filter((_, index) => index !== indexToRemove);
                    chrome.storage.sync.set({ rules: newRules }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('chrome.storage.sync.set (removeRule) error:', chrome.runtime.lastError.message);
                            alert('Error removing rule.');
                            return;
                        }
                        loadRules(); // Refresh the list
                    });
                } catch (e) {
                    console.error('removeRule logic error:', e);
                }
            });
        } catch (err) {
            console.error('removeRule outer error:', err);
        }
    }

    // "Use Current Page" button logic
    addCurrentPageButton.addEventListener('click', () => {
        try {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (chrome.runtime.lastError) {
                    console.error('chrome.tabs.query error:', chrome.runtime.lastError.message);
                    alert('Failed to get current tab.');
                    return;
                }
                try {
                    if (tabs[0] && tabs[0].url) {
                        try {
                            const currentUrl = new URL(tabs[0].url);
                            urlInput.value = currentUrl.hostname; // e.g., "www.example.com"
                        } catch (e) {
                            // Fallback for URLs like 'chrome://extensions'
                            urlInput.value = tabs[0].url;
                        }
                    } else {
                        console.warn('No active tab found or URL missing.');
                        alert('Could not get current page URL.');
                    }
                } catch (cbErr) {
                    console.error('addCurrentPageButton callback error:', cbErr);
                }
            });
        } catch (err) {
            console.error('addCurrentPageButton outer error:', err);
        }
    });

    // ----- Dark Mode Toggle Logic -----
    const darkToggleCheckbox = document.getElementById('dark-toggle');
    function applyDarkMode(enabled) {
        if (enabled) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        if (darkToggleCheckbox) {
            darkToggleCheckbox.checked = !!enabled;
        }
    }
    // Chrome storage: dark mode preference
    function loadDarkMode() {
        try {
            chrome.storage.sync.get({ darkMode: true }, data => {
                if (chrome.runtime.lastError) {
                    console.error('darkMode storage get error:', chrome.runtime.lastError.message);
                    applyDarkMode(true); // fallback: dark mode
                    return;
                }
                applyDarkMode(data.darkMode !== false); // treat undefined as true
            });
        } catch (e) {
            console.error('Error getting darkMode from storage:', e);
            applyDarkMode(true);
        }
    }
    if (darkToggleCheckbox) {
        darkToggleCheckbox.addEventListener('change', () => {
            try {
                const enabled = darkToggleCheckbox.checked;
                applyDarkMode(enabled);
                chrome.storage.sync.set({ darkMode: enabled }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('darkMode storage set error:', chrome.runtime.lastError.message);
                    }
                });
            } catch (e) {
                console.error('darkToggle change handling error:', e);
            }
        });
    }
    // Load preference on popup open
    loadDarkMode();

    // Event Listeners
    try {
        addRuleButton.addEventListener('click', addRule);
    } catch (err) {
        console.error('Failed to attach addRuleButton click:', err);
    }
    // Initial load
    try {
        loadRules();
    } catch (err) {
        console.error('Initial loadRules() error:', err);
    }
});
