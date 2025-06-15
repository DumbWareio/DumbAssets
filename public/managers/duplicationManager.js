/**
 * Duplication Manager
 * Handles all duplication operations for assets and sub-assets
 */

export class DuplicationManager {
    constructor({
        // Utility functions
        setButtonLoading,
        generateId,
        
        // Navigation functions
        renderAssetDetails,
        closeAssetModal,
        closeSubAssetModal,
        
        // Data functions
        refreshData,
        getAssets,
        getSubAssets
    }) {
        // Store dependencies
        this.setButtonLoading = setButtonLoading;
        this.generateId = generateId;
        this.renderAssetDetails = renderAssetDetails;
        this.closeAssetModal = closeAssetModal;
        this.closeSubAssetModal = closeSubAssetModal;
        this.refreshData = refreshData;
        this.getAssets = getAssets;
        this.getSubAssets = getSubAssets;
        
        // DOM elements
        this.duplicateModal = document.getElementById('duplicateModal');
        this.duplicateModalTitle = document.getElementById('duplicateModalTitle');
        this.duplicateModalDescription = document.getElementById('duplicateModalDescription');
        this.duplicateCountInput = document.getElementById('duplicateCount');
        this.duplicatePropertiesSection = document.getElementById('duplicatePropertiesSection');
        this.duplicatePropertiesGrid = document.getElementById('duplicatePropertiesGrid');
        this.confirmDuplicateBtn = document.getElementById('confirmDuplicateBtn');
        this.cancelDuplicateBtn = document.getElementById('cancelDuplicateBtn');
        
        // State
        this.duplicateType = null;
        this.duplicateSource = null;
        
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
    }

    /**
     * Open the duplication modal
     * @param {string} type - 'asset' or 'subAsset'
     * @param {string} itemId - ID of the item to duplicate
     */
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

    /**
     * Close the duplication modal
     */
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

    /**
     * Set up event listeners for the duplicate modal buttons
     */
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

    /**
     * Update the duplicate button text based on count
     */
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

    /**
     * Perform the duplication operation
     */
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
            
            // Store the duplicate type before closing modal (since closeDuplicateModal sets it to null)
            const duplicatedType = this.duplicateType;
            
            // Close the duplicate modal
            this.closeDuplicateModal();
            this.closeAssetModal();
            this.closeSubAssetModal();
            
            // Refresh data first
            await this.refreshData();
            
            // Navigate appropriately based on what was duplicated
            if (createdItems.length > 0 && this.renderAssetDetails) {
                const firstItem = createdItems[0];
                
                if (duplicatedType === 'asset') {
                  // For assets, navigate to the first duplicated asset
                  console.log(`[DuplicationManager] Navigating to first duplicated asset: ${firstItem.id}`);
                  this.renderAssetDetails(firstItem.id, false);
                } else {
                    // For sub-assets, we need to determine the navigation context
                    if (firstItem.parentSubId) {
                        // This is a sub-sub-asset (component of a component)
                        // Stay on the parent sub-asset to show the newly duplicated sub-component
                        console.log(`[DuplicationManager] Navigating to parent sub-asset: ${firstItem.parentSubId}`);
                        this.renderAssetDetails(firstItem.parentSubId, true);
                    } else {
                        // This is a first-level sub-asset (component of an asset)
                        // We need to check the current context to decide where to navigate
                        const sourceItem = this.duplicateSource;
                        
                        if (sourceItem && sourceItem.parentSubId) {
                            // If the source was also a sub-sub-asset, stay on the parent sub-asset
                            console.log(`[DuplicationManager] Source was sub-sub-asset, staying on parent sub-asset: ${sourceItem.parentSubId}`);
                            this.renderAssetDetails(sourceItem.parentSubId, true);
                        } else {
                            // Source was a first-level sub-asset, show the parent asset with the new component
                            const parentAssetId = firstItem.parentId;
                            if (parentAssetId) {
                                console.log(`[DuplicationManager] Navigating to parent asset: ${parentAssetId}`);
                                this.renderAssetDetails(parentAssetId, false);
                            } else {
                                // Fallback: navigate to the sub-asset itself if no parent found
                                console.log(`[DuplicationManager] Fallback - navigating to sub-asset: ${firstItem.id}`);
                                this.renderAssetDetails(firstItem.id, true);
                            }
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

    /**
     * Generate property toggles for the duplicate modal
     * @param {string} type - 'asset' or 'subAsset'
     */
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

    /**
     * Get the selected properties from the duplicate modal
     * @returns {Object} Object with selected properties
     */
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
