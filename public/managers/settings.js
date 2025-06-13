// SettingsManager handles all settings modal logic, loading, saving, and dashboard order drag/drop
export class SettingsManager {
    constructor({
        settingsBtn,
        settingsModal,
        notificationForm,
        saveSettings,
        cancelSettings,
        settingsClose,
        testNotificationSettings,
        setButtonLoading,
        renderDashboard
    }) {
        this.localSettingsStorageKey = 'dumbAssetSettings';
        this.localSettingsLastOpenedPaneKey = 'dumbAssetSettingsLastOpenedPane';
        this.settingsBtn = settingsBtn;
        this.settingsModal = settingsModal;
        this.notificationForm = notificationForm;
        this.saveSettings = saveSettings;
        this.cancelSettings = cancelSettings;
        this.settingsClose = settingsClose;
        this.testNotificationSettings = testNotificationSettings;
        this.setButtonLoading = setButtonLoading;
        this.renderDashboard = renderDashboard;
        this.selectedAssetId = null;
        this.DEBUG = false;
        this._bindEvents();
        this.defaultSettings = window.appConfig?.defaultSettings || {
            notificationSettings: {
                notifyAdd: true,
                notifyDelete: false,
                notifyEdit: true,
                notify1Month: true,
                notify2Week: false,
                notify7Day: true,
                notify3Day: false,
                notifyMaintenance: true // Default to true for compatibility
            },
            interfaceSettings: {
                dashboardOrder: [],
                dashboardVisibility: {
                    analytics: true,
                    totals: true,
                    warranties: true,
                    events: true
                },
                cardVisibility: {
                    assets: true,
                    components: true,
                    value: true,
                    warranties: true,
                    within60: true,
                    within30: true,
                    expired: true,
                    active: true
                }
            }
        };
    }

    _bindEvents() {
        this.settingsBtn.addEventListener('click', async () => {
            await this.loadSettings();
            this.settingsModal.style.display = 'block';
            // Use last opened tab if available
            const lastTab = localStorage.getItem(this.localSettingsLastOpenedPaneKey) || 'notifications';
            this.showSettingsTab(lastTab);
        });
        this.settingsClose.addEventListener('click', () => this.closeSettingsModal());
        this.cancelSettings.addEventListener('click', () => this.closeSettingsModal());
        this.saveSettings.addEventListener('click', () => this._saveSettings());
        this.testNotificationSettings.addEventListener('click', () => this._testNotificationSettings());
        
        // Export button
        const exportDataBtn = document.getElementById('exportDataBtn');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => this._exportData());
        }
        
        // Export simple data button
        const exportSimpleDataBtn = document.getElementById('exportSimpleDataBtn');
        if (exportSimpleDataBtn) {
            exportSimpleDataBtn.addEventListener('click', () => this._exportSimpleData());
        }
        
        // Paperless integration
        const testPaperlessConnection = document.getElementById('testPaperlessConnection');
        if (testPaperlessConnection) {
            testPaperlessConnection.addEventListener('click', () => this._testPaperlessConnection());
        }
        
        const paperlessEnabled = document.getElementById('paperlessEnabled');
        if (paperlessEnabled) {
            paperlessEnabled.addEventListener('change', (e) => this._togglePaperlessConfig(e.target.checked));
        }
        
        // Handle token field changes
        const paperlessToken = document.getElementById('paperlessToken');
        if (paperlessToken) {
            paperlessToken.addEventListener('input', (e) => this._handleTokenFieldChange(e.target));
            paperlessToken.addEventListener('focus', (e) => this._handleTokenFieldFocus(e.target));
        }
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                // Save last opened tab to localStorage
                localStorage.setItem(this.localSettingsLastOpenedPaneKey, tabId);
                this.showSettingsTab(tabId);
            });
        });
    }

    closeSettingsModal() {
        this.settingsModal.style.display = 'none';
    }

    showSettingsTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
        });
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabId}-tab`);
        });
        if (tabId === 'notifications') {
            this.testNotificationSettings.style.display = 'block';
        } else {
            this.testNotificationSettings.style.display = 'none';
        }
        if (tabId === 'interface') {
            this.initSortable();
        }
    }

    getDefaultSettings() {
        return this.defaultSettings;
    }

    async fetchSettings() {
        try {
            const response = await fetch('/api/settings', { credentials: 'include' });
            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) throw new Error(responseValidation.errorMessage);

            const settings = await response.json();
            const stringified = JSON.stringify(settings); // Deep clone to avoid mutation
            localStorage.setItem(this.localSettingsStorageKey, stringified);
            return JSON.parse(stringified); // Deep clone to avoid mutation
        } catch (error) {
            globalThis.logError('Failed to fetch settings:', error.message);
            return this.getDefaultSettings(); // Return default settings on error
        }
    }

    getSettingsFromLocalStorage() {
        const localSettings = localStorage.getItem(this.localSettingsStorageKey);
        if (localSettings) {
            try {
                const parsedSettings = JSON.parse(localSettings);
                const mergedSettings = {
                    ...this.getDefaultSettings(),
                    ...parsedSettings
                };
                return { ...mergedSettings };
            } catch (err) {
                console.error('Error parsing settings from localStorage:', err);
                return null;
            }
        }
        return null;
    }

    async loadSettings() {
        try {
            const settings = { ...await this.fetchSettings() };
            const notificationSettings = settings.notificationSettings;
            this.notificationForm.notifyAdd.checked = !!notificationSettings.notifyAdd;
            this.notificationForm.notifyDelete.checked = !!notificationSettings.notifyDelete;
            this.notificationForm.notifyEdit.checked = !!notificationSettings.notifyEdit;
            this.notificationForm.notify1Month.checked = !!notificationSettings.notify1Month;
            this.notificationForm.notify2Week.checked = !!notificationSettings.notify2Week;
            this.notificationForm.notify7Day.checked = !!notificationSettings.notify7Day;
            this.notificationForm.notify3Day.checked = !!notificationSettings.notify3Day;
            this.notificationForm.notifyMaintenance.checked = (typeof notificationSettings.notifyMaintenance !== 'undefined')
                ? !!notificationSettings.notifyMaintenance
                : (settings.notifyMaintenance !== false);
                
            const interfaceSettings = settings.interfaceSettings;
            // Dashboard order
            if (interfaceSettings.dashboardOrder && Array.isArray(interfaceSettings.dashboardOrder)) {
                const dashboardSectionsContainer = document.getElementById('dashboardSections');
                if (dashboardSectionsContainer) {
                    const sections = dashboardSectionsContainer.querySelectorAll('.sortable-item');
                    const orderedSections = [];
                    let orderToUse = [...interfaceSettings.dashboardOrder];
                    
                    orderToUse.forEach(sectionName => {
                        Array.from(sections).forEach(section => {
                            if (section.getAttribute('data-section') === sectionName) {
                                orderedSections.push(section);
                            }
                        });
                    });
                    
                    // Add any sections that exist in HTML but not in saved order
                    Array.from(sections).forEach(section => {
                        if (!orderedSections.includes(section)) {
                            orderedSections.push(section);
                        }
                    });
                    
                    dashboardSectionsContainer.innerHTML = '';
                    orderedSections.forEach(section => {
                        dashboardSectionsContainer.appendChild(section);
                    });
                }
            }
            // Dashboard visibility - ensure Events defaults to true
            const vis = interfaceSettings.dashboardVisibility || {};
            // Set defaults for any missing values
            const visibilityDefaults = { analytics: true, totals: true, warranties: true, events: true };
            const finalVisibility = { ...visibilityDefaults, ...vis };
            
            document.getElementById('toggleTotals').checked = finalVisibility.totals;
            document.getElementById('toggleWarranties').checked = finalVisibility.warranties;
            document.getElementById('toggleAnalytics').checked = finalVisibility.analytics;
            document.getElementById('toggleEvents').checked = finalVisibility.events;
            
            // Paperless integration settings
            const integrationSettings = settings.integrationSettings || {};
            const paperlessSettings = integrationSettings.paperless || {};
            
            document.getElementById('paperlessEnabled').checked = paperlessSettings.enabled || false;
            document.getElementById('paperlessHost').value = paperlessSettings.hostUrl || '';
            
            // Handle API token - show placeholder if token exists, empty if not
            const tokenField = document.getElementById('paperlessToken');
            if (paperlessSettings.apiToken) {
                if (paperlessSettings.apiToken === '*********************') {
                    // Already a placeholder, keep it
                    tokenField.value = paperlessSettings.apiToken;
                    tokenField.setAttribute('data-has-saved-token', 'true');
                    tokenField.placeholder = 'Saved token hidden - focus to enter new token';
                } else {
                    // This shouldn't happen with the backend fix, but handle it for safety
                    tokenField.value = '*********************';
                    tokenField.setAttribute('data-has-saved-token', 'true');
                    tokenField.placeholder = 'Saved token hidden - focus to enter new token';
                }
            } else {
                tokenField.value = '';
                tokenField.removeAttribute('data-has-saved-token');
                tokenField.placeholder = 'Enter your Paperless API token';
            }
            
            this._togglePaperlessConfig(paperlessSettings.enabled || false);
            
            // Card visibility toggles
            if (typeof window.renderCardVisibilityToggles === 'function') {
                window.renderCardVisibilityToggles(settings);
            }
            localStorage.setItem(this.localSettingsStorageKey, JSON.stringify(settings));
            return settings;
        } catch (err) {
            console.error('Error loading settings:', err);
            // Set default values when loading fails
            this.notificationForm.notifyAdd.checked = this.defaultSettings.notificationSettings.notifyAdd;
            this.notificationForm.notifyDelete.checked = this.defaultSettings.notificationSettings.notifyDelete;
            this.notificationForm.notifyEdit.checked = this.defaultSettings.notificationSettings.notifyEdit;
            this.notificationForm.notify1Month.checked = this.defaultSettings.notificationSettings.notify1Month;
            this.notificationForm.notify2Week.checked = this.defaultSettings.notificationSettings.notify2Week;
            this.notificationForm.notify7Day.checked = this.defaultSettings.notificationSettings.notify7Day;
            this.notificationForm.notify3Day.checked = this.defaultSettings.notificationSettings.notify3Day;
            // Ensure Events toggle is enabled by default when loading fails
            document.getElementById('toggleEvents').checked = true;
        }
    }

    async _saveSettings() {
        this.setButtonLoading(this.saveSettings, true);
        const settings = {
            notificationSettings: {
                notifyAdd: this.notificationForm.notifyAdd.checked,
                notifyDelete: this.notificationForm.notifyDelete.checked,
                notifyEdit: this.notificationForm.notifyEdit.checked,
                notify1Month: this.notificationForm.notify1Month.checked,
                notify2Week: this.notificationForm.notify2Week.checked,
                notify7Day: this.notificationForm.notify7Day.checked,
                notify3Day: this.notificationForm.notify3Day.checked,
                notifyMaintenance: this.notificationForm.notifyMaintenance.checked // Ensure this is always present
            },
            interfaceSettings: {
                dashboardOrder: [],
                dashboardVisibility: {
                    analytics: document.getElementById('toggleAnalytics').checked,
                    totals: document.getElementById('toggleTotals').checked,
                    warranties: document.getElementById('toggleWarranties').checked,
                    events: document.getElementById('toggleEvents').checked
                },
                cardVisibility: {
                    assets: document.getElementById('toggleCardTotalAssets')?.checked !== false,
                    components: document.getElementById('toggleCardTotalComponents')?.checked !== false,
                    value: document.getElementById('toggleCardTotalValue')?.checked !== false,
                    warranties: document.getElementById('toggleCardWarrantiesTotal')?.checked !== false,
                    within60: document.getElementById('toggleCardWarrantiesWithin60')?.checked !== false,
                    within30: document.getElementById('toggleCardWarrantiesWithin30')?.checked !== false,
                    expired: document.getElementById('toggleCardWarrantiesExpired')?.checked !== false,
                    active: document.getElementById('toggleCardWarrantiesActive')?.checked !== false
                }
            },
            integrationSettings: {
                paperless: {
                    enabled: document.getElementById('paperlessEnabled')?.checked || false,
                    hostUrl: document.getElementById('paperlessHost')?.value || '',
                    apiToken: document.getElementById('paperlessToken')?.value || ''
                }
            }
        };
        const dashboardSections = document.querySelectorAll('#dashboardSections .sortable-item');
        dashboardSections.forEach(section => {
            settings.interfaceSettings.dashboardOrder.push(section.getAttribute('data-section'));
        });

        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
                credentials: 'include'
            });
            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) throw new Error(responseValidation.errorMessage);

            const settingsCopy = { ...settings };
            localStorage.setItem(this.localSettingsStorageKey, JSON.stringify(settingsCopy));
            this.closeSettingsModal();
            globalThis.toaster.show('Settings saved');
            if (!this.selectedAssetId && typeof this.renderDashboard === 'function') {
                this.renderDashboard();
            }
        } catch (error) {
            globalThis.logError('Failed to save settings:', error.message);
        } finally {
            this.setButtonLoading(this.saveSettings, false);
        }
    }

    async _testNotificationSettings() {
        if (this.DEBUG) {
            console.log('[DEBUG] Test notification settings button clicked');
        }
        this.setButtonLoading(this.testNotificationSettings, true);
        const enabledTypes = [];
        const f = this.notificationForm;
        if (f.notifyAdd.checked) enabledTypes.push('notifyAdd');
        if (f.notifyDelete.checked) enabledTypes.push('notifyDelete');
        if (f.notifyEdit.checked) enabledTypes.push('notifyEdit');
        if (f.notify1Month.checked) enabledTypes.push('notify1Month');
        if (f.notify2Week.checked) enabledTypes.push('notify2Week');
        if (f.notify7Day.checked) enabledTypes.push('notify7Day');
        if (f.notify3Day.checked) enabledTypes.push('notify3Day');
        if (f.notifyMaintenance.checked) enabledTypes.push('notifyMaintenance');
        if (enabledTypes.length === 0) enabledTypes.push('notifyAdd');
        fetch('/api/notification-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabledTypes })
        })
        .then(async (response) => {
            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) throw new Error(responseValidation.errorMessage);
            globalThis.toaster.show('Test notifications sent successfully!');
        })
        .catch(error => {
            globalThis.logError('Test Notification Failed:', error.message);
        })
        .finally(() => {
            this.setButtonLoading(this.testNotificationSettings, false);
        });
    }

    cleanupPlaceholders(container) {
        const oldPlaceholders = container.querySelectorAll('.sortable-placeholder');
        oldPlaceholders.forEach(el => el.parentNode.removeChild(el));
    }

    // Drag and drop for dashboard order
    initSortable() {
        const container = document.getElementById('dashboardSections');
        if (!container) return;
        let draggedItem = null;
        let placeholder = null;
        let initialX, initialY, startClientX, startClientY;
        let itemHeight, itemWidth;
        let isTouch = false;
        this.cleanupPlaceholders(container);
        // Remove all old event listeners by cloning each sortable-item
        const oldItems = Array.from(container.querySelectorAll('.sortable-item'));
        oldItems.forEach(item => {
            const clone = item.cloneNode(true);
            item.parentNode.replaceChild(clone, item);
        });
        // Now select the fresh clones
        const items = container.querySelectorAll('.sortable-item');
        const self = this;
        items.forEach(item => {
            // Desktop (mouse)
            item.addEventListener('mousedown', (e) => {
                const isInteractiveElement = e.target.closest('button') || e.target.closest('a') || e.target.closest('input') || e.target.closest('select');
                if (e.target.closest('.sortable-handle') || (!isInteractiveElement)) {
                    e.preventDefault();
                    isTouch = false;
                    startDrag(item, e.clientX, e.clientY);
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                }
            });
            // Mobile (touch)
            item.addEventListener('touchstart', (e) => {
                const touch = e.touches[0];
                const isInteractiveElement = e.target.closest('button') || e.target.closest('a') || e.target.closest('input') || e.target.closest('select');
                if (e.target.closest('.sortable-handle') || (!isInteractiveElement)) {
                    e.preventDefault();
                    isTouch = true;
                    startDrag(item, touch.clientX, touch.clientY);
                    document.addEventListener('touchmove', onTouchMove, { passive: false });
                    document.addEventListener('touchend', onTouchEnd);
                }
            });
        });
        function startDrag(item, clientX, clientY) {
            self.cleanupPlaceholders(container);
            draggedItem = item;
            draggedItem.classList.add('dragging');
            const rect = draggedItem.getBoundingClientRect();
            itemHeight = rect.height;
            itemWidth = rect.width;
            placeholder = document.createElement('div');
            placeholder.classList.add('sortable-placeholder');
            placeholder.style.height = `${itemHeight}px`;
            placeholder.style.width = `${itemWidth}px`;
            const itemContent = draggedItem.textContent.trim();
            if (itemContent) {
                const ghostContent = document.createElement('span');
                ghostContent.textContent = itemContent;
                ghostContent.style.opacity = '0.5';
                ghostContent.style.padding = '10px 15px';
                ghostContent.style.display = 'flex';
                ghostContent.style.alignItems = 'center';
                placeholder.appendChild(ghostContent);
            }
            initialX = rect.left;
            initialY = rect.top;
            startClientX = clientX;
            startClientY = clientY;
            draggedItem.parentNode.insertBefore(placeholder, draggedItem);
            draggedItem.style.position = 'fixed';
            draggedItem.style.zIndex = '1000';
            draggedItem.style.width = `${itemWidth}px`;
            draggedItem.style.left = `${initialX}px`;
            draggedItem.style.top = `${initialY}px`;
        }
        function onMouseMove(e) {
            if (!draggedItem) return;
            e.preventDefault();
            moveDraggedItem(e.clientX, e.clientY);
        }
        function onTouchMove(e) {
            if (!draggedItem) return;
            e.preventDefault();
            const touch = e.touches[0];
            moveDraggedItem(touch.clientX, touch.clientY);
        }
        function moveDraggedItem(clientX, clientY) {
            const deltaX = clientX - startClientX;
            const deltaY = clientY - startClientY;
            draggedItem.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            const draggingRect = draggedItem.getBoundingClientRect();
            const draggingMiddleY = draggingRect.top + draggingRect.height / 2;
            const siblings = Array.from(container.querySelectorAll('.sortable-item:not(.dragging)'));
            if (siblings.length === 0) return;
            const firstItem = siblings[0];
            const lastItem = siblings[siblings.length - 1];
            const firstRect = firstItem.getBoundingClientRect();
            const lastRect = lastItem.getBoundingClientRect();
            siblings.forEach(item => item.classList.remove('shift-up', 'shift-down'));
            if (draggingMiddleY < firstRect.top + firstRect.height * 0.25) {
                firstItem.classList.add('shift-down');
                container.insertBefore(placeholder, firstItem);
                return;
            }
            if (draggingMiddleY > lastRect.bottom - lastRect.height * 0.25) {
                lastItem.classList.add('shift-up');
                container.insertBefore(placeholder, lastItem.nextElementSibling);
                return;
            }
            let closestItem = null;
            let closestDistance = Infinity;
            siblings.forEach(sibling => {
                const rect = sibling.getBoundingClientRect();
                const distance = Math.abs(rect.top + rect.height / 2 - draggingMiddleY);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestItem = sibling;
                }
            });
            if (closestItem) {
                const rect = closestItem.getBoundingClientRect();
                const threshold = rect.top + rect.height * 0.4;
                const isAfter = draggingMiddleY > threshold;
                siblings.forEach(item => {
                    item.classList.remove('shift-up', 'shift-down');
                });
                if (isAfter && placeholder.nextElementSibling !== closestItem) {
                    closestItem.classList.add('shift-down');
                    container.insertBefore(placeholder, closestItem.nextElementSibling);
                } else if (!isAfter && placeholder.previousElementSibling !== closestItem) {
                    closestItem.classList.add('shift-up');
                    container.insertBefore(placeholder, closestItem);
                }
            }
        }
        function onMouseUp() {
            if (draggedItem) finishDrag();
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
        function onTouchEnd() {
            if (draggedItem) finishDrag();
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        }
        function finishDrag() {
            container.querySelectorAll('.shift-up, .shift-down').forEach(item => {
                item.classList.remove('shift-up', 'shift-down');
            });
            if (placeholder && placeholder.parentNode) {
                placeholder.parentNode.insertBefore(draggedItem, placeholder);
                placeholder.parentNode.removeChild(placeholder);
            }
            self.cleanupPlaceholders(container);
            draggedItem.classList.remove('dragging');
            draggedItem.style.position = '';
            draggedItem.style.top = '';
            draggedItem.style.left = '';
            draggedItem.style.width = '';
            draggedItem.style.transform = '';
            draggedItem.style.zIndex = '';
            draggedItem.animate([
                { transform: 'scale(1.03)', backgroundColor: 'rgba(37, 100, 235, 0.1)' },
                { transform: 'scale(1)', backgroundColor: 'var(--file-label-color)' }
            ], {
                duration: 300,
                easing: 'ease-out'
            });
            draggedItem = null;
            placeholder = null;
            const newOrder = [];
            document.querySelectorAll('#dashboardSections .sortable-item').forEach(item => {
                newOrder.push(item.getAttribute('data-section'));
            });
            try {
                const settings = self.getSettingsFromLocalStorage() || self.defaultSettings;
                settings.interfaceSettings.dashboardOrder = newOrder;
                localStorage.setItem(self.localSettingsStorageKey, JSON.stringify(settings));
            } catch (err) {
                console.error('Error updating local storage', err);
            }
        }
    }

    async _exportData() {
        const exportBtn = document.getElementById('exportDataBtn');
        if (!exportBtn) return;
        
        this.setButtonLoading(exportBtn, true);
        
        try {
            const apiBaseUrl = globalThis.getApiBaseUrl();
            
            // Fetch both assets and sub-assets
            const [assetsResponse, subAssetsResponse] = await Promise.all([
                fetch(`${apiBaseUrl}/api/assets`, { credentials: 'include' }),
                fetch(`${apiBaseUrl}/api/subassets`, { credentials: 'include' })
            ]);
            
            // Validate responses
            const assetsValidation = await globalThis.validateResponse(assetsResponse);
            if (assetsValidation.errorMessage) throw new Error(assetsValidation.errorMessage);
            
            const subAssetsValidation = await globalThis.validateResponse(subAssetsResponse);
            if (subAssetsValidation.errorMessage) throw new Error(subAssetsValidation.errorMessage);
            
            const assets = await assetsResponse.json();
            const subAssets = await subAssetsResponse.json();
            
            // Generate CSV content
            const csvContent = this._generateCSV(assets, subAssets);
            
            // Create and download the file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            // Generate filename with current date
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
            const filename = `dumbAssets_export_${dateStr}.csv`;
            
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            globalThis.toaster.show('Data exported successfully!');
            
        } catch (error) {
            globalThis.logError('Failed to export data:', error.message);
        } finally {
            this.setButtonLoading(exportBtn, false);
        }
    }
    
    _generateCSV(assets, subAssets) {
        // CSV headers
        const headers = [
            'Type',
            'ID',
            'Name',
            'Manufacturer',
            'Model Number',
            'Serial Number',
            'Purchase Date',
            'Purchase Price',
            'Currency',
            'Location',
            'URL',
            'Notes',
            'Tags',
            'Warranty Scope',
            'Warranty Expiration',
            'Warranty Lifetime',
            'Secondary Warranty Scope',
            'Secondary Warranty Expiration',
            'Secondary Warranty Lifetime',
            'Maintenance Events',
            'Photo Path',
            'Receipt Path',
            'Manual Path',
            'Parent ID',
            'Parent Sub ID',
            'Created At',
            'Updated At'
        ];
        
        const rows = [headers];
        
        // Helper function to escape CSV values
        const escapeCsvValue = (value) => {
            if (value === null || value === undefined) return '';
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
        
        // Helper function to format maintenance events
        const formatMaintenanceEvents = (events) => {
            if (!events || !events.length) return '';
            return events.map(event => {
                let eventStr = `${event.name}`;
                if (event.type === 'frequency') {
                    eventStr += ` (Every ${event.frequency} ${event.frequencyUnit})`;
                    if (event.nextDueDate) {
                        eventStr += ` - Next: ${event.nextDueDate}`;
                    }
                } else if (event.type === 'specific' && event.specificDate) {
                    eventStr += ` - Date: ${event.specificDate}`;
                }
                if (event.notes) {
                    eventStr += ` - Notes: ${event.notes}`;
                }
                return eventStr;
            }).join('; ');
        };
        
        // Add assets
        assets.forEach(asset => {
            const row = [
                'Asset',
                asset.id || '',
                asset.name || '',
                asset.manufacturer || '',
                asset.modelNumber || '',
                asset.serialNumber || '',
                asset.purchaseDate || '',
                asset.price || '',
                asset.currency || '',
                asset.location || '',
                asset.url || '',
                asset.description || asset.notes || '',
                (asset.tags && asset.tags.length > 0) ? asset.tags.join('; ') : '',
                asset.warranty?.scope || '',
                asset.warranty?.expirationDate || '',
                asset.warranty?.isLifetime ? 'Yes' : 'No',
                asset.secondaryWarranty?.scope || '',
                asset.secondaryWarranty?.expirationDate || '',
                asset.secondaryWarranty?.isLifetime ? 'Yes' : 'No',
                formatMaintenanceEvents(asset.maintenanceEvents),
                asset.photoPath || '',
                asset.receiptPath || '',
                asset.manualPath || '',
                '', // Parent ID (empty for assets)
                '', // Parent Sub ID (empty for assets)
                asset.createdAt || '',
                asset.updatedAt || ''
            ];
            rows.push(row.map(escapeCsvValue));
        });
        
        // Add sub-assets
        subAssets.forEach(subAsset => {
            const row = [
                subAsset.parentSubId ? 'Sub-Component' : 'Component',
                subAsset.id || '',
                subAsset.name || '',
                subAsset.manufacturer || '',
                subAsset.modelNumber || '',
                subAsset.serialNumber || '',
                subAsset.purchaseDate || '',
                subAsset.purchasePrice || '',
                subAsset.currency || '',
                subAsset.location || '',
                subAsset.url || '',
                subAsset.notes || subAsset.description || '',
                (subAsset.tags && subAsset.tags.length > 0) ? subAsset.tags.join('; ') : '',
                subAsset.warranty?.scope || '',
                subAsset.warranty?.expirationDate || '',
                subAsset.warranty?.isLifetime ? 'Yes' : 'No',
                '', // Secondary warranty scope (sub-assets don't have secondary warranties)
                '', // Secondary warranty expiration
                '', // Secondary warranty lifetime
                formatMaintenanceEvents(subAsset.maintenanceEvents),
                subAsset.photoPath || '',
                subAsset.receiptPath || '',
                subAsset.manualPath || '',
                subAsset.parentId || '',
                subAsset.parentSubId || '',
                subAsset.createdAt || '',
                subAsset.updatedAt || ''
            ];
            rows.push(row.map(escapeCsvValue));
        });
        
        // Convert to CSV string
        return rows.map(row => row.join(',')).join('\n');
    }

    async _exportSimpleData() {
        const exportBtn = document.getElementById('exportSimpleDataBtn');
        if (!exportBtn) return;
        
        this.setButtonLoading(exportBtn, true);
        
        try {
            const apiBaseUrl = globalThis.getApiBaseUrl();
            
            // Fetch both assets and sub-assets
            const [assetsResponse, subAssetsResponse] = await Promise.all([
                fetch(`${apiBaseUrl}/api/assets`, { credentials: 'include' }),
                fetch(`${apiBaseUrl}/api/subassets`, { credentials: 'include' })
            ]);
            
            // Validate responses
            const assetsValidation = await globalThis.validateResponse(assetsResponse);
            if (assetsValidation.errorMessage) throw new Error(assetsValidation.errorMessage);
            
            const subAssetsValidation = await globalThis.validateResponse(subAssetsResponse);
            if (subAssetsValidation.errorMessage) throw new Error(subAssetsValidation.errorMessage);
            
            const assets = await assetsResponse.json();
            const subAssets = await subAssetsResponse.json();
            
            // Generate simplified CSV content
            const csvContent = this._generateSimpleCSV(assets, subAssets);
            
            // Create and download the file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            // Generate filename with current date
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
            const filename = `dumbAssets_simple_export_${dateStr}.csv`;
            
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            globalThis.toaster.show('Simple data exported successfully!');
            
        } catch (error) {
            globalThis.logError('Failed to export simple data:', error.message);
        } finally {
            this.setButtonLoading(exportBtn, false);
        }
    }
    
    _generateSimpleCSV(assets, subAssets) {
        // Simple CSV headers - only basic fields
        const headers = [
            'Name',
            'Manufacturer',
            'Model',
            'Serial',
            'Purchase Date',
            'Purchase Price',
            'Notes',
            'URL'
        ];
        
        const rows = [headers];
        
        // Helper function to escape CSV values
        const escapeCsvValue = (value) => {
            if (value === null || value === undefined) return '';
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
        
        // Add assets
        assets.forEach(asset => {
            const row = [
                asset.name || '',
                asset.manufacturer || '',
                asset.modelNumber || '',
                asset.serialNumber || '',
                asset.purchaseDate || '',
                asset.price || '',
                asset.description || asset.notes || '',
                asset.url || ''
            ];
            rows.push(row.map(escapeCsvValue));
        });
        
        // Add sub-assets
        subAssets.forEach(subAsset => {
            const row = [
                subAsset.name || '',
                subAsset.manufacturer || '',
                subAsset.modelNumber || '',
                subAsset.serialNumber || '',
                subAsset.purchaseDate || '',
                subAsset.purchasePrice || '',
                subAsset.notes || subAsset.description || '',
                subAsset.url || ''
            ];
            rows.push(row.map(escapeCsvValue));
        });
        
        // Convert to CSV string
        return rows.map(row => row.join(',')).join('\n');
    }

    _togglePaperlessConfig(enabled) {
        const configDiv = document.getElementById('paperlessConfig');
        if (configDiv) {
            configDiv.style.display = enabled ? 'block' : 'none';
        }
    }

    _handleTokenFieldFocus(tokenField) {
        // Clear placeholder when user focuses to enter new token
        if (tokenField.value === '*********************') {
            tokenField.value = '';
            tokenField.placeholder = 'Enter new API token to replace existing one';
        }
    }

    _handleTokenFieldChange(tokenField) {
        // Reset connection status when token changes
        const statusSpan = document.getElementById('paperlessConnectionStatus');
        if (statusSpan) {
            statusSpan.textContent = '';
            statusSpan.className = 'connection-status';
        }
        
        // Update data attribute based on whether we have content
        if (tokenField.value && tokenField.value !== '*********************') {
            tokenField.removeAttribute('data-has-saved-token');
        }
    }

    async _testPaperlessConnection() {
        const testBtn = document.getElementById('testPaperlessConnection');
        const statusSpan = document.getElementById('paperlessConnectionStatus');
        const hostUrl = document.getElementById('paperlessHost').value;
        const tokenField = document.getElementById('paperlessToken');
        const apiToken = tokenField.value;
        const hasSavedToken = tokenField.hasAttribute('data-has-saved-token');

        if (!hostUrl) {
            statusSpan.textContent = 'Please enter host URL';
            statusSpan.className = 'connection-status error';
            return;
        }

        // Check if we need a new token
        if (!apiToken || (apiToken === '*********************' && !hasSavedToken)) {
            statusSpan.textContent = 'Please enter API token';
            statusSpan.className = 'connection-status error';
            return;
        }

        this.setButtonLoading(testBtn, true);
        statusSpan.textContent = 'Testing connection...';
        statusSpan.className = 'connection-status testing';

        try {
            // Send the token even if it's the placeholder - backend will handle it
            const response = await fetch('/api/paperless/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hostUrl, apiToken }),
                credentials: 'include'
            });

            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) throw new Error(responseValidation.errorMessage);

            const result = await response.json();
            
            if (result.success) {
                statusSpan.textContent = `✓ ${result.message || `Connected successfully (${result.documentsCount} documents available)`}`;
                statusSpan.className = 'connection-status success';
                globalThis.toaster.show('Paperless connection successful!', 'success');
            } else {
                throw new Error(result.error || 'Connection failed');
            }
        } catch (error) {
            statusSpan.textContent = `✗ Connection failed: ${error.message}`;
            statusSpan.className = 'connection-status error';
            globalThis.logError('Paperless connection test failed:', error.message);
        } finally {
            this.setButtonLoading(testBtn, false);
        }
    }
}
