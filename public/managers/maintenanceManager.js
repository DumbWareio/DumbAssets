/**
 * MaintenanceManager - Handles maintenance events for assets and sub-assets
 * Manages the creation, editing, and deletion of maintenance events
 */

export class MaintenanceManager {
    constructor() {
        this.maintenanceEvents = new Map();
        this.initializeEventListeners();
    }

    /**
     * Initialize event listeners for maintenance event buttons
     */
    initializeEventListeners() {
        const addAssetMaintenanceBtn = document.getElementById('addMaintenanceEvent');
        const addSubAssetMaintenanceBtn = document.getElementById('addSubAssetMaintenanceEvent');

        if (addAssetMaintenanceBtn) {
            addAssetMaintenanceBtn.addEventListener('click', () => this.addMaintenanceEvent('asset'));
        }

        if (addSubAssetMaintenanceBtn) {
            addSubAssetMaintenanceBtn.addEventListener('click', () => this.addMaintenanceEvent('subAsset'));
        }
    }

    /**
     * Add a new maintenance event to the specified type (asset or sub-asset)
     * @param {string} type - 'asset' or 'subAsset'
     */
    addMaintenanceEvent(type) {
        const container = document.getElementById(`${type}MaintenanceEvents`);
        if (!container) return;

        // Expand the maintenance section if it's collapsed
        this.expandMaintenanceSection(type);

        const eventId = `event_${Date.now()}`;
        const eventHtml = this.createMaintenanceEventHtml(eventId);
        container.insertAdjacentHTML('beforeend', eventHtml);

        // Add event listener for delete button
        const deleteBtn = container.querySelector(`#${eventId} .delete-maintenance-event`);
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteMaintenanceEvent(eventId, type));
        }

        // Add event listener for type change
        const newEvent = container.lastElementChild;
        const typeSelect = newEvent.querySelector('[name="eventType"]');
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => this.handleEventTypeChange(e.target));
        }

        // Recalculate the collapsible section height
        this.recalculateCollapsibleHeight(type);
    }

    /**
     * Create HTML for a maintenance event
     * @param {string} eventId - Unique identifier for the event
     * @returns {string} HTML string for the maintenance event
     */
    createMaintenanceEventHtml(eventId) {
        return `
            <div id="${eventId}" class="maintenance-event">
                <div class="maintenance-event-header">
                    <h4 class="maintenance-event-title">Maintenance Event</h4>
                    <button type="button" class="delete-maintenance-event" title="Delete event">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="maintenance-event-fields">
                    <div class="maintenance-event-row">
                        <input type="text" name="eventName" placeholder="Event Name" required>
                    </div>
                    <div class="maintenance-event-row">
                        <select name="eventType">
                            <option value="frequency">Frequency Based</option>
                            <option value="specific">Specific Date</option>
                        </select>
                    </div>
                    <div class="maintenance-event-row frequency-fields">
                        <input type="number" name="frequency" min="1" placeholder="Frequency">
                        <select name="frequencyUnit">
                            <option value="days">Days</option>
                            <option value="weeks">Weeks</option>
                            <option value="months">Months</option>
                            <option value="years">Years</option>
                        </select>
                    </div>
                    <div class="maintenance-event-row specific-date-fields" style="display: none;">
                        <input type="date" name="specificDate">
                    </div>
                    <div class="maintenance-event-row">
                        <textarea name="notes" placeholder="Notes (optional)"></textarea>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Delete a maintenance event
     * @param {string} eventId - ID of the event to delete
     */
    deleteMaintenanceEvent(eventId, type) {
        const eventElement = document.getElementById(eventId);
        if (eventElement) {
            eventElement.remove();
        }

        // Recalculate the collapsible section height
        this.recalculateCollapsibleHeight(type);
    }

    /**
     * Get all maintenance events for a specific type (asset or sub-asset)
     * @param {string} type - 'asset' or 'subAsset'
     * @returns {Array} Array of maintenance event objects
     */
    getMaintenanceEvents(type) {
        const container = document.getElementById(`${type}MaintenanceEvents`);
        if (!container) return [];

        const events = [];
        container.querySelectorAll('.maintenance-event').forEach(eventElement => {
            const event = {
                name: eventElement.querySelector('[name="eventName"]').value,
                type: eventElement.querySelector('[name="eventType"]').value,
                notes: eventElement.querySelector('[name="notes"]').value
            };

            if (event.type === 'frequency') {
                event.frequency = eventElement.querySelector('[name="frequency"]').value;
                event.frequencyUnit = eventElement.querySelector('[name="frequencyUnit"]').value;
            } else {
                event.specificDate = eventElement.querySelector('[name="specificDate"]').value;
            }

            events.push(event);
        });

        return events;
    }

    /**
     * Set maintenance events for a specific type (asset or sub-asset)
     * @param {string} type - 'asset' or 'subAsset'
     * @param {Array} events - Array of maintenance event objects
     */
    setMaintenanceEvents(type, events) {
        const container = document.getElementById(`${type}MaintenanceEvents`);
        if (!container) return;

        // Clear existing events
        container.innerHTML = '';

        // If there are events to show, expand the section
        if (events && events.length > 0) {
            this.expandMaintenanceSection(type);
        }

        // Add each event
        events.forEach(event => {
            const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const eventHtml = this.createMaintenanceEventHtml(eventId);
            container.insertAdjacentHTML('beforeend', eventHtml);

            const eventElement = container.lastElementChild;
            if (eventElement) {
                eventElement.querySelector('[name="eventName"]').value = event.name || '';
                eventElement.querySelector('[name="eventType"]').value = event.type || 'frequency';
                eventElement.querySelector('[name="notes"]').value = event.notes || '';

                if (event.type === 'frequency') {
                    eventElement.querySelector('[name="frequency"]').value = event.frequency || '';
                    eventElement.querySelector('[name="frequencyUnit"]').value = event.frequencyUnit || 'days';
                } else {
                    eventElement.querySelector('[name="specificDate"]').value = event.specificDate || '';
                }

                // Add event listener for delete button
                const deleteBtn = eventElement.querySelector('.delete-maintenance-event');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => this.deleteMaintenanceEvent(eventId, type));
                }

                // Add event listener for type change
                const typeSelect = eventElement.querySelector('[name="eventType"]');
                if (typeSelect) {
                    typeSelect.addEventListener('change', (e) => this.handleEventTypeChange(e.target));
                }
            }
        });

        // Recalculate the collapsible section height after all events are added
        if (events && events.length > 0) {
            this.recalculateCollapsibleHeight(type);
        }
    }

    /**
     * Handle change in maintenance event type
     * @param {HTMLSelectElement} select - The select element that changed
     */
    handleEventTypeChange(select) {
        const eventElement = select.closest('.maintenance-event');
        if (!eventElement) return;

        const frequencyFields = eventElement.querySelector('.frequency-fields');
        const specificDateFields = eventElement.querySelector('.specific-date-fields');

        if (select.value === 'frequency') {
            frequencyFields.style.display = 'flex';
            specificDateFields.style.display = 'none';
        } else {
            frequencyFields.style.display = 'none';
            specificDateFields.style.display = 'flex';
        }

        // Recalculate height after changing field visibility
        const container = select.closest('[id$="MaintenanceEvents"]');
        if (container) {
            const containerId = container.id;
            const type = containerId.includes('subAsset') ? 'subAsset' : 'asset';
            this.recalculateCollapsibleHeight(type);
        }
    }

    /**
     * Expand the maintenance section if it's collapsed
     * @param {string} type - 'asset' or 'subAsset'
     */
    expandMaintenanceSection(type) {
        const sectionId = type === 'asset' ? 'assetMaintenanceSection' : 'subAssetMaintenanceSection';
        const section = document.getElementById(sectionId);
        
        if (section && section.classList.contains('collapsed')) {
            section.classList.remove('collapsed');
            const content = section.querySelector('.collapsible-content');
            if (content) {
                // Use requestAnimationFrame to ensure proper height calculation
                requestAnimationFrame(() => {
                    content.style.height = (content.scrollHeight + 5) + 'px';
                });
            }
        }
    }

    /**
     * Recalculate the height of the collapsible section
     * @param {string} type - 'asset' or 'subAsset'
     */
    recalculateCollapsibleHeight(type) {
        const sectionId = type === 'asset' ? 'assetMaintenanceSection' : 'subAssetMaintenanceSection';
        const section = document.getElementById(sectionId);
        
        if (section && !section.classList.contains('collapsed')) {
            const content = section.querySelector('.collapsible-content');
            if (content) {
                // Use requestAnimationFrame to ensure DOM has updated
                requestAnimationFrame(() => {
                    // Force a reflow to get accurate scrollHeight
                    content.style.display = 'none';
                    content.offsetHeight; // Trigger reflow
                    content.style.display = '';
                    
                    // Set the new height with a small buffer
                    content.style.height = (content.scrollHeight + 10) + 'px';
                });
            }
        }
    }
} 