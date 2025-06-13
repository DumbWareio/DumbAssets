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