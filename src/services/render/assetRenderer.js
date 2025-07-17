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
let openDuplicateModal;

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

// IntegrationsManager reference - will be injected
let integrationsManager;

/**
 * Get the appropriate integration badge HTML based on integration ID
 * @param {string} integrationId - The integration identifier
 * @returns {string} - The badge HTML
 */
function getIntegrationBadge(integrationId) {
    return integrationsManager?.getIntegrationBadge(integrationId) || `<div class="integration-badge generic-badge"><span title="From ${integrationId}">${integrationId}</span></div>`;
}

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
    openDuplicateModal = config.openDuplicateModal;
    
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
    
    // Store reference to integrations manager
    integrationsManager = config.integrationsManager;
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
                    <strong>Event: ${event.name}</strong>
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
        <div class="info-item">
            <div class="info-label">Quantity</div>
            <div>${asset.quantity || 1}</div>
        </div>
        ${(asset.quantity > 1 && (asset.price || asset.purchasePrice)) ? `
        <div class="info-item">
            <div class="info-label">Total Value</div>
            <div>${formatCurrency((asset.price || asset.purchasePrice) * asset.quantity)}</div>
        </div>
        ` : ''}
        ${asset.warranty?.expirationDate || asset.warranty?.isLifetime ? `
        <div class="info-item">
            <div class="info-label">Warranty</div>
            ${asset.warranty.scope ? `<div>${asset.warranty.scope}</div>` : ''}
            <div>${asset.warranty.isLifetime ? 'Lifetime' : formatDate(asset.warranty.expirationDate)}</div>
        </div>
        ` : ''}
        ${asset.secondaryWarranty?.expirationDate || asset.secondaryWarranty?.isLifetime ? `
        <div class="info-item">
            <div class="info-label">Secondary Warranty</div>
            ${asset.secondaryWarranty.scope ? `<div>${asset.secondaryWarranty.scope}</div>` : ''}
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
 * Generate HTML for file grid display (supports multiple files)
 * 
 * @param {Object} asset - The asset object containing file paths
 * @returns {string} HTML string for the file grid
 */
/**
 * Format filename for display with truncation if needed
 * @param {string} fileName - The original filename
 * @param {number} maxLength - Maximum length (default 15)
 * @returns {string} Formatted filename
 */
function formatDisplayFileName(fileName, maxLength = 15) {
    if (!fileName || fileName.length <= maxLength) {
        return fileName || 'Unknown File';
    }
    
    // Find the last dot for the extension
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
        // No extension found, just truncate
        return fileName.substring(0, maxLength - 3) + '...';
    }
    
    const extension = fileName.substring(lastDotIndex);
    const nameWithoutExt = fileName.substring(0, lastDotIndex);
    
    // Calculate how much space we have for the name part
    const availableSpace = maxLength - extension.length - 3; // 3 for "..."
    
    if (availableSpace <= 0) {
        // Extension is too long, just show truncated name
        return fileName.substring(0, maxLength - 3) + '...';
    }
    
    return nameWithoutExt.substring(0, availableSpace) + '...' + extension;
}

function generateFileGridHTML(asset) {
    let html = '';
    
    // Handle multiple photos
    if (asset.photoPaths && Array.isArray(asset.photoPaths) && asset.photoPaths.length > 0) {
        asset.photoPaths.forEach((photoPath, index) => {
            const photoInfo = asset.photoInfo?.[index] || {};
            const fileName = photoInfo.originalName || photoPath.split('/').pop();
            const integrationClass = photoInfo.integrationId ? ` ${photoInfo.integrationId}-document` : '';
            const integrationBadge = photoInfo.integrationId ? getIntegrationBadge(photoInfo.integrationId) : '';
            
            // Use preview URL for external images if available
            let displayPath = formatFilePath(photoPath);
            if (photoInfo.integrationId && photoInfo.previewUrl) {
                displayPath = photoInfo.previewUrl;
            }
            
            html += `
                <div class="file-item photo external-document${integrationClass}">
                    <a href="${formatFilePath(photoPath)}" target="_blank" class="file-preview">
                        <img src="${displayPath}" alt="${asset.name}" class="asset-image">
                        ${integrationBadge}
                        <div class="file-label">${formatDisplayFileName(fileName)}</div>
                    </a>
                </div>
            `;
        });
    } else if (asset.photoPath) {
        // Backward compatibility for single photo
        const photoInfo = asset.photoInfo?.[0] || {};
        const fileName = photoInfo.originalName || asset.photoPath.split('/').pop();
        const integrationClass = photoInfo.integrationId ? ` ${photoInfo.integrationId}-document` : '';
        const integrationBadge = photoInfo.integrationId ? getIntegrationBadge(photoInfo.integrationId) : '';
        html += `
            <div class="file-item photo external-document${integrationClass}">
                <a href="${formatFilePath(asset.photoPath)}" target="_blank" class="file-preview">
                    <img src="${formatFilePath(asset.photoPath)}" alt="${asset.name}" class="asset-image">
                    ${integrationBadge}
                    <div class="file-label">${formatDisplayFileName(fileName)}</div>
                </a>
            </div>
        `;
    }
    
    // Handle multiple receipts
    if (asset.receiptPaths && Array.isArray(asset.receiptPaths) && asset.receiptPaths.length > 0) {
        asset.receiptPaths.forEach((receiptPath, index) => {
            const receiptInfo = asset.receiptInfo?.[index] || {};
            const fileName = receiptInfo.originalName || receiptPath.split('/').pop();
            const integrationClass = receiptInfo.integrationId ? ` ${receiptInfo.integrationId}-document` : '';
            const integrationBadge = receiptInfo.integrationId ? getIntegrationBadge(receiptInfo.integrationId) : '';
            html += `
                <div class="file-item receipt external-document${integrationClass}">
                    <a href="${formatFilePath(receiptPath)}" target="_blank" class="file-preview">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2m4 -14h6m-6 4h6m-2 4h2" />
                        </svg>
                        ${integrationBadge}
                        <div class="file-label">${formatDisplayFileName(fileName)}</div>
                    </a>
                </div>
            `;
        });
    } else if (asset.receiptPath) {
        // Backward compatibility for single receipt
        const receiptInfo = asset.receiptInfo?.[0] || {};
        const fileName = receiptInfo.originalName || asset.receiptPath.split('/').pop();
        const integrationClass = receiptInfo.integrationId ? ` ${receiptInfo.integrationId}-document` : '';
        const integrationBadge = receiptInfo.integrationId ? getIntegrationBadge(receiptInfo.integrationId) : '';
        html += `
            <div class="file-item receipt external-document${integrationClass}">
                <a href="${formatFilePath(asset.receiptPath)}" target="_blank" class="file-preview">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2m4 -14h6m-6 4h6m-2 4h2" />
                    </svg>
                    ${integrationBadge}
                    <div class="file-label">${formatDisplayFileName(fileName)}</div>
                </a>
            </div>
        `;
    }
    
    // Handle multiple manuals
    if (asset.manualPaths && Array.isArray(asset.manualPaths) && asset.manualPaths.length > 0) {
        asset.manualPaths.forEach((manualPath, index) => {
            const manualInfo = asset.manualInfo?.[index] || {};
            const fileName = manualInfo.originalName || manualPath.split('/').pop();
            const integrationClass = manualInfo.integrationId ? ` ${manualInfo.integrationId}-document` : '';
            const integrationBadge = manualInfo.integrationId ? getIntegrationBadge(manualInfo.integrationId) : '';
            html += `
                <div class="file-item manual external-document${integrationClass}">
                    <a href="${formatFilePath(manualPath)}" target="_blank" class="file-preview">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        ${integrationBadge}
                        <div class="file-label">${formatDisplayFileName(fileName)}</div>
                    </a>
                </div>
            `;
        });
    } else if (asset.manualPath) {
        // Backward compatibility for single manual
        const manualInfo = asset.manualInfo?.[0] || {};
        const fileName = manualInfo.originalName || asset.manualPath.split('/').pop();
        const integrationClass = manualInfo.integrationId ? ` ${manualInfo.integrationId}-document` : '';
        const integrationBadge = manualInfo.integrationId ? getIntegrationBadge(manualInfo.integrationId) : '';
        html += `
            <div class="file-item manual external-document${integrationClass}">
                <a href="${formatFilePath(asset.manualPath)}" target="_blank" class="file-preview">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    ${integrationBadge}
                    <div class="file-label">${formatDisplayFileName(fileName)}</div>
                </a>
            </div>
        `;
    }
    
    return html || '<!-- No files available -->';
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
                    <button class="copy-link-btn" title="Copy Link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></button>
                    <button class="edit-asset-btn" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/></svg></button>
                    <button class="duplicate-asset-btn" title="Duplicate"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path stroke="none" d="M0 0h24v24H0z"/><path d="M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z"/><path d="M4.012 16.737a2 2 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1"/><path d="M11 14h6"/><path d="M14 11v6"/></svg></button>
                    <button class="delete-asset-btn" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
                </div>
            </div>
            <div class="asset-info">
                ${generateAssetInfoHTML(asset)}
                ${maintenanceScheduleHtml}
            </div>
            ${generateFileGridHTML(asset)}
            ${asset.maintenanceEvents && asset.maintenanceEvents.length > 0 ? generateMaintenanceEventsHTML(asset.maintenanceEvents) : ''}
        </fieldset>
    `;

    // Set up event listeners for asset actions
    const copyLinkBtn = assetDetails.querySelector('.copy-link-btn');
    const editBtn = assetDetails.querySelector('.edit-asset-btn');
    const duplicateBtn = assetDetails.querySelector('.duplicate-asset-btn');
    const deleteBtn = assetDetails.querySelector('.delete-asset-btn');
    const backBtn = assetDetails.querySelector('.back-to-parent-btn');

    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', () => {
            const url = new URL(window.location);
            url.searchParams.set('asset', asset.id);
            if (isSub) url.searchParams.set('sub', 'true');
            navigator.clipboard.writeText(url.toString()).then(() => {
                globalThis.toaster?.show('Link copied to clipboard', 'success');
            }).catch(() => {
                globalThis.toaster?.show('Failed to copy link', 'error');
            });
        });
    }

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            if (isSub) {
                openSubAssetModal(asset);
            } else {
                openAssetModal(asset);
            }
        });
    }

    if (duplicateBtn) {
        duplicateBtn.addEventListener('click', () => {
            const type = isSub ? 'subAsset' : 'asset';
            openDuplicateModal(type, asset.id);
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (isSub) {
                deleteSubAsset(asset.id);
            } else {
                deleteAsset(asset.id);
            }
        });
    }

    if (backBtn && isSub) {
        backBtn.addEventListener('click', () => {
            // Navigate back to parent asset
            renderAssetDetails(asset.parentId, false);
        });
    }

    // Show sub-assets container if this is a main asset
    if (!isSub) {
        renderSubAssets(assetId);
    }
}

// Export functions for use by other modules
export {
    initRenderer,
    updateState,
    updateSelectedIds,
    renderAssetDetails,
    formatFilePath
};