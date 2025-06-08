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
    
    // Store all files and their preview states
    let allFiles = [];
    let filePreviewMap = new Map(); // Maps fileKey to preview element
    let newFilesSet = new Set(); // Tracks which files are newly added (not existing)

    // Helper function to create unique file key
    const createFileKey = (file) => `${file.name}-${file.size}-${file.lastModified}`;

    // Helper function to update input.files from allFiles
    const updateInputFiles = () => {
        const dataTransfer = new DataTransfer();
        allFiles.forEach(file => {
            dataTransfer.items.add(file);
        });
        input.files = dataTransfer.files;
    };

    // Helper function to remove file and its preview
    const removeFile = (fileToRemove) => {
        const fileKey = createFileKey(fileToRemove);
        
        // Remove from allFiles
        allFiles = allFiles.filter(file => createFileKey(file) !== fileKey);
        
        // Remove from newFilesSet
        newFilesSet.delete(fileKey);
        
        // Remove preview if it exists
        if (filePreviewMap.has(fileKey)) {
            const previewElement = filePreviewMap.get(fileKey);
            previewElement.remove();
            filePreviewMap.delete(fileKey);
        }
        
        // Update input.files
        updateInputFiles();
        
        // If this is an import file, reset the import form
        if (fileType === 'import' && window.resetImportForm) {
            window.resetImportForm();
        }
    };

    // Helper function to add file and create preview
    const addFile = (file, isNewFile = true) => {
        const fileKey = createFileKey(file);
        
        // Skip if already exists
        if (filePreviewMap.has(fileKey)) {
            return;
        }
        
        // Add to allFiles
        allFiles.push(file);
        
        // Track if this is a new file (user uploaded) vs existing file (loaded for preview)
        if (isNewFile) {
            newFilesSet.add(fileKey);
        }
        
        // Special handling for marker files (existing files, deleted files)
        // These don't need previews created since they're handled separately
        if (file._isExisting || file._isDeletedExisting || file.type === 'application/x-deleted-marker') {
            // Don't create a preview - it's already handled or not needed
            return;
        }
        
        // Create preview element
        const previewItem = document.createElement('div');
        filePreviewMap.set(fileKey, previewItem);
        
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
            
            // Set up delete handler
            const deleteHandler = () => {
                if (confirm(`Are you sure you want to delete this ${docType}?`)) {
                    removeFile(file);
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
                        removeFile(file);
                    }
                };
                
                // Use createPhotoPreview for images with filename and size
                const photoPreview = createPhotoPreview(e.target.result, deleteHandler, sanitizeFileName(file.name), formatFileSize(file.size));
                previewItem.appendChild(photoPreview);
            };
            reader.readAsDataURL(file);
        }

        preview.appendChild(previewItem);
    };

    // Helper function to add existing file for preview only (not for upload)
    const addExistingFile = (file) => {
        addFile(file, false); // false = not a new file
    };

    // Handle file input changes (additive behavior)
    input.onchange = () => {
        if (input.files && input.files.length > 0) {
            // Get newly selected files
            const newFiles = Array.from(input.files);
            
            // Add each new file (addFile will handle duplicates)
            newFiles.forEach(file => {
                addFile(file, true); // true = new file
            });
            
            // Update input.files to include all files
            updateInputFiles();
        } else {
            // Input was cleared - remove all files and previews
            allFiles = [];
            newFilesSet.clear();
            filePreviewMap.forEach((previewElement) => {
                previewElement.remove();
            });
            filePreviewMap.clear();
        }
    };

    // Expose helper functions for external use (e.g., drag and drop)
    input._fileUploadHelpers = {
        addFile: (file) => addFile(file, true), // Always mark as new when added via helpers
        addExistingFile,
        removeFile,
        getAllFiles: () => [...allFiles],
        getNewFiles: () => allFiles.filter(file => newFilesSet.has(createFileKey(file))),
        clearAll: () => {
            allFiles = [];
            newFilesSet.clear();
            filePreviewMap.forEach((previewElement) => {
                previewElement.remove();
            });
            filePreviewMap.clear();
            updateInputFiles();
        },
        reset: () => {
            // Complete reset - clear everything and reset input
            allFiles = [];
            newFilesSet.clear();
            filePreviewMap.forEach((previewElement) => {
                previewElement.remove();
            });
            filePreviewMap.clear();
            input.value = ''; // Clear the input value
            updateInputFiles();
        },
        getState: () => ({
            totalFiles: allFiles.length,
            newFiles: Array.from(newFilesSet).length,
            existingFiles: allFiles.length - Array.from(newFilesSet).length
        })
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

        // 2. Handle new uploads - only upload truly new files
        let newPaths = [];
        let newInfos = [];
        if (input && input._fileUploadHelpers) {
            // Use helper to get only new files (not existing ones loaded for preview)
            const allHelperFiles = input._fileUploadHelpers.getAllFiles();
            
            // Filter out existing files, deleted markers, and only get truly new files
            const newFiles = allHelperFiles.filter(file => {
                // Skip existing file markers
                if (file._isExisting) return false;
                
                // Skip deleted file markers  
                if (file._isDeletedExisting || file.type === 'application/x-deleted-marker') return false;
                
                // Check if it's marked as new
                const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
                return input._fileUploadHelpers.getNewFiles().some(newFile => 
                    `${newFile.name}-${newFile.size}-${newFile.lastModified}` === fileKey
                );
            });
            
            // Also collect deletion information from markers
            const deletionMarkers = allHelperFiles.filter(file => 
                file._isDeletedExisting || file.type === 'application/x-deleted-marker'
            );
            
            // Add deleted paths to the asset's filesToDelete array
            deletionMarkers.forEach(marker => {
                if (marker._originalPath) {
                    if (!assetCopy.filesToDelete) {
                        assetCopy.filesToDelete = [];
                    }
                    if (!assetCopy.filesToDelete.includes(marker._originalPath)) {
                        assetCopy.filesToDelete.push(marker._originalPath);
                    }
                }
            });
            
            if (newFiles.length > 0) {
                const sanitizedFiles = newFiles.map(file => new File([file], sanitizeFileName(file.name), { type: file.type }));
                const result = await uploadFiles(sanitizedFiles, typeMap[fileType], assetCopy.id);
                if (result && result.files) {
                    newPaths = result.files.map(f => f.path);
                    newInfos = result.files.map(f => f.fileInfo);
                }
            }
        } else if (input && input.files && input.files.length > 0) {
            // Fallback for when helpers aren't available - upload all files in input
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
                let validFiles = 0;
                let invalidFiles = 0;
                
                // Check if this input accepts multiple files
                const acceptsMultiple = fileInput.hasAttribute('multiple');
                
                // For single file inputs, only take the first file
                const filesToProcess = acceptsMultiple ? Array.from(files) : [files[0]];
                
                // Use helper functions if available (from setupFileInputPreview)
                if (fileInput._fileUploadHelpers) {
                    // For single file inputs, clear existing files first
                    if (!acceptsMultiple) {
                        fileInput._fileUploadHelpers.clearAll();
                    }
                    
                    filesToProcess.forEach(file => {
                        if (validateFileType(file, fileInput.accept)) {
                            const sanitizedFile = new File([file], sanitizeFileName(file.name), { type: file.type });
                            fileInput._fileUploadHelpers.addFile(sanitizedFile);
                            validFiles++;
                        } else {
                            invalidFiles++;
                        }
                    });
                } else {
                    // Fallback to old method if helpers aren't available
                    const dataTransfer = new DataTransfer();
                    
                    // For single file inputs, don't preserve existing files
                    if (acceptsMultiple) {
                        // Build a set of existing file keys for multiple file inputs
                        const existingFileKeys = new Set();
                        if (fileInput.files) {
                            Array.from(fileInput.files).forEach(file => {
                                const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
                                existingFileKeys.add(fileKey);
                                dataTransfer.items.add(file);
                            });
                        }
                        // Add new files only if not already present
                        filesToProcess.forEach(file => {
                            const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
                            if (validateFileType(file, fileInput.accept) && !existingFileKeys.has(fileKey)) {
                                dataTransfer.items.add(new File([file], sanitizeFileName(file.name), { type: file.type }));
                                validFiles++;
                            } else if (!validateFileType(file, fileInput.accept)) {
                                invalidFiles++;
                            }
                        });
                    } else {
                        // For single file inputs, replace with the new file
                        filesToProcess.forEach(file => {
                            if (validateFileType(file, fileInput.accept)) {
                                dataTransfer.items.add(new File([file], sanitizeFileName(file.name), { type: file.type }));
                                validFiles++;
                            } else {
                                invalidFiles++;
                            }
                        });
                    }
                    
                    if (validFiles > 0) {
                        fileInput.files = dataTransfer.files;
                        fileInput.dispatchEvent(new Event('change'));
                    }
                }
                
                if (invalidFiles > 0) {
                    if (validFiles > 0) {
                        const fileText = acceptsMultiple ? 'file(s)' : 'file';
                        globalThis.toaster?.show(`${validFiles} valid ${fileText} added. ${invalidFiles} file(s) were invalid or duplicate and were skipped.`, 'error') ||
                        alert(`${validFiles} valid ${fileText} added. ${invalidFiles} file(s) were invalid or duplicate and were skipped.`);
                    } else {
                        const message = acceptsMultiple
                            ? 'Invalid file type(s) or duplicate files. Please upload supported, non-duplicate files.'
                            : 'Invalid file type. Please upload a supported file.';
                        if (globalThis.toaster) globalThis.toaster.show(message, 'error');
                        else alert(message);
                    }
                } else if (validFiles > 1 && !acceptsMultiple) {
                    // User dropped multiple files on a single-file input
                    if (globalThis.toaster) globalThis.toaster?.show('Only one file allowed. The first valid file was selected.', 'error');
                    else alert('Only one file allowed. The first valid file was selected.');
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