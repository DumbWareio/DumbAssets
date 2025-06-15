/**
 * External Document Manager - Handles searching and linking documents from multiple integrations
 * Supports Paperless NGX initially, extensible for Nextcloud, SharePoint, etc.
 */

export class ExternalDocManager {
    constructor({ modalManager, setButtonLoading }) {
        this.modalManager = modalManager;
        this.setButtonLoading = setButtonLoading;
        this.currentAttachmentType = null;
        this.currentIsSubAsset = false;
        this.searchTimeout = null;
        this.activeIntegrations = [];
        this.selectedIntegrations = new Set();
        
        this.DEBUG = window.appConfig?.debug || false;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadActiveIntegrations();
    }

    bindEvents() {
        // Bind the "Link External Docs" buttons
        const buttonIds = [
            'linkExternalPhotos',
            'linkExternalReceipts', 
            'linkExternalManuals',
            'linkExternalSubPhotos',
            'linkExternalSubReceipts',
            'linkExternalSubManuals'
        ];

        buttonIds.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', (e) => {
                    this.handleLinkExternalDocs(e, buttonId);
                });
            }
        });

        // Bind modal events
        const modal = document.getElementById('externalDocModal');
        const closeBtn = modal?.querySelector('.close-btn');
        const searchInput = document.getElementById('externalDocSearchInput');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.performSearch(e.target.value);
                }, 300);
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    clearTimeout(this.searchTimeout);
                    this.performSearch(e.target.value);
                }
            });
        }
    }

    async loadActiveIntegrations() {
        try {
            const response = await fetch(`${globalThis.getApiBaseUrl()}/api/integrations/enabled`);
            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) {
                throw new Error(responseValidation.errorMessage);
            }

            this.activeIntegrations = await response.json();
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
            filtersContainer.innerHTML = `
                <div class="integration-filter-warning">
                    <span>⚠️ No document integrations enabled. Enable integrations in Settings to search external documents.</span>
                </div>
            `;
            return;
        }

        // Add "All" filter
        const allBtn = document.createElement('button');
        allBtn.className = 'integration-filter-btn active';
        allBtn.dataset.integration = 'all';
        allBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 2v20"/>
                <path d="M2 12h20"/>
            </svg>
            All Sources
        `;
        allBtn.addEventListener('click', () => this.toggleIntegrationFilter('all'));
        filtersContainer.appendChild(allBtn);

        // Add individual integration filters
        this.activeIntegrations.forEach(integration => {
            const btn = document.createElement('button');
            btn.className = 'integration-filter-btn';
            btn.dataset.integration = integration.id;
            btn.innerHTML = `
                ${this.getIntegrationIcon(integration)}
                ${integration.name}
            `;
            btn.addEventListener('click', () => this.toggleIntegrationFilter(integration.id));
            filtersContainer.appendChild(btn);
        });

        // Select all by default
        this.selectedIntegrations.clear();
        this.selectedIntegrations.add('all');
    }

    getIntegrationIcon(integration) {
        const icons = {
            paperless: '<img src="/assets/logos/paperless-ngx.png" alt="Paperless NGX" class="integration-icon">',
            nextcloud: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
            </svg>`,
            default: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
            </svg>`
        };
        
        return icons[integration.id] || icons.default;
    }

    toggleIntegrationFilter(integrationId) {
        const filtersContainer = document.getElementById('integrationFilters');
        const buttons = filtersContainer.querySelectorAll('.integration-filter-btn');

        if (integrationId === 'all') {
            // Select all, deselect others
            this.selectedIntegrations.clear();
            this.selectedIntegrations.add('all');
            buttons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.integration === 'all');
            });
        } else {
            // Toggle individual integration
            this.selectedIntegrations.delete('all');
            
            if (this.selectedIntegrations.has(integrationId)) {
                this.selectedIntegrations.delete(integrationId);
            } else {
                this.selectedIntegrations.add(integrationId);
            }

            // Update button states
            buttons.forEach(btn => {
                if (btn.dataset.integration === 'all') {
                    btn.classList.remove('active');
                } else {
                    btn.classList.toggle('active', this.selectedIntegrations.has(btn.dataset.integration));
                }
            });

            // If no integrations selected, select all
            if (this.selectedIntegrations.size === 0) {
                this.selectedIntegrations.add('all');
                buttons.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.integration === 'all');
                });
            }
        }

        // Re-run search if there's a search term
        const searchInput = document.getElementById('externalDocSearchInput');
        if (searchInput && searchInput.value.trim()) {
            this.performSearch(searchInput.value.trim());
        }
    }

    handleLinkExternalDocs(event, buttonId) {
        // Determine attachment type and sub-asset status from button ID
        const idMap = {
            'linkExternalPhotos': { type: 'photo', isSubAsset: false },
            'linkExternalReceipts': { type: 'receipt', isSubAsset: false },
            'linkExternalManuals': { type: 'manual', isSubAsset: false },
            'linkExternalSubPhotos': { type: 'photo', isSubAsset: true },
            'linkExternalSubReceipts': { type: 'receipt', isSubAsset: true },
            'linkExternalSubManuals': { type: 'manual', isSubAsset: true }
        };

        const buttonConfig = idMap[buttonId];
        if (!buttonConfig) {
            console.error('Unknown button ID:', buttonId);
            return;
        }

        this.currentAttachmentType = buttonConfig.type;
        this.currentIsSubAsset = buttonConfig.isSubAsset;

        this.openModal();
    }

    openModal() {
        const modal = document.getElementById('externalDocModal');
        const searchInput = document.getElementById('externalDocSearchInput');
        const resultsContainer = document.getElementById('externalDocResults');

        if (modal) {
            modal.style.display = 'flex';
            
            // Reset search input and results
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div class="search-placeholder">
                        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                        <p>Start typing to search external documents</p>
                    </div>
                `;
            }

            // Refresh integrations in case settings changed
            this.loadActiveIntegrations();
        }
    }

    closeModal() {
        const modal = document.getElementById('externalDocModal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Clear search timeout
        clearTimeout(this.searchTimeout);
    }

    async performSearch(query) {
        if (!query || query.trim().length < 2) {
            this.showSearchPlaceholder();
            return;
        }

        const resultsContainer = document.getElementById('externalDocResults');
        if (!resultsContainer) return;

        // Show loading state
        resultsContainer.innerHTML = `
            <div class="search-loading">
                <div class="spinner"></div>
                <span>Searching external documents...</span>
            </div>
        `;

        try {
            const integrations = this.getSelectedIntegrations();
            const allResults = [];

            // Search each selected integration
            for (const integration of integrations) {
                try {
                    const results = await this.searchIntegration(integration, query);
                    allResults.push(...results);
                } catch (error) {
                    console.error(`Failed to search ${integration.name}:`, error);
                    // Continue with other integrations
                }
            }

            this.displayResults(allResults, query);

        } catch (error) {
            console.error('Search failed:', error);
            resultsContainer.innerHTML = `
                <div class="search-error">
                    <p>Search failed: ${error.message}</p>
                </div>
            `;
        }
    }

    getSelectedIntegrations() {
        if (this.selectedIntegrations.has('all')) {
            return this.activeIntegrations;
        }
        
        return this.activeIntegrations.filter(integration => 
            this.selectedIntegrations.has(integration.id)
        );
    }

    async searchIntegration(integration, query) {
        switch (integration.id) {
            case 'paperless':
                return await this.searchPaperless(query);
            case 'nextcloud':
                return await this.searchNextcloud(query);
            default:
                console.warn(`Search not implemented for integration: ${integration.id}`);
                return [];
        }
    }

    async searchPaperless(query) {
        try {
            const response = await fetch(`${globalThis.getApiBaseUrl()}/api/paperless/search?q=${encodeURIComponent(query)}&page_size=20`);
            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) {
                throw new Error(responseValidation.errorMessage);
            }

            const data = await response.json();
            
            return (data.results || []).map(doc => ({
                id: doc.id,
                title: doc.title,
                source: 'paperless',
                sourceName: 'Paperless NGX',
                downloadUrl: `${globalThis.getApiBaseUrl()}/api/paperless/document/${doc.id}/download`,
                viewUrl: doc.original_file_name ? `${globalThis.getApiBaseUrl()}/api/paperless/document/${doc.id}/download` : null,
                mimeType: doc.mime_type,
                fileSize: doc.file_size,
                created: doc.created,
                modified: doc.modified,
                tags: doc.tags || [],
                correspondent: doc.correspondent_name,
                documentType: doc.document_type_name,
                attachedAt: new Date().toISOString()
            }));
        } catch (error) {
            console.error('Paperless search failed:', error);
            throw new Error(`Paperless search failed: ${error.message}`);
        }
    }

    async searchNextcloud(query) {
        // Placeholder for future Nextcloud integration
        try {
            const response = await fetch(`${globalThis.getApiBaseUrl()}/api/nextcloud/search?q=${encodeURIComponent(query)}`);
            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) {
                throw new Error(responseValidation.errorMessage);
            }

            const data = await response.json();
            
            return (data.files || []).map(file => ({
                id: file.fileid,
                title: file.basename,
                source: 'nextcloud',
                sourceName: 'Nextcloud',
                downloadUrl: `${globalThis.getApiBaseUrl()}/api/nextcloud/file/${encodeURIComponent(file.path)}/download`,
                viewUrl: file.preview_url,
                mimeType: file.mimetype,
                fileSize: file.size,
                created: file.mtime,
                modified: file.mtime,
                path: file.path,
                attachedAt: new Date().toISOString()
            }));
        } catch (error) {
            console.error('Nextcloud search failed:', error);
            // Don't throw for future integrations that aren't implemented yet
            return [];
        }
    }

    displayResults(results, query) {
        const resultsContainer = document.getElementById('externalDocResults');
        if (!resultsContainer) return;

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M16 16l-4-4-4 4"/>
                        <path d="M12 8v8"/>
                    </svg>
                    <p>No documents found for "${query}"</p>
                </div>
            `;
            return;
        }

        // Sort results by relevance/date
        results.sort((a, b) => new Date(b.modified || b.created) - new Date(a.modified || a.created));

        const resultsHtml = results.map(doc => this.createDocumentItemHtml(doc)).join('');
        resultsContainer.innerHTML = resultsHtml;

        // Bind link buttons
        resultsContainer.querySelectorAll('.external-doc-link-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const docData = JSON.parse(e.target.dataset.docData);
                this.linkDocument(docData);
            });
        });
    }

    createDocumentItemHtml(doc) {
        const formattedDate = doc.modified ? new Date(doc.modified).toLocaleDateString() : '';
        const formattedSize = doc.fileSize ? this.formatFileSize(doc.fileSize) : '';
        
        const meta = [
            formattedDate,
            formattedSize,
            doc.correspondent,
            doc.documentType
        ].filter(Boolean).join(' • ');

        return `
            <div class="external-doc-item">
                <div class="external-doc-info">
                    <div class="external-doc-title">
                        ${this.escapeHtml(doc.title)}
                        <span class="external-doc-source">
                            ${this.getIntegrationIcon({ id: doc.source })}
                            ${doc.sourceName}
                        </span>
                    </div>
                    ${meta ? `<div class="external-doc-meta">${this.escapeHtml(meta)}</div>` : ''}
                    ${doc.tags && doc.tags.length > 0 ? `
                        <div class="external-doc-meta">
                            Tags: ${doc.tags.map(tag => `<span class="tag">${this.escapeHtml(tag.name || tag)}</span>`).join(', ')}
                        </div>
                    ` : ''}
                </div>
                <button class="external-doc-link-btn" data-doc-data='${JSON.stringify(doc)}'>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    Link
                </button>
            </div>
        `;
    }

    async linkDocument(docData) {
        try {
            // Create attachment object compatible with existing system
            const attachment = {
                paperlessId: docData.id, // Keep for backward compatibility
                externalId: docData.id,
                source: docData.source,
                title: docData.title,
                downloadUrl: docData.downloadUrl,
                viewUrl: docData.viewUrl,
                mimeType: docData.mimeType,
                fileSize: docData.fileSize,
                attachedAt: docData.attachedAt,
                // Additional metadata
                tags: docData.tags,
                correspondent: docData.correspondent,
                documentType: docData.documentType,
                path: docData.path
            };

            // Use existing modal manager method, but make it generic
            await this.modalManager.attachExternalDocument(
                attachment, 
                this.currentAttachmentType, 
                this.currentIsSubAsset
            );

            // Close the modal
            this.closeModal();

            globalThis.toaster.show(`Linked "${docData.title}" to ${this.currentAttachmentType}`, 'success');

        } catch (error) {
            globalThis.logError('Failed to link external document:', error.message);
        }
    }

    showSearchPlaceholder() {
        const resultsContainer = document.getElementById('externalDocResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="search-placeholder">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>
                    <p>Start typing to search external documents</p>
                </div>
            `;
        }
    }

    formatFileSize(bytes) {
        if (!bytes) return '';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
} 