/**
 * Asset List Renderer Service
 * Handles rendering of the asset list sidebar with search and filter functionality
 */

// These functions from other modules will be injected
let updateSelectedIds;
let renderAssetDetails;
let handleSidebarNav;

// Global state references - will be passed from main script
let assets = [];
let subAssets = [];
let selectedAssetId = null;
let dashboardFilter = null;
let currentSort = { field: null, direction: 'asc' };
let searchInput;

// DOM element references
let assetList;

/**
 * Initialize the list renderer with required dependencies
 * 
 * @param {Object} config Configuration object with dependencies
 */
function initListRenderer(config) {
    // Store references to other module functions
    updateSelectedIds = config.updateSelectedIds;
    renderAssetDetails = config.renderAssetDetails;
    handleSidebarNav = config.handleSidebarNav;
    
    // Store references to global state
    assets = config.assets;
    subAssets = config.subAssets;
    selectedAssetId = config.selectedAssetId;
    dashboardFilter = config.dashboardFilter;
    currentSort = config.currentSort;
    searchInput = config.searchInput;
    
    // Store references to DOM elements
    assetList = config.assetList;
}

/**
 * Update the global state references
 * 
 * @param {Array} newAssets Updated assets array
 * @param {Array} newSubAssets Updated sub-assets array
 * @param {String} newSelectedAssetId Selected asset ID
 */
function updateListState(newAssets, newSubAssets, newSelectedAssetId) {
    assets = newAssets;
    subAssets = newSubAssets;
    selectedAssetId = newSelectedAssetId;
}

/**
 * Update dashboard filter
 * 
 * @param {String} newFilter New dashboard filter value
 */
function updateDashboardFilter(newFilter) {
    dashboardFilter = newFilter;
}

/**
 * Update sort settings
 * 
 * @param {Object} newSort New sort settings
 */
function updateSort(newSort) {
    currentSort = newSort;
}

/**
 * Get the appropriate warranty dot type based on expiration date
 * 
 * @param {Object} asset Asset to check for warranty
 * @returns {String|null} Dot type ('red', 'yellow', 'expired', or null)
 */
function getWarrantyDotType(asset) {
    // Check both primary and secondary warranties
    const warranties = [
        { exp: asset?.warranty?.expirationDate, isLifetime: asset?.warranty?.isLifetime },
        { exp: asset?.secondaryWarranty?.expirationDate, isLifetime: asset?.secondaryWarranty?.isLifetime }
    ].filter(w => w.exp || w.isLifetime);

    if (warranties.length === 0) return null;

    const now = new Date();
    let hasExpiring = false;
    let hasWarning = false;
    let hasExpired = false;

    warranties.forEach(warranty => {
        // Skip lifetime warranties
        if (warranty.isLifetime) return;
        
        const expDate = new Date(warranty.exp);
        if (isNaN(expDate)) return;
        const diff = (expDate - now) / (1000 * 60 * 60 * 24);
        if (diff < 0) {
            // Warranty has expired
            hasExpired = true;
        } else if (diff >= 0 && diff <= 30) {
            // Expiring within 30 days
            hasExpiring = true;
        } else if (diff > 30 && diff <= 60) {
            // Warning (31-60 days)
            hasWarning = true;
        }
    });

    if (hasExpired) return 'expired';
    if (hasExpiring) return 'red';
    if (hasWarning) return 'yellow';
    return null;
}

/**
 * Render the asset list in the sidebar with filtering and searching
 * 
 * @param {String} searchQuery Search query to filter assets by
 */
function renderAssetList(searchQuery = '') {
    if (!assetList) return;
    assetList.innerHTML = '';

    if (assets.length === 0) {
        assetList.innerHTML = '<div class="empty-state">No assets found</div>';
        return;
    }

    let filteredAssets = searchQuery
        ? assets.filter(asset => 
            asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            asset.modelNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
        : assets;

    // Apply dashboard filter
    if (dashboardFilter) {
        const now = new Date();
        
        // Special case for components filter
        if (dashboardFilter === 'components') {
            // Only show assets that have sub-assets associated with them
            filteredAssets = filteredAssets.filter(a => 
                subAssets.some(sa => sa.parentId === a.id)
            );
        }
        else if (dashboardFilter === 'warranties') {
            // Assets with warranties
            filteredAssets = filteredAssets.filter(a => a.warranty && a.warranty.expirationDate);
        } else if (dashboardFilter === 'expired') {
            // Assets with expired warranties
            filteredAssets = filteredAssets.filter(a => {
                const exp = a.warranty?.expirationDate;
                if (!exp) return false;
                return new Date(exp) < now;
            });
            
            // Also include assets with sub-assets that have expired warranties
            const assetsWithExpiredComponents = assets.filter(a => 
                !filteredAssets.includes(a) && // Don't duplicate
                subAssets.some(sa => {
                    if (sa.parentId !== a.id) return false;
                    const exp = sa.warranty?.expirationDate;
                    if (!exp) return false;
                    return new Date(exp) < now;
                })
            );
            
            filteredAssets = [...filteredAssets, ...assetsWithExpiredComponents];
        } else if (dashboardFilter === 'within30') {
            // Assets with warranties expiring within 30 days
            filteredAssets = filteredAssets.filter(a => {
                const exp = a.warranty?.expirationDate;
                if (!exp) return false;
                const diff = (new Date(exp) - now) / (1000 * 60 * 60 * 24);
                return diff >= 0 && diff <= 30;
            });
            
            // Also include assets with sub-assets expiring within 30 days
            const assetsWithExpiringComponents = assets.filter(a => 
                !filteredAssets.includes(a) && // Don't duplicate
                subAssets.some(sa => {
                    if (sa.parentId !== a.id) return false;
                    const exp = sa.warranty?.expirationDate;
                    if (!exp) return false;
                    const diff = (new Date(exp) - now) / (1000 * 60 * 60 * 24);
                    return diff >= 0 && diff <= 30;
                })
            );
            
            filteredAssets = [...filteredAssets, ...assetsWithExpiringComponents];
        } else if (dashboardFilter === 'within60') {
            // Assets with warranties expiring between 31-60 days
            filteredAssets = filteredAssets.filter(a => {
                const exp = a.warranty?.expirationDate;
                if (!exp) return false;
                const diff = (new Date(exp) - now) / (1000 * 60 * 60 * 24);
                return diff > 30 && diff <= 60;
            });
            
            // Also include assets with sub-assets expiring within 31-60 days
            const assetsWithWarningComponents = assets.filter(a => 
                !filteredAssets.includes(a) && // Don't duplicate
                subAssets.some(sa => {
                    if (sa.parentId !== a.id) return false;
                    const exp = sa.warranty?.expirationDate;
                    if (!exp) return false;
                    const diff = (new Date(exp) - now) / (1000 * 60 * 60 * 24);
                    return diff > 30 && diff <= 60;
                })
            );
            
            filteredAssets = [...filteredAssets, ...assetsWithWarningComponents];
        } else if (dashboardFilter === 'active') {
            // Assets with active warranties (more than 60 days)
            filteredAssets = filteredAssets.filter(a => {
                const exp = a.warranty?.expirationDate;
                const isLifetime = a.warranty?.isLifetime;
                if (!exp && !isLifetime) return false;
                if (isLifetime) return true;
                const diff = (new Date(exp) - now) / (1000 * 60 * 60 * 24);
                return diff > 60;
            });
            
            // Also include assets with sub-assets having active warranties
            const assetsWithActiveComponents = assets.filter(a => 
                !filteredAssets.includes(a) && // Don't duplicate
                subAssets.some(sa => {
                    if (sa.parentId !== a.id) return false;
                    const exp = sa.warranty?.expirationDate;
                    const isLifetime = sa.warranty?.isLifetime;
                    if (!exp && !isLifetime) return false;
                    if (isLifetime) return true;
                    const diff = (new Date(exp) - now) / (1000 * 60 * 60 * 24);
                    return diff > 60;
                })
            );
            
            filteredAssets = [...filteredAssets, ...assetsWithActiveComponents];
        }
    }

    // Apply sorting if a sort field is selected
    if (currentSort.field) {
        filteredAssets = sortAssets(filteredAssets, currentSort.field, currentSort.direction);
    }

    filteredAssets.forEach(asset => {
        const assetItem = document.createElement('div');
        assetItem.className = 'asset-item';
        assetItem.dataset.id = asset.id; // Store ID in dataset
        
        // Set active class if this is the currently selected asset
        if (selectedAssetId && asset.id === selectedAssetId) {
            assetItem.classList.add('active');
        }
        
        // Add warranty dot or expired icon if needed
        const dotType = getWarrantyDotType(asset);
        if (dotType === 'red') {
            const dot = document.createElement('div');
            dot.className = 'warranty-expiring-dot';
            assetItem.appendChild(dot);
        } else if (dotType === 'yellow') {
            const dot = document.createElement('div');
            dot.className = 'warranty-warning-dot';
            assetItem.appendChild(dot);
        } else if (dotType === 'expired') {
            const expiredIcon = document.createElement('div');
            expiredIcon.className = 'warranty-expired-icon';
            expiredIcon.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
            `;
            assetItem.appendChild(expiredIcon);
        }
        
        // Format asset item with name, model, and tags
        assetItem.innerHTML += `
            <div class="asset-item-name">${asset.name || 'Unnamed Asset'}</div>
            ${asset.modelNumber ? `<div class="asset-item-model">${asset.modelNumber}</div>` : ''}
            ${asset.tags && asset.tags.length > 0 ? `
                <div class="asset-item-tags">
                    ${asset.tags.map(tag => `<span class="asset-tag" data-tag="${tag}">${tag}</span>`).join('')}
                </div>
            ` : ''}
        `;
            
        assetItem.addEventListener('click', (e) => {
            // Don't trigger asset click if clicking on a tag
            if (e.target.classList.contains('asset-tag')) {
                return;
            }
            
            // Remove active class from all asset items
            document.querySelectorAll('.asset-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Add active class to clicked item
            assetItem.classList.add('active');

            // Set selectedAssetId before rendering details
            updateSelectedIds(asset.id, null);
            
            renderAssetDetails(asset.id);
            handleSidebarNav();
        });
        
        // Add click event listeners to tags
        const tagElements = assetItem.querySelectorAll('.asset-tag');
        tagElements.forEach(tagElement => {
            tagElement.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent asset click
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
        
        assetList.appendChild(assetItem);
    });

    // Return whether any assets were found (for determining if we should render empty state)
    return filteredAssets.length > 0;
}

/**
 * Sort assets based on specified field and direction
 * 
 * @param {Array} assets Array of assets to sort
 * @param {String} field Field to sort by
 * @param {String} direction Sort direction ('asc' or 'desc')
 * @returns {Array} Sorted assets array
 */
function sortAssets(assets, field, direction) {
    if (!assets || !Array.isArray(assets)) {
        console.warn('sortAssets called with invalid assets array');
        return [];
    }
    
    return [...assets].sort((a, b) => {
        let valueA, valueB;
        
        // Safely extract values based on field
        if (field === 'name') {
            // Handle name field (as string)
            valueA = (a.name ? a.name.toLowerCase() : '');
            valueB = (b.name ? b.name.toLowerCase() : '');
            
            // Compare as strings
            if (direction === 'asc') {
                return valueA.localeCompare(valueB);
            } else {
                return valueB.localeCompare(valueA);
            }
        } 
        else if (field === 'warranty') {
            // Handle warranty expiration dates
            const dateA = a.warranty?.expirationDate ? new Date(a.warranty.expirationDate) : null;
            const dateB = b.warranty?.expirationDate ? new Date(b.warranty.expirationDate) : null;
            
            // Handle cases with null dates (always put null dates at the end)
            if (!dateA && !dateB) return 0;
            if (!dateA) return direction === 'asc' ? 1 : -1;
            if (!dateB) return direction === 'asc' ? -1 : 1;
            
            // Compare valid dates
            return direction === 'asc' 
                ? dateA.getTime() - dateB.getTime()
                : dateB.getTime() - dateA.getTime();
        }
        else if (field === 'updatedAt') {
            // Handle updatedAt dates
            const dateA = a.updatedAt ? new Date(a.updatedAt) : null;
            const dateB = b.updatedAt ? new Date(b.updatedAt) : null;
            
            // Handle cases with null dates (always put null dates at the end)
            if (!dateA && !dateB) return 0;
            if (!dateA) return direction === 'asc' ? 1 : -1;
            if (!dateB) return direction === 'asc' ? -1 : 1;
            
            // Compare valid dates
            return direction === 'asc' 
                ? dateA.getTime() - dateB.getTime()
                : dateB.getTime() - dateA.getTime();
        }
        else {
            // Default to sorting by name for unknown fields
            console.warn(`Unknown sort field: ${field}, defaulting to name`);
            valueA = (a.name ? a.name.toLowerCase() : '');
            valueB = (b.name ? a.name.toLowerCase() : '');
            
            return direction === 'asc'
                ? valueA.localeCompare(valueB)
                : valueB.localeCompare(valueA);
        }
    });
}

// Export the module functions
export {
    initListRenderer,
    updateListState,
    updateDashboardFilter,
    updateSort,
    renderAssetList,
    sortAssets
};