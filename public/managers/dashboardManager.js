/**
 * Dashboard Manager
 * Handles dashboard rendering, events collection, and events display functionality
 */

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
            const exp = new Date(item.warranty.expirationDate);
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
                console.log('Dashboard card clicked, filter:', filter);

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
                console.log('Dashboard filter updated to:', this.getDashboardFilter());
                
                this.renderAssetList(this.searchInput.value);
                
                // Update events display if events section exists
                const eventsTable = document.getElementById('eventsTable');
                if (eventsTable) {
                    console.log('Events table found, calling updateEventsDisplay');
                    this.updateEventsDisplay();
                } else {
                    console.log('Events table not found');
                }
            });
        });
    }
    
    generateEventsSection() {
        const events = this.collectUpcomingEvents();
        
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
    
    collectUpcomingEvents() {
        const assets = this.getAssets();
        const subAssets = this.getSubAssets();
        const events = [];
        const now = new Date();
        const futureLimit = new Date();
        futureLimit.setFullYear(now.getFullYear() + 1); // Show events up to 1 year in the future

        // Collect warranty events from assets
        assets.forEach(asset => {
            // Primary warranty
            if (asset.warranty && asset.warranty.expirationDate && !asset.warranty.isLifetime) {
                const expDate = new Date(asset.warranty.expirationDate);
                if (expDate >= now && expDate <= futureLimit) {
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
                const expDate = new Date(asset.secondaryWarranty.expirationDate);
                if (expDate >= now && expDate <= futureLimit) {
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
                    let eventDate = null;
                    let eventDetails = event.name;

                    if (event.type === 'frequency' && event.nextDueDate) {
                        eventDate = new Date(event.nextDueDate);
                        eventDetails += ` (Every ${event.frequency} ${event.frequencyUnit})`;
                    } else if (event.type === 'specific' && event.specificDate) {
                        eventDate = new Date(event.specificDate);
                    }

                    if (eventDate && eventDate >= now && eventDate <= futureLimit) {
                        events.push({
                            type: 'maintenance',
                            date: eventDate,
                            name: asset.name,
                            details: eventDetails,
                            assetType: 'Asset',
                            notes: event.notes,
                            id: asset.id,
                            isSubAsset: false
                        });
                    }
                });
            }
        });

        // Collect warranty events from sub-assets
        subAssets.forEach(subAsset => {
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
                const expDate = new Date(subAsset.warranty.expirationDate);
                if (expDate >= now && expDate <= futureLimit) {
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
                    let eventDate = null;
                    let eventDetails = event.name;

                    if (event.type === 'frequency' && event.nextDueDate) {
                        eventDate = new Date(event.nextDueDate);
                        eventDetails += ` (Every ${event.frequency} ${event.frequencyUnit})`;
                    } else if (event.type === 'specific' && event.specificDate) {
                        eventDate = new Date(event.specificDate);
                    }

                    if (eventDate && eventDate >= now && eventDate <= futureLimit) {
                        events.push({
                            type: 'maintenance',
                            date: eventDate,
                            name: subAsset.name,
                            details: eventDetails,
                            assetType: assetType,
                            parentAsset: parentName,
                            notes: event.notes,
                            id: subAsset.id,
                            isSubAsset: true
                        });
                    }
                });
            }
        });

        // Sort events by date (ascending by default)
        events.sort((a, b) => a.date.getTime() - b.date.getTime());

        return events;
    }
    
    generateEventsTableHTML(events) {
        if (events.length === 0) {
            return `
                <div class="events-empty">
                    <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 6v6l4 2"></path>
                    </svg>
                    <p>No upcoming events</p>
                </div>
            `;
        }

        const now = new Date();
        
        return events.map(event => {
            const daysUntil = Math.ceil((event.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const isOverdue = daysUntil < 0;
            const isUrgent = daysUntil <= 30 && daysUntil >= 0;
            const isWarning = daysUntil <= 60 && daysUntil > 30;

            let urgencyClass = '';
            if (isOverdue) urgencyClass = 'overdue';
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
                        <span class="event-days-until">${isOverdue ? `${Math.abs(daysUntil)} days overdue` : `${daysUntil} days`}</span>
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
            const allEvents = this.collectUpcomingEvents();
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
        let events = this.collectUpcomingEvents();
        console.log('updateEventsDisplay called, total events:', events.length);

        // Apply local events filter (all, warranty, maintenance)
        if (this.currentFilter !== 'all') {
            events = events.filter(event => event.type === this.currentFilter);
            console.log('After local filter (' + this.currentFilter + '):', events.length);
        }

        // Apply global dashboard filter to respect the same filtering as asset list
        const dashboardFilter = this.getDashboardFilter();
        console.log('Dashboard filter in updateEventsDisplay:', dashboardFilter);
        if (dashboardFilter) {
            const eventsBefore = events.length;
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
                                    const expDate = new Date(subAsset.warranty.expirationDate);
                                    const diff = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                                    return diff > 60;
                                }
                            }
                        } else {
                            const asset = assets.find(a => a.id === event.id);
                            if (asset && asset.warranty) {
                                if (asset.warranty.isLifetime) return true;
                                if (asset.warranty.expirationDate) {
                                    const expDate = new Date(asset.warranty.expirationDate);
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
            console.log('After dashboard filter (' + dashboardFilter + '):', eventsBefore, '->', events.length);
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

        console.log('Final events for display:', paginatedEvents.length);

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