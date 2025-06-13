// SettingsManager handles all settings modal logic, loading, saving, and dashboard order drag/drop
import { TOKENMASK } from '../src/constants.js';

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
        
        // Integrations will be bound dynamically when loaded
        
        // Handle token field changes will be bound dynamically per integration
        
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
            
            // Load integrations dynamically
            await this.loadIntegrations();
            
            // Apply current integration settings to the dynamically loaded form
            this.applyIntegrationSettingsToForm(settings.integrationSettings || {});
            
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
            integrationSettings: this.collectAllIntegrationSettings()
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

    /**
     * Load and render integrations dynamically
     */
    async loadIntegrations() {
        const integrationsContainer = document.getElementById('integrationsContainer');
        const loadingElement = document.getElementById('integrationsLoading');
        const errorElement = document.getElementById('integrationsError');

        try {
            loadingElement.style.display = 'block';
            errorElement.style.display = 'none';

            const response = await fetch(`${globalThis.getApiBaseUrl()}/api/integrations`);
            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) {
                throw new Error(responseValidation.errorMessage);
            }

            const integrations = await response.json();
            
            // Clear loading state
            loadingElement.style.display = 'none';
            
            // Clear existing content except loading/error elements
            const existingIntegrations = integrationsContainer.querySelectorAll('.integration-section');
            existingIntegrations.forEach(el => el.remove());

            if (integrations.length === 0) {
                const noIntegrationsMsg = document.createElement('div');
                noIntegrationsMsg.style.cssText = 'text-align: center; padding: 2rem; color: var(--text-color-secondary);';
                noIntegrationsMsg.textContent = 'No integrations available';
                integrationsContainer.appendChild(noIntegrationsMsg);
                return;
            }

            // Group integrations by category
            const categories = this.groupIntegrationsByCategory(integrations);
            
            // Render each category
            for (const [category, categoryIntegrations] of Object.entries(categories)) {
                const categorySection = this.renderIntegrationCategory(category, categoryIntegrations);
                integrationsContainer.appendChild(categorySection);
            }

            // Bind events for all rendered integrations
            this.bindIntegrationEvents();

        } catch (error) {
            console.error('Failed to load integrations:', error);
            loadingElement.style.display = 'none';
            errorElement.style.display = 'block';
            errorElement.textContent = `Failed to load integrations: ${error.message}`;
        }
    }

    /**
     * Group integrations by category
     */
    groupIntegrationsByCategory(integrations) {
        const categories = {};
        
        integrations.forEach(integration => {
            const category = integration.category || 'general';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(integration);
        });

        return categories;
    }

    /**
     * Render an integration category section
     */
    renderIntegrationCategory(category, integrations) {
        const categorySection = document.createElement('div');
        categorySection.className = 'integration-category';
        
        const categoryTitle = this.getCategoryDisplayName(category);
        
        integrations.forEach(integration => {
            const integrationElement = this.renderIntegration(integration);
            categorySection.appendChild(integrationElement);
        });

        return categorySection;
    }

    /**
     * Get display name for category
     */
    getCategoryDisplayName(category) {
        const categoryNames = {
            'document-management': 'Document Management',
            'communication': 'Communication',
            'monitoring': 'Monitoring',
            'backup': 'Backup & Sync',
            'general': 'General'
        };
        
        return categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
    }

    /**
     * Render a single integration
     */
    renderIntegration(integration) {
        const section = document.createElement('div');
        section.className = 'integration-section';
        section.dataset.integrationId = integration.id;

        const header = document.createElement('div');
        header.className = 'collapsible-header';
        header.innerHTML = `
            <div class="integration-header-content">
                <div class="integration-info">
                    <h4>${integration.name}</h4>
                    <p class="integration-description">${integration.description || ''}</p>
                </div>
                <div class="integration-toggle">
                    <label class="switch">
                        <input type="checkbox" id="${integration.id}Enabled" ${integration.defaultConfig?.enabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
            <span class="collapsible-arrow">▼</span>
        `;

        const content = document.createElement('div');
        content.className = 'collapsible-content';
        content.style.display = 'none';

        const fieldsContainer = document.createElement('div');
        fieldsContainer.className = 'integration-fields';
        
        // Render fields based on schema
        const fields = this.renderIntegrationFields(integration);
        fieldsContainer.appendChild(fields);

        // Add test connection button if integration supports it
        if (this.integrationSupportsTestConnection(integration)) {
            const testButton = document.createElement('button');
            testButton.type = 'button';
            testButton.className = 'action-button test-integration-btn';
            testButton.dataset.integrationId = integration.id;
            testButton.style.cssText = 'background: var(--success-color); margin-top: 1rem;';
            testButton.innerHTML = 'Test Connection<div class="spinner"></div>';
            fieldsContainer.appendChild(testButton);
        }

        content.appendChild(fieldsContainer);
        section.appendChild(header);
        section.appendChild(content);

        // Make it collapsible
        this.makeCollapsible(header, content);

        return section;
    }

    /**
     * Render integration fields based on schema
     */
    renderIntegrationFields(integration) {
        const container = document.createElement('div');
        container.className = 'integration-fields-container';

        const schema = integration.configSchema || {};
        
        Object.entries(schema).forEach(([fieldName, fieldConfig]) => {
            // Skip the enabled field as it's handled by the toggle
            if (fieldName === 'enabled') return;

            const fieldElement = this.renderIntegrationField(integration.id, fieldName, fieldConfig);
            container.appendChild(fieldElement);
        });

        return container;
    }

    /**
     * Render a single integration field
     */
    renderIntegrationField(integrationId, fieldName, fieldConfig) {
        const fieldContainer = document.createElement('div');
        fieldContainer.className = 'form-group integration-field';
        fieldContainer.dataset.fieldName = fieldName;

        // Add dependency class if this field depends on another
        if (fieldConfig.dependsOn) {
            fieldContainer.classList.add('depends-on-' + fieldConfig.dependsOn);
        }

        const label = document.createElement('label');
        label.textContent = fieldConfig.label || fieldName;
        label.htmlFor = `${integrationId}${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`;

        const fieldId = `${integrationId}${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`;
        let input;

        switch (fieldConfig.type) {
            case 'password':
                input = document.createElement('input');
                input.type = 'password';
                input.id = fieldId;
                input.name = fieldName;
                input.placeholder = fieldConfig.placeholder || '';
                if (fieldConfig.sensitive) {
                    input.dataset.sensitive = 'true';
                }
                break;
                
            case 'url':
                input = document.createElement('input');
                input.type = 'url';
                input.id = fieldId;
                input.name = fieldName;
                input.placeholder = fieldConfig.placeholder || '';
                break;
                
            case 'boolean':
                // For boolean fields other than 'enabled', render as checkbox
                input = document.createElement('div');
                input.className = 'checkbox-container';
                input.innerHTML = `
                    <label class="switch">
                        <input type="checkbox" id="${fieldId}" name="${fieldName}" ${fieldConfig.default ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                `;
                break;
                
            default:
                input = document.createElement('input');
                input.type = 'text';
                input.id = fieldId;
                input.name = fieldName;
                input.placeholder = fieldConfig.placeholder || '';
        }

        fieldContainer.appendChild(label);
        fieldContainer.appendChild(input);

        // Add description if provided
        if (fieldConfig.description) {
            const description = document.createElement('small');
            description.className = 'field-description';
            description.textContent = fieldConfig.description;
            fieldContainer.appendChild(description);
        }

        return fieldContainer;
    }

    /**
     * Check if integration supports test connection
     */
    integrationSupportsTestConnection(integration) {
        return integration.endpoints && integration.endpoints.some(endpoint => 
            endpoint.includes('test-connection') || endpoint.includes('/test')
        );
    }

    /**
     * Make a section collapsible
     */
    makeCollapsible(header, content) {
        header.addEventListener('click', () => {
            const isOpen = content.style.display !== 'none';
            content.style.display = isOpen ? 'none' : 'block';
            const arrow = header.querySelector('.collapsible-arrow');
            if (arrow) {
                arrow.textContent = isOpen ? '▼' : '▲';
            }
        });
    }

    /**
     * Bind events for integration controls
     */
    bindIntegrationEvents() {
        // Enable/disable toggle events
        document.querySelectorAll('.integration-section input[id$="Enabled"]').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const integrationId = e.target.id.replace('Enabled', '');
                this.toggleIntegrationFields(integrationId, e.target.checked);
            });
            
            // Set initial state
            const integrationId = toggle.id.replace('Enabled', '');
            this.toggleIntegrationFields(integrationId, toggle.checked);
        });

        // Sensitive field focus events for password fields
        document.querySelectorAll('.integration-section input[data-sensitive="true"]').forEach(field => {
            field.addEventListener('focus', () => {
                if (field.value === TOKENMASK) {
                    field.value = '';
                    field.placeholder = 'Enter new value...';
                }
            });
        });

        // Test connection button events
        document.querySelectorAll('.test-integration-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const integrationId = e.target.dataset.integrationId;
                this.testIntegrationConnection(integrationId, btn);
            });
        });
    }

    /**
     * Toggle integration fields visibility based on enabled state
     */
    toggleIntegrationFields(integrationId, enabled) {
        const section = document.querySelector(`[data-integration-id="${integrationId}"]`);
        if (!section) return;

        // Toggle fields that depend on enabled state
        const dependentFields = section.querySelectorAll('.integration-field.depends-on-enabled');
        dependentFields.forEach(field => {
            field.style.display = enabled ? 'block' : 'none';
        });

        // Toggle test button
        const testBtn = section.querySelector('.test-integration-btn');
        if (testBtn) {
            testBtn.style.display = enabled ? 'block' : 'none';
        }
    }

    /**
     * Test integration connection
     */
    async testIntegrationConnection(integrationId, button) {
        try {
            this.setButtonLoading(button, true);

            // Collect current integration settings
            const integrationConfig = this.collectIntegrationSettings(integrationId);

            const response = await fetch(`${globalThis.getApiBaseUrl()}/api/integrations/${integrationId}/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(integrationConfig),
                credentials: 'include'
            });

            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) {
                throw new Error(responseValidation.errorMessage);
            }

            const result = await response.json();
            
            if (result.status === 'success') {
                globalThis.toaster.show(`${integrationId} connection test successful!`, 'success');
            } else {
                throw new Error(result.message || 'Connection test failed');
            }

        } catch (error) {
            globalThis.logError(`${integrationId} connection test failed:`, error);
        } finally {
            this.setButtonLoading(button, false);
        }
    }

    /**
     * Collect integration settings from form fields
     */
    collectIntegrationSettings(integrationId) {
        const section = document.querySelector(`[data-integration-id="${integrationId}"]`);
        if (!section) return {};

        const settings = {};
        
        // Get enabled state
        const enabledToggle = section.querySelector(`#${integrationId}Enabled`);
        if (enabledToggle) {
            settings.enabled = enabledToggle.checked;
        }

        // Get all other fields
        const fields = section.querySelectorAll('.integration-field input, .integration-field select, .integration-field textarea');
        fields.forEach(field => {
            const fieldName = field.name || field.id.replace(integrationId, '').toLowerCase();
            
            if (field.type === 'checkbox') {
                settings[fieldName] = field.checked;
            } else {
                settings[fieldName] = field.value;
            }
        });

        return settings;
    }

    /**
     * Collect all integration settings from the form
     */
    collectAllIntegrationSettings() {
        const integrationSettings = {};
        
        // Find all integration sections
        const integrationSections = document.querySelectorAll('.integration-section[data-integration-id]');
        
        integrationSections.forEach(section => {
            const integrationId = section.dataset.integrationId;
            const settings = this.collectIntegrationSettings(integrationId);
            
            if (Object.keys(settings).length > 0) {
                integrationSettings[integrationId] = settings;
            }
        });
        
        return integrationSettings;
    }

    /**
     * Apply integration settings to the dynamically loaded form
     */
    applyIntegrationSettingsToForm(integrationSettings) {
        Object.entries(integrationSettings).forEach(([integrationId, config]) => {
            const section = document.querySelector(`[data-integration-id="${integrationId}"]`);
            if (!section) return;

            // Set enabled state
            const enabledToggle = section.querySelector(`#${integrationId}Enabled`);
            if (enabledToggle) {
                enabledToggle.checked = config.enabled || false;
                this.toggleIntegrationFields(integrationId, enabledToggle.checked);
            }

            // Set field values
            Object.entries(config).forEach(([fieldName, value]) => {
                if (fieldName === 'enabled') return; // Already handled above

                const fieldId = `${integrationId}${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`;
                const field = section.querySelector(`#${fieldId}`);
                
                if (field) {
                    if (field.type === 'checkbox') {
                        field.checked = !!value;
                    } else {
                        // Handle sensitive fields
                        if (field.dataset.sensitive === 'true' && value) {
                            field.value = TOKENMASK;
                            field.setAttribute('data-has-saved-token', 'true');
                            field.placeholder = 'Saved token hidden - focus to enter new token';
                        } else {
                            field.value = value || '';
                        }
                    }
                }
            });
        });
    }
}
