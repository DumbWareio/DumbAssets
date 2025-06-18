/**
 * Papra Integration
 * Combined integration schema and endpoint functionality for Papra document management system
 */

const { API_TEST_SUCCESS, API_PAPRA_ENDPOINT, TOKENMASK } = require('../src/constants.js');

class PapraIntegration {
  /**
   * Integration schema for Papra
   * This schema defines the configuration options, endpoints, and validation for the Papra integration.
   * It includes:
   * - Configuration schema for enabling/disabling the integration
   * - Host URL, organization ID, and API token fields
   * - Default configuration values
   * - API endpoints for testing connection, searching documents, getting document info, and downloading documents
   * - Validation functions for configuration
   * - Status check function to verify connection and configuration
   * - Metadata for documentation and support
   * This schema is used to register the integration with the integration manager and provide a consistent interface for interacting with Papra.
   **/
  static SCHEMA = {
    name: 'Papra',
    description: 'Integration for accessing and attaching Papra documents to assets.',
    version: '1.0.0',
    icon: 'document',
    logoHref: 'assets/integrations/papra/papra.png',
    colorScheme: '#B3D167',
    category: 'document-management',
    apiEndpoint: API_PAPRA_ENDPOINT,
    
    configSchema: {
      enabled: {
        type: 'boolean',
        label: 'Enable Papra Integration',
        // description: 'Enable integration with Papra document management system',
        default: false,
        required: false
      },
      hostUrl: {
        type: 'url',
        label: 'Papra Host URL',
        description: 'The base URL of your Papra instance',
        placeholder: 'https://papra.example.com',
        required: true,
        dependsOn: 'enabled'
      },
      organizationId: {
        type: 'text',
        label: 'Organization ID',
        description: 'Your Papra organization ID',
        placeholder: 'Enter your organization ID',
        required: true,
        dependsOn: 'enabled'
      },
      apiToken: {
        type: 'password',
        label: 'API Token',
        description: 'Your Papra API token for authentication',
        placeholder: 'Enter your API token',
        required: true,
        sensitive: true,
        dependsOn: 'enabled'
      }
    },
    
    defaultConfig: {
      enabled: false,
      hostUrl: '',
      organizationId: '',
      apiToken: ''
    },
    
    endpoints: [
      `GET /${API_PAPRA_ENDPOINT}/test-connection`,
      `GET /${API_PAPRA_ENDPOINT}/search`,
      `GET /${API_PAPRA_ENDPOINT}/document/:id/info`,
      `GET /${API_PAPRA_ENDPOINT}/document/:id/download`,
      `GET /${API_PAPRA_ENDPOINT}/test`
    ],
    
    validators: {
      configValidator: (config) => {
        const errors = [];
            
        if (config.enabled) {
          if (!config.hostUrl) {
            errors.push('Host URL is required when Papra integration is enabled');
          } else {
            try {
              new URL(config.hostUrl);
            } catch {
              errors.push('Host URL must be a valid URL');
            }
          }

          if (!config.organizationId) {
            errors.push('Organization ID is required when Papra integration is enabled');
          }
                
          if (!config.apiToken) {
            errors.push('API Token is required when Papra integration is enabled');
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
        
      if (!config.hostUrl || !config.organizationId || !config.apiToken) {
        return { status: 'misconfigured', message: 'Missing required configuration' };
      }
        
      try {
        return await this.testConnection(config);
      } catch (error) {
        return { status: 'error', message: error.message };
      }
    },
    
    metadata: {
      documentationUrl: 'https://github.com/papra-hq/papra/issues/363#issuecomment-2981636832',
      supportLevel: 'community',
      tags: ['documents', 'pdf', 'management', 'organization']
    }
  };

  /**
   * Test connection to Papra instance
   */
  static async testConnection(config) {
    if (!config.enabled) {
      throw new Error('Integration is disabled');
    }
    if (!config.hostUrl || !config.organizationId || !config.apiToken) {
      throw new Error('Host URL, Organization ID, and API Token are required');
    }

    try {
      const data = await this.getDocuments(config, 0, 1);
      return {
        status: API_TEST_SUCCESS,
        message: `Successfully connected to Papra (${data.documentsCount || 0} documents available)`,
        documentCount: data.documentsCount || 0
      };
    } catch (error) {
      console.error('Papra connection test failed:', error);
    }
  }

  /** Load Papra Documents */
  static async getDocuments(config, page = 0, pageSize = 50) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const url = new URL(`${config.hostUrl.replace(/\/$/, '')}/api/organizations/${config.organizationId}/documents`);
      url.searchParams.append('pageIndex', page.toString());
      url.searchParams.append('pageSize', pageSize.toString());

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API token or unauthorized access');
        } else if (response.status === 404) {
          throw new Error('Papra API not found or invalid Organization ID - check your host URL and organization ID');
        } else if (response.status === 403) {
          throw new Error('Access forbidden - check your permissions and organization membership');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Connection timeout - Papra instance may be slow or unreachable');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Connection refused - check your host URL and network connectivity');
      } else if (error.code === 'ENOTFOUND') {
        throw new Error('Host not found - check your host URL');
      } else {
        throw error;
      }
    }
  }

  /**
   * Search Papra documents
   */
  static async searchDocuments(config, query, page = 0, pageSize = 50) {
    if (!config.hostUrl || !config.organizationId || !config.apiToken) {
      throw new Error('Papra integration not configured');
    }

    try {
      if (query && query.trim().length > 0) {
        const url = new URL(`${config.hostUrl.replace(/\/$/, '')}/api/organizations/${config.organizationId}/documents/search`);
        
        const searchQuery = !query || !query.trim() ? '' : query;
        url.searchParams.append('searchQuery', searchQuery);
        url.searchParams.append('pageIndex', page.toString());
        url.searchParams.append('pageSize', pageSize.toString());
  
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
  
        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${config.apiToken}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
  
        clearTimeout(timeoutId);
  
        if (!response.ok) {
          throw new Error(`Search failed: HTTP ${response.status}`);
        }
  
        return await response.json();
      } else {
        const data = await this.getDocuments(config, page, pageSize);
        return data;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Search timeout - Papra instance may be slow or unreachable');
      }
      console.error('Papra search error:', error);
      throw error;
    }
  }

  /**
   * Get document information
   */
  static async getDocumentInfo(config, documentId) {
    if (!config.hostUrl || !config.organizationId || !config.apiToken) {
      throw new Error('Papra integration not configured');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${config.hostUrl.replace(/\/$/, '')}/api/organizations/${config.organizationId}/documents/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Document not found');
        }
        throw new Error(`Failed to get document info: HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - Papra instance may be slow or unreachable');
      }
      console.error('Failed to get document info:', error);
      throw error;
    }
  }

  /**
   * Proxy document download
   */
  static async downloadDocument(config, documentId) {
    if (!config.hostUrl || !config.organizationId || !config.apiToken) {
      throw new Error('Papra integration not configured');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${config.hostUrl.replace(/\/$/, '')}/api/organizations/${config.organizationId}/documents/${documentId}/file`, {
        headers: {
          'Authorization': `Bearer ${config.apiToken}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Document not found');
        }
        throw new Error(`Download failed: HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Download timeout - Papra instance may be slow or unreachable');
      }
      console.error('Failed to download document:', error);
      throw error;
    }
  }

  /**
   * Register Papra API routes with Express app
   */
  static registerRoutes(app, getSettings) {
    const BASE_PATH = process.env.BASE_PATH || '';

    // Helper to get Papra config
    const getPapraConfig = async () => {
      try {
        const settings = await getSettings();
        const papraConfig = settings.integrationSettings?.papra;
        
        if (!papraConfig?.enabled) {
          throw new Error('Papra integration is disabled');
        }
        
        return papraConfig;
      } catch (error) {
        throw new Error('Failed to get Papra configuration');
      }
    };

    // Test Papra connection
    app.post(BASE_PATH + `/${API_PAPRA_ENDPOINT}/test-connection`, async (req, res) => {
      try {
        let { hostUrl, organizationId, apiToken } = req.body;
        
        if (!hostUrl || !organizationId || !apiToken) {
          return res.status(400).json({ 
            success: false, 
            error: 'Host URL, Organization ID, and API Token are required' 
          });
        };
        
        // If the token is masked, get the real token from stored settings
        if (apiToken === TOKENMASK) {
          try {
            const papraConfig = await getPapraConfig();
            if (papraConfig?.apiToken && papraConfig.apiToken !== TOKENMASK) {
              apiToken = papraConfig.apiToken;
            } else {
              return res.status(400).json({ 
                success: false, 
                error: 'No saved API token found. Please enter a new token.' 
              });
            }
          } catch (error) {
            return res.status(400).json({ 
              success: false, 
              error: 'Failed to retrieve saved token: ' + error.message 
            });
          }
        }

        const result = await this.testConnection({ hostUrl, organizationId, apiToken });
        res.json({ success: true, ...result });
      } catch (error) {
        console.error('Papra connection test failed:', error);
        res.status(400).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Search Papra documents
    app.get(BASE_PATH + `/${API_PAPRA_ENDPOINT}/search`, async (req, res) => {
      try {
        const config = await getPapraConfig();
        const { q: query, pageIndex = 0, pageSize = 20 } = req.query;
        
        const results = await this.searchDocuments(
          config, 
          query, 
          parseInt(pageIndex), 
          parseInt(pageSize)
        );
        
        res.json(results);
      } catch (error) {
        console.error('Papra search failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get Papra document info
    app.get(BASE_PATH + `/${API_PAPRA_ENDPOINT}/document/:id/info`, async (req, res) => {
      try {
        const config = await getPapraConfig();
        const documentId = req.params.id;
        
        const info = await this.getDocumentInfo(config, documentId);
        res.json(info);
      } catch (error) {
        console.error('Failed to get document info:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Proxy Papra document download
    app.get(BASE_PATH + `/${API_PAPRA_ENDPOINT}/document/:id/download`, async (req, res) => {
      try {
        const config = await getPapraConfig();
        const documentId = req.params.id;
        
        const response = await this.downloadDocument(config, documentId);
        
        // Copy relevant headers from Papra response
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        const contentDisposition = response.headers.get('content-disposition');
        
        if (contentType) res.setHeader('content-type', contentType);
        if (contentLength) res.setHeader('content-length', contentLength);
        if (contentDisposition) res.setHeader('content-disposition', contentDisposition);
        
        // Get the response as a buffer and send it
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
      } catch (error) {
        console.error('Failed to download document:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Test endpoint for debugging
    app.get(BASE_PATH + `/${API_PAPRA_ENDPOINT}/test`, (req, res) => {
      res.json({ 
        message: 'Papra integration endpoints are working',
        timestamp: new Date().toISOString()
      });
    });

    console.log('📄 Papra endpoints registered');
  }
}

module.exports = PapraIntegration; 