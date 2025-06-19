/**
 * External Document Manager - Handles searching and linking documents from document management integrations
 * Only loads integrations with category 'document-management' (e.g., Paperless NGX, Papra)
 * Extensible for other document management systems like Nextcloud, SharePoint, etc.
 * Dynamically applies integration color schemes instead of relying on hardcoded CSS classes.
 */

import { API_PAPERLESS_ENDPOINT, API_PAPRA_ENDPOINT, INTEGRATION_CATEGORIES } from '../../src/constants.js';

export class ExternalDocManager {
    constructor({ modalManager, setButtonLoading, integrationsManager }) {
        this.modalManager = modalManager;
        this.setButtonLoading = setButtonLoading;
        this.integrationsManager = integrationsManager;
        this.currentAttachmentType = null;
        this.currentIsSubAsset = false;
        this.searchTimeout = null;
        this.activeIntegrations = [];
        this.selectedIntegrations = new Set(['all']);
        
        // Pagination state
        this.currentPage = 1;
        this.pageSize = 15;
        this.totalDocuments = 0;
        this.currentQuery = '';
        this.isLoading = false;
        this.buttonIds = [
            'linkExternalPhotos', 'linkExternalReceipts', 'linkExternalManuals',
            'linkExternalSubPhotos', 'linkExternalSubReceipts', 'linkExternalSubManuals'
        ];
        
        // File extension filters for different attachment types (more reliable than MIME types)
        this.fileExtensionFilters = {
            photo: [
                '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif', '.svg'
            ],
            receipt: [
                '.pdf', '.doc', '.docx', '.txt', '.rtf',
                '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'
            ],
            manual: [
                '.pdf', '.doc', '.docx', '.txt', '.rtf',
                '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp'
            ]
        };
        
        // MIME type filters as backup (when file extension isn't available)
        this.mimeTypeFilters = {
            photo: [
                'image/jpeg',
                'image/jpg', 
                'image/png',
                'image/gif',
                'image/webp',
                'image/bmp',
                'image/tiff',
                'image/svg+xml'
            ],
            receipt: [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain',
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/gif',
                'image/webp',
                'image/bmp',
                'image/tiff'
            ],
            manual: [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            ]
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadActiveIntegrations();
    }

    bindEvents() {
        const modal = document.getElementById('externalDocModal');
        const closeBtn = modal?.querySelector('.close-btn');
        const searchInput = document.getElementById('externalDocSearchInput');

        if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
        if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) this.closeModal(); });
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.currentQuery = e.target.value;
                this.currentPage = 1; // Reset to first page on new search
                this.searchTimeout = setTimeout(() => this.performSearch(e.target.value), 300);
            });
        }

        // Pagination event listeners
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        
        if (prevBtn) prevBtn.addEventListener('click', () => this.previousPage());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());
    }

    async loadActiveIntegrations() {
        try {
            // Remove existing event listeners and hide buttons
            this.buttonIds.forEach(buttonId => {
                const button = document.getElementById(buttonId);
                if (button) {
                    button.removeEventListener('click', (e) => this.handleLinkExternalDocs(e, buttonId));
                    button.style.display = 'none';
                }
            });

            // Use IntegrationsManager to get active integrations
            const allActiveIntegrations = await this.integrationsManager.getActiveIntegrations();
            
            // Filter to only include document-management category integrations
            this.activeIntegrations = allActiveIntegrations.filter(integration => {
                const integrationData = this.integrationsManager.getIntegration(integration.id);
                return integrationData && integrationData.category === INTEGRATION_CATEGORIES.DOCUMENT_MANAGEMENT;
            });

            if (window.appConfig?.debug) {
                console.log('ExternalDocManager: All active integrations:', allActiveIntegrations);
                console.log('ExternalDocManager: Document management integrations:', this.activeIntegrations);
            }

            if (this.activeIntegrations && this.activeIntegrations.length > 0) {
                this.buttonIds.forEach(buttonId => {
                    const button = document.getElementById(buttonId);
                    if (button) {
                        button.addEventListener('click', (e) => this.handleLinkExternalDocs(e, buttonId));
                        button.style.display = 'flex';
                    }
                });
            }
            this.updateIntegrationFilters();
        } catch (error) {
            console.error('Failed to load active integrations:', error);
            this.activeIntegrations = [];
        }
    }

    updateIntegrationFilters() {
        const filtersContainer = document.getElementById('integrationFilters');
        if (!filtersContainer) return;

        filtersContainer.innerHTML = '';
        
        if (this.activeIntegrations.length === 0) {
            filtersContainer.innerHTML = '<div style="color: var(--text-color-secondary); padding: 0.5rem;">No document management integrations enabled</div>';
            return;
        }

        const allBtn = document.createElement('button');
        allBtn.className = 'integration-filter-btn active';
        allBtn.textContent = 'All Sources';
        allBtn.addEventListener('click', () => this.toggleIntegrationFilter('all'));
        filtersContainer.appendChild(allBtn);

        this.activeIntegrations.forEach(integration => {
            const btn = document.createElement('button');
            btn.className = 'integration-filter-btn';
            
            // Get color scheme from IntegrationsManager
            const integrationData = this.integrationsManager.getIntegration(integration.id);
            if (integrationData && integrationData.colorScheme) {
                btn.style.backgroundColor = integrationData.colorScheme;
            }
            
            btn.textContent = this.integrationsManager.getIntegrationName(integration.id);
            btn.addEventListener('click', () => this.toggleIntegrationFilter(integration.id));
            filtersContainer.appendChild(btn);
        });
    }

    toggleIntegrationFilter(integrationId) {
        // Update selected integrations
        this.selectedIntegrations.clear();
        this.selectedIntegrations.add(integrationId === 'all' ? 'all' : integrationId);
        
        // Update UI - find the correct button
        const buttons = document.querySelectorAll('.integration-filter-btn');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            // Check if this button corresponds to the selected integration
            if ((integrationId === 'all' && btn.textContent === 'All Sources') ||
                (integrationId !== 'all' && btn.textContent === this.integrationsManager.getIntegrationName(integrationId))) {
                btn.classList.add('active');
            }
        });
        
        // Reset pagination and reload data with new filter
        this.currentPage = 1;
        if (this.currentQuery) {
            this.performSearch(this.currentQuery);
        } else {
            this.loadAllDocuments();
        }
    }

    handleLinkExternalDocs(event, buttonId) {
        const idMap = {
            'linkExternalPhotos': { type: 'photo', isSubAsset: false },
            'linkExternalReceipts': { type: 'receipt', isSubAsset: false },
            'linkExternalManuals': { type: 'manual', isSubAsset: false },
            'linkExternalSubPhotos': { type: 'photo', isSubAsset: true },
            'linkExternalSubReceipts': { type: 'receipt', isSubAsset: true },
            'linkExternalSubManuals': { type: 'manual', isSubAsset: true }
        };

        const config = idMap[buttonId];
        if (!config) return;

        this.currentAttachmentType = config.type;
        this.currentIsSubAsset = config.isSubAsset;
        this.openModal();
    }

    openModal() {
        const modal = document.getElementById('externalDocModal');
        if (modal) {
            modal.style.display = 'flex';
            
            // Reset state
            this.currentPage = 1;
            this.currentQuery = '';
            
            const searchInput = document.getElementById('externalDocSearchInput');
            if (searchInput) {
                searchInput.value = '';
                // Update placeholder based on attachment type
                const attachmentTypeText = this.getAttachmentTypeDisplayText();
                const fileTypeHint = this.getFileTypeHint();
                searchInput.placeholder = `Search ${attachmentTypeText} or browse all... ${fileTypeHint}`;
            }
            
            // Update modal title to show what type of files we're looking for
            this.updateModalTitle();
            
            // Load integrations and immediately load all documents
            this.loadActiveIntegrations().then(() => {
                this.loadAllDocuments();
            });
            
            // Focus search input after a brief delay
            setTimeout(() => {
                if (searchInput) searchInput.focus();
            }, 100);
        }
    }

    closeModal() {
        const modal = document.getElementById('externalDocModal');
        if (modal) modal.style.display = 'none';
        clearTimeout(this.searchTimeout);
    }

    async performSearch(query) {
        if (!query || query.trim().length < 2) {
            this.loadAllDocuments();
            return;
        }

        if (this.isLoading) return;
        
        // Check if we have any active integrations
        if (!this.activeIntegrations || this.activeIntegrations.length === 0) {
            const resultsContainer = document.getElementById('externalDocResults');
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div class="no-results">
                        <p>No document management integrations are currently enabled.</p>
                        <p>Please configure at least one document integration (like Paperless NGX or Papra) to search external documents.</p>
                    </div>
                `;
            }
            this.hidePagination();
            return;
        }
        
        this.isLoading = true;

        const resultsContainer = document.getElementById('externalDocResults');
        if (!resultsContainer) return;

        this.showLoading('Searching documents...');

        try {
            const results = await this.searchAllIntegrations(query, this.currentPage);
            this.displayResults(results, query);
        } catch (error) {
            resultsContainer.innerHTML = `<div class="search-error"><p>Search failed: ${error.message}</p></div>`;
            this.hidePagination();
        } finally {
            this.isLoading = false;
        }
    }

    async loadAllDocuments() {
        if (this.isLoading) return;
        
        // Check if we have any active integrations
        if (!this.activeIntegrations || this.activeIntegrations.length === 0) {
            const resultsContainer = document.getElementById('externalDocResults');
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div class="no-results">
                        <p>No document management integrations are currently enabled.</p>
                        <p>Please configure at least one document integration (like Paperless NGX or Papra) to search and link external documents.</p>
                    </div>
                `;
            }
            this.hidePagination();
            return;
        }
        
        this.isLoading = true;

        this.showLoading('Loading documents...');

        try {
            const results = await this.searchAllIntegrations('', this.currentPage);
            this.displayResults(results, '');
        } catch (error) {
            const resultsContainer = document.getElementById('externalDocResults');
            if (resultsContainer) {
                resultsContainer.innerHTML = `<div class="search-error"><p>Failed to load documents: ${error.message}</p></div>`;
            }
            this.hidePagination();
        } finally {
            this.isLoading = false;
        }
    }

    showLoading(message = 'Loading...') {
        const resultsContainer = document.getElementById('externalDocResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = `<div class="search-loading"><div class="spinner"></div><span>${message}</span></div>`;
        }
        this.hidePagination();
    }

    async searchAllIntegrations(query, page = 1) {
        const targetIntegrations = this.getTargetIntegrations();
        
        if (targetIntegrations.length === 0) {
            return { results: [], count: 0, next: null, previous: null };
        }

        // If "All Sources" is selected, search across all integrations
        if (this.selectedIntegrations.has('all')) {
            return await this.searchMultipleIntegrations(targetIntegrations, query, page);
        } else {
            // Search specific integration(s)
            const selectedIntegrations = targetIntegrations.filter(integration => 
                this.selectedIntegrations.has(integration.id)
            );
            
            if (selectedIntegrations.length === 0) {
                return { results: [], count: 0, next: null, previous: null };
            } else if (selectedIntegrations.length === 1) {
                return await this.searchSingleIntegration(selectedIntegrations[0], query, page);
            } else {
                // Multiple specific integrations selected
                return await this.searchMultipleIntegrations(selectedIntegrations, query, page);
            }
        }
    }

    async searchMultipleIntegrations(integrations, query, page = 1) {
        try {
            // For multiple integrations, we need to handle pagination differently
            // We'll collect results from each integration and then paginate client-side
            const searchPromises = integrations.map(async integration => {
                try {
                    let allResults = [];
                    let totalCount = 0;
                    
                    // When filtering by attachment type, we need to fetch more pages since filtering happens client-side
                    const isFiltering = !!this.currentAttachmentType;
                    const maxPages = isFiltering ? 10 : 5; // Fetch more pages when filtering
                    const targetResults = isFiltering ? this.pageSize * 6 : this.pageSize * (page + 1); // Target more results when filtering
                    
                    for (let p = 1; p <= maxPages; p++) {
                        const result = await this.searchSingleIntegration(integration, query, p);
                        if (result.results && result.results.length > 0) {
                            // If filtering, apply the filter to see how many actually match
                            let resultsToAdd = result.results;
                            if (isFiltering) {
                                resultsToAdd = result.results.filter(doc => {
                                    const fileNameForExtraction = doc.originalFileName || doc.title;
                                    return this.isValidFileType(doc.mimeType, this.currentAttachmentType, fileNameForExtraction);
                                });
                            }
                            
                            allResults.push(...resultsToAdd);
                        }
                        
                        // Update total count from the first page response
                        if (p === 1) {
                            totalCount = result.count || 0;
                        }
                        
                        // Stop if no more pages available
                        if (!result.next) break;
                        
                        // If not filtering, stop when we have enough raw results
                        // If filtering, stop when we have enough filtered results or enough raw results to process
                        if (!isFiltering && allResults.length >= this.pageSize * (page + 1)) break;
                        if (isFiltering && allResults.length >= targetResults) break;
                    }
                    
                    return { 
                        results: allResults, 
                        count: totalCount,
                        integration: integration.id 
                    };
                } catch (error) {
                    console.warn(`Search failed for ${integration.id}:`, error);
                    return { results: [], count: 0, integration: integration.id };
                }
            });

            const results = await Promise.all(searchPromises);
            
            // Combine results from all integrations
            const combinedResults = [];
            let totalCount = 0;

            results.forEach(result => {
                // Results are already filtered if attachment type filtering was applied
                combinedResults.push(...(result.results || []));
                totalCount += result.count || 0;
            });

            // Sort combined results by modified date (newest first)
            combinedResults.sort((a, b) => {
                const dateA = new Date(a.modified || 0);
                const dateB = new Date(b.modified || 0);
                return dateB - dateA;
            });

            // Apply client-side pagination for combined results
            const startIndex = (page - 1) * this.pageSize;
            const endIndex = startIndex + this.pageSize;
            const paginatedResults = combinedResults.slice(startIndex, endIndex);

            // Calculate pagination info based on available results
            const availableResults = combinedResults.length;
            const hasNext = endIndex < availableResults;
            const hasPrevious = page > 1;

            // Store total for display - use available results for pagination
            this.totalDocuments = availableResults;

            return {
                results: paginatedResults,
                count: availableResults, // Available results for pagination logic
                totalCount: totalCount, // Total from APIs for display (may be higher than available if filtering)
                next: hasNext ? true : null,
                previous: hasPrevious ? true : null
            };
        } catch (error) {
            console.error('Failed to search multiple integrations:', error);
            throw error;
        }
    }

    async searchSingleIntegration(integration, query, page = 1) {
        switch (integration.id) {
            case 'paperless':
                return await this.searchPaperless(query, page);
            case 'papra':
                return await this.searchPapra(query, page);
            default:
                throw new Error(`Unsupported integration: ${integration.id}`);
        }
    }

    getTargetIntegrations() {
        // If "all" is selected, return all active integrations
        if (this.selectedIntegrations.has('all')) {
            return this.activeIntegrations;
        }
        
        // Return only selected integrations that are active
        return this.activeIntegrations.filter(integration => 
            this.selectedIntegrations.has(integration.id)
        );
    }

    async searchPaperless(query, page = 1) {
        // When filtering by attachment type, load more results to account for filtering
        const pageSize = this.currentAttachmentType ? Math.max(this.pageSize * 3, 50) : this.pageSize;
        
        const params = new URLSearchParams({
            page: page.toString(),
            page_size: pageSize.toString()
        });
        
        if (query && query.trim()) {
            params.append('q', query.trim());
        }

        const searchEndpoint = `${globalThis.getApiBaseUrl()}/${API_PAPERLESS_ENDPOINT}/search?${params.toString()}`;
        const response = await fetch(searchEndpoint);
        const responseValidation = await globalThis.validateResponse(response);
        if (responseValidation.errorMessage) throw new Error(responseValidation.errorMessage);

        const data = await response.json();
        
        // Store pagination info
        this.totalDocuments = data.count || 0;
        
        return {
            results: (data.results || []).map(doc => ({
                id: doc.id,
                title: doc.title,
                source: 'paperless',
                downloadUrl: `${globalThis.getApiBaseUrl()}/${API_PAPERLESS_ENDPOINT}/document/${doc.id}/download`,
                mimeType: doc.mime_type,
                fileSize: doc.file_size,
                modified: doc.modified,
                originalFileName: doc.original_file_name, // Include original filename for extension extraction
                attachedAt: new Date().toISOString()
            })),
            count: data.count || 0,
            next: data.next,
            previous: data.previous
        };
    }

    async searchPapra(query, page = 1) {
        // When filtering by attachment type, load more results to account for filtering
        const pageSize = this.currentAttachmentType ? Math.max(this.pageSize * 3, 50) : this.pageSize;
        
        // Convert from 1-based to 0-based pagination for Papra API
        const pageIndex = Math.max(0, page - 1);
        
        const params = new URLSearchParams({
            pageIndex: pageIndex.toString(),
            pageSize: pageSize.toString()
        });
        
        if (query && query.trim()) {
            params.append('q', query.trim());
        }

        const searchEndpoint = `${globalThis.getApiBaseUrl()}/${API_PAPRA_ENDPOINT}/search?${params.toString()}`;
        const response = await fetch(searchEndpoint);
        const responseValidation = await globalThis.validateResponse(response);
        if (responseValidation.errorMessage) throw new Error(responseValidation.errorMessage);

        const data = await response.json();
        
        // Store pagination info
        this.totalDocuments = data.documentsCount || 0;
        
        return {
            results: (data.documents || []).map(doc => ({
                id: doc.id,
                title: doc.name,
                source: 'papra',
                downloadUrl: `${globalThis.getApiBaseUrl()}/${API_PAPRA_ENDPOINT}/document/${doc.id}/download`,
                mimeType: doc.content || 'application/octet-stream', // Papra might not have MIME type
                fileSize: doc.size,
                modified: doc.updatedAt || doc.createdAt,
                originalFileName: doc.name, // Use document name as filename
                attachedAt: new Date().toISOString()
            })),
            count: data.documentsCount || 0,
            next: null, // Papra uses different pagination
            previous: null
        };
    }

    displayResults(data, query) {
        const resultsContainer = document.getElementById('externalDocResults');
        if (!resultsContainer) return;

        let results = data.results || [];
        
        // Only apply client-side filtering for single integration searches
        // Multi-integration searches already have filtering applied
        const isMultiIntegration = data.totalCount !== undefined;
        
        if (!isMultiIntegration && this.currentAttachmentType && (this.fileExtensionFilters[this.currentAttachmentType] || this.mimeTypeFilters[this.currentAttachmentType])) {
            results = results.filter(doc => {
                // Use originalFileName if available, otherwise fall back to title
                const fileNameForExtraction = doc.originalFileName || doc.title;
                const isValid = this.isValidFileType(doc.mimeType, this.currentAttachmentType, fileNameForExtraction);
                return isValid;
            });
        }

        if (results.length === 0) {
            const attachmentTypeText = this.currentAttachmentType ? 
                ` matching file type for ${this.currentAttachmentType}s` : '';
            const message = query ? 
                `No documents found for "${query}"${attachmentTypeText}` : 
                `No documents available${attachmentTypeText}`;
            resultsContainer.innerHTML = `<div class="no-results"><p>${message}</p></div>`;
            this.hidePagination();
            return;
        }

        const resultsHtml = results.map(doc => {
            const formattedDate = doc.modified ? new Date(doc.modified).toLocaleDateString() : '';
            const formattedSize = doc.fileSize ? this.formatFileSize(doc.fileSize) : '';
            const meta = [formattedDate, formattedSize].filter(Boolean).join(' • ');
            
            // Get the display name for the source
            const sourceDisplayName = this.getSourceDisplayName(doc.source);
            
            // Get integration data and color scheme for dynamic styling
            const integrationData = this.integrationsManager.getIntegration(doc.source);
            const colorScheme = integrationData?.colorScheme || '#6b7280'; // Default gray if no color scheme
            const borderLeftStyle = `border-left: 3px solid ${colorScheme};`;
            const sourceSpanStyle = `background-color: ${colorScheme};`;
            
            const html = `
                <div class="external-doc-item external-document" style="${borderLeftStyle}">
                    <div class="external-doc-info">
                        <div class="external-doc-title">
                            ${this.escapeHtml(doc.title)}
                            <span class="external-doc-source" style="${sourceSpanStyle}">${sourceDisplayName}</span>
                        </div>
                        ${meta ? `<div class="external-doc-meta">${this.escapeHtml(meta)}</div>` : ''}
                    </div>
                    <button id="${doc.source}-${doc.id}" class="external-doc-link-btn">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                        Link
                    </button>
                </div>
            `;
            return html;
        }).join('');
        
        
        resultsContainer.innerHTML = resultsHtml;
        const linkButtons = resultsContainer.querySelectorAll('.external-doc-link-btn');
        linkButtons.forEach(button => {
            button.addEventListener('click', () => {
                const docId = button.id.split('-')[1];
                // Use filtered results instead of original data.results
                // Handle both string IDs (Papra) and integer IDs (Paperless)
                const docData = results.find(doc => {
                    // Try exact string match first
                    if (doc.id === docId) return true;
                    // Try integer comparison for backward compatibility
                    const parsedId = parseInt(docId, 10);
                    if (!isNaN(parsedId) && doc.id === parsedId) return true;
                    return false;
                });
                if (docData) {
                    this.linkDocument(docData);
                } else {
                    globalThis.logError(`Document with ID ${docId} not found in filtered results`);
                }
            });
        });
        
        // Update pagination - for single integration searches with filtering, 
        // update the data to reflect filtered results
        let paginationData = data;
        if (!isMultiIntegration && this.currentAttachmentType && results.length !== (data.results?.length || 0)) {
            // Single integration with client-side filtering applied
            paginationData = {
                ...data,
                results: results,
                filteredCount: results.length
            };
        }
        this.updatePagination(paginationData, query);
    }

    updatePagination(data, query) {
        const paginationContainer = document.getElementById('externalDocPagination');
        const paginationInfo = document.getElementById('paginationInfo');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');

        if (!paginationContainer || !paginationInfo || !prevBtn || !nextBtn) return;

        // For multi-integration searches, use the combined total count
        const isMultiIntegration = data.totalCount !== undefined;
        const currentResults = data.results?.length || 0;
        
        if (currentResults === 0) {
            paginationContainer.style.display = 'none';
            return;
        }

        // When filtering by attachment type, show a simpler pagination info
        if (this.currentAttachmentType) {
            const attachmentTypeDisplay = this.getAttachmentTypeDisplayText();
            paginationContainer.style.display = 'flex';
            
            if (isMultiIntegration || this.currentPage > 1 || (data.next && currentResults === this.pageSize)) {
                // Show page-based info when pagination is relevant
                paginationInfo.textContent = `Page ${this.currentPage} - ${currentResults} ${attachmentTypeDisplay} shown`;
                
                // Enable/disable pagination buttons based on data availability
                prevBtn.disabled = this.currentPage <= 1;
                nextBtn.disabled = !data.next || currentResults < this.pageSize;
            } else {
                // Single page of results
                paginationInfo.textContent = `${currentResults} ${attachmentTypeDisplay} found`;
                prevBtn.disabled = true;
                nextBtn.disabled = true;
            }
            return;
        }

        // For non-filtered results, use the original total count
        const totalCount = isMultiIntegration ? this.totalDocuments : (data.count || 0);
        
        // Calculate display info for non-filtered results
        const startItem = ((this.currentPage - 1) * this.pageSize) + 1;
        const endItem = Math.min(startItem + currentResults - 1, totalCount);
        
        // Calculate total pages
        const totalPages = Math.ceil(totalCount / this.pageSize);
        
        // Show pagination if there are more results than one page OR if we're not on page 1
        if (totalPages > 1 || this.currentPage > 1) {
            paginationContainer.style.display = 'flex';
            paginationInfo.textContent = `${startItem}-${endItem} of ${totalCount} documents`;
            
            // Update button states based on integration type
            if (isMultiIntegration) {
                // Multi-integration search - use client-side pagination logic
                prevBtn.disabled = this.currentPage <= 1;
                nextBtn.disabled = data.next === null || data.next === false;
            } else {
                // Single integration search - use server-side pagination
                prevBtn.disabled = !data.previous;
                nextBtn.disabled = !data.next;
            }
        } else {
            paginationContainer.style.display = 'none';
        }
    }

    hidePagination() {
        const paginationContainer = document.getElementById('externalDocPagination');
        if (paginationContainer) {
            paginationContainer.style.display = 'none';
        }
    }

    async previousPage() {
        if (this.currentPage > 1 && !this.isLoading) {
            this.currentPage--;
            if (this.currentQuery) {
                this.performSearch(this.currentQuery);
            } else {
                this.loadAllDocuments();
            }
        }
    }

    async nextPage() {
        if (!this.isLoading) {
            this.currentPage++;
            if (this.currentQuery) {
                this.performSearch(this.currentQuery);
            } else {
                this.loadAllDocuments();
            }
        }
    }

    formatFileSize(bytes) {
        if (!bytes) return '';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Check if a file's MIME type is valid for the current attachment type
     * @param {string} mimeType - The MIME type of the file
     * @param {string} attachmentType - The attachment type (photo, receipt, manual)
     * @param {string} documentTitle - The document title/filename for extension extraction
     * @returns {boolean} - Whether the file type is valid
     */
    isValidFileType(mimeType, attachmentType, documentTitle = '') {
        // If no attachment type, allow everything
        if (!attachmentType) return true;
        
        // Try file extension filtering first (more reliable)
        const fileExtension = this.extractFileExtension(documentTitle);
        if (fileExtension) {
            const allowedExtensions = this.fileExtensionFilters[attachmentType];
            if (allowedExtensions) {
                return allowedExtensions.includes(fileExtension.toLowerCase());
            }
        }
        
        // Fallback to MIME type filtering if no file extension available
        if (!mimeType) {
            // Be strict for photos, allow for receipts/manuals if no MIME type
            return attachmentType !== 'photo';
        }
        
        const allowedTypes = this.mimeTypeFilters[attachmentType];
        if (!allowedTypes) return true; // If no filter defined, don't filter
        
        // Normalize MIME type (lowercase, trim)
        const normalizedMimeType = mimeType.toLowerCase().trim();
        
        // Check exact match first
        if (allowedTypes.includes(normalizedMimeType)) return true;
        
        // Check for wildcard matches (e.g., image/* for any image type)
        const baseType = normalizedMimeType.split('/')[0];
        if (allowedTypes.some(type => type.startsWith(baseType + '/'))) {
            return true;
        }
        
        return false;
    }

    /**
     * Extract file extension from document title
     * @param {string} title - Document title
     * @returns {string|null} - File extension with dot (e.g., '.pdf') or null
     */
    extractFileExtension(title) {
        if (!title) return null;
        
        // Look for file extension pattern at the end of the title
        const match = title.match(/\.([a-zA-Z0-9]+)(?:\s|$)/);
        if (match) {
            return '.' + match[1].toLowerCase();
        }
        
        // Try to extract from the very end if no spaces
        const lastDotIndex = title.lastIndexOf('.');
        if (lastDotIndex > -1 && lastDotIndex < title.length - 1) {
            const extension = title.substring(lastDotIndex).toLowerCase();
            // Only return if it looks like a valid extension (2-5 characters)
            if (/^\.[a-z]{2,5}$/.test(extension)) {
                return extension;
            }
        }
        
        return null;
    }

    /**
     * Get display text for the current attachment type
     * @returns {string} - Display text for the attachment type
     */
    getAttachmentTypeDisplayText() {
        const typeMap = {
            photo: 'images',
            receipt: 'receipts',
            manual: 'manuals'
        };
        return typeMap[this.currentAttachmentType] || 'documents';
    }

    /**
     * Update the modal title to show the attachment type and file type filter
     */
    updateModalTitle() {
        const modalTitle = document.querySelector('#externalDocModal .modal-title');
        if (!modalTitle) return;
        
        const attachmentTypeText = this.getAttachmentTypeDisplayText();
        
        modalTitle.innerHTML = `Link External ${attachmentTypeText.charAt(0).toUpperCase() + attachmentTypeText.slice(1)}`;
    }

    /**
     * Get file type hint text for the current attachment type
     * @returns {string} - File type hint text
     */
    getFileTypeHint() {
        const hintMap = {
            photo: '(Images: JPG, PNG, GIF, WebP, etc.)',
            receipt: '(Images & Documents: JPG, PNG, PDF, DOC, etc.)',
            manual: '(Documents: PDF, DOC, XLS, PPT, etc.)'
        };
        return hintMap[this.currentAttachmentType] || '';
    }

    async linkDocument(docData) {
        // Find the button that was clicked
        const clickedButton = event?.target?.closest('.external-doc-link-btn');
        
        try {
            if (clickedButton) this.setButtonLoading(clickedButton, true);
            
            const attachment = {
                externalId: docData.id,
                integrationId: docData.source, // Use the source (paperless, papra, etc.)
                title: docData.title,
                downloadUrl: docData.downloadUrl,
                mimeType: docData.mimeType,
                fileSize: docData.fileSize,
                attachedAt: docData.attachedAt
            };

            await this.modalManager.attachPaperlessDocument(attachment, this.currentAttachmentType, this.currentIsSubAsset);
            
            // Show success feedback
            // globalThis.toaster.show(`Linked "${docData.title}"`, 'success', false, 2000);
            
            // Update button to show it's been linked
            if (clickedButton) {
                clickedButton.innerHTML = `
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    Linked
                `;
                clickedButton.disabled = true;
                clickedButton.style.background = 'var(--success-color, #10b981)';
                clickedButton.style.opacity = '0.8';
                clickedButton.style.cursor = 'default';
            }
            
        } catch (error) {
            if (clickedButton) this.setButtonLoading(clickedButton, false);
            globalThis.logError('Failed to link document:', error.message);
        }
    }

    getSourceDisplayName(sourceId) {
        const sourceNames = {
            'paperless': 'Paperless NGX',
            'papra': 'Papra'
        };
        return sourceNames[sourceId] || sourceId.charAt(0).toUpperCase() + sourceId.slice(1);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}