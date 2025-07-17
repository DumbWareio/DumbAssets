/**
 * File Preview Renderer
 * Provides centralized functions for rendering file previews consistently across the application
 */

// IntegrationsManager reference - will be injected
let integrationsManager;

/**
 * Creates an HTML element displaying a photo file preview, including an optional integration badge and delete button.
 *
 * @param {string} filePath - The path to the photo file.
 * @param {Function} onDeleteCallback - Function to call when the delete button is clicked.
 * @param {string|null} [fileName=null] - Optional display name for the file; extracted from the path if not provided.
 * @param {number|null} [fileSize=null] - Optional file size (unused in preview rendering).
 * @param {string|null} [integrationId=null] - Optional integration ID to display an associated badge.
 * @return {HTMLElement} The constructed photo preview element.
 */
export function createPhotoPreview(filePath, onDeleteCallback, fileName = null, fileSize = null, integrationId = null) {
    const previewItem = document.createElement('div');
    previewItem.className = 'file-preview-item';
    
    // Extract file name from path if not provided
    if (!fileName) {
        fileName = filePath.split('/').pop();
    }
    
    const integrationBadge = integrationId ? 
        getIntegrationBadge(integrationId) : '';
    
    previewItem.innerHTML = `
        <div class="file-preview">
            <div class="preview-content">
                <img src="${filePath}" alt="Photo Preview">
            </div>
        </div>
        ${integrationBadge}
        <button type="button" class="delete-preview-btn" title="Delete Image">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
        </button>
        <div class="file-info-pill">
            <span class="file-name">${fileName}</span>
        </div>
    `;
    
    if (onDeleteCallback) {
        const deleteButton = previewItem.querySelector('.delete-preview-btn');
        deleteButton.addEventListener('click', onDeleteCallback);
    }
    
    return previewItem;
}

/**
 * Creates an HTML element representing a document preview, including icon, file name, and optional integration badge.
 *
 * Supports document types such as 'receipt', 'manual', 'import', 'image', and defaults to 'document'. The preview includes a type-specific icon, a delete button, and displays the file name. If an integration ID is provided, an integration badge is shown.
 *
 * @param {string} type - The type of document ('receipt', 'manual', 'import', 'image', or other).
 * @param {string} filePath - The path to the document file.
 * @param {Function} onDeleteCallback - Callback invoked when the delete button is clicked.
 * @param {string|null} [fileName=null] - Optional file name to display; extracted from filePath if not provided.
 * @param {number|null} [fileSize=null] - Optional file size (not displayed in the preview).
 * @param {string|null} [integrationId=null] - Optional integration ID for displaying an integration badge.
 * @return {HTMLElement} The constructed document preview element.
 */
export function createDocumentPreview(type, filePath, onDeleteCallback, fileName = null, fileSize = null, integrationId = null) {
    const previewItem = document.createElement('div');
    previewItem.className = 'file-preview-item';
    
    let typeLabel = 'Manual';
    switch (type) {
        case 'receipt':
            typeLabel = 'Receipt';
            break;
        case 'manual':
            typeLabel = 'Manual';
            break;
        case 'import':
            typeLabel = 'Import';
            break;
        case 'image':
            typeLabel = 'Image';
            break;
        default:
            typeLabel = 'Document';
            break;
    }
    const title = `Delete ${typeLabel}`;

    let fileIcon;
    if (type === 'receipt') {
        fileIcon = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2m4 -14h6m-6 4h6m-2 4h2" />
        </svg>`;
    } else if (type === 'image') {
        fileIcon = `<svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
        </svg>`;
    } else {
        fileIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
          </svg>`;
    }
    
    // Extract file name from path if not provided
    if (!fileName && typeof filePath === 'string') {
        fileName = filePath.split('/').pop();
    }
    
    const integrationBadge = integrationId ? 
        getIntegrationBadge(integrationId) : '';
    
    previewItem.innerHTML = `
        <div class="file-preview">
            <div class="preview-content">
                ${fileIcon}
            </div>
        </div>
        ${integrationBadge}
        <button type="button" class="delete-preview-btn" title="${title}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
        </button>
        <div class="file-info-pill">
            <span class="file-name">${fileName || 'Document'}</span>
        </div>
    `;
    
    if (onDeleteCallback) {
        const deleteButton = previewItem.querySelector('.delete-preview-btn');
        deleteButton.addEventListener('click', onDeleteCallback);
    }
    
    return previewItem;
}

/**
 * Add a new preview to the container (for multiple files)
 * 
 * @param {Element} container - The container element to add preview to
 * @param {string} type - Type of preview ('photo', 'receipt', or 'manual')
 * @param {string} displayPath - Path to the file for display (e.g., with base URL)
 * @param {string} originalPath - Original path of the file as stored on the server
 * @param {Element} fileInput - The file input element to clear on delete
 * @param {Object} modalManager - The instance of the modal manager to update delete flags
 * @param {string} fileName - The name of the file
 * @param {string} fileSize - The size of the file
 */
export function setupFilePreview(container, type, displayPath, originalPath, fileInput, modalManager, fileName = null, fileSize = null) {
    if (!container || !displayPath) return;

    const confirmMessage = `Are you sure you want to delete this ${type}?`;
    
    const onDelete = () => {
        if (confirm(confirmMessage)) {
            // Remove only this specific preview element
            previewElement.remove();
            if (modalManager && modalManager.filesToDelete) {
                modalManager.filesToDelete.push(originalPath);
            }
        }
    };
    
    let previewElement;
    
    // Extract file name from path if not provided
    if (!fileName && typeof displayPath === 'string') {
        fileName = displayPath.split('/').pop();
    }
    
    if (type === 'photo') {
        previewElement = createPhotoPreview(displayPath, onDelete, fileName, fileSize);
    } else {
        previewElement = createDocumentPreview(type, displayPath, onDelete, fileName, fileSize);
    }
    
    container.appendChild(previewElement);
}

/**
 * Adds a preview element for an existing file to a container, supporting integration badges and preventing duplicate uploads.
 *
 * For files linked to integrations, displays the appropriate badge and uses a preview URL if available. Handles special cases for Paperless integration images by rendering a document preview with an image icon. When a file is deleted, updates the modal manager's deletion list and, if file upload helpers are present, adds a marker file to track the deletion.
 *
 * @param {Element} container - The container to which the preview element will be appended.
 * @param {string} type - The type of file preview ('photo', 'receipt', 'manual', 'import', 'image', or other document types).
 * @param {string} displayPath - The display path or URL for the file.
 * @param {string} originalPath - The original server-side path of the file.
 * @param {Element} fileInput - The file input element associated with the upload.
 * @param {Object} modalManager - The modal manager instance used to track files marked for deletion.
 * @param {string} [fileName=null] - The file's name; if not provided, it is extracted from the display path.
 * @param {string} [fileSize=null] - The file's size in bytes.
 * @param {Object} [fileInfo={}] - Additional file metadata, such as integrationId, previewUrl, or mimeType.
 */
export function setupExistingFilePreview(container, type, displayPath, originalPath, fileInput, modalManager, fileName = null, fileSize = null, fileInfo = {}) {
    if (!container || !displayPath || !fileInput) return;

    // Extract file name from path if not provided
    if (!fileName && typeof displayPath === 'string') {
        fileName = displayPath.split('/').pop();
    }

    // For external images with integration info, use preview URL if available
    let actualDisplayPath = displayPath;
    if (type === 'photo' && fileInfo.integrationId && fileInfo.previewUrl) {
        actualDisplayPath = fileInfo.previewUrl;
    }

    // Create the delete handler that integrates with the modal manager's filesToDelete system
    const confirmMessage = `Are you sure you want to delete this ${type}?`;
    const onDelete = () => {
        if (confirm(confirmMessage)) {
            // Remove the preview element
            previewElement.remove();
            
            // Add to the modal manager's filesToDelete array for server-side deletion
            if (modalManager && modalManager.filesToDelete) {
                modalManager.filesToDelete.push(originalPath);
            }
            
            // If file upload helpers are available, we need to track this differently
            // We'll create a special marker to represent the deleted existing file
            if (fileInput._fileUploadHelpers) {
                // Create a unique marker for this deleted file
                const deletedFileMarker = new File(['DELETED_EXISTING_FILE'], `DELETED:${fileName}`, {
                    type: 'application/x-deleted-marker',
                    lastModified: Date.now()
                });
                
                // Store the original path on the file object for reference
                deletedFileMarker._originalPath = originalPath;
                deletedFileMarker._isDeletedExisting = true;
                
                // Add this marker so the upload system knows about the deletion
                fileInput._fileUploadHelpers.addFile(deletedFileMarker, false);
            }
        }
    };

    let previewElement;
    
    // Create the preview element directly with the server path (not mock file)
    const integrationId = fileInfo.integrationId || null;
    
    // Special handling for Paperless images - show image icon instead of trying to load actual image
    const isPaperlessImage = type === 'photo' && 
                            integrationId === 'paperless' && 
                            fileInfo.mimeType && 
                            fileInfo.mimeType.startsWith('image/');
    
    if (isPaperlessImage) {
        // For Paperless images, use document preview with image icon to avoid broken image links
        previewElement = createDocumentPreview('image', actualDisplayPath, onDelete, fileName, fileSize, integrationId);
    } else if (type === 'photo') {
        previewElement = createPhotoPreview(actualDisplayPath, onDelete, fileName, fileSize, integrationId);
    } else if (type === 'image') {
        previewElement = createDocumentPreview(type, actualDisplayPath, onDelete, fileName, fileSize, integrationId);
    } else {
        previewElement = createDocumentPreview(type, actualDisplayPath, onDelete, fileName, fileSize, integrationId);
    }
    
    // Add the preview to the container
    container.appendChild(previewElement);
}

/**
 * Returns the HTML string for an integration badge corresponding to the given integration ID.
 * If a badge is not available from the integrations manager, a generic badge is returned.
 * @param {string} integrationId - The unique identifier for the integration.
 * @returns {string} The HTML markup for the integration badge.
 */
function getIntegrationBadge(integrationId) {
    return integrationsManager?.getIntegrationBadge(integrationId) || `<div class="integration-badge generic-badge"><span title="From ${integrationId}">${integrationId}</span></div>`;
}

/**
 * Initializes the preview renderer with external dependencies.
 * 
 * Sets up required services such as the integrations manager for use in file preview rendering functions.
 */
export function initPreviewRenderer(config) {
    integrationsManager = config.integrationsManager;
}

export default {
    createPhotoPreview,
    createDocumentPreview,
    setupFilePreview,
    setupExistingFilePreview,
    getIntegrationBadge,
    initPreviewRenderer
};
