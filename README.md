# DumbAssets

A stupid simple asset tracker for keeping track of your physical assets and their components.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Configuration](#configuration)
- [Security](#security)
- [Technical Details](#technical-details)
- [Contributing](#contributing)
- [License](#license)

---

## Quick Start

### Prerequisites

- Docker (recommended)
- Node.js >=14.0.0 (for local development)

### Option 1: Docker (For Dummies)

```sh
docker run -p 3000:3000 -v ./data:/app/data dumbwareio/dumbassets:latest
```

1. Go to [http://localhost:3000](http://localhost:3000)
2. Add assets, upload photos/receipts, and track warranties
3. Celebrate how dumb easy this was

### Option 2: Docker Compose (For Dummies who like customizing)

Create a `docker-compose.yml` file:

```yaml
services:
  dumbassets:
    container_name: dumbassets
    image: dumbwareio/dumbassets:latest
    ports: 
      - 3000:3000
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    environment:
      PORT: ${DUMBASSETS_PORT:-3000}
      NODE_ENV: ${DUMBASSETS_NODE_ENV:-production}
      DEBUG: ${DUMBASSETS_DEBUG:-true}
      SITE_TITLE: ${DUMBASSETS_SITE_TITLE:-DumbAssets}
      BASE_URL: ${DUMBASSETS_BASE_URL:-http://localhost:3000}
      DUMBASSETS_PIN: ${DUMBASSETS_PIN:-1234}
      ALLOWED_ORIGINS: ${DUMBASSETS_ALLOWED_ORIGINS:-*}
      APPRISE_URL: ${DUMBASSETS_APPRISE_URL:-}
      DEMO_MODE: ${DUMBASSETS_DEMO_MODE:-false}
      # ...other env vars
```

Then run:

```sh
docker compose up -d
```

1. Go to [http://localhost:3000](http://localhost:3000)
2. Add and manage your assets

### Option 3: Running Locally (For Developers)

```sh
git clone https://github.com/yourusername/DumbAssets.git
cd DumbAssets
npm install
npm start
```

Open your browser to [http://localhost:3000](http://localhost:3000)

---

## Features

- 🚀 Track assets with detailed info (model, serial, warranty, etc.)
- 🧩 Add components and sub-components
- 🖼️ Upload and store photos and receipts
- 🔍 Search by name, model, serial, or description
- 🏷️ Hierarchical organization of components
- 📅 Warranty expiration notifications (configurable)
- 🔔 Apprise notification integration
- 🌗 Light/Dark mode with theme persistence
- 🛡️ PIN authentication with brute force protection
- 📦 Docker support for easy deployment
- 🔒 **Demo Mode**: Read-only demonstration mode for showcasing
- **Direct Asset Linking**: Notifications now include clickable links that directly open the specific asset in your browser

## Demo Mode

Demo mode provides a read-only version of DumbAssets perfect for demonstrations, showcasing, or public instances. When enabled:

- **Backend**: All modifying HTTP methods (POST, PUT, DELETE, PATCH) are blocked
- **Frontend**: All buttons, forms, and file uploads are disabled
- **Visual Indicators**: Clear "DEMO" badge and notices inform users of the read-only state
- **User Experience**: Friendly messages explain why actions are disabled

### Enabling Demo Mode

Set the environment variable:
```bash
DEMO_MODE=true
```

Or in Docker Compose:
```yaml
environment:
  DEMO_MODE: true
```

When demo mode is active, the site title will automatically include "(DEMO)" and users will see visual indicators throughout the interface.

## Direct Asset Linking

When you receive notifications (warranty expiring, asset added/edited, maintenance due), they now include direct links to view the specific asset. Simply click the "🔗 View Asset" link in the notification to be taken directly to that asset's details page.

### URL Format
- Main assets: `yoursite.com?ass=asset-id`  
- Sub-assets: `yoursite.com?ass=parent-id&sub=sub-asset-id`

### Configuration
To use this feature, set the `BASE_URL` environment variable to your domain:
```bash
BASE_URL=https://assets.yourcompany.com
```

If not set, it defaults to `http://localhost:3000`.

---

## Configuration

### Environment Variables

| Variable         | Description                                 | Default            | Required |
|------------------|---------------------------------------------|--------------------|----------|
| PORT             | Server port                                 | 3000               | No       |
| DUMBASSETS_PIN   | PIN protection (4+ digits)                  | None               | No       |
| DEMO_MODE        | Enable read-only demo mode                  | false              | No       |
| APPRISE_URL      | Apprise URL for notifications               | None               | No       |
| TZ               | Container timezone                          | America/Chicago    | No       |
| BASE_URL         | Base URL for the application                | http://localhost   | No       |
| SITE_TITLE       | Site title shown in browser tab and header  | DumbAssets         | No       |
| ALLOWED_ORIGINS  | Origins allowed to visit your instance      | '*'                | No       |

### Data Storage

All data is stored in JSON files in the `/data` directory:

- `/data/Assets.json` - All asset data
- `/data/SubAssets.json` - All component data
- `/data/Images` - Uploaded photos
- `/data/Receipts` - Uploaded receipts
- `/data/config.json` - Notification and app config

---

## Security

- Variable-length PIN support (4+ digits)
- Constant-time PIN comparison
- Brute force protection (lockout after too many attempts)
- Secure session cookies
- No client-side PIN storage
- Rate limiting

---

## Technical Details

- **Backend:** Node.js (>=14.0.0) with Express
- **Frontend:** Vanilla JavaScript (ES6+)
- **Container:** Docker with Alpine base
- **Notifications:** Apprise integration (via Python)
- **Uploads:** Multer for file handling
- **Scheduling:** node-cron for warranty notifications

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See the Development Guide for local setup and guidelines.

---

Made with ❤️ by DumbWare.io 
