/**
 * Home Assistant Integration
 * Combined integration schema and endpoint functionality for Home Assistant home automation system
 */

const { API_TEST_SUCCESS, API_HOMEASSISTANT_ENDPOINT, TOKENMASK } = require('../src/constants.js');

class HomeAssistantIntegration {
  /**
   * Integration schema for Home Assistant
   * This schema defines the configuration options, endpoints, and validation for the Home Assistant integration.
   * It includes:
   * - Configuration schema for enabling/disabling the integration
   * - Host URL and API token fields
   * - Default configuration values
   * - API endpoints for testing connection, importing devices, and getting device info
   * - Validation functions for configuration
   * - Status check function to verify connection and configuration
   * - Metadata for documentation and support
   */
  static SCHEMA = {
    name: 'Home Assistant',
    description: 'Integration for importing devices and sensors from Home Assistant into your asset inventory.',
    version: '1.0.0',
    icon: 'home',
    logoHref: 'assets/integrations/homeassistant/homeassistant.png',
    colorScheme: '#41BDF5',
    category: 'monitoring',
    apiEndpoint: API_HOMEASSISTANT_ENDPOINT,
    
    configSchema: {
      enabled: {
        type: 'boolean',
        label: 'Enable Home Assistant Integration',
        description: 'Enable integration with Home Assistant home automation system',
        default: false,
        required: false
      },
      hostUrl: {
        type: 'url',
        label: 'Home Assistant URL',
        description: 'The base URL of your Home Assistant instance (including port if not 8123)',
        placeholder: 'http://homeassistant.local:8123',
        required: true,
        dependsOn: 'enabled'
      },
      accessToken: {
        type: 'password',
        label: 'Long-Lived Access Token',
        description: 'Your Home Assistant Long-Lived Access Token (create in Profile settings)',
        placeholder: 'Enter your access token',
        required: true,
        sensitive: true,
        dependsOn: 'enabled'
      },
      importFilters: {
        type: 'textarea',
        label: 'Device Import Filters (Optional)',
        description: 'Comma-separated list of entity domains to import (e.g., sensor,light,switch). Leave empty to import all.',
        placeholder: 'sensor,light,switch,climate,lock',
        required: false,
        dependsOn: 'enabled'
      }
    },
    
    defaultConfig: {
      enabled: false,
      hostUrl: '',
      accessToken: '',
      importFilters: ''
    },
    
    endpoints: [
      `GET /${API_HOMEASSISTANT_ENDPOINT}/test-connection`,
      `GET /${API_HOMEASSISTANT_ENDPOINT}/devices`,
      `GET /${API_HOMEASSISTANT_ENDPOINT}/device/:entity_id/info`,
      `POST /${API_HOMEASSISTANT_ENDPOINT}/import-devices`,
      `GET /${API_HOMEASSISTANT_ENDPOINT}/config`,
      `GET /${API_HOMEASSISTANT_ENDPOINT}/test`
    ],
    
    validators: {
      configValidator: (config) => {
        const errors = [];
            
        if (config.enabled) {
          if (!config.hostUrl) {
            errors.push('Home Assistant URL is required when integration is enabled');
          } else {
            try {
              new URL(config.hostUrl);
            } catch {
              errors.push('Home Assistant URL must be a valid URL');
            }
          }
                
          if (!config.accessToken) {
            errors.push('Access Token is required when Home Assistant integration is enabled');
          }
        }
            
        return {
          valid: errors.length === 0,
          errors
        };
      }
    },
    
    statusCheck: async (config) => {
      if (!config.enabled) {
        return { status: 'disabled', message: 'Integration is disabled' };
      }
        
      if (!config.hostUrl || !config.accessToken) {
        return { status: 'misconfigured', message: 'Missing required configuration' };
      }
        
      try {
        return await this.testConnection(config);
      } catch (error) {
        return { status: 'error', message: error.message };
      }
    },
    
    metadata: {
      documentationUrl: 'https://developers.home-assistant.io/docs/api/rest/',
      supportLevel: 'community',
      author: 'DumbAssets Team',
      tags: ['home-automation', 'iot', 'monitoring', 'sensors']
    }
  };

  /**
   * Test connection to Home Assistant
   */
  static async testConnection(config) {
    if (!config.hostUrl || !config.accessToken) {
      throw new Error('Home Assistant URL and Access Token are required');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      // Test the API endpoint
      const response = await fetch(`${config.hostUrl.replace(/\/$/, '')}/api/`, {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid access token - please check your Home Assistant token');
        }
        throw new Error(`Connection failed: HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.message === 'API running.') {
        return { 
          status: API_TEST_SUCCESS, 
          message: 'Successfully connected to Home Assistant',
          version: data.version || 'Unknown'
        };
      } else {
        throw new Error('Unexpected response from Home Assistant API');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Connection timeout - Home Assistant instance may be unreachable');
      }
      throw error;
    }
  }

  /**
   * Get all Home Assistant devices/entities
   */
  static async getDevices(config, filters = []) {
    if (!config.hostUrl || !config.accessToken) {
      throw new Error('Home Assistant integration not configured');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${config.hostUrl.replace(/\/$/, '')}/api/states`, {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch devices: HTTP ${response.status}`);
      }

      let entities = await response.json();

      // Apply domain filters if specified
      if (filters && filters.length > 0) {
        entities = entities.filter(entity => {
          const domain = entity.entity_id.split('.')[0];
          return filters.includes(domain);
        });
      }

      // Transform entities into a more useful format for asset management
      return entities.map(entity => ({
        entity_id: entity.entity_id,
        name: entity.attributes.friendly_name || entity.entity_id,
        domain: entity.entity_id.split('.')[0],
        state: entity.state,
        unit_of_measurement: entity.attributes.unit_of_measurement || null,
        device_class: entity.attributes.device_class || null,
        area: entity.attributes.area_id || null,
        last_changed: entity.last_changed,
        last_updated: entity.last_updated,
        attributes: entity.attributes,
        raw_entity: entity // Keep original for reference
      }));
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - Home Assistant instance may be slow or unreachable');
      }
      console.error('Home Assistant devices fetch error:', error);
      throw error;
    }
  }

  /**
   * Get Home Assistant configuration info
   */
  static async getConfig(config) {
    if (!config.hostUrl || !config.accessToken) {
      throw new Error('Home Assistant integration not configured');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${config.hostUrl.replace(/\/$/, '')}/api/config`, {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch config: HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - Home Assistant instance may be slow or unreachable');
      }
      throw error;
    }
  }

  /**
   * Get specific device/entity information
   */
  static async getDeviceInfo(config, entityId) {
    if (!config.hostUrl || !config.accessToken) {
      throw new Error('Home Assistant integration not configured');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${config.hostUrl.replace(/\/$/, '')}/api/states/${entityId}`, {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Device/entity not found');
        }
        throw new Error(`Failed to get device info: HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - Home Assistant instance may be slow or unreachable');
      }
      throw error;
    }
  }

  /**
   * Convert Home Assistant entities to DumbAssets format
   */
  static convertToAssets(entities, config) {
    return entities.map(entity => {
      const domain = entity.entity_id.split('.')[0];
      const deviceName = entity.attributes.friendly_name || entity.entity_id;
      
      // Determine asset category based on domain
      let category = 'Electronics';
      switch (domain) {
        case 'light':
          category = 'Lighting';
          break;
        case 'sensor':
          category = 'Sensors';
          break;
        case 'switch':
          category = 'Electrical';
          break;
        case 'climate':
          category = 'HVAC';
          break;
        case 'lock':
          category = 'Security';
          break;
        case 'camera':
          category = 'Security';
          break;
        case 'media_player':
          category = 'Entertainment';
          break;
        default:
          category = 'Electronics';
      }

      return {
        name: deviceName,
        category: category,
        serialNumber: entity.entity_id,
        notes: `Imported from Home Assistant\nDomain: ${domain}\nCurrent State: ${entity.state}${entity.unit_of_measurement ? ` ${entity.unit_of_measurement}` : ''}`,
        location: entity.area || 'Unknown',
        tags: [domain, 'home-assistant', 'iot'],
        customFields: {
          ha_entity_id: entity.entity_id,
          ha_domain: domain,
          ha_device_class: entity.device_class,
          ha_last_updated: entity.last_updated,
          ha_current_state: entity.state,
          ha_unit: entity.unit_of_measurement
        },
        source: 'home-assistant',
        importDate: new Date().toISOString()
      };
    });
  }

  /**
   * Register Home Assistant API routes with Express app
   */
  static registerRoutes(app, getSettings) {
    const BASE_PATH = process.env.BASE_PATH || '';

    // Helper to get Home Assistant config
    const getHomeAssistantConfig = async () => {
      try {
        const settings = await getSettings();
        const haConfig = settings.integrationSettings?.homeassistant;
        
        if (!haConfig?.enabled) {
          throw new Error('Home Assistant integration is disabled');
        }
        
        return haConfig;
      } catch (error) {
        throw new Error('Failed to get Home Assistant configuration');
      }
    };

    // Test Home Assistant connection
    app.post(BASE_PATH + `/${API_HOMEASSISTANT_ENDPOINT}/test-connection`, async (req, res) => {
      try {
        let { hostUrl, accessToken } = req.body;
        
        if (!hostUrl || !accessToken) {
          return res.status(400).json({ 
            success: false, 
            error: 'Host URL and Access Token are required' 
          });
        }
        
        // If the token is masked, get the real token from stored settings
        if (accessToken === TOKENMASK) {
          try {
            const haConfig = await getHomeAssistantConfig();
            if (haConfig?.accessToken && haConfig.accessToken !== TOKENMASK) {
              accessToken = haConfig.accessToken;
            } else {
              return res.status(400).json({ 
                success: false, 
                error: 'No saved access token found. Please enter a new token.' 
              });
            }
          } catch (error) {
            return res.status(400).json({ 
              success: false, 
              error: 'Failed to retrieve saved token: ' + error.message 
            });
          }
        }

        const result = await this.testConnection({ hostUrl, accessToken });
        res.json({ success: true, ...result });
      } catch (error) {
        console.error('Home Assistant connection test failed:', error);
        res.status(400).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Get all Home Assistant devices
    app.get(BASE_PATH + `/${API_HOMEASSISTANT_ENDPOINT}/devices`, async (req, res) => {
      try {
        const config = await getHomeAssistantConfig();
        
        // Parse filters from config
        let filters = [];
        if (config.importFilters) {
          filters = config.importFilters.split(',').map(f => f.trim()).filter(f => f);
        }
        
        const devices = await this.getDevices(config, filters);
        res.json({ 
          success: true, 
          devices,
          total: devices.length,
          filters: filters
        });
      } catch (error) {
        console.error('Home Assistant devices fetch failed:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Get Home Assistant configuration
    app.get(BASE_PATH + `/${API_HOMEASSISTANT_ENDPOINT}/config`, async (req, res) => {
      try {
        const config = await getHomeAssistantConfig();
        const haConfig = await this.getConfig(config);
        res.json({ success: true, config: haConfig });
      } catch (error) {
        console.error('Home Assistant config fetch failed:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Get specific device info
    app.get(BASE_PATH + `/${API_HOMEASSISTANT_ENDPOINT}/device/:entity_id/info`, async (req, res) => {
      try {
        const config = await getHomeAssistantConfig();
        const entityId = decodeURIComponent(req.params.entity_id);
        
        const info = await this.getDeviceInfo(config, entityId);
        res.json({ success: true, device: info });
      } catch (error) {
        console.error('Failed to get device info:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Import devices as assets
    app.post(BASE_PATH + `/${API_HOMEASSISTANT_ENDPOINT}/import-devices`, async (req, res) => {
      try {
        const config = await getHomeAssistantConfig();
        const { selectedEntities } = req.body;
        
        if (!selectedEntities || !Array.isArray(selectedEntities)) {
          return res.status(400).json({ 
            success: false, 
            error: 'selectedEntities array is required' 
          });
        }

        // Get full device info for selected entities
        const devicePromises = selectedEntities.map(entityId => 
          this.getDeviceInfo(config, entityId)
        );
        
        const entities = await Promise.all(devicePromises);
        
        // Convert to asset format
        const assets = this.convertToAssets(entities.map(entity => ({
          entity_id: entity.entity_id,
          state: entity.state,
          attributes: entity.attributes,
          last_changed: entity.last_changed,
          last_updated: entity.last_updated,
          area: entity.attributes.area_id
        })), config);
        
        res.json({ 
          success: true, 
          assets,
          imported: assets.length,
          message: `Successfully converted ${assets.length} Home Assistant entities to assets`
        });
      } catch (error) {
        console.error('Home Assistant import failed:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Test endpoint for debugging
    app.get(BASE_PATH + `/${API_HOMEASSISTANT_ENDPOINT}/test`, (req, res) => {
      res.json({ 
        message: 'Home Assistant integration endpoints are working',
        timestamp: new Date().toISOString()
      });
    });
  }
}

module.exports = HomeAssistantIntegration; 