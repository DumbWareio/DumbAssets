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
        
        // Duplicate modal elements
        this.duplicateModal = document.getElementById('duplicateModal');
        this.duplicateModalTitle = document.getElementById('duplicateModalTitle');
        this.duplicateModalDescription = document.getElementById('duplicateModalDescription');
        this.duplicateCountInput = document.getElementById('duplicateCount');
        this.confirmDuplicateBtn = document.getElementById('confirmDuplicateBtn');
        this.cancelDuplicateBtn = document.getElementById('cancelDuplicateBtn');
        this.duplicateAssetBtn = document.getElementById('duplicateAssetBtn');
        this.duplicateSubAssetBtn = document.getElementById('duplicateSubAssetBtn');
        this.duplicatePropertiesSection = document.getElementById('duplicatePropertiesSection');
        this.duplicatePropertiesGrid = document.getElementById('duplicatePropertiesGrid');
        
        // Define properties that can be duplicated for assets and sub-assets
        this.duplicatableProperties = {
            asset: {
                'manufacturer': { label: 'Manufacturer', default: true },
                'modelNumber': { label: 'Model Number', default: true },
                'serialNumber': { label: 'Serial Number', default: true },
                'description': { label: 'Description', default: true },
                'purchaseDate': { label: 'Purchase Date', default: true },
                'price': { label: 'Purchase Price', default: true },
                'quantity': { label: 'Quantity', default: true },
                'link': { label: 'Product Link', default: true },
                'tags': { label: 'Tags', default: true },
                'warranty': { label: 'Warranty Info', default: true },
                'secondaryWarranty': { label: 'Secondary Warranty', default: true },
                'maintenanceEvents': { label: 'Maintenance Events', default: true },
                'photoPath': { label: 'Photos', default: true },
                'receiptPath': { label: 'Receipts', default: true },
                'manualPath': { label: 'Manuals', default: true },
                'subAssets': { label: 'Copy Components', default: true }
            },
            subAsset: {
                'manufacturer': { label: 'Manufacturer', default: true },
                'modelNumber': { label: 'Model Number', default: true },
                'serialNumber': { label: 'Serial Number', default: true },
                'notes': { label: 'Notes', default: true },
                'purchaseDate': { label: 'Purchase Date', default: true },
                'purchasePrice': { label: 'Purchase Price', default: true },
                'quantity': { label: 'Quantity', default: true },
                'link': { label: 'Product Link', default: true },
                'tags': { label: 'Tags', default: true },
                'warranty': { label: 'Warranty Info', default: true },
                'maintenanceEvents': { label: 'Maintenance Events', default: true },
                'photoPath': { label: 'Photos', default: true },
                'receiptPath': { label: 'Receipts', default: true },
                'manualPath': { label: 'Manuals', default: true },
                'subAssets': { label: 'Copy Sub-Components', default: true }
            }
        };
        
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
        
        // Store global state getters
        this.getAssets = getAssets;
        this.getSubAssets = getSubAssets;
        
        // Modal state
        this.isEditMode = false;
        this.currentAsset = null;
        this.currentSubAsset = null;
        this.filesToDelete = [];
        
        // Duplication state
        this.duplicateType = null; // 'asset' or 'subAsset'
        this.duplicateSource = null; // The asset/subAsset being duplicated
        
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
        if (this.duplicateAssetBtn) {
            this.duplicateAssetBtn.onclick = () => {
                this.openDuplicateModal('asset');
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
        if (this.duplicateSubAssetBtn) {
            this.duplicateSubAssetBtn.onclick = () => {
                this.openDuplicateModal('subAsset');
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
    
    // Duplication methods
    openDuplicateModal(type, itemId = null) {
        if (!this.duplicateModal) return;
        
        this.duplicateType = type;
        
        // Find the source asset/subAsset by ID
        if (itemId) {
            if (type === 'asset') {
                const assets = this.getAssets();
                this.duplicateSource = assets.find(a => a.id === itemId);
            } else {
                const subAssets = this.getSubAssets();
                this.duplicateSource = subAssets.find(sa => sa.id === itemId);
            }
        } else {
            // Fallback to current item (for backward compatibility)
            this.duplicateSource = type === 'asset' ? this.currentAsset : this.currentSubAsset;
        }
        
        if (!this.duplicateSource) {
            globalThis.toaster.show(`Failed to find ${type} with ID: ${itemId}`, 'error');
            return;
        }
        
        // Update modal content
        this.duplicateModalTitle.textContent = type === 'asset' ? 'Duplicate Asset' : 'Duplicate Component';
        this.duplicateModalDescription.textContent = `How many duplicates of "${this.duplicateSource.name}" would you like to create?`;
        
        // Reset input
        this.duplicateCountInput.value = '1';
        
        // Reset properties section to collapsed
        if (this.duplicatePropertiesSection) {
            this.duplicatePropertiesSection.setAttribute('data-collapsed', 'true');
        }
        
        // Generate property toggles
        this.generatePropertyToggles(type);
        
        // Initialize collapsible section
        if (window.initCollapsibleSections) {
            window.initCollapsibleSections();
        }
        
        // Set up event listeners
        this.setupDuplicateModalButtons();
        
        // Focus on count input
        this.duplicateCountInput.focus();
        
        // Show modal
        this.duplicateModal.style.display = 'block';
    }
    
    closeDuplicateModal() {
        if (!this.duplicateModal) return;
        
        this.duplicateModal.style.display = 'none';
        this.duplicateType = null;
        this.duplicateSource = null;
        
        // Remove event listeners
        if (this.confirmDuplicateBtn) {
            this.confirmDuplicateBtn.onclick = null;
        }
        if (this.cancelDuplicateBtn) {
            this.cancelDuplicateBtn.onclick = null;
        }
    }
    
    setupDuplicateModalButtons() {
        // Set up confirm button
        if (this.confirmDuplicateBtn) {
            this.confirmDuplicateBtn.onclick = () => {
                this.performDuplication();
            };
        }
        
        // Set up cancel button
        if (this.cancelDuplicateBtn) {
            this.cancelDuplicateBtn.onclick = () => {
                this.closeDuplicateModal();
            };
        }
        
        // Set up close button
        const closeBtn = this.duplicateModal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.onclick = () => {
                this.closeDuplicateModal();
            };
        }
        
        // Set up Enter key handler
        this.duplicateCountInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performDuplication();
            }
        };
        
        // Set up input event to update button text dynamically
        this.duplicateCountInput.oninput = () => {
            this.updateDuplicateButtonText();
        };
        
        // Initialize button text
        this.updateDuplicateButtonText();
    }
    
    updateDuplicateButtonText() {
        if (!this.confirmDuplicateBtn || !this.duplicateCountInput) return;
        
        const count = parseInt(this.duplicateCountInput.value) || 1;
        const duplicateIcon = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                <path stroke="none" d="M0 0h24v24H0z" />
                                <path
                                    d="M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" />
                                <path d="M4.012 16.737a2 2 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" />
                                <path d="M11 14h6" />
                                <path d="M14 11v6" />
                            </svg>`;
        if (count === 1) {
            this.confirmDuplicateBtn.innerHTML = `${duplicateIcon} Create Duplicate`;
        } else {
            this.confirmDuplicateBtn.innerHTML = `${duplicateIcon} Create Duplicates (${count})`;
        }
    }

    async performDuplication() {
        const count = parseInt(this.duplicateCountInput.value);
        
        if (!count || count < 1 || count > 100) {
            globalThis.toaster.show('Please enter a valid number between 1 and 100', 'error');
            return;
        }
        
        try {
            this.setButtonLoading(this.confirmDuplicateBtn, true);
            
            // Get selected properties
            const selectedProperties = this.getSelectedProperties();
            
            // Create the source object with only the original asset data (no modifications)
            const sourceData = { ...this.duplicateSource };
            
            // Send duplication request to server with source data and property selections
            const apiBaseUrl = globalThis.getApiBaseUrl();
            const endpoint = this.duplicateType === 'asset' ? '/api/assets/duplicate' : '/api/subassets/duplicate';
            const response = await fetch(`${apiBaseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    source: sourceData,
                    count: count,
                    selectedProperties: selectedProperties
                }),
                credentials: 'include'
            });
            
            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) throw new Error(responseValidation.errorMessage);
            
            // Parse the response to get the created items
            const result = await response.json();
            const createdItems = result.items || [];
            
            // Close modals
            this.closeDuplicateModal();
            if (this.duplicateType === 'asset') {
                this.closeAssetModal();
            } else {
                this.closeSubAssetModal();
            }
            
            // Refresh data first
            await this.refreshData();
            
            // Navigate appropriately based on what was duplicated
            if (createdItems.length > 0 && this.renderAssetDetails) {
                const firstItem = createdItems[0];
                
                if (this.duplicateType === 'asset') {
                    // For assets, navigate to the first duplicated asset
                    this.renderAssetDetails(firstItem.id, false);
                } else {
                    // For sub-assets, check if it's a sub-sub-asset (has parentSubId)
                    if (firstItem.parentSubId) {
                        // This is a sub-sub-asset, navigate to the parent sub-asset
                        this.renderAssetDetails(firstItem.parentSubId, true);
                    } else {
                        // This is a first-level sub-asset, navigate to the parent asset to show the duplicated component in context
                        const parentAssetId = firstItem.parentId;
                        if (parentAssetId) {
                            this.renderAssetDetails(parentAssetId, false);
                        } else {
                            // Fallback: navigate to the sub-asset itself if no parent found
                            this.renderAssetDetails(firstItem.id, true);
                        }
                    }
                }
            }
            
            // Show success message
            globalThis.toaster.show(`Successfully created ${count} duplicate${count > 1 ? 's' : ''}!`);
            
        } catch (error) {
            globalThis.logError('Error creating duplicates:', error.message);
        } finally {
            this.setButtonLoading(this.confirmDuplicateBtn, false);
        }
    }
    
    createDuplicate(source, type, index) {
        const duplicate = { ...source };
        
        // Generate new ID
        duplicate.id = this.generateId();
        
        // Add sequential numbering to duplicate names
        duplicate.name = `${source.name} (${index})`;
        
        // Clear serial number and warranty information
        duplicate.serialNumber = '';
        duplicate.warranty = {
            scope: '',
            expirationDate: null,
            isLifetime: false
        };
        
        // Clear secondary warranty for assets
        if (type === 'asset' && duplicate.secondaryWarranty) {
            duplicate.secondaryWarranty = {
                scope: '',
                expirationDate: null,
                isLifetime: false
            };
        }
        
        // Clear file paths (duplicates won't have files)
        duplicate.photoPath = null;
        duplicate.receiptPath = null;
        duplicate.manualPath = null;
        duplicate.photoPaths = [];
        duplicate.receiptPaths = [];
        duplicate.manualPaths = [];
        duplicate.photoInfo = [];
        duplicate.receiptInfo = [];
        duplicate.manualInfo = [];
        
        // Clear maintenance events
        duplicate.maintenanceEvents = [];
        
        // Set new timestamps
        duplicate.createdAt = new Date().toISOString();
        duplicate.updatedAt = new Date().toISOString();
        
        return duplicate;
    }
    
    async refreshData() {
        // This should be provided by the parent script
        if (window.refreshAllData) {
            await window.refreshAllData();
        }
    }
    
    generatePropertyToggles(type) {
        if (!this.duplicatePropertiesGrid) return;
        
        // Clear existing toggles
        this.duplicatePropertiesGrid.innerHTML = '';
        
        const properties = this.duplicatableProperties[type];
        if (!properties) return;
        
        // Create toggle for each property
        Object.entries(properties).forEach(([key, config]) => {
            const toggleRow = document.createElement('div');
            toggleRow.className = 'toggle-row';
            
            // Create toggle HTML structure matching settings modal
            toggleRow.innerHTML = `
                <span>${config.label}</span>
                <label class="toggle-switch">
                    <input type="checkbox" 
                           id="duplicate-${key}" 
                           name="duplicate-${key}" 
                           ${config.default ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            `;
            
            this.duplicatePropertiesGrid.appendChild(toggleRow);
        });
    }
    
    getSelectedProperties() {
        const selected = {};
        const properties = this.duplicatableProperties[this.duplicateType];
        if (!properties) return selected;
        
        Object.keys(properties).forEach(key => {
            const checkbox = document.getElementById(`duplicate-${key}`);
            if (checkbox) {
                selected[key] = checkbox.checked;
            }
        });
        
        return selected;
    }
}