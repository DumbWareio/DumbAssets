/**
 * File Upload Module
 * Handles file uploads, previews, and drag-and-drop functionality
 */

import { validateFileType, formatFileSize, sanitizeFileName } from './utils.js';
import { createPhotoPreview, createDocumentPreview } from '../render/previewRenderer.js';

// Get access to the global flags
let deletePhoto = false, deleteReceipt = false, deleteManual = false;
let deleteSubPhoto = false, deleteSubReceipt = false, deleteSubManual = false;

// Look for these flags in the window object to access them across modules
function getDeleteFlags() {
    // For main assets
    if (typeof window !== 'undefined') {
        deletePhoto = window.deletePhoto || false;
        deleteReceipt = window.deleteReceipt || false;
        deleteManual = window.deleteManual || false;
        // For sub-assets
        deleteSubPhoto = window.deleteSubPhoto || false;
        deleteSubReceipt = window.deleteSubReceipt || false;
        deleteSubManual = window.deleteSubManual || false;
    }
    return { deletePhoto, deleteReceipt, deleteManual, deleteSubPhoto, deleteSubReceipt, deleteSubManual };
}

/**
 * Upload files to the server
 * @param {FileList|File[]} files - The files to upload
 * @param {string} type - The type of file ('image', 'receipt', or 'manual')
 * @param {string} id - The ID of the associated asset
 * @returns {Promise<{files: Array}|null>} - The uploaded files info, or null if the upload failed
 */
async function uploadFiles(files, type, id) {
    let fieldName;
    let endpoint;
    const apiBaseUrl = window.location.origin + (window.appConfig?.basePath || '');
    
    if (type === 'image') {
        fieldName = 'photo';
        endpoint = `${apiBaseUrl}/api/upload/image`;
    } else if (type === 'manual') {
        fieldName = 'manual';
        endpoint = `${apiBaseUrl}/api/upload/manual`;
    } else {
        fieldName = 'receipt';
        endpoint = `${apiBaseUrl}/api/upload/receipt`;
    }
    
    const formData = new FormData();
    Array.from(files).forEach(file => {
        formData.append(fieldName, new File([file], sanitizeFileName(file.name), { type: file.type }));
    });
    formData.append('id', id);
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        const responseValidation = await globalThis.validateResponse(response);
        if (responseValidation.errorMessage) throw new Error(responseValidation.errorMessage);
        
        const data = await response.json();
        return data;
    } catch (error) {
        globalThis.logError('File upload failed', error.message);
        return null;
    }
}

/**
 * Upload a single file to the server (backward compatibility)
 * @param {File} file - The file to upload
 * @param {string} type - The type of file ('image', 'receipt', or 'manual')
 * @param {string} id - The ID of the associated asset
 * @returns {Promise<{path: string, fileInfo: Object}|null>} - The path and info of the uploaded file, or null if the upload failed
 */
async function uploadFile(file, type, id) {
    const result = await uploadFiles([file], type, id);
    return result ? result.files[0] : null;
}

/**
 * Setup file preview functionality for a file input element
 * @param {string} inputId - The ID of the file input element
 * @param {string} previewId - The ID of the preview container element
 * @param {boolean} isDocument - Whether the file is a document (true) or image (false)
 * @param {string} fileType - The type of file ('image', 'receipt', or 'manual')
 */
function setupFileInputPreview(inputId, previewId, isDocument = false, fileType = 'image') {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const uploadBox = document.querySelector(`[data-target="${inputId}"]`);
    
    if (!input || !preview) return;
    
    // Store the previous file value to restore if user cancels
    let previousValue = input.value;

    // Drag and drop functionality is handled by setupDragAndDrop()

    input.onchange = () => {
        // Don't clear existing previews - only add new ones
        // The existing previews are managed by setupFilePreview() calls from modal manager
        
        // Only show preview if there are files
        if (input.files && input.files.length > 0) {
            Array.from(input.files).forEach(file => {
                // Create the preview element using component approach
                const previewItem = document.createElement('div');
                
                if (isDocument) {
                    // For documents (receipt, manual, or import), use the document preview component
                    let docType;
                    if (fileType === 'receipt') {
                        docType = 'receipt';
                    } else if (fileType === 'import') {
                        docType = 'import';
                    } else if (fileType === 'manual') {
                        docType = 'manual';
                    } else {
                        docType = 'document';
                    }
                    const reader = new FileReader();
                    
                    // Set up delete handler
                    const deleteHandler = () => {
                        if (confirm(`Are you sure you want to delete this ${docType}?`)) {
                            previewItem.remove();
                            // Update the input files
                            const dataTransfer = new DataTransfer();
                            Array.from(input.files).forEach((f, i) => {
                                if (f !== file) {
                                    dataTransfer.items.add(new File([f], sanitizeFileName(f.name), { type: f.type }));
                                }
                            });
                            input.files = dataTransfer.files;
                            
                            // If this is an import file, reset the import form
                            if (fileType === 'import' && window.resetImportForm) {
                                window.resetImportForm();
                            }
                        }
                    };
                    
                    // Use createDocumentPreview for documents with filename and size
                    const docPreview = createDocumentPreview(docType, sanitizeFileName(file.name), deleteHandler, sanitizeFileName(file.name), formatFileSize(file.size));
                    previewItem.appendChild(docPreview);
                    
                } else {
                    // For images, use the photo preview component
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        // Set up delete handler
                        const deleteHandler = () => {
                            if (confirm('Are you sure you want to delete this image?')) {
                                previewItem.remove();
                                // Update the input files
                                const dataTransfer = new DataTransfer();
                                Array.from(input.files).forEach((f, i) => {
                                    if (f !== file) {
                                        dataTransfer.items.add(new File([f], sanitizeFileName(f.name), { type: f.type }));
                                    }
                                });
                                input.files = dataTransfer.files;
                            }
                        };
                        
                        // Use createPhotoPreview for images with filename and size
                        const photoPreview = createPhotoPreview(e.target.result, deleteHandler, sanitizeFileName(file.name), formatFileSize(file.size));
                        previewItem.appendChild(photoPreview);
                    };
                    reader.readAsDataURL(file);
                }

                preview.appendChild(previewItem);
            });
        }
    };
}

/**
 * Handle file uploads for an asset
 * @param {Object} asset - The asset to upload files for
 * @param {boolean} isEditMode - Whether we're editing an existing asset or creating a new one
 * @param {boolean} isSubAsset - Whether this is a sub-asset
 * @returns {Promise<Object>} - The updated asset with file paths
 */
async function handleFileUploads(asset, isEditMode, isSubAsset = false) {
    const assetCopy = { ...asset };

    // Ensure file path and info arrays exist
    ['photo', 'receipt', 'manual'].forEach(type => {
        assetCopy[`${type}Paths`] = assetCopy[`${type}Paths`] || [];
        assetCopy[`${type}Info`] = assetCopy[`${type}Info`] || [];
    });

    const fileInputs = {
        photo: document.getElementById(isSubAsset ? 'subAssetPhoto' : 'assetPhoto'),
        receipt: document.getElementById(isSubAsset ? 'subAssetReceipt' : 'assetReceipt'),
        manual: document.getElementById(isSubAsset ? 'subAssetManual' : 'assetManual')
    };

    const processFiles = async (fileType) => {
        const input = fileInputs[fileType];
        const typeMap = { photo: 'image', receipt: 'receipt', manual: 'manual' };
        const pathsKey = `${fileType}Paths`;
        const infoKey = `${fileType}Info`;
        const legacyPathKey = `${fileType}Path`;

        let currentPaths = assetCopy[pathsKey] || (assetCopy[legacyPathKey] ? [assetCopy[legacyPathKey]] : []);
        let currentInfos = assetCopy[infoKey] || [];

        // 1. Filter out files marked for deletion
        if (assetCopy.filesToDelete && assetCopy.filesToDelete.length > 0) {
            const filesToDeleteSet = new Set(assetCopy.filesToDelete);
            const filteredEntries = [];
            currentPaths.forEach((path, index) => {
                if (!filesToDeleteSet.has(path)) {
                    filteredEntries.push({ path, info: currentInfos[index] });
                }
            });
            currentPaths = filteredEntries.map(e => e.path);
            currentInfos = filteredEntries.map(e => e.info || {});
        }

        // 2. Handle new uploads
        let newPaths = [];
        let newInfos = [];
        if (input && input.files && input.files.length > 0) {
            const sanitizedFiles = Array.from(input.files).map(file => new File([file], sanitizeFileName(file.name), { type: file.type }));
            const result = await uploadFiles(sanitizedFiles, typeMap[fileType], assetCopy.id);
            if (result && result.files) {
                newPaths = result.files.map(f => f.path);
                newInfos = result.files.map(f => f.fileInfo);
            }
        }

        // 3. Merge and set the final arrays
        assetCopy[pathsKey] = [...currentPaths, ...newPaths];
        assetCopy[infoKey] = [...currentInfos, ...newInfos];
        assetCopy[legacyPathKey] = assetCopy[pathsKey][0] || null;
    };

    await processFiles('photo');
    await processFiles('receipt');
    await processFiles('manual');

    return assetCopy;
}

/**
 * Set up drag and drop functionality for all file upload boxes
 */
function setupDragAndDrop() {
    // Add click handler for file upload boxes
    document.querySelectorAll('.file-upload-box').forEach(box => {
        const fileInput = box.querySelector('input[type="file"]');
        box.addEventListener('click', (e) => {
            // Only trigger file input if clicking the box itself, not its children
            if (e.target === box) {
                fileInput.click();
            }
        });
    });

    // Add drag and drop handlers for file upload boxes
    document.querySelectorAll('.file-upload-box').forEach(box => {
        const fileInput = box.querySelector('input[type="file"]');
        const targetId = box.getAttribute('data-target');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            box.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            box.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            box.addEventListener(eventName, unhighlight, false);
        });

        function highlight(e) {
            box.classList.add('drag-over');
        }

        function unhighlight(e) {
            box.classList.remove('drag-over');
        }

        box.addEventListener('drop', handleDrop, false);

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            handleFiles(files);
        }

        function handleFiles(files) {
            if (files.length > 0) {
                const dataTransfer = new DataTransfer();
                let validFiles = 0;
                
                // Add existing files first
                if (fileInput.files) {
                    Array.from(fileInput.files).forEach(file => {
                        dataTransfer.items.add(file);
                    });
                }
                
                // Add new files
                Array.from(files).forEach(file => {
                    if (validateFileType(file, fileInput.accept)) {
                        dataTransfer.items.add(new File([file], sanitizeFileName(file.name), { type: file.type }));
                        validFiles++;
                    }
                });
                
                if (validFiles > 0) {
                    fileInput.files = dataTransfer.files;
                    fileInput.dispatchEvent(new Event('change'));
                } else {
                    alert('Invalid file type(s). Please upload supported files.');
                }
            }
        }
    });
}

// Export the functions
export {
    uploadFile,
    uploadFiles,
    setupFileInputPreview,
    handleFileUploads,
    setupDragAndDrop
};