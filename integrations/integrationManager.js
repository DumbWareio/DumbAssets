/**
 * Integration Manager - Server-side integration registry and manager
 * Handles registration, configuration, and endpoint management for all integrations
 */

const { TOKENMASK } = require('../src/constants');
const PaperlessIntegration = require('./paperless'); // Import Paperless schema
const PapraIntegration = require('./papra'); // Import Papra schema
const HomeAssistantIntegration = require('./homeassistant'); // Import Home Assistant schema

class IntegrationManager {
    constructor() {
        this.integrations = new Map();
        this.registerBuiltInIntegrations();
    }

    /**
     * Register built-in integrations
     */
    registerBuiltInIntegrations() {
        // Register Paperless NGX integration
        this.registerIntegration('paperless', PaperlessIntegration.SCHEMA);

        // Register Papra integration
        this.registerIntegration('papra', PapraIntegration.SCHEMA);

        // Register Home Assistant integration
        this.registerIntegration('homeassistant', HomeAssistantIntegration.SCHEMA);

        // Future integrations can be added here
        // this.registerIntegration('nextcloud', { ... });
        // this.registerIntegration('sharepoint', { ... });
    }

    /**
     * Register routes for all integrations
     * @param {Object} app - Express application instance
     * @param {Function} getSettings - Function to retrieve application settings
     * This method registers all integration-specific routes
     * by calling their static `registerRoutes` methods. which is ultimately called from server.js.
     * It allows each integration to define its own API endpoints
     */
    registerRoutes(app, getSettings) {
        PaperlessIntegration.registerRoutes(app, getSettings);
        PapraIntegration.registerRoutes(app, getSettings);
        HomeAssistantIntegration.registerRoutes(app, getSettings);
        // Future integrations can register their routes here
    }

    /**
     * Register a new integration
     * @param {string} id - Unique integration identifier
     * @param {Object} config - Integration configuration
     */
    registerIntegration(id, config) {
        const integration = {
            id,
            name: config.name,
            description: config.description || '',
            version: config.version || '1.0.0',
            enabled: config.enabled || false,
            icon: config.icon || 'gear',
            logoHref: config.logoHref || null, // Optional logo URL for frontend display
            colorScheme: config.colorScheme || 'default', // Default color scheme for UI
            category: config.category || 'general',
            
            // Configuration schema for settings UI
            configSchema: config.configSchema || {},
            
            // Default configuration values
            defaultConfig: config.defaultConfig || {},
            
            // API endpoints this integration provides
            endpoints: config.endpoints || [],
            
            // Middleware functions
            middleware: config.middleware || {},
            
            // Validation functions
            validators: config.validators || {},
            
            // Status check function
            statusCheck: config.statusCheck || null,
            
            // Integration-specific metadata
            metadata: config.metadata || {}
        };

        this.integrations.set(id, integration);
        console.log(`✅ Registered integration: ${integration.name} (${id})`);
        return integration;
    }

    /**
     * Get all registered integrations
     */
    getAllIntegrations() {
        return Array.from(this.integrations.values());
    }

    /**
     * Get a specific integration by ID
     */
    getIntegration(id) {
        return this.integrations.get(id);
    }

    /**
     * Get enabled integrations only
     */
    getEnabledIntegrations() {
        return Array.from(this.integrations.values()).filter(integration => integration.enabled);
    }

    /**
     * Get integrations by category
     */
    getIntegrationsByCategory(category) {
        return Array.from(this.integrations.values()).filter(integration => integration.category === category);
    }

    /**
     * Update integration configuration
     */
    updateIntegrationConfig(id, config) {
        const integration = this.integrations.get(id);
        if (!integration) {
            throw new Error(`Integration not found: ${id}`);
        }

        // Merge with existing config
        integration.config = { ...integration.defaultConfig, ...config };
        integration.enabled = config.enabled || false;
        
        console.log(`🔄 Updated integration config: ${integration.name}`);
        return integration;
    }

    /**
     * Validate integration configuration
     */
    validateConfig(id, config) {
        const integration = this.integrations.get(id);
        if (!integration) {
            throw new Error(`Integration not found: ${id}`);
        }

        const validator = integration.validators.configValidator;
        if (validator) {
            return validator(config);
        }

        return { valid: true };
    }

    /**
     * Check integration status/health
     */
    async checkIntegrationStatus(id, config) {
        const integration = this.integrations.get(id);
        if (!integration || !integration.statusCheck) {
            return { status: 'unknown', message: 'No status check available' };
        }

        try {
            return await integration.statusCheck(config);
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    /**
     * Sanitize configuration for frontend (mask sensitive fields)
     */
    sanitizeConfigForFrontend(id, config) {
        const integration = this.integrations.get(id);
        if (!integration) return config;

        const sanitized = { ...config };
        const schema = integration.configSchema;

        // Mask sensitive fields
        for (const [fieldName, fieldConfig] of Object.entries(schema)) {
            if (fieldConfig.sensitive && sanitized[fieldName]) {
                sanitized[fieldName] = TOKENMASK;
            }
        }

        return sanitized;
    }

    /**
     * Get integration configuration for frontend settings
     */
    getIntegrationsForSettings() {
        return Array.from(this.integrations.values()).map(integration => ({
            id: integration.id,
            name: integration.name,
            description: integration.description,
            icon: integration.icon,
            logoHref: integration.logoHref,
            colorScheme: integration.colorScheme || 'default',
            category: integration.category,
            configSchema: integration.configSchema,
            defaultConfig: integration.defaultConfig,
            endpoints: integration.endpoints,
            metadata: integration.metadata
        }));
    }

    /**
     * Apply integration settings updates, handling sensitive data preservation and validation
     */
    applyIntegrationSettings(serverConfig, updatedConfig) {
        if (!updatedConfig.integrationSettings) {
            return updatedConfig;
        }

        for (const [integrationId, newConfig] of Object.entries(updatedConfig.integrationSettings)) {
            const integration = this.getIntegration(integrationId);
            if (!integration) {
                console.warn(`Unknown integration in settings: ${integrationId}`);
                continue;
            }

            const serverIntegrationConfig = serverConfig.integrationSettings?.[integrationId] || {};
            const schema = integration.configSchema;

            // Handle sensitive field preservation and validation
            for (const [fieldName, fieldConfig] of Object.entries(schema)) {
                const newValue = newConfig[fieldName];
                
                if (fieldConfig.sensitive && newValue === TOKENMASK) {
                    // Preserve existing sensitive value if token mask is present
                    if (serverIntegrationConfig[fieldName]) {
                        newConfig[fieldName] = serverIntegrationConfig[fieldName];
                    } else {
                        newConfig[fieldName] = '';
                    }
                }

                // Validate and sanitize URL fields
                if (fieldConfig.type === 'url' && newValue && newValue.trim()) {
                    const trimmedUrl = newValue.trim();
                    if (!/^https?:\/\//i.test(trimmedUrl)) {
                        throw new Error(`Invalid ${integration.name} ${fieldConfig.label}: URL must start with http:// or https://`);
                    }
                    // Remove trailing slash for consistency
                    newConfig[fieldName] = trimmedUrl.endsWith('/') 
                        ? trimmedUrl.slice(0, -1) 
                        : trimmedUrl;
                }
            }

            // Run integration-specific validation
            const validation = this.validateConfig(integrationId, newConfig);
            if (!validation.valid) {
                throw new Error(`${integration.name} configuration error: ${validation.errors.join(', ')}`);
            }
        }

        return updatedConfig;
    }

    /**
     * Prepare configuration for testing, handling masked sensitive fields
     */
    async prepareConfigForTesting(integrationId, testConfig, getSettings) {
        const integration = this.getIntegration(integrationId);
        if (!integration) {
            throw new Error(`Integration not found: ${integrationId}`);
        }

        const preparedConfig = { ...testConfig };
        const schema = integration.configSchema;

        // Handle masked sensitive fields
        for (const [fieldName, fieldConfig] of Object.entries(schema)) {
            if (fieldConfig.sensitive && preparedConfig[fieldName] === TOKENMASK) {
                try {
                    // Get the actual stored value
                    const settings = await getSettings();
                    const storedConfig = settings.integrationSettings?.[integrationId];
                    
                    if (storedConfig?.[fieldName] && storedConfig[fieldName] !== TOKENMASK) {
                        preparedConfig[fieldName] = storedConfig[fieldName];
                    } else {
                        throw new Error(`No stored ${fieldConfig.label || fieldName} found. Please enter a new value.`);
                    }
                } catch (error) {
                    throw new Error(`Failed to retrieve stored ${fieldConfig.label || fieldName}: ${error.message}`);
                }
            }
        }

        return preparedConfig;
    }
}

// Singleton instance
const integrationManager = new IntegrationManager();

module.exports = { IntegrationManager, integrationManager };
