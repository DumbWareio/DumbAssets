/**
 * Render Services Index
 * Re-exports     // List renderer functions
    initListRenderer,
    updateListState,
    updateDashboardFilter,
    updateSort,
    renderAssetList,
    sortAssets,
    
    // Preview renderer functions
    createPhotoPreview,
    createDocumentPreview,
    setupFilePreview,
    
    // Sync helper functions
    syncState
};ns from the asset renderer modules
 */

// Import from asset renderer module
import {
    initRenderer,
    updateState,
    updateSelectedIds,
    renderAssetDetails,
    formatFilePath
} from './assetRenderer.js';

// Import from list renderer module
import {
    initListRenderer,
    updateListState,
    updateDashboardFilter,
    updateSort,
    renderAssetList,
    sortAssets
} from './listRenderer.js';

// Import from sync helper
import { syncState } from './syncHelper.js';

// Import from preview renderer
import {
    createPhotoPreview,
    createDocumentPreview,
    setupFilePreview,
    setupExistingFilePreview
} from './previewRenderer.js';

// Export all render service functions
export {
    // Asset renderer functions
    initRenderer,
    updateState,
    updateSelectedIds,
    renderAssetDetails,
    formatFilePath,
    
    // List renderer functions
    initListRenderer,
    updateListState,
    updateDashboardFilter,
    updateSort,
    renderAssetList,
    sortAssets,
    
    // Preview renderer functions
    createPhotoPreview,
    createDocumentPreview,
    setupFilePreview,
    setupExistingFilePreview,
    
    // Sync helper function
    syncState
}; 