/**
 * Asset Renderer Service
 * Handles rendering of asset details, sub-assets, and related UI components
 */

// Import utility functions if needed
// These will be injected when we use the module
let formatDate;
let formatCurrency;

// These functions from other modules will be injected
let openAssetModal;
let openSubAssetModal;
let deleteAsset;
let deleteSubAsset;
let createSubAssetElement;
let handleSidebarNav;
let renderSubAssets;

// Search functionality
let searchInput;
let renderAssetList;

// Global state references - will be passed from main script
let assets = [];
let subAssets = [];
let selectedAssetId = null;
let selectedSubAssetId = null;

// DOM element references - will be passed from main script
let assetList;
let assetDetails;
let subAssetContainer;

/**
 * Initialize the renderer with required dependencies
 * 
 * @param {Object} config Configuration object with dependencies
 */
function initRenderer(config) {
    // Store references to utility functions
    formatDate = config.formatDate;
    formatCurrency = config.formatCurrency;
    
    // Store references to other module functions
    openAssetModal = config.openAssetModal;
    openSubAssetModal = config.openSubAssetModal;
    deleteAsset = config.deleteAsset;
    deleteSubAsset = config.deleteSubAsset;
    createSubAssetElement = config.createSubAssetElement;
    handleSidebarNav = config.handleSidebarNav;
    renderSubAssets = config.renderSubAssets;
    
    // Store references to search functionality
    searchInput = config.searchInput;
    renderAssetList = config.renderAssetList;
    
    // Store references to global state
    assets = config.assets;
    subAssets = config.subAssets;
    
    // Store references to DOM elements
    assetList = config.assetList;
    assetDetails = config.assetDetails;
    subAssetContainer = config.subAssetContainer;
}

/**
 * Update the global state references
 * 
 * @param {Array} newAssets Updated assets array
 * @param {Array} newSubAssets Updated sub-assets array
 */
function updateState(newAssets, newSubAssets) {
    assets = newAssets;
    subAssets = newSubAssets;
}

/**
 * Update the selected asset and sub-asset IDs
 * 
 * @param {String} assetId Selected asset ID
 * @param {String} subAssetId Selected sub-asset ID
 */
function updateSelectedIds(assetId, subAssetId) {
    selectedAssetId = assetId;
    selectedSubAssetId = subAssetId;
}

/**
 * Format a file path to use the correct base URL
 * @param {string} path - The file path (/Images/filename.jpg, etc.)
 * @returns {string} - The properly formatted URL
 */
function formatFilePath(path) {
    if (!path) return '';
    
    // If the path already includes the full URL, return it as is
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    
    // Get the base URL from window.appConfig or window.location
    const baseUrl = window.appConfig?.basePath || '';
    
    // Ensure path starts with a slash
    const formattedPath = path.startsWith('/') ? path : `/${path}`;
    
    // Return the complete URL
    return `${baseUrl}${formattedPath}`;
}

/**
 * Generate HTML for maintenance events section
 * @param {Array} maintenanceEvents - Array of maintenance events
 * @returns {string} HTML string for maintenance events section
 */
function generateMaintenanceEventsHTML(maintenanceEvents) {
    if (!maintenanceEvents || maintenanceEvents.length === 0) {
        return '';
    }

    const eventsHTML = maintenanceEvents.map(event => {
        let scheduleText = '';
        let typeText = '';
        
        if (event.type === 'frequency') {
            scheduleText = `Every ${event.frequency} ${event.frequencyUnit}`;
            typeText = 'Recurring';
        } else if (event.type === 'specific') {
            scheduleText = `${formatDate(event.specificDate)}`;
            typeText = 'One-time';
        }

        return `
            <div class="maintenance-event-item">
                <div class="maintenance-event-line">
                    <strong>Event:${event.name}</strong>
                    <span class="maintenance-schedule-inline">${typeText} - ${scheduleText}</span>
                </div>
                ${event.notes ? `
                <div class="maintenance-notes-line">
                    <strong>Notes:</strong> ${event.notes}
                </div>
                ` : ''}
            </div>
        `;
    }).join('');

    return `
        <div class="maintenance-section-inline">
            <div class="info-label">Maintenance</div>
            <div class="maintenance-events-list">
                ${eventsHTML}
            </div>
        </div>
    `;
}

/**
 * Generate HTML for asset info section
 * @param {Object} asset - The asset object
 * @returns {string} HTML string for asset info section
 */
function generateAssetInfoHTML(asset) {
    return `
        <div class="info-item">
            <div class="info-label">Manufacturer</div>
            <div>${asset.manufacturer || 'N/A'}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Model Number</div>
            <div>${asset.modelNumber || 'N/A'}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Serial Number</div>
            <div>${asset.serialNumber || 'N/A'}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Purchase Date</div>
            <div>${formatDate(asset.purchaseDate)}</div>
        </div>
        <div class="info-item">
            <div class="info-label">Price</div>
            <div>${formatCurrency(asset.price || asset.purchasePrice)}</div>
        </div>
        ${asset.warranty?.scope ? `
        <div class="info-item">
            <div class="info-label">Warranty</div>
            <div>${asset.warranty.scope}</div>
            <div>${asset.warranty.isLifetime ? 'Lifetime' : formatDate(asset.warranty.expirationDate)}</div>
        </div>
        ` : ''}
        ${asset.secondaryWarranty?.scope || asset.secondaryWarranty?.expirationDate ? `
        <div class="info-item">
            <div class="info-label">Secondary Warranty</div>
            <div>${asset.secondaryWarranty.scope || 'N/A'}</div>
            <div>${asset.secondaryWarranty.isLifetime ? 'Lifetime' : formatDate(asset.secondaryWarranty.expirationDate)}</div>
        </div>
        ` : ''}
        ${asset.link ? `
        <div class="info-item">
            <div class="info-label">Link</div>
            <div><a href="${asset.link}" target="_blank" rel="noopener noreferrer">${asset.link}</a></div>
        </div>` : ''}
    `;
}

/**
 * Render asset details in the UI
 * 
 * @param {String} assetId ID of the asset to render
 * @param {Boolean} isSubAsset Whether the asset is a sub-asset
 * @returns {void}
 */
function renderAssetDetails(assetId, isSubAsset = false) {
    console.log(`renderAssetDetails called for ${isSubAsset ? 'sub-asset' : 'asset'} ID: ${assetId}`);
    
    // Find the asset or sub-asset
    let asset, isSub = false;
    if (!isSubAsset) {
        asset = assets.find(a => a.id === assetId);
    } else {
        asset = subAssets.find(sa => sa.id === assetId);
        isSub = true;
    }
    
    if (!asset) {
        console.error(`Asset not found with ID: ${assetId}`);
        return;
    }
    
    // Log the asset data before formatting
    console.log(`Asset data before formatting:`, {
        id: asset.id,
        name: asset.name,
        photoPath: asset.photoPath,
        receiptPath: asset.receiptPath,
        manualPath: asset.manualPath
    });
    
    // Update selected asset/sub-asset
    if (!isSub) {
        selectedAssetId = assetId;
        selectedSubAssetId = null;
    } else {
        selectedSubAssetId = assetId;
        // Make sure we maintain the parent asset ID
        selectedAssetId = asset.parentId;
    }
    
    // Update active class in list using dataset.id instead of name
    if (!isSub) {
        const assetItems = assetList.querySelectorAll('.asset-item');
        assetItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.id === assetId) {
                item.classList.add('active');
            }
        });
    }
    
    // Format file paths with the correct base URL
    const photoPath = asset.photoPath ? formatFilePath(asset.photoPath) : null;
    const receiptPath = asset.receiptPath ? formatFilePath(asset.receiptPath) : null;
    const manualPath = asset.manualPath ? formatFilePath(asset.manualPath) : null;
    
    // Log the formatted paths
    console.log(`Formatted paths for asset ${asset.id}:`, {
        photoPath,
        receiptPath,
        manualPath
    });
    
    // Determine legend title
    let legendTitle = 'Asset Details';
    if (isSubAsset) legendTitle = 'Component Details';

    // Render asset or sub-asset details inside a unified fieldset/legend
    let maintenanceScheduleHtml = '';
    if (asset.maintenanceSchedule) {
        let scheduleText = '';
        if (asset.maintenanceSchedule.unit === 'custom') {
            scheduleText = asset.maintenanceSchedule.custom;
        } else if (asset.maintenanceSchedule.frequency && asset.maintenanceSchedule.unit) {
            scheduleText = `Every ${asset.maintenanceSchedule.frequency} ${asset.maintenanceSchedule.unit}`;
        }
        if (scheduleText) {
            maintenanceScheduleHtml = `
                <div class="info-item">
                    <div class="info-label">Maintenance Schedule</div>
                    <div>${scheduleText}</div>
                </div>
            `;
        }
    }
    assetDetails.innerHTML = `
        <fieldset class="dashboard-legend">
            <legend class="dashboard-legend-title">${legendTitle}</legend>
            <div class="asset-header">
                <div class="asset-title">
                    <h2>${asset.name}</h2>
                    <div class="asset-meta">
                        Added: ${formatDate(asset.createdAt)}
                        ${asset.updatedAt !== asset.createdAt ? ` • Updated: ${formatDate(asset.updatedAt)}` : ''}
                    </div>
                </div>
                <div class="asset-actions">
                    ${isSub ? `<button class="back-to-parent-btn" title="Back to Parent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>` : ''}
                    <button class="edit-asset-btn" data-id="${asset.id}" title="Edit">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/></svg>
                    </button>
                    <button class="delete-asset-btn" data-id="${asset.id}" title="Delete">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                </div>
            </div>
            <div class="asset-info">
                ${generateAssetInfoHTML(asset)}
                ${maintenanceScheduleHtml}
                ${generateMaintenanceEventsHTML(asset.maintenanceEvents)}
            </div>
            ${(asset.description || asset.notes) ? `
            <div class="asset-description">
                <strong>Description:</strong>
                <p>${asset.description || asset.notes}</p>
            </div>
            ` : ''}
            ${asset.tags && asset.tags.length > 0 ? `
            <div class="info-item" style="margin-bottom: 1rem;">
                <div class="info-label">Tags</div>
                <div class="tag-list">
                    ${asset.tags.map(tag => `<span class="tag" data-tag="${tag}" style="cursor: pointer;">${tag}</span>`).join('')}
                </div>
            </div>` : ''}
            <div class="asset-files">
                <div class="files-grid">
                    ${photoPath ? `
                    <div class="file-item photo">
                        <a href="${photoPath}" target="_blank" class="file-preview">
                            <img src="${photoPath}" alt="${asset.name}" class="asset-image">
                            <div class="file-label">Photo</div>
                        </a>
                    </div>
                    ` : '<!-- No photo available -->'}
                    ${receiptPath ? `
                    <div class="file-item receipt">
                        <a href="${receiptPath}" target="_blank" class="file-preview">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2m4 -14h6m-6 4h6m-2 4h2" />
                            </svg>
                            <div class="file-label">Receipt</div>
                        </a>
                    </div>
                    ` : '<!-- No receipt available -->'}
                    ${manualPath ? `
                    <div class="file-item manual">
                        <a href="${manualPath}" target="_blank" class="file-preview">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            <div class="file-label">Manual</div>
                        </a>
                    </div>
                    ` : '<!-- No manual available -->'}
                </div>
            </div>
        </fieldset>
    `;
    // Add event listeners
    if (isSub) {
        const backBtn = assetDetails.querySelector('.back-to-parent-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                // If sub-sub-asset, go to parent sub-asset; else go to main asset
                if (asset.parentSubId) {
                    renderAssetDetails(asset.parentSubId, true);
                } else {
                    renderAssetDetails(asset.parentId);
                }
            });
        }
    }
    const editBtn = assetDetails.querySelector('.edit-asset-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            if (isSub) openSubAssetModal(asset);
            else openAssetModal(asset);
        });
    }
    const deleteBtn = assetDetails.querySelector('.delete-asset-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (isSub) deleteSubAsset(asset.id);
            else deleteAsset(asset.id);
        });
    }
    
    // Add click event listeners to tags in the details view
    const tagElements = assetDetails.querySelectorAll('.tag[data-tag]');
    tagElements.forEach(tagElement => {
        tagElement.addEventListener('click', (e) => {
            e.stopPropagation();
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
                if (renderAssetList) {
                    renderAssetList(tagName);
                }
                
                // Focus the search input
                searchInput.focus();
            }
        });
    });
    
    // Only render sub-assets if viewing a main asset
    if (!isSub) {
        renderSubAssets(assetId);
    } else {
        subAssetContainer.classList.add('hidden');
        // If this is a first-level sub-asset (not a sub-sub-asset), show sub-sub-assets
        if (!asset.parentSubId) {
            // Get fresh list of sub-sub-assets after potential changes
            const subSubAssets = subAssets.filter(sa => sa.parentSubId === asset.id);
            // --- Modern legend/fieldset for sub-sub-assets ---
            const fieldset = document.createElement('fieldset');
            fieldset.className = 'dashboard-legend';
            fieldset.innerHTML = `
                <legend class="dashboard-legend-title">Components & Attachments</legend>
                <div class="sub-asset-header">
                    <button class="add-sub-asset-btn" style="margin-top:0.5rem;">+ Add Sub-Component</button>
                </div>
                <div class="sub-asset-list">
                    ${subSubAssets.length === 0
                        ? '<div class="empty-state"><p>No components found. Add your first component.</p></div>'
                        : subSubAssets.map(child => {
                            const wrapper = document.createElement('div');
                            wrapper.appendChild(createSubAssetElement(child));
                            return wrapper.innerHTML;
                        }).join('')
                    }
                </div>
            `;
            // Add event for add button
            fieldset.querySelector('.add-sub-asset-btn').onclick = () => openSubAssetModal(null, asset.parentId, asset.id);
            assetDetails.appendChild(fieldset);
        }
    }
    handleSidebarNav();
}

// Export the module functions
export {
    initRenderer,
    updateState,
    updateSelectedIds,
    renderAssetDetails,
    formatFilePath
};