// Token masking for security
export const TOKENMASK = '*********************';

// Integration constants
export const INTEGRATION_CATEGORIES = {
  DOCUMENT_MANAGEMENT: 'document-management',
  COMMUNICATION: 'communication',
  MONITORING: 'monitoring',
  BACKUP: 'backup',
  GENERAL: 'general'
};

export const INTEGRATION_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  DISABLED: 'disabled',
  MISCONFIGURED: 'misconfigured',
  UNKNOWN: 'unknown'
};

export const FIELD_TYPES = {
  TEXT: 'text',
  PASSWORD: 'password',
  URL: 'url',
  EMAIL: 'email',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  SELECT: 'select',
  TEXTAREA: 'textarea'
};

export const API_TEST_SUCCESS = 'connected';
// API ENDPOINTS
export const API_INTEGRATIONS_ENPOINT = 'api/integrations';
export const API_PAPERLESS_ENDPOINT = API_INTEGRATIONS_ENPOINT + '/paperless';
export const API_PAPRA_ENDPOINT = API_INTEGRATIONS_ENPOINT + '/papra';
export const API_HOMEASSISTANT_ENDPOINT = API_INTEGRATIONS_ENPOINT + '/homeassistant';