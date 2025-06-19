# DumbAssets Integration Guide

This guide explains how to add new third-party integrations to DumbAssets using our schema-driven architecture.

## Overview

DumbAssets uses a centralized integration system where:

- Integration classes define schemas and API routes
- UI is automatically generated from schemas
- Integration Manager handles registration and routing
- External Document Manager provides modular search

## Files That Need Updates

When adding a new integration, you need to modify these files:

1. **Create**: `/integrations/your-integration.js` - Main integration class
2. **Update**: `/src/constants.js` - Add API endpoint constant
3. **Update**: `/integrations/integrationManager.js` - Register integration
4. **Update**: `/public/managers/externalDocManager.js` - Add search support
5. **Create**: `/public/assets/integrations/your-integration/` - Assets folder
6. **Optional**: `/public/assets/css/your-integration-styles.css` - Custom styles

## Step 1: Create Integration Class

Create `/integrations/your-integration.js`:

```javascript
const {
  API_TEST_SUCCESS,
  API_YOUR_INTEGRATION_ENDPOINT,
} = require("../src/constants.js");

class YourIntegration {
  static SCHEMA = {
    id: "your-integration",
    name: "Your Integration Name",
    description: "Brief description",
    category: "document-management",
    icon: "/assets/integrations/your-integration/icon.png",
    logoHref: "/assets/integrations/your-integration/icon.png",
    colorScheme: "#your-brand-color",

    config: {
      enabled: {
        type: "boolean",
        label: "Enable Integration",
        default: false,
        required: true,
      },
      hostUrl: {
        type: "url",
        label: "Server URL",
        required: true,
      },
      apiToken: {
        type: "password",
        label: "API Token",
        required: true,
        sensitive: true,
      },
    },

    endpoints: {
      testConnection: "/api/integrations/your-integration/test",
      search: "/api/integrations/your-integration/search",
      download: "/api/integrations/your-integration/document/:id/download",
    },

    capabilities: {
      search: true,
      download: true,
    },
  };

  static registerRoutes(app, getSettings) {
    console.log("📄 Your Integration endpoints registered");

    app.get("/api/integrations/your-integration/test", async (req, res) => {
      try {
        const result = await YourIntegration.testConnection(getSettings);
        res.json(result);
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.get("/api/integrations/your-integration/search", async (req, res) => {
      try {
        const { searchQuery, pageIndex = 0, pageSize = 25 } = req.query;
        const result = await YourIntegration.searchDocuments(
          getSettings,
          searchQuery,
          parseInt(pageIndex),
          parseInt(pageSize)
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.get(
      "/api/integrations/your-integration/document/:id/download",
      async (req, res) => {
        try {
          const result = await YourIntegration.downloadDocument(
            getSettings,
            req.params.id
          );
          res.setHeader("Content-Type", result.contentType);
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${result.filename}"`
          );
          result.stream.pipe(res);
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      }
    );
  }

  static async testConnection(getSettings) {
    const settings = getSettings();
    const config = settings.integrations?.["your-integration"];

    if (!config?.enabled) {
      throw new Error("Integration not enabled");
    }

    // Test your API connection here
    return { success: true, message: "Connected successfully" };
  }

  static async searchDocuments(getSettings, searchQuery, pageIndex, pageSize) {
    const settings = getSettings();
    const config = settings.integrations?.["your-integration"];

    if (!config?.enabled) {
      throw new Error("Integration not enabled");
    }

    // Implement search logic
    return {
      documents: [],
      documentsCount: 0,
    };
  }

  static async downloadDocument(getSettings, documentId) {
    const settings = getSettings();
    const config = settings.integrations?.["your-integration"];

    if (!config?.enabled) {
      throw new Error("Integration not enabled");
    }

    // Implement download logic
    return {
      stream: null,
      filename: "document.pdf",
      contentType: "application/pdf",
    };
  }
}

module.exports = YourIntegration;
```

## Step 2: Add Constants

In `/src/constants.js`, add:

```javascript
export const API_YOUR_INTEGRATION_ENDPOINT =
  API_INTEGRATIONS_ENPOINT + "/your-integration";
```

## Step 3: Register in Integration Manager

In `/integrations/integrationManager.js`:

```javascript
// Add import
const YourIntegration = require("./your-integration");

// In registerBuiltInIntegrations()
this.registerIntegration("your-integration", YourIntegration.SCHEMA);

// In registerRoutes()
YourIntegration.registerRoutes(app, getSettings);
```

## Step 4: Add Search Support

In `/public/managers/externalDocManager.js`:

```javascript
// Add import
import { API_YOUR_INTEGRATION_ENDPOINT } from '../../src/constants.js';

// Add case in searchAllIntegrations()
case 'your-integration':
    return await this.searchYourIntegration(query, page);

// Add search method
async searchYourIntegration(query, page = 0) {
    const pageSize = this.currentAttachmentType ? Math.max(this.pageSize * 3, 50) : this.pageSize;

    const params = new URLSearchParams({
        pageIndex: page.toString(),
        pageSize: pageSize.toString()
    });

    if (query && query.trim()) {
        params.append('searchQuery', query.trim());
    }

    const searchEndpoint = `${globalThis.getApiBaseUrl()}/${API_YOUR_INTEGRATION_ENDPOINT}/search?${params.toString()}`;
    const response = await fetch(searchEndpoint);
    const responseValidation = await globalThis.validateResponse(response);
    if (responseValidation.errorMessage) throw new Error(responseValidation.errorMessage);

    const data = await response.json();

    return {
        results: (data.documents || []).map(doc => ({
            id: doc.id,
            title: doc.name,
            source: 'your-integration',
            downloadUrl: `${globalThis.getApiBaseUrl()}/${API_YOUR_INTEGRATION_ENDPOINT}/document/${doc.id}/download`,
            mimeType: doc.contentType || 'application/octet-stream',
            fileSize: doc.size,
            modified: doc.updatedAt,
            originalFileName: doc.name,
            attachedAt: new Date().toISOString()
        })),
        count: data.documentsCount || 0,
        next: null,
        previous: null
    };
}

// Update getSourceDisplayName()
getSourceDisplayName(sourceId) {
    const sourceNames = {
        'paperless': 'Paperless NGX',
        'papra': 'Papra',
        'your-integration': 'Your Integration Name'
    };
    return sourceNames[sourceId] || sourceId.charAt(0).toUpperCase() + sourceId.slice(1);
}
```

## Step 5: Add Assets

Create directory structure:

```
/public/assets/integrations/your-integration/
├── icon.png
```

## Step 6: Optional CSS

Create `/public/assets/css/your-integration-styles.css`:

```css
.your-integration-document {
  border-left: 3px solid #your-brand-color;
}

.your-integration-badge {
  background: #your-brand-color;
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 500;
}
```

Include in `/public/index.html`:

```html
<link rel="stylesheet" href="assets/css/your-integration-styles.css" />
```

## Schema Field Types

- `text` - Single line text
- `password` - Masked input
- `url` - URL with validation
- `number` - Numeric input
- `boolean` - Checkbox
- `select` - Dropdown
- `textarea` - Multi-line text

## Field Properties

- `type` - Input type
- `label` - Display name
- `description` - Help text
- `required` - Required field
- `sensitive` - Mask in UI
- `default` - Default value
- `validation` - Rules object

## Testing Checklist

- [ ] Test connection endpoint
- [ ] Test search functionality
- [ ] Test document download
- [ ] Test UI generation
- [ ] Test form validation
- [ ] Test error handling

## Example Integrations

Reference existing integrations:

- `paperless.js` - Paperless NGX
- `papra.js` - Papra

## Architecture Benefits

- Schema-driven UI generation
- Centralized integration management
- Consistent patterns across integrations
- Modular search system
- Easy extensibility
