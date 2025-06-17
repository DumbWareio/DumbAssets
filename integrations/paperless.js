/**
 * Paperless NGX Integration
 * Combined integration schema and endpoint functionality for Paperless NGX document management system
 */

const { API_TEST_SUCCESS, TOKENMASK } = require('../src/constants.js');

class PaperlessIntegration {
  /**
   * Integration schema for Paperless NGX
   * This schema defines the configuration options, endpoints, and validation for the Paperless NGX integration.
   * * It includes:
   * - Configuration schema for enabling/disabling the integration
   * - Host URL and API token fields
   * - Default configuration values
   * - API endpoints for testing connection, searching documents, getting document info, and downloading documents
   * - Validation functions for configuration
   * - Status check function to verify connection and configuration
   * - Metadata for documentation and support
   * * This schema is used to register the integration with the integration manager and provide a consistent interface for interacting with Paperless NGX.
   **/
  static SCHEMA = {
    name: 'Paperless NGX',
    description: 'Integration for accessing and attaching paperless documents to assets.',
    version: '1.0.0',
    icon: 'document',
    category: 'document-management',
    
    configSchema: {
      enabled: {
        type: 'boolean',
        label: 'Enable Paperless Integration',
        // description: 'Enable integration with Paperless NGX document management system',
        default: false,
        required: false
      },
      hostUrl: {
        type: 'url',
        label: 'Paperless Host URL',
        description: 'The base URL of your Paperless NGX instance',
        placeholder: 'https://paperless.example.com',
        required: true,
        dependsOn: 'enabled'
      },
      apiToken: {
        type: 'password',
        label: 'API Token',
        description: 'Your Paperless NGX API token (found in your user settings)',
        placeholder: 'Enter your API token',
        required: true,
        sensitive: true,
        dependsOn: 'enabled'
      }
    },
    
    defaultConfig: {
      enabled: false,
      hostUrl: '',
      apiToken: ''
    },
    
    endpoints: [
      'GET /api/paperless/test-connection',
      'GET /api/paperless/search',
      'GET /api/paperless/document/:id/info',
      'GET /api/paperless/document/:id/download',
      'GET /api/paperless/test'
    ],
    
    validators: {
      configValidator: (config) => {
        const errors = [];
            
        if (config.enabled) {
          if (!config.hostUrl) {
            errors.push('Host URL is required when Paperless integration is enabled');
          } else {
            try {
              new URL(config.hostUrl);
            } catch {
              errors.push('Host URL must be a valid URL');
            }
          }
                
          if (!config.apiToken) {
            errors.push('API Token is required when Paperless integration is enabled');
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
        
      if (!config.hostUrl || !config.apiToken) {
        return { status: 'misconfigured', message: 'Missing required configuration' };
      }
        
      try {
        return await this.testConnection(config);
      } catch (error) {
        return { status: 'error', message: error.message };
      }
    },
    
    metadata: {
      documentationUrl: 'https://paperless-ngx.readthedocs.io/en/latest/api/',
      supportLevel: 'community',
      tags: ['documents', 'pdf', 'scanning', 'ocr']
    }
  };

  /**
   * Test connection to Paperless instance
   */
  static async testConnection(config) {
    if (!config.hostUrl || !config.apiToken) {
      throw new Error('Host URL and API Token are required');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${config.hostUrl.replace(/\/$/, '')}/api/documents/?page_size=1`, {
        headers: {
          'Authorization': `Token ${config.apiToken}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API token');
        } else if (response.status === 404) {
          throw new Error('Paperless API not found - check your host URL');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      return {
        status: API_TEST_SUCCESS,
        message: `Successfully connected to Paperless NGX (${data.count} documents available)`,
        documentCount: data.count
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Connection timeout - Paperless instance may be slow or unreachable');
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
   * Search Paperless documents
   */
  static async searchDocuments(config, query, page = 1, pageSize = 20) {
    if (!config.hostUrl || !config.apiToken) {
      throw new Error('Paperless integration not configured');
    }

    try {
      const url = new URL(`${config.hostUrl.replace(/\/$/, '')}/api/documents/`);
      
      if (query) {
        url.searchParams.append('query', query);
      }
      url.searchParams.append('page', page.toString());
      url.searchParams.append('page_size', pageSize.toString());
      url.searchParams.append('ordering', '-created');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Token ${config.apiToken}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Search failed: HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Search timeout - Paperless instance may be slow or unreachable');
      }
      console.error('Paperless search error:', error);
      throw error;
    }
  }

  /**
   * Get document information
   */
  static async getDocumentInfo(config, documentId) {
    if (!config.hostUrl || !config.apiToken) {
      throw new Error('Paperless integration not configured');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${config.hostUrl.replace(/\/$/, '')}/api/documents/${documentId}/`, {
        headers: {
          'Authorization': `Token ${config.apiToken}`,
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
        throw new Error('Request timeout - Paperless instance may be slow or unreachable');
      }
      console.error('Failed to get document info:', error);
      throw error;
    }
  }

  /**
   * Proxy document download
   */
  static async downloadDocument(config, documentId) {
    if (!config.hostUrl || !config.apiToken) {
      throw new Error('Paperless integration not configured');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${config.hostUrl.replace(/\/$/, '')}/api/documents/${documentId}/download/`, {
        headers: {
          'Authorization': `Token ${config.apiToken}`
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
        throw new Error('Download timeout - Paperless instance may be slow or unreachable');
      }
      console.error('Failed to download document:', error);
      throw error;
    }
  }

  /**
   * Register Paperless API routes with Express app
   */
  static registerRoutes(app, getSettings) {
    const BASE_PATH = process.env.BASE_PATH || '';

    // Helper to get Paperless config
    const getPaperlessConfig = async () => {
      try {
        const settings = await getSettings();
        const paperlessConfig = settings.integrationSettings?.paperless;
        
        if (!paperlessConfig?.enabled) {
          throw new Error('Paperless integration is disabled');
        }
        
        return paperlessConfig;
      } catch (error) {
        throw new Error('Failed to get Paperless configuration');
      }
    };

    // Test Paperless connection
    app.post(BASE_PATH + '/api/paperless/test-connection', async (req, res) => {
      try {
        let { hostUrl, apiToken } = req.body;
        
        if (!hostUrl || !apiToken) {
          return res.status(400).json({ 
            success: false, 
            error: 'Host URL and API Token are required' 
          });
        }

        // If the token is masked, get the real token from stored settings
        if (apiToken === TOKENMASK) {
          try {
            const settings = await getSettings();
            const paperlessConfig = settings.integrationSettings?.paperless;
            if (paperlessConfig?.apiToken && paperlessConfig.apiToken !== TOKENMASK) {
              apiToken = paperlessConfig.apiToken;
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

        const result = await this.testConnection({ hostUrl, apiToken });
        res.json({ success: true, ...result });
      } catch (error) {
        console.error('Paperless connection test failed:', error);
        res.status(400).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Search Paperless documents
    app.get(BASE_PATH + '/api/paperless/search', async (req, res) => {
      try {
        const config = await getPaperlessConfig();
        const { q: query, page = 1, page_size: pageSize = 20 } = req.query;
        
        const results = await this.searchDocuments(
          config, 
          query, 
          parseInt(page), 
          parseInt(pageSize)
        );
        
        res.json(results);
      } catch (error) {
        console.error('Paperless search failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get Paperless document info
    app.get(BASE_PATH + '/api/paperless/document/:id/info', async (req, res) => {
      try {
        const config = await getPaperlessConfig();
        const documentId = req.params.id;
        
        const info = await this.getDocumentInfo(config, documentId);
        res.json(info);
      } catch (error) {
        console.error('Failed to get document info:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Proxy Paperless document download
    app.get(BASE_PATH + '/api/paperless/document/:id/download', async (req, res) => {
      try {
        const config = await getPaperlessConfig();
        const documentId = req.params.id;
        
        const response = await this.downloadDocument(config, documentId);
        
        // Copy relevant headers from Paperless response
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
    app.get(BASE_PATH + '/api/paperless/test', (req, res) => {
      res.json({ 
        message: 'Paperless integration endpoints are working',
        timestamp: new Date().toISOString()
      });
    });

    console.log('📄 Paperless NGX endpoints registered');
  }
}

module.exports = PaperlessIntegration;