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

    let editingRuleIndex = null;
    let cancelEditButton = null;
    const formActions = document.getElementById('form-actions');

    function updateFormActions(isEditing) {
        if (!formActions) return;
        while (formActions.firstChild) formActions.removeChild(formActions.firstChild);
        if (isEditing) {
            const row = document.createElement('div');
            row.className = 'edit-controls';
            addRuleButton.textContent = 'Save';
            row.appendChild(addRuleButton);
            cancelEditButton = document.createElement('button');
            cancelEditButton.className = 'btn-cancel-edit';
            cancelEditButton.type = 'button';
            cancelEditButton.textContent = 'Cancel';
            cancelEditButton.onclick = () => {
                urlInput.value = '';
                selectorInput.value = '';
                resetEditState();
                loadRules();
            };
            row.appendChild(cancelEditButton);
            formActions.appendChild(row);
        } else {
            addRuleButton.textContent = 'Add Rule';
            formActions.appendChild(addRuleButton);
        }
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
                                if (editingRuleIndex !== null && editingRuleIndex === index) {
                                    ruleElement.classList.add('edit-highlight');
                                }
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
            const selectorEl = document.createElement('span');
            selectorEl.textContent = rule.selector;
            text.appendChild(urlEl);
            text.appendChild(selectorEl);
            // Action icons (col)
            const actions = document.createElement('div');
            actions.className = 'rule-actions';
            // Edit icon-button
            const editButton = document.createElement('button');
            editButton.className = 'btn-edit';
            editButton.title = 'Edit';
            editButton.dataset.index = index;
            editButton.innerHTML = `<svg class="svg-action-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 0 0-2.828 0l-8.794 8.793a1 1 0 0 0-.263.456l-1.5 5a1 1 0 0 0 1.263 1.263l5-1.5a1 1 0 0 0 .456-.263l8.793-8.794a2 2 0 0 0 0-2.828l-2-2zm-9.121 9.12 7.085-7.084 1.415 1.414-7.085 7.085-1.415-1.415z"/></svg>`;
            editButton.addEventListener('click', editRule);
            // Remove icon-button
            const removeButton = document.createElement('button');
            removeButton.className = 'btn-remove';
            removeButton.title = 'Remove';
            removeButton.dataset.index = index;
            removeButton.innerHTML = `<svg class="svg-action-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-width="1.5" d="m7.75 7.75 8.5 8.5m0-8.5-8.5 8.5"/><rect width="20" height="20" x="2" y="2" stroke="currentColor" stroke-width="1.5" rx="4"/></svg>`;
            removeButton.addEventListener('click', removeRule);
            actions.appendChild(editButton);
            actions.appendChild(removeButton);
            div.appendChild(text);
            // If there's a toggle, add toggle here (skip here to focus on actions)
            div.appendChild(actions);
            return div;
        } catch (err) {
            console.error('createRuleElement error:', err);
            throw err;
        }
    }

    function editRule(event) {
        try {
            const indexToEdit = parseInt(event.target.dataset.index, 10);
            chrome.storage.sync.get({ rules: [] }, (data) => {
                if (chrome.runtime.lastError) {
                    console.error('chrome.storage.sync.get (editRule) error:', chrome.runtime.lastError.message);
                    return;
                }
                if (!data || !Array.isArray(data.rules) || !data.rules[indexToEdit]) {
                    alert('Error: Rule not found.');
                    return;
                }
                const rule = data.rules[indexToEdit];
                urlInput.value = rule.url;
                selectorInput.value = rule.selector;
                editingRuleIndex = indexToEdit;
                updateFormActions(true);
                loadRules(); // highlight being edited
            });
        } catch (err) {
            console.error('editRule outer error:', err);
        }
    }

    function resetEditState() {
        editingRuleIndex = null;
        if (cancelEditButton && cancelEditButton.parentNode) {
            cancelEditButton.parentNode.removeChild(cancelEditButton);
            cancelEditButton = null;
        }
        updateFormActions(false);
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
            if (editingRuleIndex !== null) {
                // Save edit
                chrome.storage.sync.get({ rules: [] }, (data) => {
                    if (chrome.runtime.lastError) {
                        console.error('chrome.storage.sync.get (edit save) error:', chrome.runtime.lastError.message);
                        return;
                    }
                    if (!data || !Array.isArray(data.rules) || !data.rules[editingRuleIndex]) {
                        alert('Error: Rule not found (edit save).');
                        resetEditState();
                        return;
                    }
                    const updatedRules = [...data.rules];
                    updatedRules[editingRuleIndex] = {
                        ...updatedRules[editingRuleIndex],
                        url,
                        selector
                    };
                    chrome.storage.sync.set({ rules: updatedRules }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('chrome.storage.sync.set (edit save) error:', chrome.runtime.lastError.message);
                            alert('Error saving rule.');
                            return;
                        }
                        urlInput.value = '';
                        selectorInput.value = '';
                        resetEditState();
                        loadRules();
                    });
                });
            } else {
                // old add logic
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
            }
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

    // How-to overlay toggle logic
    const howtoOpenBtn = document.getElementById('howto-open');
    const howtoOverlay = document.getElementById('howto-overlay');
    const howtoBackBtn = document.getElementById('howto-back');
    if (howtoOpenBtn && howtoOverlay && howtoBackBtn) {
      howtoOpenBtn.addEventListener('click', () => {
        howtoOverlay.classList.add('active');
        howtoOverlay.focus();
      });
      howtoBackBtn.addEventListener('click', () => {
        howtoOverlay.classList.remove('active');
        howtoOpenBtn.focus();
      });
      // Escape closes
      howtoOverlay.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          howtoOverlay.classList.remove('active');
          howtoOpenBtn.focus();
        }
      });
    }

    // Event Listeners
    try {
        addRuleButton.addEventListener('click', addRule);
    } catch (err) {
        console.error('Failed to attach addRuleButton click:', err);
    }
    // Initial load
    try {
        updateFormActions(false);
        loadRules();
    } catch (err) {
        console.error('Initial loadRules() error:', err);
    }
});
