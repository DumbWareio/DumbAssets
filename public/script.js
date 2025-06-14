/**
 * DumbAssets - Asset Tracking Application
 * Main JavaScript file handling application logic
 */

// Debug mode flag - set to true to enable debug logging
const DEBUG = window.appConfig?.debug || false;

// Global handlers for error logging, response validation, toaster, and getApiBaseUrl
import { GlobalHandlers } from './managers/globalHandlers.js';
new GlobalHandlers();

// Import file upload module
import { initializeFileUploads, handleFileUploads } from '/src/services/fileUpload/index.js';
import { formatFileSize } from '/src/services/fileUpload/utils.js';
// Import asset renderer module
import { 
    initRenderer, 
    updateState, 
    updateSelectedIds, 
    renderAssetDetails,
    formatFilePath,
    // Import list renderer functions
    initListRenderer,
    updateListState,
    updateDashboardFilter as updateListDashboardFilter,
    updateSort,
    renderAssetList,
    sortAssets,
    // Import file preview renderer
    setupFilePreview,
    setupExistingFilePreview
} from '/src/services/render/index.js';
import { ChartManager } from '/managers/charts.js';
import { registerServiceWorker } from './helpers/serviceWorkerHelper.js';
import {     
    initCollapsibleSections, 
    expandSection,
    collapseSection
} from './js/collapsible.js';
import { SettingsManager } from './managers/settings.js';
import { generateId, formatDate, formatCurrency } from './helpers/utils.js';
import { ImportManager } from './managers/import.js';
import { MaintenanceManager } from './managers/maintenanceManager.js';
import { ModalManager } from './managers/modalManager.js';
import { DashboardManager } from './managers/dashboardManager.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize variables for app state
    let assets = [];
    let subAssets = [];
    let selectedAssetId = null;
    let selectedSubAssetId = null;
    let dashboardFilter = 'all';
    let currentSort = { field: 'updatedAt', direction: 'desc' };

    // Local function to update dashboard filter and keep modules in sync
    function updateDashboardFilter(filter) {
        dashboardFilter = filter || 'all';
        updateListDashboardFilter(filter);
    }

    // DOM Elements
    const siteTitleElem = document.getElementById('siteTitle');
    const pageTitleElem = document.getElementById('pageTitle');
    const assetModal = document.getElementById('assetModal');
    const assetForm = document.getElementById('assetForm');
    const subAssetModal = document.getElementById('subAssetModal');
    const subAssetForm = document.getElementById('subAssetForm');
    const assetList = document.getElementById('assetList');
    const assetDetails = document.getElementById('assetDetails');
    const subAssetContainer = document.getElementById('subAssetContainer');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const subAssetList = document.getElementById('subAssetList');
    const addAssetBtn = document.getElementById('addAssetBtn');
    const addSubAssetBtn = document.getElementById('addSubAssetBtn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarOpenBtn = document.getElementById('sidebarOpen');
    const sidebarCloseBtn = document.getElementById('sidebarClose');
    const mainContent = document.querySelector('.main-content');
    const sortNameBtn = document.getElementById('sortNameBtn');
    const sortWarrantyBtn = document.getElementById('sortWarrantyBtn');
    const topSortBtn = document.getElementById('topSortBtn');
    const homeBtn = document.getElementById('homeBtn');

    // Import functionality
    const importModal = document.getElementById('importModal');
    const importBtn = document.getElementById('importAssetsBtn');
    const importFile = document.getElementById('importFile');
    const startImportBtn = document.getElementById('startImportBtn');
    const columnSelects = document.querySelectorAll('.column-select');

    // Settings UI
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const notificationForm = document.getElementById('notificationForm');
    const saveSettings = document.getElementById('saveSettings');
    const cancelSettings = document.getElementById('cancelSettings');
    const settingsClose = settingsModal ? settingsModal.querySelector('.close-btn') : null;
    const testNotificationSettings = document.getElementById('testNotificationSettings');
    const toggleCardTotalAssets = document.getElementById('toggleCardTotalAssets')
    const toggleCardTotalComponents = document.getElementById('toggleCardTotalComponents')
    const toggleCardTotalValue = document.getElementById('toggleCardTotalValue')
    const toggleCardWarrantiesTotal = document.getElementById('toggleCardWarrantiesTotal')
    const toggleCardWarrantiesWithin60 = document.getElementById('toggleCardWarrantiesWithin60')
    const toggleCardWarrantiesWithin30 = document.getElementById('toggleCardWarrantiesWithin30')
    const toggleCardWarrantiesExpired = document.getElementById('toggleCardWarrantiesExpired')
    const toggleCardWarrantiesActive = document.getElementById('toggleCardWarrantiesActive')

    let settingsManager;
    let modalManager;
    let dashboardManager;
    const chartManager = new ChartManager({formatDate});

    // Acts as constructor for the app
    // will be called at the very end of the file
    function initialize() {
        // Display demo banner if in demo mode
        if (window.appConfig?.demoMode) {
            document.getElementById('demo-banner').style.display = 'block';
        }

        addWindowEventListenersAndProperties();
        // initialize page title right away
        setupPageTitle();
        // Load initial data
        loadAllData().then(() => {
            // Initialize dashboard manager first
            dashboardManager = new DashboardManager({
                // DOM elements
                assetDetails,
                subAssetContainer,
                searchInput,
                clearFiltersBtn,

                // Utility functions
                formatDate,
                formatCurrency,
                
                // Managers
                chartManager,
                settingsManager,
                
                // UI functions
                updateDashboardFilter,
                updateSort,
                updateSelectedIds,
                renderAssetDetails,
                renderAssetList,
                handleSidebarNav,
                setButtonLoading,
                
                // Global state getters
                getAssets: () => assets,
                getSubAssets: () => subAssets,
                getDashboardFilter: () => dashboardFilter,
                getCurrentSort: () => currentSort,
                getSelectedAssetId: () => selectedAssetId
            });
            
            // Expose dashboardManager to global scope for chart access
            window.dashboardManager = dashboardManager;
            
            // After data is loaded, check for URL parameters
            if (!handleUrlParameters()) {
                // No URL parameters, show empty state as normal
                dashboardManager.renderDashboard();
            }
        });

        // Set up file upload functionality
        initializeFileUploads();
        
        // Initialize collapsible sections
        initCollapsibleSections();
        
        // Initialize the asset renderer module
        initRenderer({
            // Utility functions
            formatDate,
            formatCurrency,
            
            // Module functions
            openAssetModal: (asset) => modalManager.openAssetModal(asset),
            openSubAssetModal: (subAsset = null, parentId = null, parentSubId = null) => modalManager.openSubAssetModal(subAsset, parentId, parentSubId),
            deleteAsset,
            deleteSubAsset,
            createSubAssetElement,
            handleSidebarNav,
            renderSubAssets,
            
            // Search functionality
            searchInput,
            renderAssetList,
            
            // Global state
            assets,
            subAssets,
            
            // DOM elements
            assetList,
            assetDetails,
            subAssetContainer
        });
        
        // Initialize the list renderer module
        initListRenderer({
            // Module functions
            updateSelectedIds,
            renderAssetDetails,
            handleSidebarNav,
            formatDate,
            formatCurrency,
            
            // Global state
            assets,
            subAssets,
            selectedAssetId,
            dashboardFilter,
            currentSort,
            searchInput,
            
            // DOM elements
            assetList
        });
        
        const maintenanceManager = new MaintenanceManager();
        const assetTagManager = setupTagInput('assetTags', 'assetTagsContainer');
        const subAssetTagManager = setupTagInput('subAssetTags', 'subAssetTagsContainer');

        modalManager = new ModalManager({
            // DOM elements
            assetModal,
            assetForm,
            subAssetModal,
            subAssetForm,
            
            // Utility functions
            formatDate,
            formatCurrency,
            formatFileSize,
            generateId,
            
            // File handling
            handleFileUploads,
            setupFilePreview,
            setupExistingFilePreview,
            formatFilePath,
            
            // UI functions
            setButtonLoading,
            expandSection,
            collapseSection,
            
            // Data functions
            saveAsset,
            saveSubAsset,
            
            // Tag and maintenance managers
            assetTagManager,
            subAssetTagManager,
            maintenanceManager,
            
            // Global state
            getAssets: () => assets,
            getSubAssets: () => subAssets
        });

        // Initialize SettingsManager after DashboardManager is ready
        if (settingsBtn && settingsModal && notificationForm && saveSettings && cancelSettings && settingsClose && testNotificationSettings) {
            settingsManager = new SettingsManager({
                settingsBtn,
                settingsModal,
                notificationForm,
                saveSettings,
                cancelSettings,
                settingsClose,
                testNotificationSettings,
                setButtonLoading,
                renderDashboard: (animate = true) => dashboardManager.renderDashboard(animate),
            });
        }

        if (importModal && importBtn && importFile && startImportBtn) {
            const importManager = new ImportManager({
                importModal,
                importBtn,
                importFile,
                startImportBtn,
                columnSelects,
                setButtonLoading,
                loadAssets,
                renderDashboard: (animate = true) => dashboardManager.renderDashboard(animate),
            });
        }

        addElementEventListeners();
        setupDragIcons();
        addShortcutEventListeners();

        registerServiceWorker();
    }
    // Initialize the application
    try { // Global try-catch to catch any initialization errors
        initialize();
    } catch (err) {
        globalThis.logError('Failed to initialize application. Please check the console for details.', err);
    }

    function addWindowEventListenersAndProperties() {
        // Keep window references for backward compatibility with existing save functions
        globalThis.deletePhoto = false;
        globalThis.deleteReceipt = false;
        globalThis.deleteManual = false;
        globalThis.deleteSubPhoto = false;
        globalThis.deleteSubReceipt = false;
        globalThis.deleteSubManual = false;
        globalThis.renderCardVisibilityToggles = renderCardVisibilityToggles;

        // Handle window resize events to update sidebar overlay
        globalThis.addEventListener('resize', () => {
            // If we're now in desktop mode but overlay is visible, hide it
            if (globalThis.innerWidth > 853 && sidebarOverlay) {
                sidebarOverlay.style.display = 'none';
                sidebarOverlay.style.opacity = '0';
                sidebarOverlay.style.pointerEvents = 'none';
            }
            // If we're now in mobile mode with sidebar open, show overlay
            else if (globalThis.innerWidth <= 853 && sidebar && sidebar.classList.contains('open') && sidebarOverlay) {
                sidebarOverlay.style.display = 'block';
                sidebarOverlay.style.opacity = '1';
                sidebarOverlay.style.pointerEvents = 'auto';
            }
        });
    }

    // Button loading state handler
    function setButtonLoading(button, loading) {
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    // Data Functions
    async function loadAssets() {
        try {
            const apiBaseUrl = globalThis.getApiBaseUrl();
            const response = await fetch(`${apiBaseUrl}/api/assets`, {
                credentials: 'include'
            });
            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) throw new Error(responseValidation.errorMessage);
            assets = await response.json();
            // Update asset list in the modules
            updateState(assets, subAssets);
            updateListState(assets, subAssets, selectedAssetId);
            renderAssetList();
        } catch (error) {
            globalThis.logError('Error loading assets:', error.message);
            assets = [];
            updateState(assets, subAssets);
            updateListState(assets, subAssets, selectedAssetId);
            renderAssetList();
        }
    }

    async function loadSubAssets() {
        try {
            const apiBaseUrl = globalThis.getApiBaseUrl();
            const response = await fetch(`${apiBaseUrl}/api/subassets`, {
                credentials: 'include'
            });
            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) throw new Error(responseValidation.errorMessage);

            subAssets = await response.json();
            updateState(assets, subAssets);
            updateListState(assets, subAssets, selectedAssetId);
        } catch (error) {
            globalThis.logError('Error loading sub-assets:', error.message);
            subAssets = [];
            updateState(assets, subAssets);
            updateListState(assets, subAssets, selectedAssetId);
        }
    }

    // Load both assets and sub-assets
    async function loadAllData() {
        await Promise.all([loadAssets(), loadSubAssets()]);
    }

    // Also add a dedicated refresh function to reload data without resetting the UI
    async function refreshAllData() {
        try {
            const loadPromises = [loadAssets(), loadSubAssets()];
            await Promise.all(loadPromises);
            return true;
        } catch (error) {
            globalThis.logError('Error refreshing data:', error.message);
            return false;
        }
    }

    // Expose refreshAllData to window for ModalManager access
    window.refreshAllData = refreshAllData;

    async function saveAsset(asset) {
        const saveBtn = assetForm.querySelector('.save-btn');
        
        try {
            setButtonLoading(saveBtn, true);
            const apiBaseUrl = globalThis.getApiBaseUrl();
            // Get the actual edit mode from the modal manager instead of just checking for ID
            const isEditMode = modalManager ? modalManager.isEditMode : false;

            // Create a copy to avoid mutation issues
            const assetToSave = { ...asset };
            
            console.log('Starting saveAsset with data:', {
                id: assetToSave.id,
                name: assetToSave.name,
                photoPath: assetToSave.photoPath,
                receiptPath: assetToSave.receiptPath,
                manualPath: assetToSave.manualPath
            });
            console.log('Edit mode determined as:', isEditMode);
            
            
            console.log('After handling deletions, asset state:', {
                photoPath: assetToSave.photoPath,
                receiptPath: assetToSave.receiptPath,
                manualPath: assetToSave.manualPath
            });
            
            // Make the API call to save the asset
            const url = isEditMode ? `${apiBaseUrl}/api/assets/${assetToSave.id}` : `${apiBaseUrl}/api/asset`;
            const response = await fetch(url, {
                method: isEditMode ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(assetToSave),
                credentials: 'include'
            });
            
            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) throw new Error(responseValidation.errorMessage);
            
            // Get the saved asset from the response
            const savedAsset = await response.json();
            console.log('Asset saved successfully. Response data:', {
                id: savedAsset.id,
                name: savedAsset.name,
                photoPath: savedAsset.photoPath,
                receiptPath: savedAsset.receiptPath,
                manualPath: savedAsset.manualPath
            });
            
            // Reload all data to ensure everything is updated
            await refreshAllData();
            
            // Close the modal
            modalManager.closeAssetModal();
            
            // Reset delete flags both locally and on window
            deletePhoto = window.deletePhoto = false;
            deleteReceipt = window.deleteReceipt = false;
            deleteManual = window.deleteManual = false;
            
            // Always explicitly render the asset details if it's the current selection
            // or if this is a new asset that should be selected
            if (selectedAssetId === assetToSave.id || !selectedAssetId) {
                selectedAssetId = savedAsset.id;
                
                // Force a refresh of the asset from the server data
                const refreshedAsset = assets.find(a => a.id === savedAsset.id);
                if (refreshedAsset) {
                    console.log('Refreshing asset display with data:', {
                        photoPath: refreshedAsset.photoPath,
                        receiptPath: refreshedAsset.receiptPath,
                        manualPath: refreshedAsset.manualPath
                    });
                }
                
                refreshAssetDetails(savedAsset.id, false);
            }
            
            // Show success message
            globalThis.toaster.show(isEditMode ? "Asset updated successfully!" : "Asset added successfully!");
            setButtonLoading(saveBtn, false);
        } catch (error) {
            globalThis.logError('Error saving asset:', error.message);
        } finally {
            setButtonLoading(saveBtn, false);
        }
    }

    async function saveSubAsset(subAsset) {
        const saveBtn = subAssetForm.querySelector('.save-btn');
        
        try {
            setButtonLoading(saveBtn, true);
            const apiBaseUrl = globalThis.getApiBaseUrl();
            // Get the actual edit mode from the modal manager instead of just checking for ID
            const isEditMode = modalManager ? modalManager.isEditMode : false;
            
            // Debug logging to see what we're sending
            console.log('Saving sub-asset with data:', JSON.stringify(subAsset, null, 2));
            console.log('Edit mode determined as:', isEditMode);
            
            // Check for required fields that server expects
            if (!subAsset.id) {
                console.error('Missing required field: id');
            }
            if (!subAsset.name) {
                console.error('Missing required field: name');
            }
            if (!subAsset.parentId) {
                console.error('Missing required field: parentId');
            }
            // Ensure we're sending the required fields
            if (!subAsset.id || !subAsset.name || !subAsset.parentId) {
                throw new Error('Missing required fields for sub-asset. Check the console for details.');
            }
            
            const url = isEditMode ? `${apiBaseUrl}/api/subassets/${subAsset.id}` : `${apiBaseUrl}/api/subasset`;
            const response = await fetch(url, {
                method: isEditMode ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(subAsset),
                credentials: 'include'
            });
            
            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) throw new Error(responseValidation.errorMessage);
            
            // Get the updated sub-asset from the response
            const savedSubAsset = await response.json();
            console.log('Server response with updated sub-asset:', savedSubAsset);
            
            // Reload all data to ensure everything is updated
            await refreshAllData();
            
            // Close the modal
            modalManager.closeSubAssetModal();
            
            // Determine which view to render after saving
            if (subAsset.parentSubId) {
                // If this is a sub-sub-asset, go to the parent sub-asset view
                refreshAssetDetails(subAsset.parentSubId, true);
            } else if (selectedSubAssetId === subAsset.id) {
                // If we're editing the currently viewed sub-asset
                refreshAssetDetails(subAsset.id, true);
            } else {
                // Navigate based on the saved component's context
                await handleComponentNavigation({ id: savedSubAsset.id, parentId: savedSubAsset.parentId, parentSubId: savedSubAsset.parentSubId }, true);
            }
            
            // Show success message
            globalThis.toaster.show(isEditMode ? "Component updated successfully!" : "Component added successfully!");
            setButtonLoading(saveBtn, false);
        } catch (error) {
            globalThis.logError('Error saving component:', error.message);
        } finally {
            setButtonLoading(saveBtn, false);
        }
    }

    async function deleteAsset(assetId) {
        if (!confirm('Are you sure you want to delete this asset? This will also delete all its components.')) {
            return;
        }
        
        try {
            const apiBaseUrl = globalThis.getApiBaseUrl();
            const response = await fetch(`${apiBaseUrl}/api/asset/${assetId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) throw new Error(responseValidation.errorMessage);

            updateSelectedIds(null, null);
            await refreshAllData();
            dashboardManager.renderDashboard();
            globalThis.toaster.show("Asset deleted successfully!");
        } catch (error) {
            globalThis.logError('Error deleting asset:', error.message);
        }
    }

    async function deleteSubAsset(subAssetId) {
        if (!confirm('Are you sure you want to delete this component? This will also delete any sub-components.')) {
            return;
        }
        
        try {
            const apiBaseUrl = globalThis.getApiBaseUrl();
            
            // Find the sub-asset and its parent info before deleting
            const subAsset = subAssets.find(s => s.id === subAssetId);
            if (!subAsset) {
                throw new Error('Sub-asset not found');
            }
            
            // Store parent info for later
            const parentAssetId = subAsset.parentId;
            const parentSubId = subAsset.parentSubId;

            const response = await fetch(`${apiBaseUrl}/api/subasset/${subAssetId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) throw new Error(responseValidation.errorMessage);

            // Refresh all data first to ensure we have the latest state
            await refreshAllData();

            // Handle navigation and refresh views based on deleted component's context
            await handleComponentNavigation({ id: subAssetId, parentId: parentAssetId, parentSubId }, true);

            // If viewing the parent sub-asset or asset, refresh the current view
            if (selectedSubAssetId === parentSubId) {
                await refreshAssetDetails(parentSubId, true);
            } else if (selectedAssetId === parentAssetId && !selectedSubAssetId) {
                await refreshAssetDetails(parentAssetId, false);
            }
            
            globalThis.toaster.show("Component deleted successfully!");
        } catch (error) {
            globalThis.logError('Error deleting component:', error.message);
        }
    }

    // Utility function to handle component navigation and rendering logic
    async function handleComponentNavigation(component, isDeleted = false) {
        const parentAssetId = component.parentId;
        const parentSubId = component.parentSubId;

        // Case 1: If the component was being viewed when deleted
        // Or if it's a new/updated component and we want to show it
        if (!isDeleted && (component.id === selectedSubAssetId || !parentSubId)) {
            updateSelectedIds(parentAssetId, component.id);
            await refreshAssetDetails(component.id, true);
            return;
        }

        // Case 2: Navigate to parent sub-asset if this was a sub-sub-asset
        if (parentSubId) {
            updateSelectedIds(parentAssetId, parentSubId);
            await refreshAssetDetails(parentSubId, true);
            return;
        }

        // Case 3: Navigate to parent asset
        updateSelectedIds(parentAssetId, null);
        await refreshAssetDetails(parentAssetId, false);
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('open');
        if (sidebarCloseBtn) sidebarCloseBtn.style.display = 'none';
        if (sidebarOpenBtn) sidebarOpenBtn.style.display = 'block';
        if (sidebarToggle) sidebarToggle.style.display = 'block';
        document.querySelector('.app-container').classList.remove('sidebar-active');
        
        // Hide overlay directly with JavaScript for cross-browser compatibility
        if (sidebarOverlay) {
            sidebarOverlay.style.display = 'none';
            sidebarOverlay.style.opacity = '0';
            sidebarOverlay.style.pointerEvents = 'none';
        }
    }

    function openSidebar() {
        if (sidebar) sidebar.classList.add('open');
        if (sidebarCloseBtn) sidebarCloseBtn.style.display = 'block';
        if (sidebarOpenBtn) sidebarOpenBtn.style.display = 'none';
        document.querySelector('.app-container').classList.add('sidebar-active');
        
        // Show overlay directly with JavaScript for cross-browser compatibility
        // Only in mobile view (width <= 853px)
        if (sidebarOverlay && window.innerWidth <= 853) {
            sidebarOverlay.style.display = 'block';
            sidebarOverlay.style.opacity = '1';
            sidebarOverlay.style.pointerEvents = 'auto';
        }
    }

    function handleSidebarNav() {
        if (window.innerWidth <= 853) closeSidebar();
    }

    // Sorting Functions
    function updateSortButtons(activeButton) {
        // Remove active class from all buttons
        document.querySelectorAll('.sort-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Set active button and update its direction
        if (activeButton) {
            activeButton.classList.add('active');
            const direction = activeButton.getAttribute('data-direction');
            const sortIcon = activeButton.querySelector('.sort-icon');
            if (sortIcon) {
                sortIcon.style.transform = direction === 'desc' ? 'rotate(180deg)' : '';
            }
        }
    }

    function renderSubAssets(parentAssetId) {
        if (!subAssetContainer || !subAssetList) return;
        
        // Get sub-assets for this parent
        const parentSubAssets = subAssets.filter(sa => sa.parentId === parentAssetId && !sa.parentSubId);
        
        
        // Render the sub-asset header (the + Add Component button)
        const subAssetHeader = subAssetContainer.querySelector('.sub-asset-header');
        if (subAssetHeader) {
            subAssetHeader.innerHTML = `
            <button id="addSubAssetBtn" class="add-sub-asset-btn">+ Add Component</button>
            `;
            const addSubAssetBtn = subAssetHeader.querySelector('#addSubAssetBtn');
            if (addSubAssetBtn) {
                addSubAssetBtn.onclick = () => modalManager.openSubAssetModal(null, parentAssetId);
            }
        }
        
        // Render the sub-asset list
        if (parentSubAssets.length === 0) {
            subAssetList.innerHTML = `
            <div class="empty-state">
                <p>No components found. Add your first component.</p>
            </div>
            `;
        } else {
            subAssetList.innerHTML = '';
            parentSubAssets.forEach(subAsset => {
                const subAssetElement = createSubAssetElement(subAsset);
                subAssetList.appendChild(subAssetElement);
            });
        }
        
        // Show or hide the container
        subAssetContainer.classList.remove('hidden');
    }

    function createSubAssetElement(subAsset) {
        const element = document.createElement('div');
        element.className = 'sub-asset-item';
        if (subAsset.id === selectedSubAssetId) {
            element.classList.add('active');
        }
        
        // Check warranty expiration
        let warrantyDot = '';
        if (subAsset.warranty && subAsset.warranty.expirationDate) {
            const expDate = new Date(formatDate(subAsset.warranty.expirationDate));
            const now = new Date();
            const diff = (expDate - now) / (1000 * 60 * 60 * 24); // difference in days
            
            if (diff < 0) {
                // Warranty has expired
                warrantyDot = `<div class="warranty-expired-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                </div>`;
            } else if (diff >= 0 && diff <= 30) {
                warrantyDot = '<div class="warranty-expiring-dot"></div>';
            } else if (diff > 30 && diff <= 60) {
                warrantyDot = '<div class="warranty-warning-dot"></div>';
            }
        }
        
        // Create header with name and actions
        const details = document.createElement('div');
        details.className = 'sub-asset-details';
        details.innerHTML = `
            ${warrantyDot}
            <div class="sub-asset-title">${subAsset.name}</div>
            <div class="sub-asset-actions">
                <button class="edit-sub-btn" data-id="${subAsset.id}" title="Edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/></svg>
                </button>
                <button class="delete-sub-btn" data-id="${subAsset.id}" title="Delete">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </div>
        `;
        
        // Set up button event listeners
        const editBtn = details.querySelector('.edit-sub-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            modalManager.openSubAssetModal(subAsset);
        });
        
        const deleteBtn = details.querySelector('.delete-sub-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSubAsset(subAsset.id);
        });
        
        element.appendChild(details);
        
        // Add summary info
        const info = document.createElement('div');
        info.className = 'sub-asset-info';
        
        // Create model/serial info and tags section
        info.innerHTML = `
            <div>
                ${subAsset.modelNumber ? `<span>${subAsset.modelNumber}</span>` : ''}
                ${subAsset.serialNumber ? `<span>#${subAsset.serialNumber}</span>` : ''}
            </div>
            ${subAsset.tags && subAsset.tags.length > 0 ? `
            <div class="tag-list">
                ${subAsset.tags.map(tag => `<span class="tag" data-tag="${tag}">${tag}</span>`).join('')}
            </div>`: ''}
        `;
        
        element.appendChild(info);
        
        // Add click event listeners to tags
        const tagElements = info.querySelectorAll('.tag');
        tagElements.forEach(tagElement => {
            tagElement.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent sub-asset click
                const tagName = tagElement.dataset.tag;
                
                // Set the search input value to the tag name
                if (searchInput) {
                    searchInput.value = tagName;
                    
                    // Show the clear search button
                    const clearSearchBtn = document.getElementById('clearSearchBtn');
                    if (clearSearchBtn) {
                        clearSearchBtn.style.display = 'flex';
                    }
                    
                    // Trigger the search by calling renderAssetList with the tag
                    renderAssetList(tagName);
                    
                    // Focus the search input
                    searchInput.focus();
                }
            });
            
            // Add cursor pointer style to make it clear tags are clickable
            tagElement.style.cursor = 'pointer';
        });
        
        // Add file previews
        const filePreviewsContainer = document.createElement('div');
        filePreviewsContainer.className = 'sub-asset-files';
        
        // Add file previews if available
        if (subAsset.photoPath || subAsset.receiptPath || subAsset.manualPath) {
            const files = document.createElement('div');
            files.className = 'compact-files-grid';
            
            if (subAsset.photoPath) {
                files.innerHTML += `
                    <div class="compact-file-item photo">
                        <a href="${formatFilePath(subAsset.photoPath)}" target="_blank">
                            <img src="${formatFilePath(subAsset.photoPath)}" alt="${subAsset.name}" class="compact-asset-image">
                        </a>
                    </div>
                `;
            }
            
            if (subAsset.receiptPath) {
                files.innerHTML += `
                    <div class="compact-file-item receipt">
                        <a href="${formatFilePath(subAsset.receiptPath)}" target="_blank">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2"/>
                                <path d="M14 8h-8"/>
                                <path d="M15 12h-9"/>
                                <path d="M15 16h-9"/>
                            </svg>
                        </a>
                    </div>
                `;
            }
            
            if (subAsset.manualPath) {
                files.innerHTML += `
                    <div class="compact-file-item manual">
                        <a href="${formatFilePath(subAsset.manualPath)}" target="_blank">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <path d="M14 2v6h6"/>
                                <path d="M16 13H8"/>
                                <path d="M16 17H8"/>
                                <path d="M10 9H8"/>
                            </svg>
                        </a>
                    </div>
                `;
            }
            
            filePreviewsContainer.appendChild(files);
        }
        
        element.appendChild(filePreviewsContainer);
        
        // Check for children (only for first level sub-assets)
        if (!subAsset.parentSubId) {
            const children = subAssets.filter(sa => sa.parentSubId === subAsset.id);
            
            if (children.length > 0) {
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'sub-asset-children';
                
                children.forEach(child => {
                    const childElement = document.createElement('div');
                    childElement.className = 'sub-asset-item child';
                    
                    // Check warranty expiration for child
                    let childWarrantyDot = '';
                    if (child.warranty && child.warranty.expirationDate) {
                        const expDate = new Date(formatDate(child.warranty.expirationDate));
                        const now = new Date();
                        const diff = (expDate - now) / (1000 * 60 * 60 * 24);
                        
                        if (diff < 0) {
                            // Warranty has expired
                            childWarrantyDot = `<div class="warranty-expired-icon">
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="15" y1="9" x2="9" y2="15" />
                                    <line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                            </div>`;
                        } else if (diff >= 0 && diff <= 30) {
                            childWarrantyDot = '<div class="warranty-expiring-dot"></div>';
                        } else if (diff > 30 && diff <= 60) {
                            childWarrantyDot = '<div class="warranty-warning-dot"></div>';
                        }
                    }
                    
                    // Create child header
                    const childDetails = document.createElement('div');
                    childDetails.className = 'sub-asset-details';
                    childDetails.innerHTML = `
                        ${childWarrantyDot}
                        <div class="sub-asset-title">${child.name}</div>
                        <div class="sub-asset-actions">
                            <button class="edit-sub-btn" data-id="${child.id}" title="Edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/></svg>
                            </button>
                            <button class="delete-sub-btn" data-id="${child.id}" title="Delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            </button>
                        </div>
                    `;
                    childElement.appendChild(childDetails);
                    
                    // Add child info section with tags
                    const childInfo = document.createElement('div');
                    childInfo.className = 'sub-asset-info';
                    childInfo.innerHTML = `
                        <div>
                            ${child.modelNumber ? `<span>${child.modelNumber}</span>` : ''}
                            ${child.serialNumber ? `<span>#${child.serialNumber}</span>` : ''}
                        </div>
                        ${child.tags && child.tags.length > 0 ? `
                        <div class="tag-list">
                            ${child.tags.map(tag => `<span class="tag" data-tag="${tag}">${tag}</span>`).join('')}
                        </div>`: ''}
                    `;
                    childElement.appendChild(childInfo);
                    
                    // Add click event listeners to tags
                    const tagElements = childInfo.querySelectorAll('.tag');
                    tagElements.forEach(tagElement => {
                        tagElement.addEventListener('click', (e) => {
                            e.stopPropagation(); // Prevent sub-asset click
                            const tagName = tagElement.dataset.tag;
                            
                            // Set the search input value to the tag name
                            if (searchInput) {
                                searchInput.value = tagName;
                                
                                // Show the clear search button
                                const clearSearchBtn = document.getElementById('clearSearchBtn');
                                if (clearSearchBtn) {
                                    clearSearchBtn.style.display = 'flex';
                                }
                                
                                // Trigger the search by calling renderAssetList with the tag
                                renderAssetList(tagName);
                                
                                // Focus the search input
                                searchInput.focus();
                            }
                        });
                        
                        // Add cursor pointer style to make it clear tags are clickable
                        tagElement.style.cursor = 'pointer';
                    });
                    
                    // Add file previews container for the child
                    const childFilePreviewsContainer = document.createElement('div');
                    childFilePreviewsContainer.className = 'sub-asset-files';
                    
                    if (child.photoPath || child.receiptPath || child.manualPath) {
                        const childFiles = document.createElement('div');
                        childFiles.className = 'compact-files-grid';
                        
                        if (child.photoPath) {
                            childFiles.innerHTML += `
                                <div class="compact-file-item photo">
                                    <a href="${formatFilePath(child.photoPath)}" target="_blank">
                                        <img src="${formatFilePath(child.photoPath)}" alt="${child.name}" class="compact-asset-image">
                                    </a>
                                </div>
                            `;
                        }
                        
                        if (child.receiptPath) {
                            childFiles.innerHTML += `
                                <div class="compact-file-item receipt">
                                    <a href="${formatFilePath(child.receiptPath)}" target="_blank">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                            <path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2"/>
                                            <path d="M14 8h-8"/>
                                            <path d="M15 12h-9"/>
                                            <path d="M15 16h-9"/>
                                        </svg>
                                    </a>
                                </div>
                            `;
                        }
                        
                        if (child.manualPath) {
                            childFiles.innerHTML += `
                                <div class="compact-file-item manual">
                                    <a href="${formatFilePath(child.manualPath)}" target="_blank">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                            <path d="M14 2v6h6"/>
                                            <path d="M16 13H8"/>
                                            <path d="M16 17H8"/>
                                            <path d="M10 9H8"/>
                                        </svg>
                                    </a>
                                </div>
                            `;
                        }

                        childFilePreviewsContainer.appendChild(childFiles);
                    }
                    childElement.appendChild(childFilePreviewsContainer);
                    
                    // Add event listeners to child
                    const childEditBtn = childElement.querySelector('.edit-sub-btn');
                    childEditBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        modalManager.openSubAssetModal(child);
                    });
                    
                    const childDeleteBtn = childElement.querySelector('.delete-sub-btn');
                    childDeleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        deleteSubAsset(child.id);
                    });
                    
                    // Make sub-sub-asset clickable to show details
                    childElement.addEventListener('click', (e) => {
                        if (e.target.closest('button')) return;
                        e.stopPropagation();
                        updateSelectedIds(selectedAssetId, child.id);
                        renderAssetDetails(child.id, true);
                    });
                    
                    childrenContainer.appendChild(childElement);
                });
                
                element.appendChild(childrenContainer);
            }
        }
        
        // Make the component clickable to show details
        element.addEventListener('click', (e) => {
            // Prevent click if clicking on an action button
            if (e.target.closest('button')) return;
            e.stopPropagation();
            updateSelectedIds(selectedAssetId, subAsset.id);
            renderAssetDetails(subAsset.id, true);
        });
        
        return element;
    }

    // Add/enhance function to render asset details properly
    async function refreshAssetDetails(assetId, isSubAsset = false) {
        console.log(`Refreshing ${isSubAsset ? 'sub-asset' : 'asset'} details for ID: ${assetId}`);
        
        if (!assetId) {
            console.log('No ID provided for refresh');
            return;
        }
        
        // Ensure we have fresh data before proceeding
        const collection = isSubAsset ? subAssets : assets;
        const item = collection.find(a => a.id === assetId);
        
        if (!item) {
            console.error(`Could not find ${isSubAsset ? 'sub-asset' : 'asset'} with ID: ${assetId}`);
            // If item not found and we're refreshing a sub-asset, try to refresh the parent asset instead
            if (isSubAsset) {
                const parentAssetId = collection.find(a => a.id === assetId)?.parentId;
                if (parentAssetId) {
                    console.log('Falling back to parent asset view');
                    refreshAssetDetails(parentAssetId, false);
                    return;
                }
            }
            return;
        }
        
        // Log item details for debugging
        console.log(`Found ${isSubAsset ? 'sub-asset' : 'asset'} data:`, {
            id: item.id,
            name: item.name,
            photoPath: item.photoPath,
            receiptPath: item.receiptPath,
            manualPath: item.manualPath,
            updatedAt: item.updatedAt
        });
        
        // Ensure that any image paths are properly formatted
        if (item.photoPath) {
            console.log(`Original photo path: ${item.photoPath}`);
            const formattedPhotoPath = formatFilePath(item.photoPath);
            console.log(`Formatted photo path: ${formattedPhotoPath}`);
        } else {
            console.log(`No photo path found for asset ${item.id}`);
        }
        
        if (item.receiptPath) {
            console.log(`Original receipt path: ${item.receiptPath}`);
            const formattedReceiptPath = formatFilePath(item.receiptPath);
            console.log(`Formatted receipt path: ${formattedReceiptPath}`);
        }
        
        if (item.manualPath) {
            console.log(`Original manual path: ${item.manualPath}`);
            const formattedManualPath = formatFilePath(item.manualPath);
            console.log(`Formatted manual path: ${formattedManualPath}`);
        }
        
        // Add secondary warranty info if it exists
        let detailsHtml = '';
        if (item.secondaryWarranty) {
            detailsHtml += `
                <div class="info-item">
                    <div class="info-label">Secondary Warranty</div>
                    <div>${item.secondaryWarranty.scope || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Secondary Warranty Expiration</div>
                    <div>${formatDate(item.secondaryWarranty.expirationDate)}</div>
                </div>
            `;
        }
        
        // Render the details with a brief delay to ensure the DOM is ready
        // and any data changes are fully applied
        setTimeout(() => {
            console.log(`Rendering details for ${isSubAsset ? 'sub-asset' : 'asset'} ${item.id}`);
            renderAssetDetails(assetId, isSubAsset);
        }, 50);
    }

    function setupDragIcons() {
        // --- Inject SVG into .sortable-handle elements (Settings UI) ---
        const sortableHandleSVG = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M19 11v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2" />
                <path d="M13 13l9 3l-4 2l-2 4l-3 -9" />
                <path d="M3 3l0 .01" />
                <path d="M7 3l0 .01" />
                <path d="M11 3l0 .01" />
                <path d="M15 3l0 .01" />
                <path d="M3 7l0 .01" />
                <path d="M3 11l0 .01" />
                <path d="M3 15l0 .01" />
            </svg>
        `;
        document.querySelectorAll('.sortable-handle').forEach(handle => {
            handle.innerHTML = sortableHandleSVG;
        });
    }

    // Tag management functions
    function getAllExistingTags() {
        const allTags = new Set();
        
        // Collect tags from assets
        assets.forEach(asset => {
            if (asset.tags && Array.isArray(asset.tags)) {
                asset.tags.forEach(tag => allTags.add(tag));
            }
        });
        
        // Collect tags from sub-assets
        subAssets.forEach(subAsset => {
            if (subAsset.tags && Array.isArray(subAsset.tags)) {
                subAsset.tags.forEach(tag => allTags.add(tag));
            }
        });
        
        return Array.from(allTags).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    }

    function setupTagInput(inputId, containerId) {
        const tags = new Set();
        const input = document.getElementById(inputId);
        const container = document.getElementById(containerId);
        
        let autocompleteContainer = null;
        let currentSuggestions = [];
        let selectedSuggestionIndex = -1;

        function createAutocompleteContainer() {
            if (autocompleteContainer) {
                autocompleteContainer.remove();
            }
            
            autocompleteContainer = document.createElement('div');
            autocompleteContainer.className = 'tag-autocomplete';
            autocompleteContainer.style.display = 'none';
            autocompleteContainer.style.position = 'absolute';
            autocompleteContainer.style.zIndex = '1000';
            
            // Position the autocomplete container directly below the input
            const inputRect = input.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            
            autocompleteContainer.style.top = (inputRect.bottom + scrollTop) + 'px';
            autocompleteContainer.style.left = (inputRect.left + scrollLeft) + 'px';
            autocompleteContainer.style.width = inputRect.width + 'px';
            
            // Append to body for proper positioning
            document.body.appendChild(autocompleteContainer);
        }

        function showAutocomplete(suggestions) {
            if (!autocompleteContainer) {
                createAutocompleteContainer();
            }
            
            currentSuggestions = suggestions;
            selectedSuggestionIndex = -1;
            
            if (suggestions.length === 0) {
                hideAutocomplete();
                return;
            }
            
            // Update position before showing (in case input moved)
            const inputRect = input.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            
            autocompleteContainer.style.top = (inputRect.bottom + scrollTop) + 'px';
            autocompleteContainer.style.left = (inputRect.left + scrollLeft) + 'px';
            autocompleteContainer.style.width = inputRect.width + 'px';
            
            autocompleteContainer.innerHTML = suggestions.map((suggestion, index) => 
                `<div class="tag-suggestion" data-index="${index}">${suggestion}</div>`
            ).join('');
            
            autocompleteContainer.style.display = 'block';
            
            // Add click handlers to suggestions
            autocompleteContainer.querySelectorAll('.tag-suggestion').forEach((suggestionElement, index) => {
                suggestionElement.addEventListener('click', () => {
                    selectSuggestion(index);
                });
            });
        }

        function hideAutocomplete() {
            if (autocompleteContainer) {
                autocompleteContainer.style.display = 'none';
            }
            currentSuggestions = [];
            selectedSuggestionIndex = -1;
        }

        function updateSuggestionSelection() {
            if (!autocompleteContainer) return;
            
            autocompleteContainer.querySelectorAll('.tag-suggestion').forEach((el, index) => {
                el.classList.toggle('selected', index === selectedSuggestionIndex);
            });
        }

        function selectSuggestion(index) {
            if (index >= 0 && index < currentSuggestions.length) {
                const selectedTag = currentSuggestions[index];
                if (!tags.has(selectedTag)) {
                    tags.add(selectedTag);
                    input.value = '';
                    renderTags();
                    hideAutocomplete();
                }
            }
        }

        function getFilteredSuggestions(inputValue) {
            if (!inputValue.trim()) return [];
            
            const existingTags = getAllExistingTags();
            const inputLower = inputValue.toLowerCase();
            
            return existingTags.filter(tag => 
                tag.toLowerCase().startsWith(inputLower) && !tags.has(tag)
            ).slice(0, 8); // Limit to 8 suggestions
        }

        function renderTags() {
            if (!container) return;
            container.innerHTML = Array.from(tags).map(tag => `
                <span class="tag">
                    ${tag}
                    <button class="remove-tag" data-tag="${tag}" title="Remove tag">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </span>
            `).join('');

            // Add click handlers to remove buttons
            container.querySelectorAll('.remove-tag').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation(); // Prevent bubbling to parent elements
                    e.preventDefault();
                    const tagToRemove = btn.dataset.tag;
                    tags.delete(tagToRemove);
                    renderTags();
                };
            });
        }

        if (input) {
            // Create autocomplete container
            createAutocompleteContainer();
            
            // Handle input changes for autocomplete
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                
                // Handle comma input for tag separation
                if (value.endsWith(',')) {
                    e.preventDefault();
                    const tag = value.slice(0, -1).trim();
                    if (tag && !tags.has(tag)) {
                        tags.add(tag);
                        input.value = '';
                        renderTags();
                        hideAutocomplete();
                    }
                } else {
                    // Show autocomplete suggestions
                    const suggestions = getFilteredSuggestions(value);
                    showAutocomplete(suggestions);
                }
            });

            // Handle keyboard events
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // If there's a selected suggestion, use it
                    if (selectedSuggestionIndex >= 0 && currentSuggestions.length > 0) {
                        selectSuggestion(selectedSuggestionIndex);
                    } else {
                        // Otherwise, add the current input value
                        const tag = input.value.trim();
                        if (tag && !tags.has(tag)) {
                            tags.add(tag);
                            input.value = '';
                            renderTags();
                            hideAutocomplete();
                        }
                    }
                } else if (e.key === 'Tab') {
                    // Tab completion
                    if (currentSuggestions.length > 0) {
                        e.preventDefault();
                        const suggestionIndex = selectedSuggestionIndex >= 0 ? selectedSuggestionIndex : 0;
                        selectSuggestion(suggestionIndex);
                    }
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (currentSuggestions.length > 0) {
                        selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, currentSuggestions.length - 1);
                        updateSuggestionSelection();
                    }
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (currentSuggestions.length > 0) {
                        selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
                        updateSuggestionSelection();
                    }
                } else if (e.key === 'Escape') {
                    hideAutocomplete();
                }
            });

            // Handle mobile keyboard "Enter" button
            input.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // If there's a selected suggestion, use it
                    if (selectedSuggestionIndex >= 0 && currentSuggestions.length > 0) {
                        selectSuggestion(selectedSuggestionIndex);
                    } else {
                        // Otherwise, add the current input value
                        const tag = input.value.trim();
                        if (tag && !tags.has(tag)) {
                            tags.add(tag);
                            input.value = '';
                            renderTags();
                            hideAutocomplete();
                        }
                    }
                }
            });

            // Hide autocomplete when input loses focus (with a small delay)
            input.addEventListener('blur', () => {
                setTimeout(() => {
                    hideAutocomplete();
                }, 150); // Small delay to allow clicking on suggestions
            });

            // Show autocomplete when input gains focus (if there's content)
            input.addEventListener('focus', () => {
                if (input.value.trim()) {
                    const suggestions = getFilteredSuggestions(input.value);
                    showAutocomplete(suggestions);
                }
            });
        }

        return {
            getTags: () => Array.from(tags),
            setTags: (newTags) => {
                tags.clear();
                newTags.forEach(tag => tags.add(tag));
                renderTags();
            },
            addTag: (tag) => {
                tags.add(tag);
                renderTags();
            },
            removeTag: (tag) => {
                tags.delete(tag);
                renderTags();
            },
            clearTags: () => {
                tags.clear();
                renderTags();
            }
        };
    }

    // Add per-card visibility toggles in the settings modal (interface tab)
    // This should be called when rendering the settings modal tabs
    function renderCardVisibilityToggles(settings) {
        // Set initial state from settings
        const vis = (settings && settings.interfaceSettings && settings.interfaceSettings.cardVisibility) || {};
        toggleCardTotalAssets.checked = vis.assets !== false;
        toggleCardTotalComponents.checked = vis.components !== false;
        toggleCardTotalValue.checked = vis.value !== false;
        toggleCardWarrantiesTotal.checked = vis.warranties !== false;
        toggleCardWarrantiesWithin60.checked = vis.within60 !== false;
        toggleCardWarrantiesWithin30.checked = vis.within30 !== false;
        toggleCardWarrantiesExpired.checked = vis.expired !== false;
        toggleCardWarrantiesActive.checked = vis.active !== false;
    }

    // Add URL parameter handling for direct asset links
    function handleUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const assetId = urlParams.get('ass');
        const subAssetId = urlParams.get('sub');
        
        console.log('handleUrlParameters called - URL:', window.location.href);
        console.log('Parsed parameters - assetId:', assetId, 'subAssetId:', subAssetId);
        
        if (assetId) {
            console.log('URL parameter detected - navigating to asset:', assetId, subAssetId ? `sub-asset: ${subAssetId}` : '');
            
            // Check if the asset exists
            const targetAsset = assets.find(a => a.id === assetId);
            const targetSubAsset = subAssetId ? subAssets.find(sa => sa.id === subAssetId) : null;
            
            console.log('Found asset:', targetAsset ? targetAsset.name : 'NOT FOUND');
            if (subAssetId) {
                console.log('Found sub-asset:', targetSubAsset ? targetSubAsset.name : 'NOT FOUND');
            }
            
            if (!targetAsset) {
                console.error('Asset not found for ID:', assetId);
                globalThis.toaster?.show('Asset not found', 'error');
                return false;
            }
            
            if (subAssetId && !targetSubAsset) {
                console.error('Sub-asset not found for ID:', subAssetId);
                globalThis.toaster?.show('Component not found', 'error');
                return false;
            }
            
            // Clear URL parameters from browser history without page reload
            if (window.history && window.history.replaceState) {
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
            }
            
            // Navigate to the asset/sub-asset
            if (subAssetId) {
                // Navigate to sub-asset
                console.log('Navigating to sub-asset:', subAssetId);
                updateSelectedIds(assetId, subAssetId);
                renderAssetDetails(subAssetId, true);
            } else {
                // Navigate to main asset
                console.log('Navigating to main asset:', assetId);
                updateSelectedIds(assetId, null);
                renderAssetDetails(assetId, false);
            }
            
            // Close sidebar on mobile after navigation
            handleSidebarNav();
            
            return true; // Indicates we handled URL parameters
        }
        
        console.log('No URL parameters found');
        return false; // No URL parameters to handle
    }
    
    function goHome() {
        // Clear selected asset
        updateSelectedIds(null, null);
        // Remove active class from all asset items
        document.querySelectorAll('.asset-item').forEach(item => {
            item.classList.remove('active');
        });
        // Render dashboard and charts
        dashboardManager.renderDashboard();
        // Close sidebar on mobile
        handleSidebarNav();
    }
    
    // GLOBAL SHORTCUTS
    function addShortcutEventListeners() {
        // Add event listener for escape key to close all modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                [assetModal, subAssetModal, importModal, settingsModal].forEach(modal => {
                    if (modal && modal.style.display !== 'none') {
                        modal.style.display = 'none';
                    }
                });
                modalManager.closeAssetModal();
                modalManager.closeSubAssetModal();
                
                // Close duplicate modal if it exists
                if (modalManager && modalManager.closeDuplicateModal) {
                    modalManager.closeDuplicateModal();
                }
            }
        });
        // Add click-off-to-close for all modals on overlay click
        [importModal, settingsModal].forEach(modal => {
            if (modal) {
                modal.addEventListener('mousedown', function(e) {
                    if (e.target !== modal) return;
                    if (modal === settingsModal) {
                        settingsManager.closeSettingsModal();
                    }
                    else {
                        modal.style.display = 'none';
                    }
                });
            }
        });
        
        // Add click-off-to-close for duplicate modal
        const duplicateModal = document.getElementById('duplicateModal');
        if (duplicateModal) {
            duplicateModal.addEventListener('mousedown', function(e) {
                if (e.target !== duplicateModal) return;
                if (modalManager && modalManager.closeDuplicateModal) {
                    modalManager.closeDuplicateModal();
                }
            });
        }
    }

    function addElementEventListeners() {
        // Add Ctrl+Enter keyboard shortcut to save the settings form
        if (settingsModal && saveSettings) {
            const settingsKeydownHandler = (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    saveSettings.click();
                }
            };
            settingsModal.addEventListener('keydown', settingsKeydownHandler);
        }
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                if (sidebar.classList.contains('open')) {
                    closeSidebar();
                } else {
                    openSidebar();
                }
            });
        }
        if (sidebarCloseBtn) {
            sidebarCloseBtn.addEventListener('click', () => {
                closeSidebar();
            });
        }
        // Close sidebar when clicking the overlay
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', (e) => {
                e.preventDefault();
                closeSidebar();
            });
        }
        // Set up search
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                renderAssetList(e.target.value);
                if (clearSearchBtn) {
                    clearSearchBtn.style.display = e.target.value ? 'flex' : 'none';
                }
            });
        }
        if (clearSearchBtn && searchInput) {
            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearSearchBtn.style.display = 'none';
                renderAssetList('');
                searchInput.focus();
            });
        }
        // Set up home button
        if (homeBtn) {
            homeBtn.addEventListener('click', () => goHome());
        }
        // Set up add asset button
        if (addAssetBtn) {
            addAssetBtn.addEventListener('click', () => {
                modalManager.openAssetModal();
            });
        }
        // Set up sort buttons   
        if (sortNameBtn) {
            sortNameBtn.addEventListener('click', () => {
                const currentDirection = sortNameBtn.getAttribute('data-direction') || 'asc';
                const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
                
                // Update button state
                sortNameBtn.setAttribute('data-direction', newDirection);
                sortWarrantyBtn.setAttribute('data-direction', 'asc');
                
                // Update sort settings
                currentSort = { field: 'name', direction: newDirection };
                updateSort(currentSort);
                
                // Update UI
                updateSortButtons(sortNameBtn);
                
                // Re-render with sort
                renderAssetList(searchInput ? searchInput.value : '');
            });
        }
        if (sortWarrantyBtn) {
            sortWarrantyBtn.addEventListener('click', () => {
                const currentDirection = sortWarrantyBtn.getAttribute('data-direction') || 'asc';
                const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
                
                // Update button state
                sortWarrantyBtn.setAttribute('data-direction', newDirection);
                sortNameBtn.setAttribute('data-direction', 'asc');
                
                // Update sort settings
                currentSort = { field: 'warranty', direction: newDirection };
                updateSort(currentSort);
                
                // Update UI
                updateSortButtons(sortWarrantyBtn);
                
                // Re-render with sort
                renderAssetList(searchInput ? searchInput.value : '');
            });
        }
        // Top Sort Button
        if (topSortBtn) {
            topSortBtn.addEventListener('click', () => {
                const sortOptions = document.getElementById('sortOptions');
                if (sortOptions) {
                    sortOptions.classList.toggle('visible');
                }
            });
        }
    }

    // Set the page and site title from config if available
    function setupPageTitle() {
        if (window.appConfig && window.appConfig.siteTitle) {
            if (siteTitleElem) {
                siteTitleElem.textContent = window.appConfig.siteTitle || 'DumbAssets';
            }
            if (pageTitleElem) {
                pageTitleElem.textContent = window.appConfig.siteTitle || 'DumbAssets';
            }
            siteTitleElem.addEventListener('click', () => goHome());
        }
    }
});