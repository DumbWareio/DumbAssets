/**
 * External Document Manager - Handles searching and linking documents from multiple integrations
 * Supports Paperless NGX initially, extensible for Nextcloud, SharePoint, etc.
 */

import { API_PAPERLESS_ENDPOINT } from '../../src/constants.js';

export class ExternalDocManager {
    constructor({ modalManager, setButtonLoading }) {
        this.modalManager = modalManager;
        this.setButtonLoading = setButtonLoading;
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

            const response = await fetch(`${globalThis.getApiBaseUrl()}/api/integrations/enabled`);
            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) throw new Error(responseValidation.errorMessage);
            
            this.activeIntegrations = await response.json();

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
            filtersContainer.innerHTML = '<div style="color: var(--text-color-secondary); padding: 0.5rem;">No document integrations enabled</div>';
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
            btn.textContent = integration.name;
            btn.addEventListener('click', () => this.toggleIntegrationFilter(integration.id));
            filtersContainer.appendChild(btn);
        });
    }

    toggleIntegrationFilter(integrationId) {
        // Simplified toggle logic for now
        this.selectedIntegrations.clear();
        this.selectedIntegrations.add(integrationId === 'all' ? 'all' : integrationId);
        
        const buttons = document.querySelectorAll('.integration-filter-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
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
                searchInput.placeholder = 'Search documents or browse all...';
            }
            
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
        this.isLoading = true;

        const resultsContainer = document.getElementById('externalDocResults');
        if (!resultsContainer) return;

        this.showLoading('Searching documents...');

        try {
            const results = await this.searchPaperless(query, this.currentPage);
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
        this.isLoading = true;

        this.showLoading('Loading documents...');

        try {
            const results = await this.searchPaperless('', this.currentPage);
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

    async searchPaperless(query, page = 1) {
        const params = new URLSearchParams({
            page: page.toString(),
            page_size: this.pageSize.toString()
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
                attachedAt: new Date().toISOString()
            })),
            count: data.count || 0,
            next: data.next,
            previous: data.previous
        };
    }

    displayResults(data, query) {
        const resultsContainer = document.getElementById('externalDocResults');
        if (!resultsContainer) return;

        const results = data.results || [];

        if (results.length === 0) {
            const message = query ? `No documents found for "${query}"` : 'No documents available';
            resultsContainer.innerHTML = `<div class="no-results"><p>${message}</p></div>`;
            this.hidePagination();
            return;
        }

        const resultsHtml = results.map(doc => {
            const formattedDate = doc.modified ? new Date(doc.modified).toLocaleDateString() : '';
            const formattedSize = doc.fileSize ? this.formatFileSize(doc.fileSize) : '';
            const meta = [formattedDate, formattedSize].filter(Boolean).join(' • ');
            
            const html = `
                <div class="external-doc-item">
                    <div class="external-doc-info">
                        <div class="external-doc-title">
                            ${this.escapeHtml(doc.title)}
                            <span class="external-doc-source">Paperless NGX</span>
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
                const docData = data.results.find(doc => doc.id === parseInt(docId,
                    10));
                if (docData) {
                    this.linkDocument(docData);
                } else {
                    globalThis.logError(`Document with ID ${docId} not found in results`);
                }
            });
        });
        
        this.updatePagination(data, query);
    }

    updatePagination(data, query) {
        const paginationContainer = document.getElementById('externalDocPagination');
        const paginationInfo = document.getElementById('paginationInfo');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');

        if (!paginationContainer || !paginationInfo || !prevBtn || !nextBtn) return;

        const totalPages = Math.ceil(data.count / this.pageSize);
        const startItem = (this.currentPage - 1) * this.pageSize + 1;
        const endItem = Math.min(this.currentPage * this.pageSize, data.count);

        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'flex';
        paginationInfo.textContent = `${startItem}-${endItem} of ${data.count} documents`;
        
        prevBtn.disabled = !data.previous;
        nextBtn.disabled = !data.next;
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

    async linkDocument(docData) {
        // Find the button that was clicked
        const clickedButton = event?.target?.closest('.external-doc-link-btn');
        
        try {
            if (clickedButton) this.setButtonLoading(clickedButton, true);
            
            const attachment = {
                paperlessId: docData.id,
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



    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}