# DumbAssets
A stupid simple asset tracker for keeping track of your physical assets, their components, and applicable warranties and routine maintenance.

<p align="center">
  <img width=75% src="https://github.com/user-attachments/assets/ec310325-c3e4-4fc1-ba53-5cca5cd74c85" />
</p>

<p align="center">
  <a href="https://dumbassets.dumbware.io" target="_blank">Demo</a>
</p>

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
    restart: unless-stopped
    ports: 
      - ${DUMBASSETS_PORT:-3000}:3000
    volumes:
      - ${DUMBASSETS_DATA_PATH:-./data}:/app/data
    environment:
      NODE_ENV: ${DUMBASSETS_NODE_ENV:-production}
      DEBUG: ${DUMBASSETS_DEBUG:-true}
      SITE_TITLE: ${DUMBASSETS_SITE_TITLE:-DumbAssets}
      BASE_URL: ${DUMBASSETS_BASE_URL:-http://localhost:3000}
      DUMBASSETS_PIN: ${DUMBASSETS_PIN:-1234}
      ALLOWED_ORIGINS: ${DUMBASSETS_ALLOWED_ORIGINS:-*}
      APPRISE_URL: ${DUMBASSETS_APPRISE_URL:-}
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
- 🔧 Maintenance event notifications
- 🏷️ Flexible tagging system for better organization
- 🔔 Built in Apprise notification integration
- 🌗 Light/Dark mode with theme persistence
- 🛡️ PIN authentication with brute force protection
- 📦 Docker support for easy deployment
- 🔗 Direct Asset Linking: Notifications include links to the specific asset

## Configuration

### Environment Variables

| Variable         | Description                                 | Default            | Required |
|------------------|---------------------------------------------|--------------------|----------|
| PORT             | Server port                                 | 3000               | No       |
| DUMBASSETS_PIN   | PIN protection (4+ digits)                  | None               | No       |
| APPRISE_URL      | Apprise URL for notifications               | None               | No       |
| TZ               | Container timezone                          | America/Chicago    | No       |
| BASE_URL         | Base URL for the application                | http://localhost   | No       |
| SITE_TITLE       | Site title shown in browser tab and header  | DumbAssets         | No       |
| ALLOWED_ORIGINS  | Origins allowed to visit your instance      | '*'                | No       |
| DEMO_MODE        | Enables read-only mode                      | false              | No       |

> [!TIP]
> Apprise integration is built-in to DumbAssets, allowing you to simply add your Discord/ntfy/Telegram/etc link WITHOUT having to run Apprise as a separate service!

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

### Stack

- **Backend:** Node.js (>=14.0.0) with Express
- **Frontend:** Vanilla JavaScript (ES6+)
- **Container:** Docker with Alpine base
- **Notifications:** Apprise integration (via Python)
- **Uploads:** Multer for file handling
- **Scheduling:** node-cron for warranty & Maintenance notifications

### Dependencies
- **express**: Web framework for Node.js
- **multer**: File upload handling and multipart/form-data parsing
- **apprise**: Notification system integration for alerts
- **cors**: Cross-origin resource sharing middleware
- **dotenv**: Environment variable configuration management
- **express-rate-limit**: Rate limiting middleware for API protection
- **express-session**: Session management and authentication
- **cookie-parser**: Cookie parsing middleware
- **node-cron**: Task scheduling for notifications
- **uuid**: Unique ID generation for assets
- **sharp**: Image processing and optimization
- **compression**: Response compression middleware
- **helmet**: Security headers middleware
- **fs-extra**: Enhanced filesystem operations
- **path**: Path manipulation utilities

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See the Development Guide for local setup and guidelines.

---

Made with ❤️ by [DumbWare.io](https://dumbware.io)
