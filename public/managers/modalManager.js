/**
 * Modal Manager
 * Handles all modal operations for assets and sub-assets
 */

import { formatDate } from '../helpers/utils.js';

export class ModalManager {
    constructor({
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
        getAssets,
        getSubAssets
    }) {
        // Store DOM elements
        this.assetModal = assetModal;
        this.assetForm = assetForm;
        this.assetSaveBtn = this.assetForm.querySelector('.save-btn');
        this.subAssetModal = subAssetModal;
        this.subAssetForm = subAssetForm;
        this.subAssetSaveBtn = this.subAssetForm.querySelector('.save-btn');
        
        // Store utility functions
        this.formatDate = formatDate;
        this.formatCurrency = formatCurrency;
        this.formatFileSize = formatFileSize;
        this.generateId = generateId;
        
        // Store file handling functions
        this.handleFileUploads = handleFileUploads;
        this.setupFilePreview = setupFilePreview;
        this.setupExistingFilePreview = setupExistingFilePreview;
        this.formatFilePath = formatFilePath;
        
        // Store UI functions
        this.setButtonLoading = setButtonLoading;
        this.expandSection = expandSection;
        this.collapseSection = collapseSection;
        
        // Store data functions
        this.saveAsset = saveAsset;
        this.saveSubAsset = saveSubAsset;
        
        // Store managers
        this.assetTagManager = assetTagManager;
        this.subAssetTagManager = subAssetTagManager;
        this.maintenanceManager = maintenanceManager;
        
        // Store global state getters
        this.getAssets = getAssets;
        this.getSubAssets = getSubAssets;
        
        // Modal state
        this.isEditMode = false;
        this.currentAsset = null;
        this.currentSubAsset = null;
        this.filesToDelete = [];
        
        // File deletion flags
        this.deletePhoto = false;
        this.deleteReceipt = false;
        this.deleteManual = false;
        this.deleteSubPhoto = false;
        this.deleteSubReceipt = false;
        this.deleteSubManual = false;
        
        // Store keyboard event handlers to prevent duplication
        this.assetKeydownHandler = null;
        this.subAssetKeydownHandler = null;
        
        // Initialize event listeners
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // Add escape key listener for all modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAssetModal();
                this.closeSubAssetModal();
            }
        });
        
        // Add click-off-to-close for modals
        [this.assetModal, this.subAssetModal].forEach(modal => {
            if (modal) {
                modal.addEventListener('mousedown', (e) => {
                    if (e.target === modal) {
                        modal.style.display = 'none';
                    }
                });
            }
        });
    }
    
    openAssetModal(asset = null) {
        if (!this.assetModal || !this.assetForm) return;
        
        this.isEditMode = !!asset;
        this.currentAsset = asset;
        this.filesToDelete = [];
        
        document.getElementById('addAssetTitle').textContent = this.isEditMode ? 'Edit Asset' : 'Add Asset';
        this.assetForm.reset();
        let containsExistingFiles = false;
        let containsExistingMaintenanceEvents = false;

        // Reset loading state of save button
        const saveBtn = this.assetForm.querySelector('.save-btn');
        this.setButtonLoading(saveBtn, false);

        // Reset delete flags
        this.deletePhoto = false;
        this.deleteReceipt = false;
        this.deleteManual = false;
        
        // Reset secondary warranty fields
        const secondaryWarrantyFields = document.getElementById('secondaryWarrantyFields');
        if (secondaryWarrantyFields) {
            secondaryWarrantyFields.style.display = 'none';
        }
        
        // Set up secondary warranty button
        this.setupSecondaryWarrantyButton();
        
        // Clear file inputs and previews
        this.clearFileInputs();
        
        if (this.isEditMode && asset) {
            this.populateAssetForm(asset);
            containsExistingFiles = this.setupAssetFilePreviews(asset);
            this.maintenanceManager.setMaintenanceEvents('asset', asset.maintenanceEvents || []);
            containsExistingMaintenanceEvents = asset.maintenanceEvents && asset.maintenanceEvents.length > 0;
        } else {
            this.assetForm.reset();
            this.assetTagManager.setTags([]);
            this.maintenanceManager.setMaintenanceEvents('asset', []);
            containsExistingMaintenanceEvents = false;
        }
        
        // Set up form submission
        this.setupAssetFormSubmission();
        
        // Set up keyboard shortcuts
        this.setupAssetKeyboardShortcuts();
        
        // Set up cancel and close buttons
        this.setupAssetModalButtons();
        
        // Handle maintenance section expansion
        if (containsExistingMaintenanceEvents) this.expandSection('#assetMaintenanceSection');
        else this.collapseSection('#assetMaintenanceSection');
        
        // Handle file section expansion
        if (containsExistingFiles) this.expandSection('#assetFileUploader');
        else this.collapseSection('#assetFileUploader');
        
        // Show the modal
        this.assetModal.style.display = 'block';
        this.assetModal.querySelector('.modal-content').scrollTop = 0; // Reset scroll position;
    }
    
    closeAssetModal() {
        if (!this.assetModal) return;
        
        // Reset loading state of save button
        const saveBtn = this.assetForm.querySelector('.save-btn');
        this.setButtonLoading(saveBtn, false);

        // Clear file inputs and previews
        this.clearFileInputs();

        // Remove keyboard event handler
        if (this.assetKeydownHandler) {
            this.assetModal.removeEventListener('keydown', this.assetKeydownHandler);
            this.assetKeydownHandler = null;
        }

        this.assetModal.style.display = 'none';
        this.currentAsset = null;
        this.isEditMode = false;
    }
    
    openSubAssetModal(subAsset = null, parentId = null, parentSubId = null) {
        if (!this.subAssetModal || !this.subAssetForm) return;
        
        this.isEditMode = !!subAsset;
        this.currentSubAsset = subAsset;
        this.filesToDelete = [];
        
        document.getElementById('addComponentTitle').textContent = this.isEditMode ? 'Edit Component' : 'Add Component';
        this.subAssetForm.reset();
        let containsExistingFiles = false;
        
        // Reset loading state of save button
        const saveBtn = this.subAssetForm.querySelector('.save-btn');
        this.setButtonLoading(saveBtn, false);

        // Reset delete flags
        this.deleteSubPhoto = false;
        this.deleteSubReceipt = false;
        this.deleteSubManual = false;
        
        // Clear file inputs and previews
        this.clearSubAssetFileInputs();
        
        // Set parent IDs
        this.setParentIds(parentId, parentSubId, subAsset);
        
        if (this.isEditMode && subAsset) {
            this.populateSubAssetForm(subAsset);
            containsExistingFiles = this.setupSubAssetFilePreviews(subAsset);
            this.maintenanceManager.setMaintenanceEvents('subAsset', subAsset.maintenanceEvents || []);
        } else {
            this.subAssetForm.reset();
            this.subAssetTagManager.setTags([]);
            this.maintenanceManager.setMaintenanceEvents('subAsset', []);
        }
        
        // Set up form submission
        this.setupSubAssetFormSubmission();
        
        // Set up keyboard shortcuts
        this.setupSubAssetKeyboardShortcuts();
        
        // Set up cancel and close buttons
        this.setupSubAssetModalButtons();
        
        
        // Handle file section expansion
        if (containsExistingFiles) {
            this.expandSection('#subAssetFileUploader');
        } else {
            this.collapseSection('#subAssetFileUploader');
        }
        
        // Show the modal
        this.subAssetModal.style.display = 'block';
        this.subAssetModal.querySelector('.modal-content').scrollTop = 0; // Reset scroll position;
    }
    
    closeSubAssetModal() {
        if (!this.subAssetModal) return;
        
        // Reset loading state of save button
        const saveBtn = this.subAssetForm.querySelector('.save-btn');
        this.setButtonLoading(saveBtn, false);

        // Clear file inputs and previews
        this.clearSubAssetFileInputs();

        // Remove keyboard event handler
        if (this.subAssetKeydownHandler) {
            this.subAssetModal.removeEventListener('keydown', this.subAssetKeydownHandler);
            this.subAssetKeydownHandler = null;
        }

        this.subAssetModal.style.display = 'none';
        this.currentSubAsset = null;
        this.isEditMode = false;
    }
    
    setupSecondaryWarrantyButton() {
        const addSecondaryWarrantyBtn = document.getElementById('addSecondaryWarranty');
        if (addSecondaryWarrantyBtn) {
            addSecondaryWarrantyBtn.setAttribute('aria-expanded', 'false');
            addSecondaryWarrantyBtn.setAttribute('aria-controls', 'secondaryWarrantyFields');
            addSecondaryWarrantyBtn.title = 'Add Secondary Warranty';
            addSecondaryWarrantyBtn.onclick = () => {
                const fields = document.getElementById('secondaryWarrantyFields');
                const expanded = fields && fields.style.display !== 'none';
                if (fields) {
                    if (expanded) {
                        fields.style.display = 'none';
                        addSecondaryWarrantyBtn.innerHTML = `
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Warranty`;
                        addSecondaryWarrantyBtn.title = 'Add Secondary Warranty';
                        addSecondaryWarrantyBtn.setAttribute('aria-expanded', 'false');
                    } else {
                        fields.style.display = 'block';
                        addSecondaryWarrantyBtn.innerHTML = `
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Remove Secondary Warranty`;
                        addSecondaryWarrantyBtn.title = 'Remove Secondary Warranty';
                        addSecondaryWarrantyBtn.setAttribute('aria-expanded', 'true');
                    }
                }
            };
        }
    }
    
    clearFileInputs() {
        const photoInput = document.getElementById('assetPhoto');
        const receiptInput = document.getElementById('assetReceipt');
        const manualInput = document.getElementById('assetManual');
        const photoPreview = document.getElementById('photoPreview');
        const receiptPreview = document.getElementById('receiptPreview');
        const manualPreview = document.getElementById('manualPreview');
        
        // Always reset file upload helpers to clear all state
        if (photoInput && photoInput._fileUploadHelpers) {
            photoInput._fileUploadHelpers.reset();
        }
        if (receiptInput && receiptInput._fileUploadHelpers) {
            receiptInput._fileUploadHelpers.reset();
        }
        if (manualInput && manualInput._fileUploadHelpers) {
            manualInput._fileUploadHelpers.reset();
        }
        
        // Fallback: manually clear if helpers aren't available
        if (!this.isEditMode) {
            if (photoInput) photoInput.value = '';
            if (receiptInput) receiptInput.value = '';
            if (manualInput) manualInput.value = '';
            if (photoPreview) photoPreview.innerHTML = '';
            if (receiptPreview) receiptPreview.innerHTML = '';
            if (manualPreview) manualPreview.innerHTML = '';
        }
    }
    
    clearSubAssetFileInputs() {
        const photoInput = document.getElementById('subAssetPhoto');
        const receiptInput = document.getElementById('subAssetReceipt');
        const manualInput = document.getElementById('subAssetManual');
        const photoPreview = document.getElementById('subPhotoPreview');
        const receiptPreview = document.getElementById('subReceiptPreview');
        const manualPreview = document.getElementById('subManualPreview');
        
        // Always reset file upload helpers to clear all state
        if (photoInput && photoInput._fileUploadHelpers) {
            photoInput._fileUploadHelpers.reset();
        }
        if (receiptInput && receiptInput._fileUploadHelpers) {
            receiptInput._fileUploadHelpers.reset();
        }
        if (manualInput && manualInput._fileUploadHelpers) {
            manualInput._fileUploadHelpers.reset();
        }
        
        // Fallback: manually clear if helpers aren't available
        if (!this.isEditMode) {
            if (photoInput) photoInput.value = '';
            if (receiptInput) receiptInput.value = '';
            if (manualInput) manualInput.value = '';
            if (photoPreview) photoPreview.innerHTML = '';
            if (receiptPreview) receiptPreview.innerHTML = '';
            if (manualPreview) manualPreview.innerHTML = '';
        }
    }
    
    populateAssetForm(asset) {
        const fields = {
            'assetName': asset.name || '',
            'assetModel': asset.modelNumber || '',
            'assetManufacturer': asset.manufacturer || '',
            'assetSerial': asset.serialNumber || '',
            'assetPurchaseDate': asset.purchaseDate || '',
            'assetPrice': asset.price || '',
            'assetWarrantyScope': asset.warranty?.scope || '',
            'assetWarrantyLifetime': asset.warranty?.isLifetime || false,
            'assetWarrantyExpiration': asset.warranty?.expirationDate ? new Date(formatDate(asset.warranty.expirationDate)).toISOString().split('T')[0] : '',
            'assetNotes': asset.description || '',
            'assetLink': asset.link || ''
        };
        
        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });
        
        // Set tags
        this.assetTagManager.setTags(asset.tags || []);
        
        // Handle secondary warranty
        this.handleSecondaryWarranty(asset);
    }
    
    populateSubAssetForm(subAsset) {
        const fields = {
            'subAssetId': subAsset.id,
            'subAssetName': subAsset.name || '',
            'subAssetManufacturer': subAsset.manufacturer || '',
            'subAssetModel': subAsset.modelNumber || '',
            'subAssetSerial': subAsset.serialNumber || '',
            'subAssetPurchaseDate': subAsset.purchaseDate || '',
            'subAssetPurchasePrice': subAsset.purchasePrice || '',
            'subAssetLink': subAsset.link || '',
            'subAssetNotes': subAsset.notes || '',
            'subAssetWarrantyScope': subAsset.warranty?.scope || '',
            'subAssetWarrantyExpiration': subAsset.warranty?.expirationDate ? new Date(formatDate(subAsset.warranty.expirationDate)).toISOString().split('T')[0] : ''
        };
        
        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });
        
        // Set warranty lifetime checkbox
        const lifetimeCheckbox = document.getElementById('subAssetWarrantyLifetime');
        if (lifetimeCheckbox) {
            lifetimeCheckbox.checked = subAsset.warranty?.isLifetime || false;
        }
        
        // Set tags
        this.subAssetTagManager.setTags(subAsset.tags || []);
    }
    
    handleSecondaryWarranty(asset) {
        const addSecondaryWarrantyBtn = document.getElementById('addSecondaryWarranty');
        const secondaryWarrantyFields = document.getElementById('secondaryWarrantyFields');
        
        if (asset.secondaryWarranty) {
            if (secondaryWarrantyFields) {
                secondaryWarrantyFields.style.display = 'block';
                document.getElementById('assetSecondaryWarrantyScope').value = asset.secondaryWarranty.scope || '';
                document.getElementById('assetSecondaryWarrantyExpiration').value = asset.secondaryWarranty.expirationDate ? new Date(formatDate(asset.secondaryWarranty.expirationDate)).toISOString().split('T')[0] : '';
                document.getElementById('assetSecondaryWarrantyLifetime').checked = asset.secondaryWarranty.isLifetime || false;
                
                if (addSecondaryWarrantyBtn) {
                    addSecondaryWarrantyBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Remove Secondary Warranty`;
                    addSecondaryWarrantyBtn.title = 'Remove Secondary Warranty';
                    addSecondaryWarrantyBtn.setAttribute('aria-expanded', 'true');
                }
            }
        } else {
            if (addSecondaryWarrantyBtn) {
                addSecondaryWarrantyBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Warranty`;
                addSecondaryWarrantyBtn.title = 'Add Secondary Warranty';
                addSecondaryWarrantyBtn.setAttribute('aria-expanded', 'false');
            }
        }
    }
    
    setParentIds(parentId, parentSubId, subAsset) {
        const parentIdInput = document.getElementById('parentAssetId');
        const parentSubIdInput = document.getElementById('parentSubAssetId');
        
        if (parentIdInput) parentIdInput.value = '';
        if (parentSubIdInput) parentSubIdInput.value = '';
        
        if (parentId && parentIdInput) {
            parentIdInput.value = parentId;
        }
        if (parentSubId && parentSubIdInput) {
            parentSubIdInput.value = parentSubId;
        }
        
        // If editing, use the sub-asset's parent info
        if (subAsset) {
            if (parentIdInput) parentIdInput.value = subAsset.parentId || parentId || '';
            if (parentSubIdInput) parentSubIdInput.value = subAsset.parentSubId || parentSubId || '';
        }
    }
    
    setupAssetFilePreviews(asset) {
        let containsExistingFiles = false;
        const photoPreview = document.getElementById('photoPreview');
        const receiptPreview = document.getElementById('receiptPreview');
        const manualPreview = document.getElementById('manualPreview');
        const photoInput = document.getElementById('assetPhoto');
        const receiptInput = document.getElementById('assetReceipt');
        const manualInput = document.getElementById('assetManual');
        
        // Clear existing previews
        if (photoPreview) photoPreview.innerHTML = '';
        if (receiptPreview) receiptPreview.innerHTML = '';
        if (manualPreview) manualPreview.innerHTML = '';
        
        // Handle multiple photos
        if (asset.photoPaths && Array.isArray(asset.photoPaths) && asset.photoPaths.length > 0) {
            asset.photoPaths.forEach((photoPath, index) => {
                const photoInfo = asset.photoInfo?.[index] || {};
                this.setupExistingFilePreview(
                    photoPreview, 
                    'photo', 
                    this.formatFilePath(photoPath),
                    photoPath,
                    photoInput, 
                    this,
                    photoInfo.originalName || photoPath.split('/').pop(),
                    photoInfo.size ? this.formatFileSize(photoInfo.size) : null
                );
            });
            containsExistingFiles = true;
        } else if (asset.photoPath) {
            // Backward compatibility for single photo
            const photoInfo = asset.photoInfo?.[0] || {};
            this.setupExistingFilePreview(
                photoPreview, 
                'photo', 
                this.formatFilePath(asset.photoPath),
                asset.photoPath,
                photoInput, 
                this,
                photoInfo.originalName || asset.photoPath.split('/').pop(),
                photoInfo.size ? this.formatFileSize(photoInfo.size) : null
            );
            containsExistingFiles = true;
        }
        
        // Handle multiple receipts
        if (asset.receiptPaths && Array.isArray(asset.receiptPaths) && asset.receiptPaths.length > 0) {
            asset.receiptPaths.forEach((receiptPath, index) => {
                const receiptInfo = asset.receiptInfo?.[index] || {};
                this.setupExistingFilePreview(
                    receiptPreview, 
                    'receipt', 
                    this.formatFilePath(receiptPath),
                    receiptPath,
                    receiptInput, 
                    this,
                    receiptInfo.originalName || receiptPath.split('/').pop(),
                    receiptInfo.size ? this.formatFileSize(receiptInfo.size) : null
                );
            });
            containsExistingFiles = true;
        } else if (asset.receiptPath) {
            // Backward compatibility for single receipt
            const receiptInfo = asset.receiptInfo?.[0] || {};
            this.setupExistingFilePreview(
                receiptPreview, 
                'receipt', 
                this.formatFilePath(asset.receiptPath),
                asset.receiptPath,
                receiptInput, 
                this,
                receiptInfo.originalName || asset.receiptPath.split('/').pop(),
                receiptInfo.size ? this.formatFileSize(receiptInfo.size) : null
            );
            containsExistingFiles = true;
        }
        
        // Handle multiple manuals
        if (asset.manualPaths && Array.isArray(asset.manualPaths) && asset.manualPaths.length > 0) {
            asset.manualPaths.forEach((manualPath, index) => {
                const manualInfo = asset.manualInfo?.[index] || {};
                this.setupExistingFilePreview(
                    manualPreview, 
                    'manual', 
                    this.formatFilePath(manualPath),
                    manualPath,
                    manualInput, 
                    this,
                    manualInfo.originalName || manualPath.split('/').pop(),
                    manualInfo.size ? this.formatFileSize(manualInfo.size) : null
                );
            });
            containsExistingFiles = true;
        } else if (asset.manualPath) {
            // Backward compatibility for single manual
            const manualInfo = asset.manualInfo?.[0] || {};
            this.setupExistingFilePreview(
                manualPreview, 
                'manual', 
                this.formatFilePath(asset.manualPath),
                asset.manualPath,
                manualInput, 
                this,
                manualInfo.originalName || asset.manualPath.split('/').pop(),
                manualInfo.size ? this.formatFileSize(manualInfo.size) : null
            );
            containsExistingFiles = true;
        }
        
        return containsExistingFiles;
    }
    
    setupSubAssetFilePreviews(subAsset) {
        let containsExistingFiles = false;
        const photoPreview = document.getElementById('subPhotoPreview');
        const receiptPreview = document.getElementById('subReceiptPreview');
        const manualPreview = document.getElementById('subManualPreview');
        const photoInput = document.getElementById('subAssetPhoto');
        const receiptInput = document.getElementById('subAssetReceipt');
        const manualInput = document.getElementById('subAssetManual');
        
        // Clear existing previews
        if (photoPreview) photoPreview.innerHTML = '';
        if (receiptPreview) receiptPreview.innerHTML = '';
        if (manualPreview) manualPreview.innerHTML = '';
        
        // Handle multiple photos
        if (subAsset.photoPaths && Array.isArray(subAsset.photoPaths) && subAsset.photoPaths.length > 0) {
            subAsset.photoPaths.forEach((photoPath, index) => {
                const photoInfo = subAsset.photoInfo?.[index] || {};
                this.setupExistingFilePreview(
                    photoPreview, 
                    'photo', 
                    this.formatFilePath(photoPath),
                    photoPath,
                    photoInput, 
                    this,
                    photoInfo.originalName || photoPath.split('/').pop(),
                    photoInfo.size ? this.formatFileSize(photoInfo.size) : null
                );
            });
            containsExistingFiles = true;
        } else if (subAsset.photoPath) {
            // Backward compatibility for single photo
            const photoInfo = subAsset.photoInfo?.[0] || {};
            this.setupExistingFilePreview(
                photoPreview, 
                'photo', 
                this.formatFilePath(subAsset.photoPath),
                subAsset.photoPath,
                photoInput, 
                this,
                photoInfo.originalName || subAsset.photoPath.split('/').pop(),
                photoInfo.size ? this.formatFileSize(photoInfo.size) : null
            );
            containsExistingFiles = true;
        }
        
        // Handle multiple receipts
        if (subAsset.receiptPaths && Array.isArray(subAsset.receiptPaths) && subAsset.receiptPaths.length > 0) {
            subAsset.receiptPaths.forEach((receiptPath, index) => {
                const receiptInfo = subAsset.receiptInfo?.[index] || {};
                this.setupExistingFilePreview(
                    receiptPreview, 
                    'receipt', 
                    this.formatFilePath(receiptPath),
                    receiptPath,
                    receiptInput, 
                    this,
                    receiptInfo.originalName || receiptPath.split('/').pop(),
                    receiptInfo.size ? this.formatFileSize(receiptInfo.size) : null
                );
            });
            containsExistingFiles = true;
        } else if (subAsset.receiptPath) {
            // Backward compatibility for single receipt
            const receiptInfo = subAsset.receiptInfo?.[0] || {};
            this.setupExistingFilePreview(
                receiptPreview, 
                'receipt', 
                this.formatFilePath(subAsset.receiptPath),
                subAsset.receiptPath,
                receiptInput, 
                this,
                receiptInfo.originalName || subAsset.receiptPath.split('/').pop(),
                receiptInfo.size ? this.formatFileSize(receiptInfo.size) : null
            );
            containsExistingFiles = true;
        }
        
        // Handle multiple manuals
        if (subAsset.manualPaths && Array.isArray(subAsset.manualPaths) && subAsset.manualPaths.length > 0) {
            subAsset.manualPaths.forEach((manualPath, index) => {
                const manualInfo = subAsset.manualInfo?.[index] || {};
                this.setupExistingFilePreview(
                    manualPreview, 
                    'manual', 
                    this.formatFilePath(manualPath),
                    manualPath,
                    manualInput, 
                    this,
                    manualInfo.originalName || manualPath.split('/').pop(),
                    manualInfo.size ? this.formatFileSize(manualInfo.size) : null
                );
            });
            containsExistingFiles = true;
        } else if (subAsset.manualPath) {
            // Backward compatibility for single manual
            const manualInfo = subAsset.manualInfo?.[0] || {};
            this.setupExistingFilePreview(
                manualPreview, 
                'manual', 
                this.formatFilePath(subAsset.manualPath),
                subAsset.manualPath,
                manualInput, 
                this,
                manualInfo.originalName || subAsset.manualPath.split('/').pop(),
                manualInfo.size ? this.formatFileSize(manualInfo.size) : null
            );
            containsExistingFiles = true;
        }
        
        return containsExistingFiles;
    }
    
    setupAssetFormSubmission() {
        this.assetForm.onsubmit = (e) => {
            e.preventDefault();
            this.setButtonLoading(this.assetSaveBtn, true);
            
            const newAssetData = this.collectAssetFormData();
            
            // Combine with existing asset data to preserve file lists
            const assetToProcess = {
                ...this.currentAsset,
                ...newAssetData
            };
            
            this.handleFileUploads(assetToProcess, this.isEditMode)
                .then(updatedAsset => this.saveAsset(updatedAsset))
                .finally(() => this.setButtonLoading(this.assetSaveBtn, false));
        };
    }
    
    setupSubAssetFormSubmission() {
        this.subAssetForm.onsubmit = (e) => {
            e.preventDefault();
            this.setButtonLoading(this.subAssetSaveBtn, true);

            const newSubAssetData = this.collectSubAssetFormData();

            if (!newSubAssetData.name || !newSubAssetData.name.trim()) {
                globalThis.toaster.show('Name is required. Please try again.', 'error');
                this.setButtonLoading(this.subAssetSaveBtn, false);
                return;
            }
            if (!newSubAssetData.parentId || !newSubAssetData.parentId.trim()) {
                globalThis.toaster.show('Parent ID is required. Please try again.', 'error');
                this.setButtonLoading(this.subAssetSaveBtn, false);
                return;
            }
            
            // Combine with existing sub-asset data to preserve file lists
            const subAssetToProcess = {
                ...this.currentSubAsset,
                ...newSubAssetData
            };
            
            this.handleFileUploads(subAssetToProcess, this.isEditMode, true)
                .then(updatedSubAsset => this.saveSubAsset(updatedSubAsset))
                .finally(() => this.setButtonLoading(this.subAssetSaveBtn, false));
        };
    }
    
    collectAssetFormData() {
        const assetTags = this.assetTagManager.getTags();
        const tagsInput = document.getElementById('assetTags');
        if (tagsInput && tagsInput.value.trim() !== '') {
            assetTags.push(tagsInput.value);
        }

        const newAsset = {
            name: document.getElementById('assetName')?.value || '',
            modelNumber: document.getElementById('assetModel')?.value || '',
            manufacturer: document.getElementById('assetManufacturer')?.value || '',
            serialNumber: document.getElementById('assetSerial')?.value || '',
            purchaseDate: document.getElementById('assetPurchaseDate')?.value || '',
            price: parseFloat(document.getElementById('assetPrice')?.value) || null,
            warranty: {
                scope: document.getElementById('assetWarrantyScope')?.value || '',
                expirationDate: document.getElementById('assetWarrantyLifetime')?.checked ? null : (document.getElementById('assetWarrantyExpiration')?.value || ''),
                isLifetime: document.getElementById('assetWarrantyLifetime')?.checked || false
            },
            link: document.getElementById('assetLink')?.value || '',
            description: document.getElementById('assetNotes')?.value || '',
            tags: assetTags,
            updatedAt: new Date().toISOString(),
            maintenanceEvents: this.maintenanceManager.getMaintenanceEvents('asset'),
            filesToDelete: this.filesToDelete || []
        };
        
        // Add secondary warranty if fields are visible and filled
        const secondaryWarrantyFields = document.getElementById('secondaryWarrantyFields');
        if (secondaryWarrantyFields && secondaryWarrantyFields.style.display !== 'none') {
            const secondaryScope = document.getElementById('assetSecondaryWarrantyScope')?.value || '';
            const secondaryExpiration = document.getElementById('assetSecondaryWarrantyLifetime')?.checked ? null : (document.getElementById('assetSecondaryWarrantyExpiration')?.value || '');
            
            if (secondaryScope || secondaryExpiration) {
                newAsset.secondaryWarranty = {
                    scope: secondaryScope,
                    expirationDate: secondaryExpiration,
                    isLifetime: document.getElementById('assetSecondaryWarrantyLifetime')?.checked || false
                };
            }
        }
        
        // Add ID and file paths
        if (this.isEditMode && this.currentAsset) {
            newAsset.id = this.currentAsset.id;
            // Copy both single and multiple file paths for backward compatibility
            newAsset.photoPath = this.currentAsset.photoPath;
            newAsset.receiptPath = this.currentAsset.receiptPath;
            newAsset.manualPath = this.currentAsset.manualPath;
            newAsset.photoPaths = this.currentAsset.photoPaths || [];
            newAsset.receiptPaths = this.currentAsset.receiptPaths || [];
            newAsset.manualPaths = this.currentAsset.manualPaths || [];
            newAsset.photoInfo = this.currentAsset.photoInfo || [];
            newAsset.receiptInfo = this.currentAsset.receiptInfo || [];
            newAsset.manualInfo = this.currentAsset.manualInfo || [];
            newAsset.createdAt = this.currentAsset.createdAt;
        } else {
            newAsset.id = this.generateId();
            newAsset.photoPath = null;
            newAsset.receiptPath = null;
            newAsset.manualPath = null;
            newAsset.createdAt = new Date().toISOString();
        }
        
        return newAsset;
    }
    
    collectSubAssetFormData() {
        const subAssetTags = this.subAssetTagManager.getTags();
        const subAssetTagsInput = document.getElementById('subAssetTags');
        if (subAssetTagsInput && subAssetTagsInput.value !== '') {
            subAssetTags.push(subAssetTagsInput.value);
        }

        const newSubAsset = {
            name: document.getElementById('subAssetName')?.value || '',
            manufacturer: document.getElementById('subAssetManufacturer')?.value || '',
            modelNumber: document.getElementById('subAssetModel')?.value || '',
            serialNumber: document.getElementById('subAssetSerial')?.value || '',
            purchaseDate: document.getElementById('subAssetPurchaseDate')?.value || '',
            purchasePrice: parseFloat(document.getElementById('subAssetPurchasePrice')?.value) || null,
            parentId: document.getElementById('parentAssetId')?.value || '',
            parentSubId: document.getElementById('parentSubAssetId')?.value || '',
            link: document.getElementById('subAssetLink')?.value || '',
            notes: document.getElementById('subAssetNotes')?.value || '',
            tags: subAssetTags,
            warranty: {
                scope: document.getElementById('subAssetWarrantyScope')?.value || '',
                expirationDate: document.getElementById('subAssetWarrantyLifetime')?.checked ? null : document.getElementById('subAssetWarrantyExpiration')?.value,
                isLifetime: document.getElementById('subAssetWarrantyLifetime')?.checked || false
            },
            updatedAt: new Date().toISOString(),
            maintenanceEvents: this.maintenanceManager.getMaintenanceEvents('subAsset'),
            filesToDelete: this.filesToDelete || []
        };
        
        // Add ID and file paths
        if (this.isEditMode && this.currentSubAsset) {
            console.log('ModalManager: Edit mode - using existing sub-asset ID:', this.currentSubAsset.id);
            newSubAsset.id = this.currentSubAsset.id;
            // Copy both single and multiple file paths for backward compatibility
            newSubAsset.photoPath = this.currentSubAsset.photoPath;
            newSubAsset.receiptPath = this.currentSubAsset.receiptPath;
            newSubAsset.manualPath = this.currentSubAsset.manualPath;
            newSubAsset.photoPaths = this.currentSubAsset.photoPaths || [];
            newSubAsset.receiptPaths = this.currentSubAsset.receiptPaths || [];
            newSubAsset.manualPaths = this.currentSubAsset.manualPaths || [];
            newSubAsset.photoInfo = this.currentSubAsset.photoInfo || [];
            newSubAsset.receiptInfo = this.currentSubAsset.receiptInfo || [];
            newSubAsset.manualInfo = this.currentSubAsset.manualInfo || [];
            newSubAsset.createdAt = this.currentSubAsset.createdAt;
            
            // Handle file deletions - This is now handled by filesToDelete array
        } else {
            const generatedId = this.generateId();
            console.log('ModalManager: Create mode - generating new ID:', generatedId);
            newSubAsset.id = generatedId;
            newSubAsset.photoPath = null;
            newSubAsset.receiptPath = null;
            newSubAsset.manualPath = null;
            newSubAsset.createdAt = new Date().toISOString();
        }
        
        console.log('ModalManager: Final sub-asset data collected:', {
            id: newSubAsset.id,
            name: newSubAsset.name,
            parentId: newSubAsset.parentId,
            parentSubId: newSubAsset.parentSubId,
            isEditMode: this.isEditMode
        });
        
        return newSubAsset;
    }
    
    setupAssetKeyboardShortcuts() {
        // Remove existing handler if it exists
        if (this.assetKeydownHandler) {
            this.assetModal.removeEventListener('keydown', this.assetKeydownHandler);
        }
        
        // Create new handler
        this.assetKeydownHandler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.assetForm.dispatchEvent(new Event('submit'));
            }
        };
        
        // Add the new handler
        this.assetModal.addEventListener('keydown', this.assetKeydownHandler);
    }
    
    setupSubAssetKeyboardShortcuts() {
        // Remove existing handler if it exists
        if (this.subAssetKeydownHandler) {
            this.subAssetModal.removeEventListener('keydown', this.subAssetKeydownHandler);
        }
        
        // Create new handler
        this.subAssetKeydownHandler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.subAssetForm.dispatchEvent(new Event('submit'));
            }
        };
        
        // Add the new handler
        this.subAssetModal.addEventListener('keydown', this.subAssetKeydownHandler);
    }
    
    setupAssetModalButtons() {
        // Set up cancel button
        const cancelBtn = this.assetForm.querySelector('.cancel-btn');
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                this.closeAssetModal();
            };
        }
        
        // Set up close button
        const closeBtn = this.assetModal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.onclick = () => {
                this.closeAssetModal();
            };
        }
    }
    
    setupSubAssetModalButtons() {
        // Set up cancel button
        const cancelBtn = this.subAssetForm.querySelector('.cancel-btn');
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                this.closeSubAssetModal();
            };
        }
        
        // Set up close button
        const closeBtn = this.subAssetModal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.onclick = () => {
                this.closeSubAssetModal();
            };
        }
    }
    
    // Public methods for external access
    getDeleteFlags() {
        return {
            deletePhoto: this.deletePhoto,
            deleteReceipt: this.deleteReceipt,
            deleteManual: this.deleteManual,
            deleteSubPhoto: this.deleteSubPhoto,
            deleteSubReceipt: this.deleteSubReceipt,
            deleteSubManual: this.deleteSubManual
        };
    }
    
    resetDeleteFlags() {
        this.deletePhoto = false;
        this.deleteReceipt = false;
        this.deleteManual = false;
        this.deleteSubPhoto = false;
        this.deleteSubReceipt = false;
        this.deleteSubManual = false;
    }
} 