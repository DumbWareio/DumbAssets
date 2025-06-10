/**
 * Dashboard Manager
 * Handles dashboard rendering, events collection, and events display functionality
 */
import { formatDate } from '../helpers/utils.js';

export class DashboardManager {
    constructor({
        // DOM elements
        assetDetails,
        subAssetContainer,
        searchInput,
        clearFiltersBtn,
        
        // Utility functions
        formatDate,
        formatCurrency,
        
        // Managers
        chartManager,
        settingsManager,
        
        // UI functions
        updateDashboardFilter,
        updateSort,
        updateSelectedIds,
        renderAssetDetails,
        renderAssetList,
        handleSidebarNav,
        setButtonLoading,
        
        // Global state getters
        getAssets,
        getSubAssets,
        getDashboardFilter,
        getCurrentSort,
        getSelectedAssetId
    }) {
        // Store DOM elements
        this.assetDetails = assetDetails;
        this.subAssetContainer = subAssetContainer;
        this.searchInput = searchInput;
        this.clearFiltersBtn = clearFiltersBtn;
        
        // Store utility functions
        this.formatDate = formatDate;
        this.formatCurrency = formatCurrency;
        
        // Store chart manager
        this.chartManager = chartManager;
        this.settingsManager = settingsManager;
        
        // Store UI functions
        this.updateDashboardFilter = updateDashboardFilter;
        this.updateSort = updateSort;
        this.updateSelectedIds = updateSelectedIds;
        this.renderAssetDetails = renderAssetDetails;
        this.renderAssetList = renderAssetList;
        this.handleSidebarNav = handleSidebarNav;
        this.setButtonLoading = setButtonLoading;
        
        // Store state getters
        this.getAssets = getAssets;
        this.getSubAssets = getSubAssets;
        this.getDashboardFilter = getDashboardFilter;
        this.getCurrentSort = getCurrentSort;
        this.getSelectedAssetId = getSelectedAssetId;
        
        // Events state
        this.currentFilter = 'all';
        this.currentSort = { field: 'date', direction: 'asc' };
        this.currentPage = 1;
        this.eventsPerPage = 5;

        this.addEventListeners();
    }
    
    async getDashboardSectionVisibility() {
        try {
            const localSettings = this.settingsManager.getSettingsFromLocalStorage();
            if (localSettings) {
                if (localSettings.interfaceSettings && localSettings.interfaceSettings.dashboardVisibility) {
                    return { ...localSettings.interfaceSettings.dashboardVisibility };
                }
            } else {
                const settings = await this.settingsManager.fetchSettings();
                if (settings.interfaceSettings && settings.interfaceSettings.dashboardVisibility) {
                    return { ...settings.interfaceSettings.dashboardVisibility };
                }
            }
        } catch (e) {
            console.error(e);
        }

        const defaultSettings = this.settingsManager.getDefaultSettings();
        return { ...defaultSettings.interfaceSettings.dashboardVisibility };
    }
    
    async getDashboardOrder() {
        // DASHBOARD ORDER IS AN ARRAY
        try {
            // Try to get from localStorage as a quick cache
            const localSettings = this.settingsManager.getSettingsFromLocalStorage();
            if (localSettings && localSettings.interfaceSettings?.dashboardOrder) {
                return localSettings.interfaceSettings.dashboardOrder;
            }
            else {
                const settings = await this.settingsManager.fetchSettings();
                return settings.interfaceSettings.dashboardOrder;
            }
        } catch (err) {
            console.error('Error getting dashboard order', err);
        }

        const defaultSettings = this.settingsManager.getDefaultSettings();
        return defaultSettings.interfaceSettings.dashboardOrder;
    }
    
    async getDashboardCardVisibility() {
        try {
            const localSettings = this.settingsManager.getSettingsFromLocalStorage();
            if (localSettings && localSettings.interfaceSettings?.cardVisibility) {
                return { ...localSettings.interfaceSettings.cardVisibility};
            } 
            else {
                const settings = await this.settingsManager.fetchSettings();
                return { ...settings.interfaceSettings.cardVisibility};
            }
        } catch (e) {
            console.error('Error getting dashboard card visibility', e);
        }

        const defaultSettings = this.settingsManager.getDefaultSettings();
        return { ...defaultSettings.interfaceSettings.cardVisibility};
    }
    
    async renderDashboard(shouldAnimateCharts = true) {
        const assets = this.getAssets();
        const subAssets = this.getSubAssets();
        const dashboardFilter = this.getDashboardFilter();
        const selectedAssetId = this.getSelectedAssetId();
        
        // Calculate stats
        const totalAssets = assets.length;
        const totalSubAssets = subAssets.length;
        // Total Components is just the count of sub-assets
        const totalComponents = totalSubAssets;
        
        // Calculate total value including sub-assets
        const totalAssetsValue = assets.reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0);
        const totalSubAssetsValue = subAssets.reduce((sum, sa) => sum + (parseFloat(sa.purchasePrice) || 0), 0);
        const totalValue = totalAssetsValue + totalSubAssetsValue;
        
        
        const assetWarranties = assets.filter(a => a.warranty && (a.warranty.expirationDate || a.warranty.isLifetime));
        const subAssetWarranties = subAssets.filter(sa => sa.warranty && (sa.warranty.expirationDate || sa.warranty.isLifetime));
        const allWarranties = [...assetWarranties, ...subAssetWarranties];
        
        const now = new Date();
        let expired = 0, within60 = 0, within30 = 0, active = 0;
        
        allWarranties.forEach(item => {
            const isLifetime = item.warranty.isLifetime;
            if (isLifetime) {
                active++;
                return;
            }
            const exp = new Date(formatDate(item.warranty.expirationDate));
            if (isNaN(exp)) return;
            const diff = (exp - now) / (1000 * 60 * 60 * 24);
            if (diff < 0) {
                expired++;
            } else if (diff <= 30) {
                within30++;
            } else if (diff <= 60) {
                within60++;
                active++;
            } else {
                active++;
            }
        });

        const sectionOrder = await this.getDashboardOrder();
        const sectionVisibility = await this.getDashboardSectionVisibility();
        const cardVisibility = await this.getDashboardCardVisibility();
        
        // Prepare HTML sections for each dashboard component
        const totalsSection = sectionVisibility.totals ? `
            <fieldset class="dashboard-legend">
                <legend class="dashboard-legend-title">Totals</legend>
                <div class="dashboard-section" data-section="totals">
                    <div class="dashboard-cards totals-cards">
                        ${cardVisibility.assets !== false ? `<div class="dashboard-card card-total${!dashboardFilter ? ' active' : ''}" data-filter="all">
                            <div class="card-label">Assets</div>
                            <div class="card-value">${totalAssets}</div>
                        </div>` : ''}
                        ${cardVisibility.components !== false ? `<div class="dashboard-card card-components${dashboardFilter === 'components' ? ' active' : ''}" data-filter="components">
                            <div class="card-label">Components</div>
                            <div class="card-value">${totalComponents}</div>
                        </div>` : ''}
                        ${cardVisibility.value !== false ? `<div class="dashboard-card card-asset-value" data-filter="value">
                            <div class="card-label">Value</div>
                            <div class="card-value">${this.formatCurrency(totalValue)}</div>
                        </div>` : ''}
                    </div>
                </div>
            </fieldset>` : '';
            
        const warrantiesSection = sectionVisibility.warranties ? `
            <fieldset class="dashboard-legend">
                <legend class="dashboard-legend-title">Warranties</legend>
                <div class="dashboard-section dashboard-warranty-section" data-section="warranties">
                    <div class="dashboard-cards warranty-cards">
                        ${cardVisibility.warranties !== false ? `<div class="dashboard-card card-warranties${dashboardFilter === 'warranties' ? ' active' : ''}" data-filter="warranties">
                            <div class="card-label">Total</div>
                            <div class="card-value">${allWarranties.length}</div>
                        </div>` : ''}
                        ${cardVisibility.within60 !== false ? `<div class="dashboard-card card-within60${dashboardFilter === 'within60' ? ' active' : ''}" data-filter="within60">
                            <div class="card-label">In 60 days</div>
                            <div class="card-value">${within60}</div>
                        </div>` : ''}
                        ${cardVisibility.within30 !== false ? `<div class="dashboard-card card-within30${dashboardFilter === 'within30' ? ' active' : ''}" data-filter="within30">
                            <div class="card-label">In 30 days</div>
                            <div class="card-value">${within30}</div>
                        </div>` : ''}
                        ${cardVisibility.expired !== false ? `<div class="dashboard-card card-expired${dashboardFilter === 'expired' ? ' active' : ''}" data-filter="expired">
                            <div class="card-label">Expired</div>
                            <div class="card-value">${expired}</div>
                        </div>` : ''}
                        ${cardVisibility.active !== false ? `<div class="dashboard-card card-active${dashboardFilter === 'active' ? ' active' : ''}" data-filter="active">
                            <div class="card-label">Active</div>
                            <div class="card-value">${active}</div>
                        </div>` : ''}
                    </div>
                </div>
            </fieldset>` : '';
        
        // Generate Events section
        const eventsSection = sectionVisibility.events ? this.generateEventsSection() : '';
        
        const analyticsSection = sectionVisibility.analytics ? `
            <fieldset class="dashboard-legend">
                <legend class="dashboard-legend-title">Analytics</legend>
                <div class="dashboard-section" data-section="analytics">
                    <div class="dashboard-charts-section">
                        <div class="chart-container">
                            <h3>Warranty Status</h3>
                            <canvas id="warrantyPieChart" class="chart-canvas"></canvas>
                        </div>
                        <div class="chart-container">
                            <h3>Warranties Expiring Over Time</h3>
                            <canvas id="warrantyLineChart" class="chart-canvas"></canvas>
                        </div>
                    </div>
                </div>
            </fieldset>` : '';
        
        // Map of section names to their HTML
        const sectionMap = {};
        if (sectionVisibility.analytics) sectionMap['analytics'] = analyticsSection;
        if (sectionVisibility.totals) sectionMap['totals'] = totalsSection;
        if (sectionVisibility.warranties) sectionMap['warranties'] = warrantiesSection;
        if (sectionVisibility.events) sectionMap['events'] = eventsSection;
        
        // Build the sections in the custom order
        let orderedSections = '';
        sectionOrder.forEach(sectionName => {
            if (sectionMap[sectionName]) {
                orderedSections += sectionMap[sectionName];
            }
        });
        
        // Set the dashboard HTML with ordered sections
        this.subAssetContainer.classList.add('hidden');
        this.assetDetails.innerHTML = `
            <fieldset class="dashboard-legend">
                <legend class="dashboard-legend-title">Asset Overview</legend>
                ${orderedSections}
            </fieldset>
        `;
        
        // Initialize events section functionality if it exists
        if (sectionVisibility.events) {
            this.initializeEventsSection();
        }
        
        // Only create charts if shouldAnimateCharts is true
        if (sectionVisibility.analytics)
            this.chartManager.createWarrantyDashboard({ allWarranties, expired, within30, within60, active }, shouldAnimateCharts);
        else
            this.chartManager.destroyAllCharts();

        // Add click handlers for filtering (except value card)
        this.assetDetails.querySelectorAll('.dashboard-card').forEach(card => {
            if (card.getAttribute('data-filter') === 'value') return;
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                const filter = card.getAttribute('data-filter');

                // Remove active class from all cards
                this.assetDetails.querySelectorAll('.dashboard-card').forEach(c => {
                    c.classList.remove('active');
                });

                // Add active class to clicked card
                card.classList.add('active');

                if (filter === 'all') {
                    this.updateDashboardFilter(null);
                } else {
                    this.updateDashboardFilter(filter);
                }
                
                this.renderAssetList(this.searchInput.value);
                
                // Update events display if events section exists
                const eventsTable = document.getElementById('eventsTable');
                if (eventsTable) {
                    this.updateEventsDisplay();
                }
            });
        });
    }
    
    generateEventsSection() {
        // Get saved date range from localStorage, default to '12' (1 Year)
        const savedDateRange = localStorage.getItem('eventsDateRange') || '12';
        
        // Convert range value to the appropriate parameter for collectEventsInRange
        let monthsAhead;
        let specificDate = null;
        let specificDateDisplay = '';
        
        if (savedDateRange === 'all') {
            monthsAhead = 'all';
        } else if (savedDateRange === 'past') {
            monthsAhead = 'past';
        } else if (savedDateRange.startsWith && savedDateRange.startsWith('specific:')) {
            monthsAhead = 'specific';
            specificDate = savedDateRange.substring(9); // Remove 'specific:' prefix
            // Format the date for display using formatDate utility
            if (specificDate) {
                specificDateDisplay = this.formatDate(specificDate);
            }
        } else {
            monthsAhead = parseInt(savedDateRange);
        }
        
        const events = this.collectEventsInRange(monthsAhead, specificDate);
        
        return `
            <fieldset class="dashboard-legend">
                <legend class="dashboard-legend-title">Events</legend>
                <div class="dashboard-section" data-section="events">
                    <div class="events-controls">
                        <div class="events-filters">
                            <button class="events-filter-btn active" data-filter="all">
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M12 1v6m0 6v6"></path>
                                    <path d="m21 12-6-3-6 3-6-3"></path>
                                </svg>
                                All
                            </button>
                            <button class="events-filter-btn" data-filter="warranty">
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14,2 14,8 20,8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10,9 9,9 8,9"></polyline>
                                </svg>
                                Warranty
                            </button>
                            <button class="events-filter-btn" data-filter="maintenance">
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                                </svg>
                                Maintenance
                            </button>
                        </div>
                        <div class="events-sort">
                            <div class="events-date-filter">
                                <div class="events-calendar-icon${savedDateRange.startsWith && savedDateRange.startsWith('specific:') ? ' show' : ''}" id="eventsCalendarIcon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                    <input type="date" id="eventsSpecificDate" class="events-date-input" value="${specificDate || ''}">
                                </div>
                                <select id="eventsDateRange" class="events-date-select">
                                    <option value="past"${savedDateRange === 'past' ? ' selected' : ''}>Past Events</option>
                                    <option value="1"${savedDateRange === '1' ? ' selected' : ''}>1 Month</option>
                                    <option value="3"${savedDateRange === '3' ? ' selected' : ''}>3 Months</option>
                                    <option value="6"${savedDateRange === '6' ? ' selected' : ''}>6 Months</option>
                                    <option value="12"${savedDateRange === '12' ? ' selected' : ''}>1 Year</option>
                                    <option value="all"${savedDateRange === 'all' ? ' selected' : ''}>All Future</option>
                                    <option value="specific"${savedDateRange.startsWith && savedDateRange.startsWith('specific:') ? ' selected' : ''}>${specificDateDisplay ? specificDateDisplay : 'Specific Date'}</option>
                                </select>
                            </div>
                            <button class="events-sort-btn" data-sort="date" data-direction="asc">
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M3 6h18"></path>
                                    <path d="M7 12h10"></path>
                                    <path d="M10 18h4"></path>
                                </svg>
                                Date
                                <svg class="sort-icon" viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="events-table-container">
                        <div class="events-table" id="eventsTable">
                            ${this.generateEventsTableHTML(events)}
                        </div>
                    </div>
                </div>
            </fieldset>
        `;
    }
    
    /**
     * Get filtered assets and sub-assets based on current search and dashboard filter
     * @param {Array} assets - All assets
     * @param {Array} subAssets - All sub-assets
     * @returns {Object} Object containing filteredAssets and filteredSubAssets arrays
     */
    getFilteredAssetsAndSubAssets(assets, subAssets) {
        const searchQuery = this.searchInput ? this.searchInput.value : '';
        const dashboardFilter = this.getDashboardFilter();
        
        // First apply search filter (same logic as renderAssetList)
        let filteredAssets = searchQuery
            ? assets.filter(asset => {
                // Check if the asset itself matches the search query
                const assetMatches = asset.name?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                    asset.tags?.some(tag => tag.toString().toLowerCase().includes(searchQuery.toLowerCase())) ||
                    asset.manufacturer?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                    asset.modelNumber?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                    asset.serialNumber?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                    asset.location?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                    asset.notes?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                    asset.description?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                    asset.link?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                    asset.warranty?.scope?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                    asset.secondaryWarranty?.scope?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                    this.formatCurrency(asset.price, true).toLowerCase().includes(this.formatCurrency(searchQuery, true)) ||
                    this.formatDate(asset.warranty?.expirationDate, true).includes(searchQuery.toLowerCase()) ||
                    this.formatDate(asset.secondaryWarranty?.expirationDate, true).includes(searchQuery.toLowerCase()) ||
                    this.formatDate(asset.purchaseDate, true).includes(searchQuery.toLowerCase());
                
                // If asset matches, return true
                if (assetMatches) return true;
                
                // Check if any of its sub-assets match the search query
                const hasMatchingSubAsset = subAssets.some(subAsset => {
                    if (subAsset.parentId !== asset.id) return false;
                    
                    return subAsset.name?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                        subAsset.tags?.some(tag => tag.toString().toLowerCase().includes(searchQuery.toLowerCase())) ||
                        subAsset.manufacturer?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                        subAsset.modelNumber?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                        subAsset.serialNumber?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                        subAsset.location?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                        subAsset.notes?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                        subAsset.description?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                        subAsset.link?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                        subAsset.warranty?.scope?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                        subAsset.secondaryWarranty?.scope?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                        this.formatCurrency(subAsset.purchasePrice, true).toLowerCase().includes(this.formatCurrency(searchQuery, true)) ||
                        this.formatDate(subAsset.warranty?.expirationDate, true).includes(searchQuery.toLowerCase()) ||
                        this.formatDate(subAsset.secondaryWarranty?.expirationDate, true).includes(searchQuery.toLowerCase()) ||
                        this.formatDate(subAsset.purchaseDate, true).includes(searchQuery.toLowerCase());
                });
                
                return hasMatchingSubAsset;
            })
            : assets;

        // Apply dashboard filter
        if (dashboardFilter) {
            const now = new Date();
            
            if (dashboardFilter === 'components') {
                // Only show assets that have sub-assets associated with them
                filteredAssets = filteredAssets.filter(a => 
                    subAssets.some(sa => sa.parentId === a.id)
                );
            }
            else if (dashboardFilter === 'warranties') {
                // Assets with warranties
                filteredAssets = filteredAssets.filter(a => a.warranty && a.warranty.expirationDate);
            } else if (dashboardFilter === 'expired') {
                // Assets with expired warranties
                filteredAssets = filteredAssets.filter(a => {
                    const exp = a.warranty?.expirationDate;
                    if (!exp) return false;
                    return new Date(this.formatDate(exp)) < now;
                });
                
                // Also include assets with sub-assets that have expired warranties
                const assetsWithExpiredComponents = assets.filter(a => 
                    !filteredAssets.includes(a) && // Don't duplicate
                    subAssets.some(sa => {
                        if (sa.parentId !== a.id) return false;
                        const exp = sa.warranty?.expirationDate;
                        if (!exp) return false;
                        return new Date(this.formatDate(exp)) < now;
                    })
                );
                
                filteredAssets = [...filteredAssets, ...assetsWithExpiredComponents];
            } else if (dashboardFilter === 'within30') {
                // Assets with warranties expiring within 30 days
                filteredAssets = filteredAssets.filter(a => {
                    const exp = a.warranty?.expirationDate;
                    if (!exp) return false;
                    const diff = (new Date(this.formatDate(exp)) - now) / (1000 * 60 * 60 * 24);
                    return diff >= 0 && diff <= 30;
                });
                
                // Also include assets with sub-assets expiring within 30 days
                const assetsWithExpiringComponents = assets.filter(a => 
                    !filteredAssets.includes(a) && // Don't duplicate
                    subAssets.some(sa => {
                        if (sa.parentId !== a.id) return false;
                        const exp = sa.warranty?.expirationDate;
                        if (!exp) return false;
                        const diff = (new Date(this.formatDate(exp)) - now) / (1000 * 60 * 60 * 24);
                        return diff >= 0 && diff <= 30;
                    })
                );
                
                filteredAssets = [...filteredAssets, ...assetsWithExpiringComponents];
            } else if (dashboardFilter === 'within60') {
                // Assets with warranties expiring between 31-60 days
                filteredAssets = filteredAssets.filter(a => {
                    const exp = a.warranty?.expirationDate;
                    if (!exp) return false;
                    const diff = (new Date(this.formatDate(exp)) - now) / (1000 * 60 * 60 * 24);
                    return diff > 30 && diff <= 60;
                });
                
                // Also include assets with sub-assets expiring within 31-60 days
                const assetsWithWarningComponents = assets.filter(a => 
                    !filteredAssets.includes(a) && // Don't duplicate
                    subAssets.some(sa => {
                        if (sa.parentId !== a.id) return false;
                        const exp = sa.warranty?.expirationDate;
                        if (!exp) return false;
                        const diff = (new Date(this.formatDate(exp)) - now) / (1000 * 60 * 60 * 24);
                        return diff > 30 && diff <= 60;
                    })
                );
                
                filteredAssets = [...filteredAssets, ...assetsWithWarningComponents];
            } else if (dashboardFilter === 'active') {
                // Assets with active warranties (more than 60 days)
                filteredAssets = filteredAssets.filter(a => {
                    const exp = a.warranty?.expirationDate;
                    const isLifetime = a.warranty?.isLifetime;
                    if (!exp && !isLifetime) return false;
                    if (isLifetime) return true;
                    const diff = (new Date(this.formatDate(exp)) - now) / (1000 * 60 * 60 * 24);
                    return diff > 60;
                });
                
                // Also include assets with sub-assets having active warranties
                const assetsWithActiveComponents = assets.filter(a => 
                    !filteredAssets.includes(a) && // Don't duplicate
                    subAssets.some(sa => {
                        if (sa.parentId !== a.id) return false;
                        const exp = sa.warranty?.expirationDate;
                        const isLifetime = sa.warranty?.isLifetime;
                        if (!exp && !isLifetime) return false;
                        if (isLifetime) return true;
                        const diff = (new Date(this.formatDate(exp)) - now) / (1000 * 60 * 60 * 24);
                        return diff > 60;
                    })
                );
                
                filteredAssets = [...filteredAssets, ...assetsWithActiveComponents];
            }
        }

        // Get asset IDs that are visible in the filtered list
        const filteredAssetIds = new Set(filteredAssets.map(a => a.id));
        
        // Filter sub-assets to only include those whose parents are in the filtered asset list
        // or those that match the search query themselves
        let filteredSubAssets = subAssets.filter(subAsset => {
            // Always include sub-assets whose parent assets are visible
            if (filteredAssetIds.has(subAsset.parentId)) {
                return true;
            }
            
            // If there's a search query, also include sub-assets that match the search directly
            if (searchQuery) {
                return subAsset.name?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                    subAsset.tags?.some(tag => tag.toString().toLowerCase().includes(searchQuery.toLowerCase())) ||
                    subAsset.manufacturer?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                    subAsset.modelNumber?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                    subAsset.serialNumber?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                    subAsset.location?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                    subAsset.notes?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                    subAsset.description?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                    subAsset.link?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                    subAsset.warranty?.scope?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                    subAsset.secondaryWarranty?.scope?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                    this.formatCurrency(subAsset.purchasePrice, true).toLowerCase().includes(this.formatCurrency(searchQuery, true)) ||
                    this.formatDate(subAsset.warranty?.expirationDate, true).includes(searchQuery.toLowerCase()) ||
                    this.formatDate(subAsset.secondaryWarranty?.expirationDate, true).includes(searchQuery.toLowerCase()) ||
                    this.formatDate(subAsset.purchaseDate, true).includes(searchQuery.toLowerCase());
            }
            
            return false;
        });

        return { filteredAssets, filteredSubAssets };
    }
    
    collectEventsInRange(monthsAhead = 12, specificDate = null) {
        const assets = this.getAssets();
        const subAssets = this.getSubAssets();
        const events = [];
        const now = new Date();
        let futureLimit = null;
        
        // Get filtered assets and sub-assets based on current search and dashboard filter
        const { filteredAssets, filteredSubAssets } = this.getFilteredAssetsAndSubAssets(assets, subAssets);
        
        // Set date range limits based on monthsAhead parameter
        if (monthsAhead === 'all') {
            // Show all future events (no time limit)
            futureLimit = null;
        } else if (monthsAhead === 'past') {
            // Show only past events
            futureLimit = now;
        } else if (monthsAhead === 'specific' && specificDate) {
            // Show events for a specific date
            // Use formatDate to properly parse the date without timezone issues
            const targetDate = new Date(this.formatDate(specificDate));
            // Set to start and end of the day for the target date
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);
            futureLimit = { start: startOfDay, end: endOfDay, isSpecific: true };
        } else {
            // Show only future events within the specified range
            // Use safer date calculation to avoid rollover issues
            futureLimit = new Date(now);
            const originalDay = now.getDate();
            futureLimit.setMonth(now.getMonth() + monthsAhead);
            
            // If the day rolled over due to target month having fewer days,
            // set to the last day of the target month
            if (futureLimit.getDate() !== originalDay) {
                futureLimit.setDate(0); // This sets to last day of previous month
            }
        }

        // Helper function to check if an event should be included based on date filtering
        const shouldIncludeEvent = (eventDate) => {
            if (monthsAhead === 'all') {
                return eventDate >= now; // Only future events for "All Events"
            } else if (monthsAhead === 'past') {
                return eventDate < now; // Only past events
            } else if (monthsAhead === 'specific' && futureLimit && futureLimit.isSpecific) {
                return eventDate >= futureLimit.start && eventDate <= futureLimit.end; // Events on specific date
            } else {
                return eventDate >= now && eventDate <= futureLimit; // Only future events in range
            }
        };

        // Collect warranty events from filtered assets
        filteredAssets.forEach(asset => {
            // Primary warranty
            if (asset.warranty && asset.warranty.expirationDate && !asset.warranty.isLifetime) {
                const expDate = new Date(formatDate(asset.warranty.expirationDate));
                
                if (shouldIncludeEvent(expDate)) {
                    events.push({
                        type: 'warranty',
                        date: expDate,
                        name: asset.name,
                        details: 'Warranty Expiration',
                        assetType: 'Asset',
                        warrantyType: 'Primary',
                        id: asset.id,
                        isSubAsset: false
                    });
                }
            }

            // Secondary warranty
            if (asset.secondaryWarranty && asset.secondaryWarranty.expirationDate && !asset.secondaryWarranty.isLifetime) {
                const expDate = new Date(formatDate(asset.secondaryWarranty.expirationDate));
                
                if (shouldIncludeEvent(expDate)) {
                    events.push({
                        type: 'warranty',
                        date: expDate,
                        name: asset.name,
                        details: 'Secondary Warranty Expiration',
                        assetType: 'Asset',
                        warrantyType: 'Secondary',
                        id: asset.id,
                        isSubAsset: false
                    });
                }
            }

            // Maintenance events
            if (asset.maintenanceEvents && asset.maintenanceEvents.length > 0) {
                asset.maintenanceEvents.forEach(event => {
                    if (event.type === 'frequency' && event.nextDueDate) {
                        // Generate multiple recurring events within the date range
                        const recurringEvents = this.generateRecurringEvents(
                            event.nextDueDate, 
                            event.frequency, 
                            event.frequencyUnit, 
                            now, 
                            futureLimit, 
                            monthsAhead
                        );
                        
                        recurringEvents.forEach(eventDate => {
                            events.push({
                                type: 'maintenance',
                                date: eventDate,
                                name: asset.name,
                                details: `${event.name} (Every ${event.frequency} ${event.frequencyUnit})`,
                                assetType: 'Asset',
                                notes: event.notes,
                                id: asset.id,
                                isSubAsset: false
                            });
                        });
                    } else if (event.type === 'specific' && event.specificDate) {
                        const eventDate = new Date(formatDate(event.specificDate));
                        
                        if (shouldIncludeEvent(eventDate)) {
                            events.push({
                                type: 'maintenance',
                                date: eventDate,
                                name: asset.name,
                                details: event.name,
                                assetType: 'Asset',
                                notes: event.notes,
                                id: asset.id,
                                isSubAsset: false
                            });
                        }
                    }
                });
            }
        });

        // Collect warranty events from filtered sub-assets
        filteredSubAssets.forEach(subAsset => {
            // Determine parent information based on whether this is a sub-asset or sub-sub-asset
            let parentName = 'Unknown Parent';
            let assetType = 'Component';
            
            if (subAsset.parentSubId) {
                // This is a sub-sub-asset (component of a component)
                const parentSubAsset = subAssets.find(sa => sa.id === subAsset.parentSubId);
                const parentAsset = assets.find(a => a.id === subAsset.parentId);
                if (parentSubAsset && parentAsset) {
                    parentName = `${parentAsset.name} > ${parentSubAsset.name}`;
                } else if (parentSubAsset) {
                    parentName = parentSubAsset.name;
                } else if (parentAsset) {
                    parentName = parentAsset.name;
                }
                assetType = 'Sub-Component';
            } else {
                // This is a regular sub-asset (component of an asset)
                const parentAsset = assets.find(a => a.id === subAsset.parentId);
                parentName = parentAsset ? parentAsset.name : 'Unknown Parent';
                assetType = 'Component';
            }

            if (subAsset.warranty && subAsset.warranty.expirationDate && !subAsset.warranty.isLifetime) {
                const expDate = new Date(formatDate(subAsset.warranty.expirationDate));
                
                // Apply date filtering logic
                let includeEvent = false;
                if (monthsAhead === 'all') {
                    includeEvent = expDate >= now; // Only future events for "All Events"
                } else if (monthsAhead === 'past') {
                    includeEvent = expDate < now; // Only past events
                } else {
                    includeEvent = expDate >= now && expDate <= futureLimit; // Only future events in range
                }
                
                if (includeEvent) {
                    events.push({
                        type: 'warranty',
                        date: expDate,
                        name: subAsset.name,
                        details: 'Warranty Expiration',
                        assetType: assetType,
                        parentAsset: parentName,
                        id: subAsset.id,
                        isSubAsset: true
                    });
                }
            }

            // Maintenance events for sub-assets (including sub-sub-assets)
            if (subAsset.maintenanceEvents && subAsset.maintenanceEvents.length > 0) {
                subAsset.maintenanceEvents.forEach(event => {
                    if (event.type === 'frequency' && event.nextDueDate) {
                        // Generate multiple recurring events within the date range
                        const recurringEvents = this.generateRecurringEvents(
                            event.nextDueDate, 
                            event.frequency, 
                            event.frequencyUnit, 
                            now, 
                            futureLimit, 
                            monthsAhead
                        );
                        
                        recurringEvents.forEach(eventDate => {
                            events.push({
                                type: 'maintenance',
                                date: eventDate,
                                name: subAsset.name,
                                details: `${event.name} (Every ${event.frequency} ${event.frequencyUnit})`,
                                assetType: assetType,
                                parentAsset: parentName,
                                notes: event.notes,
                                id: subAsset.id,
                                isSubAsset: true
                            });
                        });
                    } else if (event.type === 'specific' && event.specificDate) {
                        const eventDate = new Date(formatDate(event.specificDate));
                        
                        // Apply date filtering logic
                        let includeEvent = false;
                        if (monthsAhead === 'all') {
                            includeEvent = eventDate >= now; // Only future events for "All Events"
                        } else if (monthsAhead === 'past') {
                            includeEvent = eventDate < now; // Only past events
                        } else {
                            includeEvent = eventDate >= now && eventDate <= futureLimit; // Only future events in range
                        }
                        
                        if (includeEvent) {
                            events.push({
                                type: 'maintenance',
                                date: eventDate,
                                name: subAsset.name,
                                details: event.name,
                                assetType: assetType,
                                parentAsset: parentName,
                                notes: event.notes,
                                id: subAsset.id,
                                isSubAsset: true
                            });
                        }
                    }
                });
            }
        });

        // Sort events by date (ascending by default)
        events.sort((a, b) => a.date.getTime() - b.date.getTime());

        return events;
    }
    
    /**
     * Generate recurring events within a date range
     * @param {string} nextDueDate - The next due date for the recurring event
     * @param {number} frequency - How often the event recurs (e.g., 1, 2, 3)
     * @param {string} frequencyUnit - The unit of recurrence (days, weeks, months, years)
     * @param {Date} now - Current date
     * @param {Date} futureLimit - The end date limit for generating events
     * @param {string|number} monthsAhead - The range specification ('all', 'past', or number of months)
     * @returns {Array} Array of Date objects for recurring events
     */
    generateRecurringEvents(nextDueDate, frequency, frequencyUnit, now, futureLimit, monthsAhead) {
        const events = [];
        
        // Validate inputs
        if (!nextDueDate || !frequency || !frequencyUnit) {
            return events;
        }
        
        const numericFrequency = parseInt(frequency);
        if (isNaN(numericFrequency) || numericFrequency <= 0) {
            return events;
        }
        
        // Parse the next due date
        let currentDate = new Date(formatDate(nextDueDate));
        if (isNaN(currentDate)) {
            return events;
        }
        
                 // Determine the end limit for event generation
         let endLimit = null;
         const maxEvents = 100; // Safety limit to prevent infinite loops
         let eventCount = 0;
         
         if (monthsAhead === 'all') {
            // For "all", generate events for the next 5 years to avoid infinite generation
            endLimit = new Date(now);
            endLimit.setFullYear(now.getFullYear() + 5);
                 } else if (monthsAhead === 'past') {
             // For past events, we need to generate ALL occurrences from the nextDueDate up to today
             // This includes both past and current/overdue events
             endLimit = new Date(now);
             endLimit.setHours(23, 59, 59, 999); // Include events due today
             
             // Generate all occurrences from nextDueDate forward until today
             while (currentDate <= endLimit && eventCount < maxEvents) {
                 events.push(new Date(currentDate));
                 currentDate = this.addTimePeriod(currentDate, numericFrequency, frequencyUnit);
                 if (!currentDate) break; // Safety check
                 eventCount++;
             }
             return events;
        } else if (monthsAhead === 'specific' && futureLimit && futureLimit.isSpecific) {
            // For specific date, check if any recurring events fall on that date
            const targetStart = futureLimit.start;
            const targetEnd = futureLimit.end;
            
            // Generate events from the next due date forward until we're past the target date
            // or we've checked enough occurrences
            const maxCheckLimit = new Date(targetEnd);
            maxCheckLimit.setFullYear(maxCheckLimit.getFullYear() + 10); // Check up to 10 years ahead
            
            while (currentDate <= maxCheckLimit && eventCount < maxEvents) {
                // Check if this occurrence falls on the target date
                if (currentDate >= targetStart && currentDate <= targetEnd) {
                    events.push(new Date(currentDate));
                }
                
                // Move to next occurrence
                currentDate = this.addTimePeriod(currentDate, numericFrequency, frequencyUnit);
                if (!currentDate) break; // Safety check
                eventCount++;
                
                // If we're past the target date and haven't found any matches recently, stop
                if (currentDate > targetEnd && events.length === 0) {
                    break;
                }
            }
            return events;
        } else {
            endLimit = futureLimit;
        }
        
        if (!endLimit) {
            return events;
        }
                 
         // Generate future events within the range
        
        while (currentDate <= endLimit && eventCount < maxEvents) {
            // Only include events that match the filtering criteria
            let includeEvent = false;
            if (monthsAhead === 'all') {
                includeEvent = currentDate >= now; // Only future events for "All Events"
            } else {
                includeEvent = currentDate >= now && currentDate <= endLimit; // Only future events in range
            }
            
            if (includeEvent) {
                events.push(new Date(currentDate));
                eventCount++; // Only increment when we actually add an event
            }
            
            // Move to next occurrence
            currentDate = this.addTimePeriod(currentDate, numericFrequency, frequencyUnit);
            if (!currentDate) break; // Safety check
        }
        
        return events;
    }
    
    /**
     * Add time periods to a date (JavaScript implementation, similar to Luxon's addTimePeriod)
     * @param {Date} baseDate - The base date to add to
     * @param {number} amount - The amount to add (can be negative)
     * @param {string} unit - The unit (days, weeks, months, years)
     * @returns {Date|null} - The calculated date or null if invalid
     */
    addTimePeriod(baseDate, amount, unit) {
        if (!baseDate || isNaN(baseDate)) return null;
        
        try {
            const result = new Date(baseDate);
            const numericAmount = parseInt(amount);
            if (isNaN(numericAmount)) return null;
            
            switch (unit.toLowerCase()) {
                case 'days':
                case 'day':
                    result.setDate(result.getDate() + numericAmount);
                    break;
                case 'weeks':
                case 'week':
                    result.setDate(result.getDate() + (numericAmount * 7));
                    break;
                case 'months':
                case 'month':
                    // Use safer month calculation to avoid rollover issues
                    const originalDay = result.getDate();
                    result.setMonth(result.getMonth() + numericAmount);
                    
                    // If the day rolled over due to target month having fewer days,
                    // set to the last day of the target month
                    if (result.getDate() !== originalDay) {
                        result.setDate(0); // This sets to last day of previous month
                    }
                    break;
                case 'years':
                case 'year':
                    result.setFullYear(result.getFullYear() + numericAmount);
                    break;
                default:
                    return null;
            }
            
            return result;
        } catch (error) {
            return null;
        }
    }
    
    generateEventsTableHTML(events) {
        if (events.length === 0) {
            return `
                <div class="events-empty">
                    <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 6v6l4 2"></path>
                    </svg>
                    <p>No events found</p>
                </div>
            `;
        }

        const now = new Date();
        
        return events.map(event => {
            const daysUntil = Math.ceil((event.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const isPast = daysUntil < 0;
            const isUrgent = daysUntil <= 30 && daysUntil >= 0;
            const isWarning = daysUntil <= 60 && daysUntil > 30;

            let urgencyClass = '';
            if (isPast) urgencyClass = 'overdue';
            else if (isUrgent) urgencyClass = 'urgent';
            else if (isWarning) urgencyClass = 'warning';

            const typeIcon = event.type === 'warranty' ? 
                `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10,9 9,9 8,9"></polyline>
                </svg>` :
                `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                </svg>`;

            return `
                <div class="event-row ${urgencyClass}" data-type="${event.type}" data-id="${event.id}" data-is-sub-asset="${event.isSubAsset}" style="cursor: pointer;">
                    <div class="event-type">
                        ${typeIcon}
                        <span class="event-type-pill ${event.type}">${event.type === 'warranty' ? 'Warranty' : 'Maintenance'}</span>
                    </div>
                    <div class="event-date">
                        <span class="event-date-text">${this.formatDate(event.date)}</span>
                        <span class="event-days-until">${isPast ? `${Math.abs(daysUntil)} days past` : `${daysUntil} days`}</span>
                    </div>
                    <div class="event-details">
                        <div class="event-name">${event.name}</div>
                        <div class="event-description">${event.details}</div>
                        ${(event.assetType === 'Component' || event.assetType === 'Sub-Component') && event.parentAsset ? `<div class="event-parent">Parent: ${event.parentAsset}</div>` : ''}
                        ${event.notes ? `<div class="event-notes">Notes: ${event.notes}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    initializeEventsSection() {
        // Reset events state
        this.currentFilter = 'all';
        this.currentSort = { field: 'date', direction: 'asc' };
        this.currentPage = 1;
        
        // Load saved date range from localStorage, default to '12' (1 Year)
        const savedDateRange = localStorage.getItem('eventsDateRange') || '12';
        const eventsDateRangeSelect = document.getElementById('eventsDateRange');
        
        if (eventsDateRangeSelect) {
            // Handle specific date dropdown selection on page load
            if (savedDateRange.startsWith && savedDateRange.startsWith('specific:')) {
                eventsDateRangeSelect.value = 'specific';
                const specificDate = savedDateRange.substring(9);
                const specificDateInput = document.getElementById('eventsSpecificDate');
                const calendarIcon = document.getElementById('eventsCalendarIcon');
                
                if (specificDateInput) {
                    specificDateInput.value = specificDate;
                }
                
                // Show calendar icon for specific date selection
                if (calendarIcon) {
                    calendarIcon.classList.add('show');
                }
                
                // Update the dropdown option text to show the selected date
                const specificOption = eventsDateRangeSelect.querySelector('option[value="specific"]');
                if (specificOption && specificDate) {
                    // Use formatDate utility to properly handle the date without timezone issues
                    specificOption.textContent = formatDate(specificDate);
                }
            } else {
                eventsDateRangeSelect.value = savedDateRange;
                // Ensure calendar icon stays hidden
                const calendarIcon = document.getElementById('eventsCalendarIcon');
                if (calendarIcon) {
                    calendarIcon.classList.remove('show');
                }
            }
        }

        // Filter buttons
        document.querySelectorAll('.events-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active filter button
                document.querySelectorAll('.events-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                this.currentFilter = btn.getAttribute('data-filter');
                this.currentPage = 1; // Reset to first page when filtering
                this.updateEventsDisplay();
            });
        });

        // Sort button
        const sortBtn = document.querySelector('.events-sort-btn');
        if (sortBtn) {
            sortBtn.addEventListener('click', () => {
                const newDirection = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
                this.currentSort = { field: 'date', direction: newDirection };
                
                // Update sort icon
                const sortIcon = sortBtn.querySelector('.sort-icon');
                if (sortIcon) {
                    sortIcon.style.transform = newDirection === 'desc' ? 'rotate(180deg)' : '';
                }
                
                this.currentPage = 1; // Reset to first page when sorting
                this.updateEventsDisplay();
            });
        }
        
        // Date range dropdown with localStorage persistence
        if (eventsDateRangeSelect) {
            eventsDateRangeSelect.addEventListener('change', () => {
                const selectedValue = eventsDateRangeSelect.value;
                const specificDateInput = document.getElementById('eventsSpecificDate');
                const calendarIcon = document.getElementById('eventsCalendarIcon');
                
                if (selectedValue === 'specific') {
                    // Show the calendar icon
                    if (calendarIcon) {
                        calendarIcon.classList.add('show');
                    }
                    
                    // Automatically click the calendar icon to open the date picker
                    setTimeout(() => {
                        if (calendarIcon && calendarIcon.classList.contains('show')) {
                            calendarIcon.click();
                        }
                    }, 50); // Small delay to ensure the icon is visible
                } else {
                    // Hide the calendar icon
                    if (calendarIcon) {
                        calendarIcon.classList.remove('show');
                    }
                    
                    // Close the date picker if it's open and blur the input
                    if (specificDateInput) {
                        specificDateInput.blur();
                        specificDateInput.classList.remove('show', 'show-above');
                        // Clear the specific date input value
                        specificDateInput.value = '';
                    }
                    
                    // Reset the "Specific Date" option text back to default
                    const specificOption = eventsDateRangeSelect.querySelector('option[value="specific"]');
                    if (specificOption) {
                        specificOption.textContent = 'Specific Date';
                    }
                    
                    // Save the selection and update display
                    localStorage.setItem('eventsDateRange', selectedValue);
                    
                    // Reset to first page when date range changes
                    this.currentPage = 1;
                    this.updateEventsDisplay();
                }
            });
        }
        
        // Calendar icon click handler
        const calendarIcon = document.getElementById('eventsCalendarIcon');
        if (calendarIcon) {
            calendarIcon.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the click-outside handler
                const specificDateInput = document.getElementById('eventsSpecificDate');
                if (specificDateInput) {
                    // Determine if we should show the date picker above or below the icon
                    const iconRect = calendarIcon.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;
                    const spaceBelow = viewportHeight - iconRect.bottom;
                    const spaceAbove = iconRect.top;
                    
                    // Remove any existing position classes
                    specificDateInput.classList.remove('show-above');
                    
                    // If there's not enough space below (less than 200px) and more space above, show above
                    if (spaceBelow < 200 && spaceAbove > spaceBelow) {
                        specificDateInput.classList.add('show-above');
                    }
                    
                    // Show the date picker
                    specificDateInput.classList.add('show');
                    
                    // Focus the input after a small delay to ensure it's properly positioned and visible
                    setTimeout(() => {
                        specificDateInput.focus();
                        // Try to use showPicker if available (modern browsers)
                        if (specificDateInput.showPicker) {
                            specificDateInput.showPicker();
                        }
                    }, 10);
                }
            });
        }
        
        // Click outside to close date picker
        document.addEventListener('click', (e) => {
            const specificDateInput = document.getElementById('eventsSpecificDate');
            const calendarIcon = document.getElementById('eventsCalendarIcon');
            const eventsDateFilter = document.querySelector('.events-date-filter');
            
            if (specificDateInput && !eventsDateFilter.contains(e.target)) {
                specificDateInput.classList.remove('show', 'show-above');
                specificDateInput.blur();
            }
        });
        
        // Specific date input handling
        const specificDateInput = document.getElementById('eventsSpecificDate');
        if (specificDateInput) {
            // Hide date picker when a date is selected
            specificDateInput.addEventListener('change', () => {
                specificDateInput.classList.remove('show', 'show-above');
                
                if (specificDateInput.value) {
                    // Save the specific date selection with prefix
                    const specificDateValue = `specific:${specificDateInput.value}`;
                    localStorage.setItem('eventsDateRange', specificDateValue);
                    
                    // Update the dropdown option text to show the selected date
                    const specificOption = eventsDateRangeSelect.querySelector('option[value="specific"]');
                    if (specificOption) {
                        // Use formatDate utility to properly handle the date without timezone issues
                        specificOption.textContent = formatDate(specificDateInput.value);
                    }
                    
                    // Reset to first page when date changes
                    this.currentPage = 1;
                    this.updateEventsDisplay();
                } else {
                    // If date is cleared, revert to default selection
                    eventsDateRangeSelect.value = '12';
                    localStorage.setItem('eventsDateRange', '12');
                    
                    // Reset dropdown option text
                    const specificOption = eventsDateRangeSelect.querySelector('option[value="specific"]');
                    if (specificOption) {
                        specificOption.textContent = 'Specific Date';
                    }
                    
                    this.currentPage = 1;
                    this.updateEventsDisplay();
                }
            });
        }
        
        // Set up pagination event delegation on the events table container
        const eventsTableContainer = document.querySelector('.events-table-container');
        if (eventsTableContainer) {
            eventsTableContainer.addEventListener('click', (e) => this.handlePaginationClick(e));
        }
        
        // Initialize the display with click handlers and apply any existing filters
        this.updateEventsDisplay();
    }
    
    handlePaginationClick(e) {
        console.log('Pagination click detected:', e.target);
        
        // Check if the click is on a pagination button
        const paginationBtn = e.target.closest('.events-pagination-btn');
        const prevBtn = e.target.closest('.events-prev-btn');
        const nextBtn = e.target.closest('.events-next-btn');
        
        if (paginationBtn && !paginationBtn.classList.contains('active')) {
            e.preventDefault();
            e.stopPropagation();
            const page = parseInt(paginationBtn.getAttribute('data-page'));
            console.log('Page button clicked:', page);
            if (page && page !== this.currentPage) {
                this.currentPage = page;
                this.updateEventsDisplay();
            }
        } else if (prevBtn && !prevBtn.disabled) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Previous button clicked, current page:', this.currentPage);
            if (this.currentPage > 1) {
                this.currentPage--;
                this.updateEventsDisplay();
            }
        } else if (nextBtn && !nextBtn.disabled) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Next button clicked, current page:', this.currentPage);
            
            // Get current date range selection for pagination calculation
            const dateRangeSelect = document.getElementById('eventsDateRange');
            const selectedRange = dateRangeSelect ? dateRangeSelect.value : '12';
            
            // Get the saved date range from localStorage to handle specific dates
            const savedDateRange = localStorage.getItem('eventsDateRange') || '12';
            
            // Convert range value to the appropriate parameters for collectEventsInRange
            let monthsAhead;
            let specificDate = null;
            
            if (savedDateRange === 'all') {
                monthsAhead = 'all';
            } else if (savedDateRange === 'past') {
                monthsAhead = 'past';
            } else if (savedDateRange.startsWith && savedDateRange.startsWith('specific:')) {
                monthsAhead = 'specific';
                specificDate = savedDateRange.substring(9); // Remove 'specific:' prefix
            } else {
                monthsAhead = parseInt(savedDateRange);
            }
            
            const allEvents = this.collectEventsInRange(monthsAhead, specificDate);
            const filteredEvents = this.currentFilter !== 'all' ? allEvents.filter(event => event.type === this.currentFilter) : allEvents;
            const totalPages = Math.ceil(filteredEvents.length / this.eventsPerPage);
            console.log('Total pages:', totalPages);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.updateEventsDisplay();
            }
        }
    }
    
    updateEventsDisplay() {
        // Get the selected date range from the dropdown
        const dateRangeSelect = document.getElementById('eventsDateRange');
        const selectedRange = dateRangeSelect ? dateRangeSelect.value : '12';
        
        // Get the saved date range from localStorage to handle specific dates
        const savedDateRange = localStorage.getItem('eventsDateRange') || '12';
        
        // Convert range value to the appropriate parameters for collectEventsInRange
        let monthsAhead;
        let specificDate = null;
        
        if (savedDateRange === 'all') {
            monthsAhead = 'all';
        } else if (savedDateRange === 'past') {
            monthsAhead = 'past';
        } else if (savedDateRange.startsWith && savedDateRange.startsWith('specific:')) {
            monthsAhead = 'specific';
            specificDate = savedDateRange.substring(9); // Remove 'specific:' prefix
        } else {
            monthsAhead = parseInt(savedDateRange);
        }
        
        let events = this.collectEventsInRange(monthsAhead, specificDate);

        // Apply local events filter (all, warranty, maintenance)
        if (this.currentFilter !== 'all') {
            events = events.filter(event => event.type === this.currentFilter);
        }

        // Apply global dashboard filter to respect the same filtering as asset list
        const dashboardFilter = this.getDashboardFilter();
        if (dashboardFilter) {
            const now = new Date();
            
            if (dashboardFilter === 'components') {
                // Only show events from sub-assets (components)
                events = events.filter(event => event.isSubAsset);
            }
            else if (dashboardFilter === 'warranties') {
                // Only show warranty events
                events = events.filter(event => event.type === 'warranty');
            }
            else if (dashboardFilter === 'expired') {
                // Only show events with expired warranties or overdue maintenance
                events = events.filter(event => {
                    if (event.type === 'warranty') {
                        return event.date < now;
                    } else if (event.type === 'maintenance') {
                        return event.date < now; // Overdue maintenance
                    }
                    return false;
                });
            }
            else if (dashboardFilter === 'within30') {
                // Only show events within 30 days
                events = events.filter(event => {
                    const diff = (event.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                    return diff >= 0 && diff <= 30;
                });
            }
            else if (dashboardFilter === 'within60') {
                // Only show events within 31-60 days
                events = events.filter(event => {
                    const diff = (event.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                    return diff > 30 && diff <= 60;
                });
            }
            else if (dashboardFilter === 'active') {
                // Only show events from items with active warranties (more than 60 days or lifetime)
                // For warranty events: show those more than 60 days away
                // For maintenance events: show all from assets/components with active warranties
                events = events.filter(event => {
                    if (event.type === 'warranty') {
                        const diff = (event.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                        return diff > 60;
                    } else if (event.type === 'maintenance') {
                        // For maintenance events, check if the parent asset/component has an active warranty
                        const assets = this.getAssets();
                        const subAssets = this.getSubAssets();
                        
                        if (event.isSubAsset) {
                            const subAsset = subAssets.find(sa => sa.id === event.id);
                            if (subAsset && subAsset.warranty) {
                                if (subAsset.warranty.isLifetime) return true;
                                if (subAsset.warranty.expirationDate) {
                                    const expDate = new Date(formatDate(subAsset.warranty.expirationDate));
                                    const diff = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                                    return diff > 60;
                                }
                            }
                        } else {
                            const asset = assets.find(a => a.id === event.id);
                            if (asset && asset.warranty) {
                                if (asset.warranty.isLifetime) return true;
                                if (asset.warranty.expirationDate) {
                                    const expDate = new Date(formatDate(asset.warranty.expirationDate));
                                    const diff = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                                    return diff > 60;
                                }
                            }
                        }
                        return false;
                    }
                    return false;
                });
            }
        }

        // Apply sort
        if (this.currentSort.direction === 'desc') {
            events.reverse();
        }

        // Calculate pagination
        const totalEvents = events.length;
        const totalPages = Math.ceil(totalEvents / this.eventsPerPage);
        const startIndex = (this.currentPage - 1) * this.eventsPerPage;
        const endIndex = startIndex + this.eventsPerPage;
        const paginatedEvents = events.slice(startIndex, endIndex);

        // Update table
        const eventsTable = document.getElementById('eventsTable');
        if (eventsTable) {
            eventsTable.innerHTML = this.generateEventsTableHTML(paginatedEvents);
            
            // Add click event listeners to event rows
            eventsTable.querySelectorAll('.event-row').forEach(row => {
                row.addEventListener('click', (e) => {
                    const eventId = row.getAttribute('data-id');
                    const isSubAsset = row.getAttribute('data-is-sub-asset') === 'true';
                    
                    if (eventId) {
                        const subAssets = this.getSubAssets();
                        
                        // Navigate to the asset or component
                        if (isSubAsset) {
                            // Find the sub-asset and its parent
                            const subAsset = subAssets.find(sa => sa.id === eventId);
                            if (subAsset) {
                                this.updateSelectedIds(subAsset.parentId, eventId);
                                this.renderAssetDetails(eventId, true);
                            }
                        } else {
                            // Navigate to asset
                            this.updateSelectedIds(eventId, null);
                            this.renderAssetDetails(eventId, false);
                        }
                        
                        // Close sidebar on mobile after navigation
                        this.handleSidebarNav();
                    }
                });
            });
        }

        // Update pagination controls
        this.updateEventsPagination(totalPages, totalEvents);
    }
    
    updateEventsPagination(totalPages, totalEvents) {
        const eventsTableContainer = document.querySelector('.events-table-container');
        if (!eventsTableContainer) return;

        // Remove existing pagination
        const existingPagination = eventsTableContainer.querySelector('.events-pagination');
        if (existingPagination) {
            existingPagination.remove();
        }

        // Don't show pagination if there's only one page or no events
        if (totalPages <= 1) return;

        // Create pagination HTML
        let paginationHTML = `
            <div class="events-pagination">
                <div class="events-pagination-info">
                    Showing ${((this.currentPage - 1) * this.eventsPerPage) + 1}-${Math.min(this.currentPage * this.eventsPerPage, totalEvents)} of ${totalEvents} events
                </div>
                <div class="events-pagination-controls">
                    <button class="events-prev-btn ${this.currentPage === 1 ? 'disabled' : ''}" ${this.currentPage === 1 ? 'disabled' : ''}>
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                        Previous
                    </button>
                    <div class="events-pagination-numbers">
        `;

        // Generate page numbers (show max 5 pages)
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        // Adjust start page if we're near the end
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="events-pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }

        paginationHTML += `
                    </div>
                    <button class="events-next-btn ${this.currentPage === totalPages ? 'disabled' : ''}" ${this.currentPage === totalPages ? 'disabled' : ''}>
                        Next
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        // Add pagination to the container
        eventsTableContainer.insertAdjacentHTML('beforeend', paginationHTML);
    }

    addEventListeners() {
        // Add click handler for clear filters button
        if (this.clearFiltersBtn) {
            this.clearFiltersBtn.addEventListener('click', async () => {
                this.setButtonLoading(this.clearFiltersBtn, true);
                // Remove active class from all cards
                this.assetDetails.querySelectorAll('.dashboard-card').forEach(c => {
                    c.classList.remove('active');
                });

                // Reset all sort buttons to default state
                document.querySelectorAll('.sort-button').forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('data-direction', 'asc');
                    const sortIcon = btn.querySelector('.sort-icon');
                    if (sortIcon) {
                        sortIcon.style.transform = '';
                    }
                });
                
                // Reset filter and sort
                this.updateDashboardFilter(null);
                this.updateSort({ field: 'updatedAt', direction: 'desc' });
                
                // Reset selected asset and hide components section
                this.updateSelectedIds(null, null);
                
                // Re-render list and dashboard
                this.searchInput.value = '';
                this.renderAssetList(this.searchInput.value);
                await this.renderDashboard(false);
                this.setButtonLoading(this.clearFiltersBtn, false);
            });
        }

        // Add input event listener for search input to refresh events
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => {
                // Refresh events display if events section exists
                const eventsTable = document.getElementById('eventsTable');
                if (eventsTable) {
                    this.updateEventsDisplay();
                }
            });
        }
    }
    
    /**
     * Public method to refresh events display - useful for external calls
     */
    refreshEventsDisplay() {
        // Only refresh if events section exists
        const eventsTable = document.getElementById('eventsTable');
        if (eventsTable) {
            this.updateEventsDisplay();
        }
    }
} 