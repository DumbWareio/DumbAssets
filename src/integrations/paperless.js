/**
 * PaperlessManager handles all Paperless NGX integration functionality
 * including document search, attachment, and configuration management
 */
export class PaperlessIntegration {
    constructor(modalManager) {
        this.searchModal = null;
        this.currentSearchQuery = '';
        this.searchTimeout = null;
        this.DEBUG = false;
        this._createSearchModal();

        this.modalManager = modalManager;

        // Asset modal search buttons
        this.searchPaperlessPhotos = document.getElementById('searchPaperlessPhotos');
        this.searchPaperlessReceipts = document.getElementById('searchPaperlessReceipts');
        this.searchPaperlessManuals = document.getElementById('searchPaperlessManuals');

        // Sub-asset modal search buttons
        this.searchPaperlessSubPhotos = document.getElementById('searchPaperlessSubPhotos');
        this.searchPaperlessSubReceipts = document.getElementById('searchPaperlessSubReceipts');
        this.searchPaperlessSubManuals = document.getElementById('searchPaperlessSubManuals');
        this.setupPaperlessEventListeners();
    }

    /**
     * Check if Paperless integration is enabled and configured
     */
    async isEnabled() {
        try {
            const response = await fetch('/api/settings', { credentials: 'include' });
            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) return false;

            const settings = await response.json();
            const paperlessConfig = settings.integrationSettings?.paperless;
            
            // Check if enabled and has host URL
            // For API token, accept both actual tokens and the placeholder (indicates saved token exists)
            return paperlessConfig?.enabled && 
                   paperlessConfig?.hostUrl && 
                   (paperlessConfig?.apiToken && paperlessConfig.apiToken.length > 0);
        } catch (error) {
            if (this.DEBUG) console.error('Failed to check Paperless config:', error);
            return false;
        }
    }

    /**
     * Open the Paperless document search modal
     */
    async openSearchModal(onAttach) {
        const enabled = await this.isEnabled();
        if (!enabled) {
            globalThis.toaster.show('Paperless integration is not configured. Please check your settings.', 'error');
            return;
        }

        this.onAttachCallback = onAttach;
        this.searchModal.style.display = 'flex';
        this._clearSearch();
        this._focusSearchInput();
        this._loadRecentDocuments();
    }

    /**
     * Close the search modal
     */
    closeSearchModal() {
        if (this.searchModal) {
            this.searchModal.style.display = 'none';
            this._clearSearch();
        }
    }

    /**
     * Search for Paperless documents
     */
    async searchDocuments(query, page = 1) {
        try {
            const searchUrl = `/api/paperless/search?q=${encodeURIComponent(query)}&page=${page}&page_size=20`;
            const response = await fetch(searchUrl, { credentials: 'include' });
            
            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) throw new Error(responseValidation.errorMessage);

            const data = await response.json();
            return data;
        } catch (error) {
            globalThis.logError('Failed to search Paperless documents:', error.message);
            throw error;
        }
    }

    /**
     * Attach a Paperless document to the current asset/sub-asset
     */
    async attachDocument(document) {
        try {
            if (!this.onAttachCallback) {
                throw new Error('No attachment callback configured');
            }

            // Create a standardized attachment object
            const attachment = {
                id: `paperless_${document.id}`,
                type: 'paperless_document',
                paperlessId: document.id,
                title: document.title,
                originalName: document.original_file_name || document.title,
                mimeType: document.mime_type || 'application/pdf',
                fileSize: document.size || null,
                downloadUrl: `${globalThis.getApiBaseUrl()}/api/paperless/document/${document.id}/download`,
                isPaperlessDocument: true,
                attachedAt: new Date().toISOString(),
                paperlessUrl: document.download_url
            };

            // Call the attachment callback
            await this.onAttachCallback(attachment);
            
            this.closeSearchModal();
            globalThis.toaster.show(`Attached "${document.title}" from Paperless`, 'success');
        } catch (error) {
            globalThis.logError('Failed to attach Paperless document:', error.message);
        }
    }

    /**
     * Create the search modal HTML structure
     */
    _createSearchModal() {
        // Remove existing modal if it exists
        const existingModal = document.getElementById('paperlessSearchModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = `
            <div id="paperlessSearchModal" class="paperless-search-modal" style="display: none;">
                <div class="paperless-search-content">
                    <div class="paperless-search-header">
                        <h3 style="margin: 0; color: var(--text-color);">Search Paperless Documents</h3>
                        <button type="button" class="close-btn" id="paperlessSearchClose">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="paperless-search-body">
                        <input 
                            type="text" 
                            id="paperlessSearchInput" 
                            class="paperless-search-input" 
                            placeholder="Search documents by title, content, or tags..."
                            autocomplete="off"
                        >
                        <div id="paperlessSearchResults" class="paperless-results">
                            <div style="text-align: center; color: var(--text-light); padding: 2rem;">
                                Start typing to search documents...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.searchModal = document.getElementById('paperlessSearchModal');

        // Bind events
        this._bindSearchModalEvents();
    }

    /**
     * Bind event listeners for the search modal
     */
    _bindSearchModalEvents() {
        const closeBtn = document.getElementById('paperlessSearchClose');
        const searchInput = document.getElementById('paperlessSearchInput');

        // Close button
        closeBtn.addEventListener('click', () => this.closeSearchModal());

        // Click outside to close
        this.searchModal.addEventListener('click', (e) => {
            if (e.target === this.searchModal) {
                this.closeSearchModal();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.searchModal.style.display === 'flex') {
                this.closeSearchModal();
            }
        });

        // Search input with debouncing
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            this.currentSearchQuery = query;

            // Clear previous timeout
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }

            // Debounce search
            this.searchTimeout = setTimeout(() => {
                if (query.length === 0) {
                    this._loadRecentDocuments();
                } else if (query.length >= 2) {
                    this._performSearch(query);
                }
            }, 300);
        });

        // Enter key to search
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = e.target.value.trim();
                if (query.length >= 2) {
                    this._performSearch(query);
                }
            }
        });
    }

    /**
     * Focus the search input
     */
    _focusSearchInput() {
        const searchInput = document.getElementById('paperlessSearchInput');
        if (searchInput) {
            setTimeout(() => searchInput.focus(), 100);
        }
    }

    /**
     * Clear search results and input
     */
    _clearSearch() {
        const searchInput = document.getElementById('paperlessSearchInput');
        const resultsDiv = document.getElementById('paperlessSearchResults');
        
        if (searchInput) searchInput.value = '';
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div style="text-align: center; color: var(--text-light); padding: 2rem;">
                    Start typing to search documents...
                </div>
            `;
        }
        
        this.currentSearchQuery = '';
    }

    /**
     * Load recent documents when no search query
     */
    async _loadRecentDocuments() {
        try {
            const results = await this.searchDocuments('', 1);
            this._renderSearchResults(results, 'Recent Documents');
        } catch (error) {
            this._renderError('Failed to load recent documents');
        }
    }

    /**
     * Perform search with the given query
     */
    async _performSearch(query) {
        const resultsDiv = document.getElementById('paperlessSearchResults');
        
        // Show loading state
        resultsDiv.innerHTML = `
            <div style="text-align: center; color: var(--text-light); padding: 2rem;">
                <div class="spinner" style="display: inline-block; margin-right: 0.5rem;"></div>
                Searching...
            </div>
        `;

        try {
            const results = await this.searchDocuments(query);
            this._renderSearchResults(results, `Search Results for "${query}"`);
        } catch (error) {
            this._renderError(`Search failed: ${error.message}`);
        }
    }

    setupPaperlessEventListeners() {
        // Asset modal handlers
        if (searchPaperlessPhotos) {
            searchPaperlessPhotos.addEventListener('click', () => {
                this.openSearchModal((attachment) => {
                    return this.modalManager.attachPaperlessDocument(attachment, 'photo', false);
                });
            });
        }

        if (searchPaperlessReceipts) {
            searchPaperlessReceipts.addEventListener('click', () => {
                this.openSearchModal((attachment) => {
                    return this.modalManager.attachPaperlessDocument(attachment, 'receipt', false);
                });
            });
        }

        if (searchPaperlessManuals) {
            searchPaperlessManuals.addEventListener('click', () => {
                this.openSearchModal((attachment) => {
                    return this.modalManager.attachPaperlessDocument(attachment, 'manual', false);
                });
            });
        }

        // Sub-asset modal handlers
        if (searchPaperlessSubPhotos) {
            searchPaperlessSubPhotos.addEventListener('click', () => {
                this.openSearchModal((attachment) => {
                    return this.modalManager.attachPaperlessDocument(attachment, 'photo', true);
                });
            });
        }

        if (searchPaperlessSubReceipts) {
            searchPaperlessSubReceipts.addEventListener('click', () => {
                this.openSearchModal((attachment) => {
                    return this.modalManager.attachPaperlessDocument(attachment, 'receipt', true);
                });
            });
        }

        if (searchPaperlessSubManuals) {
            searchPaperlessSubManuals.addEventListener('click', () => {
                this.openSearchModal((attachment) => {
                    return this.modalManager.attachPaperlessDocument(attachment, 'manual', true);
                });
            });
        }
    }

    /**
     * Render search results in the modal
     */
    _renderSearchResults(data, title) {
        const resultsDiv = document.getElementById('paperlessSearchResults');
        
        if (!data.results || data.results.length === 0) {
            resultsDiv.innerHTML = `
                <div style="text-align: center; color: var(--text-light); padding: 2rem;">
                    No documents found
                </div>
            `;
            return;
        }

        const resultsHTML = `
            <h4 style="margin: 0 0 1rem 0; color: var(--text-color);">${title} (${data.count})</h4>
            ${data.results.map(doc => this._renderDocumentItem(doc)).join('')}
            ${data.count > data.results.length ? `
                <div style="text-align: center; margin-top: 1rem; color: var(--text-light);">
                    Showing ${data.results.length} of ${data.count} documents
                </div>
            ` : ''}
        `;

        resultsDiv.innerHTML = resultsHTML;

        // Bind attach buttons
        resultsDiv.querySelectorAll('.paperless-attach-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const docId = e.target.dataset.docId;
                const document = data.results.find(doc => doc.id.toString() === docId);
                if (document) {
                    this.attachDocument(document);
                }
            });
        });
    }

    /**
     * Render a single document item
     */
    _renderDocumentItem(document) {
        const createdDate = new Date(document.created).toLocaleDateString();
        const fileSize = document.size ? this._formatFileSize(document.size) : '';
        const tags = document.tags && document.tags.length > 0 
            ? document.tags.slice(0, 3).join(', ') + (document.tags.length > 3 ? '...' : '')
            : '';

        return `
            <div class="paperless-document-item">
                <div class="paperless-doc-info">
                    <div class="paperless-doc-title">${this._escapeHtml(document.title)}</div>
                    <div class="paperless-doc-meta">
                        Created: ${createdDate}
                        ${fileSize ? ` • Size: ${fileSize}` : ''}
                        ${tags ? ` • Tags: ${this._escapeHtml(tags)}` : ''}
                    </div>
                </div>
                <button type="button" class="paperless-attach-btn" data-doc-id="${document.id}">
                    Attach
                </button>
            </div>
        `;
    }

    /**
     * Render error message
     */
    _renderError(message) {
        const resultsDiv = document.getElementById('paperlessSearchResults');
        resultsDiv.innerHTML = `
            <div style="text-align: center; color: #ef4444; padding: 2rem;">
                ${this._escapeHtml(message)}
            </div>
        `;
    }

    /**
     * Format file size for display
     */
    _formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Escape HTML to prevent XSS
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
} 