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
        
        // Navigation functions
        renderAssetDetails,
        
        // Tag and maintenance managers
        assetTagManager,
        subAssetTagManager,
        maintenanceManager,
        
        // Managers
        duplicationManager,
        
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
        
        // Store duplication buttons
        this.duplicateAssetBtn = document.getElementById('duplicateAssetBtn');
        this.duplicateSubAssetBtn = document.getElementById('duplicateSubAssetBtn');
        
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
        
        // Store navigation functions
        this.renderAssetDetails = renderAssetDetails;
        
        // Store managers
        this.assetTagManager = assetTagManager;
        this.subAssetTagManager = subAssetTagManager;
        this.maintenanceManager = maintenanceManager;
        this.duplicationManager = duplicationManager;
        
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
        // Add any event listeners that are needed for the modals
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
        this.resetFileUploaderHelper(photoInput);
        this.resetFileUploaderHelper(receiptInput);
        this.resetFileUploaderHelper(manualInput);
        
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

    resetFileUploaderHelper(input) {
        if (input && input._fileUploadHelpers) {
            input._fileUploadHelpers.reset();
        } else {
            // Fallback for browsers that don't support custom file upload helpers
            input.value = '';
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
        this.resetFileUploaderHelper(photoInput);
        this.resetFileUploaderHelper(receiptInput);
        this.resetFileUploaderHelper(manualInput);
        
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
            'assetQuantity': asset.quantity || 1,
            'assetWarrantyScope': asset.warranty?.scope || '',
            'assetWarrantyLifetime': asset.warranty?.isLifetime || false,
            'assetWarrantyExpiration': asset.warranty?.expirationDate ? new Date(asset.warranty.expirationDate).toISOString().split('T')[0] : '',
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
            'subAssetQuantity': subAsset.quantity || 1,
            'subAssetLink': subAsset.link || '',
            'subAssetNotes': subAsset.notes || '',
            'subAssetWarrantyScope': subAsset.warranty?.scope || '',
            'subAssetWarrantyExpiration': subAsset.warranty?.expirationDate ? new Date(subAsset.warranty.expirationDate).toISOString().split('T')[0] : ''
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
                document.getElementById('assetSecondaryWarrantyExpiration').value = asset.secondaryWarranty.expirationDate ? new Date(asset.secondaryWarranty.expirationDate).toISOString().split('T')[0] : '';
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
                    photoInfo.size ? this.formatFileSize(photoInfo.size) : null,
                    photoInfo
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
                photoInfo.size ? this.formatFileSize(photoInfo.size) : null,
                photoInfo
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
                    receiptInfo.size ? this.formatFileSize(receiptInfo.size) : null,
                    receiptInfo
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
                receiptInfo.size ? this.formatFileSize(receiptInfo.size) : null,
                receiptInfo
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
                    manualInfo.size ? this.formatFileSize(manualInfo.size) : null,
                    manualInfo
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
                manualInfo.size ? this.formatFileSize(manualInfo.size) : null,
                manualInfo
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
                    photoInfo.size ? this.formatFileSize(photoInfo.size) : null,
                    photoInfo
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
                photoInfo.size ? this.formatFileSize(photoInfo.size) : null,
                photoInfo
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
                    receiptInfo.size ? this.formatFileSize(receiptInfo.size) : null,
                    receiptInfo
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
                receiptInfo.size ? this.formatFileSize(receiptInfo.size) : null,
                receiptInfo
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
                    manualInfo.size ? this.formatFileSize(manualInfo.size) : null,
                    manualInfo
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
                manualInfo.size ? this.formatFileSize(manualInfo.size) : null,
                manualInfo
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
            quantity: parseInt(document.getElementById('assetQuantity')?.value) || 1,
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
            quantity: parseInt(document.getElementById('subAssetQuantity')?.value) || 1,
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
        
        // Set up duplicate button
        if (this.duplicateAssetBtn && this.duplicationManager) {
            this.duplicateAssetBtn.onclick = () => {
                if (this.currentAsset) {
                    this.duplicationManager.openDuplicateModal('asset', this.currentAsset.id);
                }
            };
            // Only show duplicate button in edit mode
            this.duplicateAssetBtn.style.display = this.isEditMode ? 'flex' : 'none';
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
        
        // Set up duplicate button
        if (this.duplicateSubAssetBtn && this.duplicationManager) {
            this.duplicateSubAssetBtn.onclick = () => {
                if (this.currentSubAsset) {
                    this.duplicationManager.openDuplicateModal('subAsset', this.currentSubAsset.id);
                }
            };
            // Only show duplicate button in edit mode
            this.duplicateSubAssetBtn.style.display = this.isEditMode ? 'flex' : 'none';
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
    
    // Public method to provide access to duplication functionality
    openDuplicateModal(type, itemId = null) {
        if (this.duplicationManager) {
            this.duplicationManager.openDuplicateModal(type, itemId);
        }
    }

    /**
     * Attach a Paperless document to the current asset/sub-asset
     * @param {Object} attachment - The attachment object from PaperlessManager
     * @param {string} attachmentType - Type of attachment ('photo', 'receipt', 'manual')
     * @param {boolean} isSubAsset - Whether this is for a sub-asset
     */
    async attachPaperlessDocument(attachment, attachmentType, isSubAsset) {
        try {
            // Generate preview for the Paperless document
            const previewId = isSubAsset ? 
                `sub${attachmentType.charAt(0).toUpperCase() + attachmentType.slice(1)}Preview` :
                `${attachmentType}Preview`;
            
            const previewContainer = document.getElementById(previewId);
            if (!previewContainer) {
                throw new Error(`Preview container ${previewId} not found`);
            }

            // Create a preview element for the Paperless document
            const previewElement = this._createPaperlessPreview(attachment, attachmentType);
            previewContainer.appendChild(previewElement);

            // Store the attachment data for saving
            const targetAsset = isSubAsset ? this.currentSubAsset : this.currentAsset;
            if (!targetAsset) {
                throw new Error('No asset currently being edited');
            }

            // Initialize arrays if they don't exist
            const pathsKey = `${attachmentType}Paths`;
            const infoKey = `${attachmentType}Info`;
            
            if (!targetAsset[pathsKey]) targetAsset[pathsKey] = [];
            if (!targetAsset[infoKey]) targetAsset[infoKey] = [];

            // Add the Paperless document as a "file"
            targetAsset[pathsKey].push(attachment.downloadUrl);
            targetAsset[infoKey].push({
                originalName: attachment.title,
                size: attachment.fileSize,
                isPaperlessDocument: true,
                paperlessId: attachment.paperlessId,
                mimeType: attachment.mimeType,
                attachedAt: attachment.attachedAt
            });

            console.log(`Attached Paperless document to ${isSubAsset ? 'sub-asset' : 'asset'}:`, {
                type: attachmentType,
                title: attachment.title,
                paperlessId: attachment.paperlessId
            });

        } catch (error) {
            globalThis.logError('Failed to attach Paperless document:', error.message);
            throw error;
        }
    }

    /**
     * Create a preview element for a Paperless document
     * @param {Object} attachment - The attachment object
     * @param {string} type - The attachment type
     * @returns {HTMLElement} - The preview element
     */
    _createPaperlessPreview(attachment, type) {
        const previewItem = document.createElement('div');
        previewItem.className = 'file-preview-item paperless-document';
        
        // Determine if this is an image or document
        const isImage = attachment.mimeType && attachment.mimeType.startsWith('image/');
        
        // For images, show actual preview if possible, otherwise show document icon
        let previewContent;
        if (isImage) {
            // Try to show image preview, fall back to document icon
            previewContent = `
                <img src="${attachment.downloadUrl}" alt="Paperless Document Preview" 
                     style="max-width: 100%; max-height: 85px; object-fit: contain; border-radius: var(--app-border-radius);"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="preview-content" style="display:none;">
                    <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                    </svg>
                </div>`;
        } else {
            // Show document icon
            previewContent = `
                <div class="preview-content">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                </div>
            `;
        }

        previewItem.innerHTML = `
            <div class="file-preview">
                ${previewContent}
                <div class="paperless-badge">
                    <img src="/assets/paperless-ngx.png" alt="Paperless NGX" title="From Paperless NGX">
                </div>
            </div>
            <button type="button" class="delete-preview-btn" title="Remove attachment">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
            </button>
            <div class="file-info-pill">
                <span class="file-name" title="${this._escapeHtml(attachment.title)}">${this._escapeHtml(attachment.title)}</span>
                ${attachment.fileSize ? `<span class="file-size">${this.formatFileSize(attachment.fileSize)}</span>` : ''}
            </div>
        `;

        // Add click handler for preview/download
        const filePreview = previewItem.querySelector('.file-preview');
        if (filePreview) {
            filePreview.addEventListener('click', () => {
                window.open(attachment.downloadUrl, '_blank');
            });
            filePreview.style.cursor = 'pointer';
        }

        // Add delete button handler
        const deleteBtn = previewItem.querySelector('.delete-preview-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this._removePaperlessAttachment(previewItem, attachment, type);
            });
        }

        return previewItem;
    }

    /**
     * Remove a Paperless document attachment
     * @param {HTMLElement} previewElement - The preview element to remove
     * @param {Object} attachment - The attachment object
     * @param {string} type - The attachment type
     */
    _removePaperlessAttachment(previewElement, attachment, type) {
        const targetAsset = this.currentSubAsset || this.currentAsset;
        if (!targetAsset) return;

        const pathsKey = `${type}Paths`;
        const infoKey = `${type}Info`;

        if (targetAsset[pathsKey] && targetAsset[infoKey]) {
            // Find and remove the attachment
            const index = targetAsset[pathsKey].indexOf(attachment.downloadUrl);
            if (index > -1) {
                targetAsset[pathsKey].splice(index, 1);
                targetAsset[infoKey].splice(index, 1);
            }
        }

        // Remove the preview element
        previewElement.remove();

        globalThis.toaster.show(`Removed "${attachment.title}" from attachments`, 'success');
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}