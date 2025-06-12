// public/managers/import.js
// ImportManager handles all import modal logic, file selection, mapping, and import actions

import { sanitizeFileName } from '/src/services/fileUpload/utils.js';

export class ImportManager {
    constructor({
        importModal,
        importBtn,
        importFile,
        startImportBtn,
        columnSelects,
        setButtonLoading,
        loadAssets,
        renderDashboard
    }) {
        this.importModal = importModal;
        this.importBtn = importBtn;
        this.importFile = importFile;
        this.startImportBtn = startImportBtn;
        this.columnSelects = columnSelects;
        this.setButtonLoading = setButtonLoading;
        this.loadAssets = loadAssets;
        this.renderDashboard = renderDashboard;
        this._bindEvents();
    }

    _bindEvents() {
        this.importBtn.addEventListener('click', () => {
            this.resetImportForm();
            this.importModal.style.display = 'block';
        });
        this.importModal.querySelector('.close-btn').addEventListener('click', () => {
            this.importModal.style.display = 'none';
            this.resetImportForm();
        });
        this.importFile.addEventListener('change', (e) => this._handleFileSelection(e));
        this.startImportBtn.addEventListener('click', () => this._handleImport());
        
        // Set up drag and drop for import file
        this._setupDragAndDrop();
        
        // Download Template button event
        const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
        if (downloadTemplateBtn) {
            downloadTemplateBtn.addEventListener('click', () => this._downloadTemplate());
        }
        window.resetImportForm = this.resetImportForm.bind(this);
    }

    _setupDragAndDrop() {
        const fileUploadBox = document.querySelector('.file-upload-box[data-target="importFile"]');
        if (!fileUploadBox) return;

        const self = this;

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileUploadBox.addEventListener(eventName, self._preventDefaults, false);
        });

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            fileUploadBox.addEventListener(eventName, () => fileUploadBox.classList.add('drag-over'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            fileUploadBox.addEventListener(eventName, () => fileUploadBox.classList.remove('drag-over'), false);
        });

        // Handle dropped files
        fileUploadBox.addEventListener('drop', (e) => self._handleFileDrop(e), false);
    }

    _preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    async _handleFileDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            // Only take the first file for import (single file upload)
            const file = files[0];
            
            // Validate file type
            const acceptedTypes = ['.csv', '.xls', '.xlsx'];
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            
            if (!acceptedTypes.includes(fileExtension)) {
                globalThis.toaster.show(`Invalid file type. Please select a ${acceptedTypes.join(', ')} file.`, 'error');
                return;
            }
            
            // Set the file on the actual input element so it's properly tracked
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            this.importFile.files = dataTransfer.files;
            
            // Create a synthetic file input event to reuse existing logic
            const syntheticEvent = {
                target: {
                    files: [file]
                }
            };
            
            // Call the existing file selection handler
            await this._handleFileSelection(syntheticEvent);
        }
    }

    async _handleFileSelection(e) {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const formData = new FormData();
            formData.append('file', new File([file], sanitizeFileName(file.name), { type: file.type }));
            const response = await fetch('/api/import-assets', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) throw new Error(responseValidation.errorMessage);

            const data = await response.json();
            const headers = data.headers || [];
            // Show the column mapping section
            const mappingContainer = document.querySelector('.column-mapping');
            if (mappingContainer) mappingContainer.style.display = 'block';
            // Populate column selects
            this.columnSelects.forEach(select => {
                select.innerHTML = '<option value="">Select Column</option>';
                headers.forEach((header, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = header;
                    select.appendChild(option);
                });
            });
            // Also populate new selects
            const urlColumn = document.getElementById('urlColumn');
            const warrantyColumn = document.getElementById('warrantyColumn');
            const warrantyExpirationColumn = document.getElementById('warrantyExpirationColumn');
            const lifetimeColumn = document.getElementById('lifetimeColumn');
            const tagsColumn = document.getElementById('tagsColumn');
            const quantityColumn = document.getElementById('quantityColumn');
            [urlColumn, warrantyColumn, warrantyExpirationColumn, lifetimeColumn, tagsColumn, quantityColumn].forEach(select => {
                if (!select) return;
                select.innerHTML = '<option value="">Select Column</option>';
                headers.forEach((header, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = header;
                    select.appendChild(option);
                });
            });
            const secondaryWarrantyColumn = document.getElementById('secondaryWarrantyColumn');
            const secondaryWarrantyExpirationColumn = document.getElementById('secondaryWarrantyExpirationColumn');
            [secondaryWarrantyColumn, secondaryWarrantyExpirationColumn].forEach(select => {
                if (!select) return;
                select.innerHTML = '<option value="">Select Column</option>';
                headers.forEach((header, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = header;
                    select.appendChild(option);
                });
            });
            this.autoMapColumns(headers);
            this.startImportBtn.disabled = headers.length === 0;
        } catch (error) {
            globalThis.logError('Failed to read file:', error.message);
        }
    }

    async _handleImport() {
        this.setButtonLoading(this.startImportBtn, true);
        const file = this.importFile.files[0];
        if (!file) return;
        // Get column mappings
        const mappings = {
            name: document.getElementById('nameColumn').value,
            model: document.getElementById('modelColumn').value,
            manufacturer: document.getElementById('manufacturerColumn').value,
            serial: document.getElementById('serialColumn').value,
            purchaseDate: document.getElementById('purchaseDateColumn').value,
            purchasePrice: document.getElementById('purchasePriceColumn').value,
            notes: document.getElementById('notesColumn').value,
            url: document.getElementById('urlColumn').value,
            warranty: document.getElementById('warrantyColumn').value,
            warrantyExpiration: document.getElementById('warrantyExpirationColumn').value,
            lifetime: document.getElementById('lifetimeColumn').value,
            secondaryWarranty: document.getElementById('secondaryWarrantyColumn') ? document.getElementById('secondaryWarrantyColumn').value : '',
            secondaryWarrantyExpiration: document.getElementById('secondaryWarrantyExpirationColumn') ? document.getElementById('secondaryWarrantyExpirationColumn').value : '',
            tags: document.getElementById('tagsColumn') ? document.getElementById('tagsColumn').value : '',
            quantity: document.getElementById('quantityColumn') ? document.getElementById('quantityColumn').value : ''
        };
        if (!mappings.name) {
            globalThis.toaster.show('Please map the Name column', 'error');
            this.setButtonLoading(this.startImportBtn, false);
            return;
        }
        // Client-side validation: read file and check required fields, date columns, tags
        try {
            const fileText = await file.text();
            const lines = fileText.split(/\r?\n/).filter(Boolean);
            if (lines.length < 2) throw new Error('No data rows found in file.');
            const headers = lines[0].split(',');
            const dataRows = lines.slice(1);
            const dateCols = ['purchaseDate', 'warrantyExpiration', 'secondaryWarrantyExpiration'];
            for (let i = 0; i < dataRows.length; i++) {
                const row = dataRows[i].split(',');
                // Validate name
                const nameIdx = mappings.name !== '' ? parseInt(mappings.name) : -1;
                if (nameIdx === -1 || !row[nameIdx] || !row[nameIdx].trim()) {
                    // alert(`Row ${i+2}: Name is required.`);
                    globalThis.toaster.show(`Row ${i+2}: Name is required.`, 'error');
                    this.setButtonLoading(this.startImportBtn, false);
                    return;
                }
                // Validate date columns
                for (const col of dateCols) {
                    const idx = mappings[col] !== '' ? parseInt(mappings[col]) : -1;
                    if (idx !== -1 && row[idx] && row[idx].trim()) {
                        const val = row[idx].replace(/"/g, '');
                        if (isNaN(Date.parse(val))) {
                            // alert(`Row ${i+2}: Invalid date in column '${headers[idx]}' (${val})`);
                            globalThis.toaster.show(`Row ${i+2}: Invalid date in column '${headers[idx]}' (${val})`, 'error');
                            this.setButtonLoading(this.startImportBtn, false);
                            return;
                        }
                    }
                }
            }
        } catch (validationError) {
            const errorMessage = validationError.message || 'Invalid file format or content';
            globalThis.logError('Validation error:', errorMessage);
            this.setButtonLoading(this.startImportBtn, false);
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', new File([file], sanitizeFileName(file.name), { type: file.type }));
            formData.append('mappings', JSON.stringify(mappings));
            const response = await fetch('/api/import-assets', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) throw new Error(responseValidation.errorMessage);

            const result = await response.json();
            globalThis.toaster.show(`Successfully imported ${result.importedCount} assets`, 'success');
            this.importModal.style.display = 'none';
            this.importFile.value = '';
            this.startImportBtn.disabled = true;
            this.setButtonLoading(this.startImportBtn, false);
            this.columnSelects.forEach(select => {
                select.innerHTML = '<option value="">Select Column</option>';
            });
            await this.loadAssets();
            // Rerender dashboard after import
            this.renderDashboard(true);
        } catch (error) {
            globalThis.logError('Import failed:', error.message);
        } finally {
            this.setButtonLoading(this.startImportBtn, false);
        }
    }

    autoMapColumns(headers) {
        const mappingRules = {
            nameColumn: ["name"],
            modelColumn: ["model", "model #", "model number", "model num"],
            manufacturerColumn: ["manufacturer", "make", "brand", "company"],
            serialColumn: ["serial", "serial #", "serial number", "serial num"],
            purchaseDateColumn: ["purchase date", "date purchased", "bought date"],
            purchasePriceColumn: ["purchase price", "price", "cost", "amount"],
            notesColumn: ["notes", "note", "description", "desc", "comments"],
            urlColumn: ["url", "link", "website"],
            warrantyColumn: ["warranty", "warranty scope", "coverage"],
            warrantyExpirationColumn: ["warranty expiration", "warranty expiry", "warranty end", "warranty end date", "expiration", "expiry"],
            lifetimeColumn: ["lifetime", "lifetime warranty", "is lifetime", "islifetime", "permanent"],
            secondaryWarrantyColumn: ["secondary warranty", "secondary warranty scope", "warranty 2", "warranty2", "warranty scope 2"],
            secondaryWarrantyExpirationColumn: ["secondary warranty expiration", "secondary warranty expiry", "secondary warranty end", "secondary warranty end date", "warranty 2 expiration", "warranty2 expiration", "warranty expiration 2", "warranty expiry 2"],
            tagsColumn: ["tags", "tag", "labels", "categories"],
            quantityColumn: ["quantity", "qty"]
        };
        function normalize(str) {
            return str.toLowerCase().replace(/[^a-z0-9]/g, "");
        }
        Object.entries(mappingRules).forEach(([dropdownId, variations]) => {
            const select = document.getElementById(dropdownId);
            if (!select) return;
            let foundIndex = "";
            for (let i = 0; i < headers.length; i++) {
                const headerNorm = normalize(headers[i]);
                if (variations.some(variant => headerNorm === normalize(variant))) {
                    foundIndex = i;
                    break;
                }
            }
            select.value = foundIndex;
        });
    }

    resetImportForm() {
        // Remove file preview and clear file input
        const importFilePreview = document.getElementById('importFilePreview');
        if (importFilePreview) importFilePreview.innerHTML = '';
        
        if (this.importFile) {
            // Reset file upload helpers if available
            if (this.importFile._fileUploadHelpers) {
                this.importFile._fileUploadHelpers.reset();
            } else {
                this.importFile.value = '';
                // Forcibly remove files from input (for browsers that keep the file after value='')
                if (this.importFile.files && this.importFile.files.length > 0) {
                    const dt = new DataTransfer();
                    this.importFile.files = dt.files;
                }
            }
        }
        this.columnSelects.forEach(select => {
            select.innerHTML = '<option value="">Select Column</option>';
        });
        // Explicitly reset all individual column selects in case they are not in columnSelects
        const columnIds = [
            'nameColumn',
            'modelColumn',
            'manufacturerColumn',
            'serialColumn',
            'purchaseDateColumn',
            'purchasePriceColumn',
            'notesColumn',
            'urlColumn',
            'warrantyColumn',
            'warrantyExpirationColumn',
            'lifetimeColumn',
            'secondaryWarrantyColumn',
            'secondaryWarrantyExpirationColumn',
            'tagsColumn',
            'quantityColumn'
        ];
        columnIds.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = '<option value="">Select Column</option>';
                select.value = '';
            }
        });
        this.startImportBtn.disabled = true;
        // Optionally hide column mapping UI if needed
        const mappingContainer = document.querySelector('.column-mapping');
        if (mappingContainer) mappingContainer.style.display = 'none';
    }
    
    _downloadTemplate() {
        // Define the headers for the template CSV
        const headers = [
            'Name',
            'Manufacturer',
            'Model',
            'Serial',
            'Purchase Date',
            'Purchase Price',
            'Notes',
            'URL',
            'Warranty',
            'Warranty Expiration',
            'Lifetime',
            'Secondary Warranty',
            'Secondary Warranty Expiration',
            'Tags',
            'Quantity'
        ];
        // Generate test data row
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const testRow = headers.map(h => {
            const lower = h.toLowerCase();
            if (lower.includes('date') || lower.includes('expiration')) return today;
            if (lower === 'url') return 'https://example.com';
            if (lower === 'tags') return '"tag1,tag2,tag3"'; // CSV string for tags
            if (lower === 'purchase price') return '123.45';
            if (lower === 'quantity') return '1'; // Default quantity
            if (lower === 'lifetime') return 'false'; // Boolean value for lifetime warranty
            return `Test ${h}`;
        });
        const csvContent = headers.join(',') + '\n' + testRow.join(',') + '\n';
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'assets.csv';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }
}
