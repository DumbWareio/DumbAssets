// IntegrationsManager handles all integration-related functionality including loading,
// rendering, configuration, and testing of integrations in the settings modal
import { API_TEST_SUCCESS, TOKENMASK } from '../src/constants.js';

export class IntegrationsManager {
    constructor({
        setButtonLoading
    }) {
        this.setButtonLoading = setButtonLoading;
        this.DEBUG = false;
    }

    /**
     * Initialize integrations - load and render them dynamically
     */
    async initialize() {
        await this.loadIntegrations();
    }

    /**
     * Load and render integrations dynamically
     */
    async loadIntegrations() {
        const integrationsContainer = document.getElementById('integrationsContainer');
        const loadingElement = document.getElementById('integrationsLoading');
        const errorElement = document.getElementById('integrationsError');

        if (!integrationsContainer) {
            console.error('Integrations container not found');
            return;
        }

        try {
            if (loadingElement) loadingElement.style.display = 'block';
            if (errorElement) errorElement.style.display = 'none';

            const response = await fetch(`${globalThis.getApiBaseUrl()}/api/integrations`);
            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) {
                throw new Error(responseValidation.errorMessage);
            }

            const integrations = await response.json();
            
            // Clear loading state
            if (loadingElement) loadingElement.style.display = 'none';
            
            // Clear existing content except loading/error elements
            const existingIntegrations = integrationsContainer.querySelectorAll('.integration-section');
            existingIntegrations.forEach(el => el.remove());

            if (integrations.length === 0) {
                const noIntegrationsMsg = document.createElement('div');
                noIntegrationsMsg.style.cssText = 'text-align: center; padding: 2rem; color: var(--text-color-secondary);';
                noIntegrationsMsg.textContent = 'No integrations available';
                integrationsContainer.appendChild(noIntegrationsMsg);
                return;
            }

            // Group integrations by category
            const categories = this.groupIntegrationsByCategory(integrations);
            
            // Render each category
            for (const [category, categoryIntegrations] of Object.entries(categories)) {
                const categorySection = this.renderIntegrationCategory(category, categoryIntegrations);
                integrationsContainer.appendChild(categorySection);
            }

            // Bind events for all rendered integrations
            this.bindIntegrationEvents();

        } catch (error) {
            console.error('Failed to load integrations:', error);
            if (loadingElement) loadingElement.style.display = 'none';
            if (errorElement) {
                errorElement.style.display = 'block';
                errorElement.textContent = `Failed to load integrations: ${error.message}`;
            }
        }
    }

    /**
     * Group integrations by category
     */
    groupIntegrationsByCategory(integrations) {
        const categories = {};
        
        integrations.forEach(integration => {
            const category = integration.category || 'general';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(integration);
        });

        return categories;
    }

    /**
     * Render an integration category section
     */
    renderIntegrationCategory(category, integrations) {
        const categorySection = document.createElement('div');
        categorySection.className = 'integration-category';
        
        const categoryTitle = this.getCategoryDisplayName(category);
        
        integrations.forEach(integration => {
            const integrationElement = this.renderIntegration(integration);
            categorySection.appendChild(integrationElement);
        });

        return categorySection;
    }

    /**
     * Get display name for category
     */
    getCategoryDisplayName(category) {
        const categoryNames = {
            'document-management': 'Document Management',
            'communication': 'Communication',
            'monitoring': 'Monitoring',
            'backup': 'Backup & Sync',
            'general': 'General'
        };
        
        return categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
    }

    /**
     * Render a single integration
     */
    renderIntegration(integration) {
        const section = document.createElement('div');
        section.className = 'integration-section';
        section.dataset.integrationId = integration.id;

        const header = document.createElement('div');
        header.className = 'collapsible-header';
        header.innerHTML = `
            <div class="integration-header-content">
                <div class="integration-info">
                    <h4>${integration.name}</h4>
                    <p class="integration-description">${integration.description || ''}</p>
                </div>
                <div class="integration-toggle">
                    <label class="switch">
                        <input type="checkbox" id="${integration.id}Enabled" ${integration.defaultConfig?.enabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
            <span class="collapsible-arrow">▼</span>
        `;

        const content = document.createElement('div');
        content.className = 'collapsible-content';
        content.style.display = 'none';

        const fieldsContainer = document.createElement('div');
        fieldsContainer.className = 'integration-fields';
        
        // Render fields based on schema
        const fields = this.renderIntegrationFields(integration);
        fieldsContainer.appendChild(fields);

        // Add test connection button if integration supports it
        if (this.integrationSupportsTestConnection(integration)) {
            const testButton = document.createElement('button');
            testButton.type = 'button';
            testButton.className = 'action-button test-integration-btn';
            testButton.dataset.integrationId = integration.id;
            testButton.style.cssText = 'background: var(--success-color); margin-top: 1rem;';
            testButton.innerHTML = 'Test Connection<div class="spinner"></div>';
            fieldsContainer.appendChild(testButton);
        }

        content.appendChild(fieldsContainer);
        section.appendChild(header);
        section.appendChild(content);

        // Make it collapsible
        this.makeCollapsible(header, content);

        return section;
    }

    /**
     * Render integration fields based on schema
     */
    renderIntegrationFields(integration) {
        const container = document.createElement('div');
        container.className = 'integration-fields-container';

        const schema = integration.configSchema || {};
        
        Object.entries(schema).forEach(([fieldName, fieldConfig]) => {
            // Skip the enabled field as it's handled by the toggle
            if (fieldName === 'enabled') return;

            const fieldElement = this.renderIntegrationField(integration.id, fieldName, fieldConfig);
            container.appendChild(fieldElement);
        });

        return container;
    }

    /**
     * Render a single integration field
     */
    renderIntegrationField(integrationId, fieldName, fieldConfig) {
        const fieldContainer = document.createElement('div');
        fieldContainer.className = 'form-group integration-field';
        fieldContainer.dataset.fieldName = fieldName;

        // Add dependency class if this field depends on another
        if (fieldConfig.dependsOn) {
            fieldContainer.classList.add('depends-on-' + fieldConfig.dependsOn);
        }

        const label = document.createElement('label');
        label.textContent = fieldConfig.label || fieldName;
        label.htmlFor = `${integrationId}${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`;

        const fieldId = `${integrationId}${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`;
        let input;

        switch (fieldConfig.type) {
            case 'password':
                input = document.createElement('input');
                input.type = 'password';
                input.id = fieldId;
                input.name = fieldName;
                input.placeholder = fieldConfig.placeholder || '';
                if (fieldConfig.sensitive) {
                    input.dataset.sensitive = 'true';
                }
                break;
                
            case 'url':
                input = document.createElement('input');
                input.type = 'url';
                input.id = fieldId;
                input.name = fieldName;
                input.placeholder = fieldConfig.placeholder || '';
                break;
                
            case 'boolean':
                // For boolean fields other than 'enabled', render as checkbox
                input = document.createElement('div');
                input.className = 'checkbox-container';
                input.innerHTML = `
                    <label class="switch">
                        <input type="checkbox" id="${fieldId}" name="${fieldName}" ${fieldConfig.default ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                `;
                break;
                
            default:
                input = document.createElement('input');
                input.type = 'text';
                input.id = fieldId;
                input.name = fieldName;
                input.placeholder = fieldConfig.placeholder || '';
        }

        fieldContainer.appendChild(label);
        fieldContainer.appendChild(input);

        // Add description if provided
        if (fieldConfig.description) {
            const description = document.createElement('small');
            description.className = 'field-description';
            description.textContent = fieldConfig.description;
            fieldContainer.appendChild(description);
        }

        return fieldContainer;
    }

    /**
     * Check if integration supports test connection
     */
    integrationSupportsTestConnection(integration) {
        return integration.endpoints && integration.endpoints.some(endpoint => 
            endpoint.includes('test-connection') || endpoint.includes('/test')
        );
    }

    /**
     * Make a section collapsible
     */
    makeCollapsible(header, content) {
        header.addEventListener('click', () => {
            const isOpen = content.style.display !== 'none';
            content.style.display = isOpen ? 'none' : 'block';
            const arrow = header.querySelector('.collapsible-arrow');
            if (arrow) {
                arrow.textContent = isOpen ? '▼' : '▲';
            }
        });
    }

    /**
     * Bind events for integration controls
     */
    bindIntegrationEvents() {
        // Enable/disable toggle events
        document.querySelectorAll('.integration-section input[id$="Enabled"]').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const integrationId = e.target.id.replace('Enabled', '');
                this.toggleIntegrationFields(integrationId, e.target.checked);
            });
            
            // Set initial state
            const integrationId = toggle.id.replace('Enabled', '');
            this.toggleIntegrationFields(integrationId, toggle.checked);
        });

        // Sensitive field focus events for password fields
        document.querySelectorAll('.integration-section input[data-sensitive="true"]').forEach(field => {
            field.addEventListener('focus', () => {
                if (field.value === TOKENMASK) {
                    field.value = '';
                    field.placeholder = 'Enter new value...';
                }
            });
        });

        // Test connection button events
        document.querySelectorAll('.test-integration-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const integrationId = e.target.dataset.integrationId;
                this.testIntegrationConnection(integrationId, btn);
            });
        });
    }

    /**
     * Toggle integration fields visibility based on enabled state
     */
    toggleIntegrationFields(integrationId, enabled) {
        const section = document.querySelector(`[data-integration-id="${integrationId}"]`);
        if (!section) return;

        // Toggle fields that depend on enabled state
        const dependentFields = section.querySelectorAll('.integration-field.depends-on-enabled');
        dependentFields.forEach(field => {
            field.style.display = enabled ? 'block' : 'none';
        });

        // Toggle test button
        const testBtn = section.querySelector('.test-integration-btn');
        if (testBtn) {
            testBtn.style.display = enabled ? 'block' : 'none';
        }
    }

    /**
     * Test integration connection
     */
    async testIntegrationConnection(integrationId, button) {
        try {
            this.setButtonLoading(button, true);

            // Collect current integration settings
            const integrationConfig = this.collectIntegrationSettings(integrationId);

            const response = await fetch(`${globalThis.getApiBaseUrl()}/api/integrations/${integrationId}/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(integrationConfig),
                credentials: 'include'
            });

            const responseValidation = await globalThis.validateResponse(response);
            if (responseValidation.errorMessage) {
                throw new Error(responseValidation.errorMessage);
            }

            const result = await response.json();
            
            if (result.status === API_TEST_SUCCESS) {
                globalThis.toaster.show(result.message || `${integrationId} connection test successful!`);
            } else {
                throw new Error(result.message || 'Connection test failed');
            }

        } catch (error) {
            globalThis.logError(`${integrationId} connection test failed:`, error);
        } finally {
            this.setButtonLoading(button, false);
        }
    }

    /**
     * Collect integration settings from form fields
     */
    collectIntegrationSettings(integrationId) {
        const section = document.querySelector(`[data-integration-id="${integrationId}"]`);
        if (!section) return {};

        const settings = {};
        
        // Get enabled state
        const enabledToggle = section.querySelector(`#${integrationId}Enabled`);
        if (enabledToggle) {
            settings.enabled = enabledToggle.checked;
        }

        // Get all other fields
        const fields = section.querySelectorAll('.integration-field input, .integration-field select, .integration-field textarea');
        fields.forEach(field => {
            const fieldName = field.name || field.id.replace(integrationId, '').toLowerCase();
            
            if (field.type === 'checkbox') {
                settings[fieldName] = field.checked;
            } else {
                settings[fieldName] = field.value;
            }
        });

        return settings;
    }

    /**
     * Collect all integration settings from the form
     */
    collectAllIntegrationSettings() {
        const integrationSettings = {};
        
        // Find all integration sections
        const integrationSections = document.querySelectorAll('.integration-section[data-integration-id]');
        
        integrationSections.forEach(section => {
            const integrationId = section.dataset.integrationId;
            const settings = this.collectIntegrationSettings(integrationId);
            
            if (Object.keys(settings).length > 0) {
                integrationSettings[integrationId] = settings;
            }
        });
        
        return integrationSettings;
    }

    /**
     * Apply integration settings to the dynamically loaded form
     */
    applyIntegrationSettingsToForm(integrationSettings) {
        Object.entries(integrationSettings).forEach(([integrationId, config]) => {
            const section = document.querySelector(`[data-integration-id="${integrationId}"]`);
            if (!section) return;

            // Set enabled state
            const enabledToggle = section.querySelector(`#${integrationId}Enabled`);
            if (enabledToggle) {
                enabledToggle.checked = config.enabled || false;
                this.toggleIntegrationFields(integrationId, enabledToggle.checked);
            }

            // Set field values
            Object.entries(config).forEach(([fieldName, value]) => {
                if (fieldName === 'enabled') return; // Already handled above

                const fieldId = `${integrationId}${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`;
                const field = section.querySelector(`#${fieldId}`);
                
                if (field) {
                    if (field.type === 'checkbox') {
                        field.checked = !!value;
                    } else {
                        // Handle sensitive fields
                        if (field.dataset.sensitive === 'true' && value) {
                            field.value = TOKENMASK;
                            field.setAttribute('data-has-saved-token', 'true');
                            field.placeholder = 'Saved token hidden - focus to enter new token';
                        } else {
                            field.value = value || '';
                        }
                    }
                }
            });
        });
    }
}
