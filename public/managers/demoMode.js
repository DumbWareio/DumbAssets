/**
 * Demo Mode Manager
 * Handles frontend restrictions when demo mode is active
 */

export class DemoModeManager {
    constructor() {
        this.demoMode = window.appConfig?.demoMode || false;
        this.disabledElements = new Set();
        this.originalHandlers = new Map();
        
        if (this.demoMode) {
            this.initDemoMode();
        }
    }

    /**
     * Initialize demo mode restrictions
     */
    initDemoMode() {
        console.log('[Demo Mode] Initializing read-only mode');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.applyRestrictions());
        } else {
            this.applyRestrictions();
        }
        
        // Also apply restrictions when new elements are added
        this.observeDOM();
    }

    /**
     * Observe DOM changes to apply restrictions to dynamically added elements
     */
    observeDOM() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.applyRestrictionsToElement(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Apply restrictions to a specific element and its children
     */
    applyRestrictionsToElement(element) {
        // Check if element itself is a modifying button
        if (this.isModifyingElement(element)) {
            this.disableElement(element);
        }

        // Check children
        const modifyingElements = element.querySelectorAll(
            'button.save-btn, button.delete-btn, button.edit-btn, ' +
            'button.action-button, input[type="file"], .file-upload-box, ' +
            '#addAssetBtn, #importAssetsBtn, #addSubAssetBtn, #saveSettings, ' +
            '#testNotificationSettings, #startImportBtn, #downloadTemplateBtn, ' +
            '#addSecondaryWarranty, #addMaintenanceEvent, #addSubAssetMaintenanceEvent'
        );

        modifyingElements.forEach(el => this.disableElement(el));
    }

    /**
     * Check if an element is a modifying element
     */
    isModifyingElement(element) {
        if (!element.tagName) return false;

        const modifyingClasses = ['save-btn', 'delete-btn', 'edit-btn', 'action-button'];
        const modifyingIds = [
            'addAssetBtn', 'importAssetsBtn', 'addSubAssetBtn', 'saveSettings', 
            'testNotificationSettings', 'startImportBtn', 'downloadTemplateBtn',
            'addSecondaryWarranty', 'addMaintenanceEvent', 'addSubAssetMaintenanceEvent'
        ];

        return (
            modifyingClasses.some(cls => element.classList.contains(cls)) ||
            modifyingIds.includes(element.id) ||
            element.type === 'file' ||
            element.classList.contains('file-upload-box')
        );
    }

    /**
     * Apply all demo mode restrictions
     */
    applyRestrictions() {
        this.disableModifyingButtons();
        this.disableFileUploads();
        this.disableForms();
        this.interceptFormSubmissions();
        this.addDemoModeIndicator();
        this.showDemoModeToast();
    }

    /**
     * Disable all buttons that modify data
     */
    disableModifyingButtons() {
        const modifyingButtons = [
            '#addAssetBtn',
            '#importAssetsBtn',
            '#addSubAssetBtn',
            '#saveSettings',
            '#testNotificationSettings',
            '#startImportBtn',
            '#downloadTemplateBtn',
            '#addSecondaryWarranty',
            '#addMaintenanceEvent',
            '#addSubAssetMaintenanceEvent',
            '.save-btn',
            '.delete-btn',
            '.edit-btn',
            '.action-button'
        ];

        modifyingButtons.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => this.disableElement(element));
        });

        // Disable dynamically created buttons (use event delegation)
        this.interceptButtonClicks();
    }

    /**
     * Disable all file upload inputs and drag-and-drop areas
     */
    disableFileUploads() {
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => this.disableElement(input));

        const uploadBoxes = document.querySelectorAll('.file-upload-box');
        uploadBoxes.forEach(box => {
            this.disableElement(box);
            box.setAttribute('data-demo-disabled', 'true');
        });
    }

    /**
     * Disable form submissions
     */
    disableForms() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const originalHandler = form.onsubmit;
            this.originalHandlers.set(form, originalHandler);
            
            form.onsubmit = (e) => {
                e.preventDefault();
                this.showDemoModeMessage();
                return false;
            };
        });
    }

    /**
     * Intercept form submissions using event listeners
     */
    interceptFormSubmissions() {
        document.addEventListener('submit', (e) => {
            if (this.demoMode) {
                e.preventDefault();
                e.stopPropagation();
                this.showDemoModeMessage();
                return false;
            }
        }, true);
    }

    /**
     * Intercept button clicks for dynamically created elements
     */
    interceptButtonClicks() {
        document.addEventListener('click', (e) => {
            if (!this.demoMode) return;

            const target = e.target.closest('button, .btn, .action-button, .file-upload-box');
            if (!target) return;

            // Allow certain buttons (like theme toggle, navigation, etc.)
            const allowedButtons = [
                'themeToggle', 'homeBtn', 'settingsBtn', 'sidebarToggle',
                'sidebarOpen', 'sidebarClose', 'clearSearchBtn'
            ];

            if (allowedButtons.includes(target.id)) {
                return; // Allow these buttons to work normally
            }

            // Check if it's a modifying button or element
            if (this.isModifyingElement(target) || target.closest('form')) {
                e.preventDefault();
                e.stopPropagation();
                this.showDemoModeMessage();
                return false;
            }
        }, true);
    }

    /**
     * Disable a specific element
     */
    disableElement(element) {
        if (!element) return;

        element.disabled = true;
        element.style.opacity = '0.6';
        element.style.cursor = 'not-allowed';
        element.title = 'Disabled in demo mode';
        element.setAttribute('data-demo-disabled', 'true');
        
        this.disabledElements.add(element);
    }

    /**
     * Add visual indicator that demo mode is active
     */
    addDemoModeIndicator() {
        // Add demo mode badge to header
        const header = document.querySelector('.header-title h1');
        if (header && !header.querySelector('.demo-badge')) {
            const badge = document.createElement('span');
            badge.className = 'demo-badge';
            badge.textContent = 'DEMO';
            header.appendChild(badge);
        }

        // Add demo mode banner at the very top
        if (!document.querySelector('.demo-banner')) {
            const banner = document.createElement('div');
            banner.className = 'demo-banner';
            banner.innerHTML = `
                <span>🔒 Demo Mode Active - This is a read-only demonstration</span>
            `;
            document.body.insertBefore(banner, document.body.firstChild);
        }
    }

    /**
     * Show demo mode message
     */
    showDemoModeMessage() {
        // Use existing toast system if available
        if (window.showToast) {
            window.showToast('Demo Mode: Modifying operations are disabled in this demonstration', 'warning');
        } else {
            alert('Demo Mode: Modifying operations are disabled in this demonstration');
        }
    }

    /**
     * Show initial demo mode toast
     */
    showDemoModeToast() {
        setTimeout(() => {
            if (window.showToast) {
                window.showToast('Welcome to Demo Mode! This is a read-only demonstration.', 'info');
            }
        }, 1000);
    }

    /**
     * Check if demo mode is active
     */
    isDemoMode() {
        return this.demoMode;
    }

    /**
     * Restore original functionality (for testing purposes)
     */
    restore() {
        this.disabledElements.forEach(element => {
            element.disabled = false;
            element.style.opacity = '';
            element.style.cursor = '';
            element.title = '';
            element.removeAttribute('data-demo-disabled');
        });

        this.originalHandlers.forEach((handler, form) => {
            form.onsubmit = handler;
        });

        const demoBadge = document.querySelector('.demo-badge');
        if (demoBadge) demoBadge.remove();

        const demoBanner = document.querySelector('.demo-banner');
        if (demoBanner) demoBanner.remove();

        this.disabledElements.clear();
        this.originalHandlers.clear();
    }
}

// Auto-initialize if demo mode is active
let demoModeManager = null;
if (window.appConfig?.demoMode) {
    demoModeManager = new DemoModeManager();
}

// Export for manual initialization if needed
export { demoModeManager }; 