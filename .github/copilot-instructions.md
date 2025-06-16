# Copilot Instructions for DumbAssets Project

- This document provides guidelines for using Copilot effectively in the DumbAssets project.
- It covers project conventions, architecture, and best practices to follow when writing code.
- The goal is to maintain a consistent codebase that is easy to read, understand, and maintain.
- Copilot should assist in generating code that adheres to these conventions and patterns.

# DumbAssets Architecture & Conventions

## Project Philosophy

- Keep code simple, smart, and follow best practices
- Don't over-engineer for the sake of engineering
- Use standard conventions and patterns
- Write human-readable code
- Keep it simple so the app just works
- Follow the principle: "Make it work, make it right, make it fast"
- Comments should explain "why" behind the code in more complex functions
- Overcommented code is better than undercommented code

## Commit Conventions

- Use Conventional Commits format:
  - feat: new features
  - fix: bug fixes
  - docs: documentation changes
  - style: formatting, missing semi colons, etc.
  - refactor: code changes that neither fix bugs nor add features
  - test: adding or modifying tests
  - chore: updating build tasks, package manager configs, etc.
- Each commit should be atomic and focused
- Write clear, descriptive commit messages

## Project Structure

### Root Directory

- Keep root directory clean with only essential files
- Production configuration files in root:
  - docker-compose.yml
  - Dockerfile
  - package.json
  - README.md
  - server.js (main application server)
  - nodemon.json (development configuration)

### Backend Structure

- server.js: Main Express server with all API routes
- middleware/: Custom middleware modules
  - cors.js: CORS configuration
  - demo.js: Demo mode middleware
- data/: JSON file storage
  - Assets.json: Main asset data
  - SubAssets.json: Sub-asset data
  - Images/, Manuals/, Receipts/: File uploads

### Frontend Structure (/public)

- All client-side code in /public directory
- **Manager Pattern**: Feature-specific classes in `/public/managers/`
  - globalHandlers.js: Global utilities (toaster, error logging, API calls)
  - dashboardManager.js: Dashboard rendering and charts
  - modalManager.js: Modal operations for assets/sub-assets
  - settingsManager.js: Settings modal and configuration
  - import.js: Import functionality and file processing
  - maintenanceManager.js: Maintenance event management
  - charts.js: Chart.js wrapper and chart management
  - toaster.js: Toast notification system

### Services Architecture (/src/services)

- **fileUpload/**: Modular file upload system
  - index.js: Main export interface
  - fileUploader.js: Core upload logic
  - init.js: Easy initialization
  - utils.js: Upload utilities
  - example.js: Usage examples
- **notifications/**: Apprise notification system
  - appriseNotifier.js: Apprise CLI integration
  - notificationQueue.js: Queue management
  - warrantyCron.js: Scheduled notifications
  - utils.js: Notification utilities
- **render/**: Rendering services
  - assetRenderer.js: Asset detail rendering
  - listRenderer.js: Asset list and search
  - previewRenderer.js: File preview generation
  - syncHelper.js: State synchronization
  - index.js: Service exports

### Helper Modules (/public/helpers)

- utils.js: General utility functions (generateId, formatDate, formatCurrency)
- paths.js: Path management utilities
- serviceWorkerHelper.js: PWA service worker management

### UI Enhancement (/public/js)

- collapsible.js: Collapsible section functionality
- datepicker-enhancement.js: Enhanced date input UX

# Documentation

- Main README.md in root focuses on production deployment
- Each service module has its own README.md with usage examples
- Code must be self-documenting with clear naming
- Complex logic must include comments explaining "why" not "what"
- JSDoc comments for public functions and APIs
- File headers must explain module purpose and key functionality

# Module System & ES6

- Use ES6 modules with import/export syntax
- Each manager class should be in its own file
- Services should be modular and reusable
- Use named exports for utilities, default exports for main classes
- Import statements at the top of files
- Dynamic imports only when necessary for performance

# Manager Pattern (/public/managers)

- Each major feature has its own manager class
- Manager classes handle feature-specific logic and DOM manipulation
- Managers should not directly manipulate other managers' DOM elements
- Use dependency injection for shared utilities
- Manager constructors should accept configuration objects
- Each manager should have clear initialization and cleanup methods

# Service Architecture (/src/services)

- Services are backend utilities that can be used across the application
- Each service directory should have:
  - index.js: Main export interface
  - README.md: Documentation and examples
  - Specific implementation files
- Services should be stateless when possible
- Use consistent error handling across services

# Global Handlers Pattern

- globalHandlers.js centralizes common frontend functionality
- Exposes utilities to globalThis for app-wide access:
  - globalThis.validateResponse: API response validation
  - globalThis.toaster: Toast notifications
  - globalThis.logError: Error logging with toast
  - globalThis.getApiBaseUrl: Environment-aware API URLs
- Must be instantiated early in script.js
- All async API calls should use validateResponse pattern

# File Upload System

- Modular file upload service in /src/services/fileUpload/
- Supports drag-and-drop, previews, and validation
- Consistent API across different file types (images, receipts, manuals)
- Use setupFilePreview for standard implementation
- File validation by type and size
- Preview generation for images and documents

# PWA & Service Worker

- Service worker for offline functionality and caching
- Manifest generation for PWA capabilities
- Version management for cache invalidation
- App configuration in config.js
- Service worker helper for registration and updates

# Notification System

- Apprise-based notification system for external alerts
- Queue management to prevent notification spam
- Cron-based warranty expiration notifications
- Timezone-aware scheduling with Luxon
- Sanitized message formatting

# Chart Integration

- Chart.js wrapper in managers/charts.js
- Centralized chart creation and updates
- Theme-aware chart styling
- Responsive chart configuration

# Theme System

- CSS custom properties for theme variables
- data-theme attribute on html element
- Theme persistence in localStorage
- System theme preference detection
- Consistent color scheme:
  - Light theme: #ffffff bg, #1a1a1a text, #2563eb primary
  - Dark theme: #1a1a1a bg, #ffffff text, #3b82f6 primary
- Theme toggle on all pages

# Security & Authentication

- PIN-based authentication system
- Session management with express-session
- Helmet security middleware
- CORS configuration in middleware/cors.js
- PIN input requirements:
  - type="password" fields
  - Numeric validation
  - Paste support
  - Auto-advance and backspace navigation
- Brute force protection:
  - Attempt limits and lockouts
  - Constant-time comparison
- Secure cookie configuration

# Data Management

- JSON file-based storage (Assets.json, SubAssets.json)
- File uploads organized by type (Images/, Manuals/, Receipts/)
- Import/export functionality for data migration
- Utility functions for ID generation, date/currency formatting
- State synchronization between components

# API Patterns

- RESTful API endpoints in server.js
- Consistent error response format
- File upload handling with multer
- Demo mode middleware for testing
- Environment-aware base URL handling

# UI Enhancement

- Collapsible sections with consistent API
- Enhanced date picker with clear functionality
- Drag-and-drop file uploads
- Responsive design patterns
- Loading states and user feedback

# Error Handling

- Global error logging with globalThis.logError
- Toast notifications for user feedback
- Console logging in debug mode
- Graceful degradation for missing features
- Validation at both client and server levels

# Development Workflow

- nodemon for development server
- Docker configuration for production
- Environment variable support
- Debug mode controlled by window.appConfig.debug
- Maintenance notification testing scripts

# Code Style

- Use meaningful variable and function names
- Keep functions small and focused (under 50 lines when possible)
- Maximum line length: 100 characters
- Use modern JavaScript features appropriately
- Prefer clarity over cleverness
- Add logging when DEBUG environment variable is true
- Use async/await for promises
- Handle errors explicitly, don't ignore them

# Frontend Architecture Patterns

## Global Handlers Implementation

- globalHandlers class instantiated at the very top of script.js
- Provides 4 key global utilities:
  1. `globalThis.validateResponse` - API response validation
     - Checks status codes and error messages
     - Returns errorMessage if validation fails
     - Used before all API response processing
  2. `globalThis.toaster` - Toast notification system
     - `show(message, type='success', isStatic=false, timeoutMs=3000)`
     - Centralized user feedback mechanism
  3. `globalThis.logError` - Global error logging
     - `logError(message, error, keepOpen=false, toastTimeout=3000)`
     - Automatically console.error and toast notifications
  4. `globalThis.getApiBaseUrl` - Environment-aware API URLs
     - Ensures correct base URL for all API calls

## API Call Pattern

```javascript
try {
  const response = await fetch(`${globalThis.getApiBaseUrl()}/api/endpoint`);
  const responseValidation = await globalThis.validateResponse(response);
  if (responseValidation.errorMessage) {
    throw new Error(responseValidation.errorMessage);
  }
  // Process successful response
} catch (error) {
  globalThis.logError("Custom error message:", error.message);
}
```

## Manager Class Structure

- Constructor accepts configuration object with dependencies
- Each manager handles specific feature domain
- Managers should not manipulate other managers' DOM elements
- Use `_bindEvents()` method for event listener setup
- Provide public methods for external interaction
- Include cleanup methods for proper teardown

## File Upload Patterns

- Use `initializeFileUploads()` for standard setup
- Each file type (images, receipts, manuals) has consistent API
- Drag-and-drop with validation built-in
- Preview generation for all supported file types
- Global delete flags for file removal state

## State Management

- State synchronization through syncHelper.js
- Use updateState functions for cross-module updates
- Maintain single source of truth for asset data
- Sync selected IDs and filter states across components

## Component Initialization

- DOM-ready event listener in main script.js
- Initialize global handlers first
- Load configuration and check authentication
- Initialize service worker for PWA
- Set up theme system early
- Initialize managers in dependency order

## CSS and Theming

- Use CSS custom properties (--variable-name)
- data-theme attribute on html element
- Theme values stored in localStorage
- Consistent naming: --bg-color, --text-color, --primary-color
- Dark/light theme toggle with system preference detection

## PWA Implementation

- Service worker with versioned caching
- Manifest generation via scripts/pwa-manifest-generator.js
- Cache invalidation on version updates
- Offline functionality with cached resources
- Version checking via service worker messaging

## Maintenance & Notifications

- Cron-based warranty expiration checking
- Apprise integration for external notifications
- Queue management to prevent notification spam
- Timezone-aware scheduling with Luxon
- Sanitized message formatting for security

## Integration System

### Adding New Integrations

DumbAssets uses a schema-driven integration system that automatically generates UI and handles configuration management. Here's how to add a new integration:

#### 1. Backend Integration Setup

**Create Integration File** (`/integrations/your-integration.js`):

```javascript
/**
 * Your Integration for DumbAssets
 * Provides integration with YourService for document/asset management
 */

class YourIntegration {
  static SCHEMA = {
    id: "your-integration",
    name: "Your Integration",
    description: "Connect to YourService for enhanced asset management",
    category: "document-management", // or 'inventory', 'storage', etc.
    configSchema: {
      baseUrl: {
        type: "url",
        label: "Base URL",
        placeholder: "https://your-service.example.com",
        required: true,
        helpText: "Base URL of your service instance",
      },
      apiToken: {
        type: "password",
        label: "API Token",
        placeholder: "Enter your API token",
        required: true,
        sensitive: true, // Will be masked with TOKENMASK
        helpText: "API token from your service settings",
      },
    },
    defaultConfig: {
      baseUrl: "",
      apiToken: "",
      timeout: 10000,
    },
    endpoints: {
      testConnection: "/api/integrations/your-integration/test",
      search: "/api/integrations/your-integration/search",
    },
    validators: {
      baseUrl: (value) => {
        if (!value) return "Base URL is required";
        try {
          new URL(value);
          return null;
        } catch {
          return "Please enter a valid URL";
        }
      },
      apiToken: (value) => {
        if (!value) return "API token is required";
        if (value === "TOKENMASK") return null; // Allow masked tokens
        if (value.length < 10) return "API token seems too short";
        return null;
      },
    },
    statusCheck: {
      endpoint: "/status",
      method: "GET",
      expectedStatus: 200,
    },
  };

  static async testConnection(config) {
    // Implementation for testing connection
    try {
      const response = await fetch(`${config.baseUrl}/api/status`, {
        headers: { Authorization: `Token ${config.apiToken}` },
        timeout: config.timeout || 10000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return { success: true, message: "Connection successful" };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  static registerRoutes(app) {
    // Register API routes
    app.get("/api/integrations/your-integration/test", async (req, res) => {
      try {
        const config = req.body.config || req.query;
        const result = await YourIntegration.testConnection(config);
        res.json(result);
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.post("/api/integrations/your-integration/search", async (req, res) => {
      // Implementation for search functionality
      try {
        const { config, query } = req.body;
        const results = await YourIntegration.searchDocuments(config, query);
        res.json({ success: true, data: results });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });
  }

  static async searchDocuments(config, query) {
    // Implementation for document search
    // Return standardized format for asset linking
  }
}

module.exports = YourIntegration;
```

**Register Integration** in `/integrations/integrationManager.js`:

```javascript
// Add to registerBuiltInIntegrations method
registerBuiltInIntegrations() {
  // ...existing integrations...
  this.registerIntegration(require('./your-integration'));
}
```

**Register Routes** in `server.js`:

```javascript
// Add after existing integration routes
YourIntegration.registerRoutes(app);
```

#### 2. Frontend Integration (Automatic)

The frontend automatically:

- Loads integration from `/api/integrations` endpoint
- Generates UI based on `configSchema`
- Handles form validation using `validators`
- Provides test connection functionality
- Manages configuration persistence

**Optional: Custom Styles** (`/public/assets/css/your-integration-styles.css`):

```css
/* Integration-specific styles if needed */
.integration-your-integration .custom-element {
  /* Your custom styling */
}
```

#### 3. Integration Schema Reference

**Config Schema Field Types:**

- `text`: Basic text input
- `password`: Masked input for sensitive data
- `url`: URL input with validation
- `number`: Numeric input
- `select`: Dropdown with options
- `checkbox`: Boolean checkbox
- `textarea`: Multi-line text input

**Required Schema Properties:**

- `id`: Unique integration identifier
- `name`: Display name
- `description`: User-friendly description
- `category`: Groups integrations in UI
- `configSchema`: Field definitions for configuration
- `defaultConfig`: Default values for configuration
- `endpoints`: API endpoint mappings
- `validators`: Field validation functions
- `statusCheck`: Health check configuration

**Sensitive Field Handling:**

- Mark fields with `sensitive: true`
- Use `TOKENMASK` for masked values
- Implement proper validation for masked tokens

#### 4. Integration Categories

Standard categories for organization:

- `document-management`: Document storage and retrieval
- `inventory`: Inventory management systems
- `storage`: Cloud storage services
- `notification`: Alert and notification services
- `backup`: Backup and sync services

#### 5. Error Handling Standards

- Use consistent error response format: `{ success: false, message: 'Error description' }`
- Implement proper timeout handling (default: 10000ms)
- Provide meaningful error messages for users
- Log detailed errors server-side for debugging

#### 6. Testing Integration

- Implement `testConnection` method for connectivity validation
- Use `/scripts/test-maintenance-notifications.js` pattern for testing
- Test both valid and invalid configurations
- Verify error handling and timeout scenarios

#### 7. Integration Manager API

The integration manager provides:

- `getIntegrations()`: Get all registered integrations
- `getIntegration(id)`: Get specific integration
- `validateConfig(id, config)`: Validate configuration
- `sanitizeConfig(id, config)`: Sanitize sensitive fields
- `testIntegration(id, config)`: Test integration connection

### Integration Development Checklist

**Backend:**

- [ ] Create integration class in `/integrations/`
- [ ] Define complete SCHEMA with all required properties
- [ ] Implement `testConnection` static method
- [ ] Register routes with proper error handling
- [ ] Add to integrationManager registration
- [ ] Add route registration in server.js

**Frontend:**

- [ ] Test UI generation from schema
- [ ] Verify form validation works correctly
- [ ] Test connection functionality
- [ ] Add custom styles if needed

**Testing:**

- [ ] Test valid configuration scenarios
- [ ] Test invalid configuration handling
- [ ] Verify sensitive field masking
- [ ] Test timeout and error scenarios
- [ ] Validate API endpoint responses

**Documentation:**

- [ ] Add integration-specific documentation
- [ ] Update relevant README files
- [ ] Document any special configuration requirements
