/**
 * DumbAssets - Asset Tracking Application
 * Server implementation for handling API requests and file operations
 */

// --- SECURITY & CONFIG IMPORTS ---
require('dotenv').config();
// console.log('process.env:', process.env);
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const crypto = require('crypto');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');
const { sendNotification } = require('./src/services/notifications/appriseNotifier');
const { startWarrantyCron } = require('./src/services/notifications/warrantyCron');
const { generatePWAManifest } = require("./scripts/pwa-manifest-generator");
const { originValidationMiddleware, getCorsOptions } = require('./middleware/cors');
const packageJson = require('./package.json');

const app = express();
const PORT = process.env.PORT || 3000;
const DEBUG = process.env.DEBUG === 'TRUE';
const NODE_ENV = process.env.NODE_ENV || 'production';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const DEMO_MODE = process.env.DEMO_MODE === 'true';
const SITE_TITLE = DEMO_MODE ? `${process.env.SITE_TITLE || 'DumbAssets'} (DEMO)` : (process.env.SITE_TITLE || 'DumbAssets');
const PUBLIC_DIR = path.join(__dirname, 'public');
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');
const VERSION = packageJson.version;

generatePWAManifest(SITE_TITLE);
// Set timezone from environment variable or default to America/Chicago
process.env.TZ = process.env.TZ || 'America/Chicago';

function debugLog(...args) {
    if (DEBUG) {
        console.log('[DEBUG]', ...args);
    }
}

// --- BASE PATH & PIN CONFIG ---
const BASE_PATH = (() => {
    if (!BASE_URL) {
        debugLog('No BASE_URL set, using empty base path');
        return '';
    }
    try {
        const url = new URL(BASE_URL);
        const path = url.pathname.replace(/\/$/, '');
        debugLog('Base URL Configuration:', {
            originalUrl: BASE_URL,
            extractedPath: path,
            protocol: url.protocol,
            hostname: url.hostname
        });
        return path;
    } catch {
        const path = BASE_URL.replace(/\/$/, '');
        debugLog('Using direct path as BASE_URL:', path);
        return path;
    }
})();
const projectName = packageJson.name.toUpperCase().replace(/-/g, '_');
const PIN = process.env.DUMBASSETS_PIN;
console.log('PIN:', PIN);
if (!PIN || PIN.trim() === '') {
    debugLog('PIN protection is disabled');
} else {
    debugLog('PIN protection is enabled, PIN length:', PIN.length);
}

// --- BRUTE FORCE PROTECTION ---
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000;
function resetAttempts(ip) { loginAttempts.delete(ip); }
function isLockedOut(ip) {
    const attempts = loginAttempts.get(ip);
    if (!attempts) return false;
    if (attempts.count >= MAX_ATTEMPTS) {
        const timeElapsed = Date.now() - attempts.lastAttempt;
        if (timeElapsed < LOCKOUT_TIME) return true;
        resetAttempts(ip);
    }
    return false;
}
function recordAttempt(ip) {
    const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    attempts.count += 1;
    attempts.lastAttempt = Date.now();
    loginAttempts.set(ip, attempts);
}

// --- SECURITY MIDDLEWARE ---
app.use(helmet({
  noSniff: true, // Prevent MIME type sniffing
  frameguard: { action: 'deny' }, // Prevent clickjacking
  hsts: { maxAge: 31536000, includeSubDomains: true }, // Enforce HTTPS for one year
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  referrerPolicy: { policy: 'no-referrer-when-downgrade' }, // Set referrer policy
  ieNoOpen: true, // Prevent IE from executing downloads
  // Disabled Helmet middlewares:
  contentSecurityPolicy: false, // Disable CSP for now
  dnsPrefetchControl: true, // Disable DNS prefetching
  permittedCrossDomainPolicies: false,
  originAgentCluster: false,
  xssFilter: false,
}));
app.use(express.json());
app.set('trust proxy', 1);
app.use(cors(getCorsOptions(BASE_URL)));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: (BASE_URL.startsWith('https') && NODE_ENV === 'production'),
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// --- AUTHENTICATION MIDDLEWARE FOR ALL PROTECTED ROUTES ---
app.use(BASE_PATH, (req, res, next) => {
    // List of paths that should be publicly accessible
    const publicPaths = [
        '/login',
        '/pin-length',
        '/verify-pin',
        '/config.js',
        '/assets/',
        '/styles.css',
        '/manifest.json',
        '/asset-manifest.json',
    ];

    // Check if the current path matches any of the public paths
    if (publicPaths.some(path => req.path.startsWith(path))) {
        return next();
    }

    // For all other paths, apply both origin validation and auth middleware
    originValidationMiddleware(req, res, () => {
        authMiddleware(req, res, next);
    });
});

// --- PIN VERIFICATION ---
function verifyPin(storedPin, providedPin) {
    if (!storedPin || !providedPin) return false;
    if (storedPin.length !== providedPin.length) return false;
    try {
        return crypto.timingSafeEqual(Buffer.from(storedPin), Buffer.from(providedPin));
    } catch { return false; }
}

// --- AUTH MIDDLEWARE ---
function authMiddleware(req, res, next) {
    debugLog('Auth check for path:', req.path, 'Method:', req.method);
    if (!PIN || PIN.trim() === '') return next();

    const pinCookie = req.cookies[`${projectName}_PIN`];
    if (req.session.authenticated || verifyPin(PIN, pinCookie)) {
        debugLog('Auth successful - Valid cookie found');
        req.session.authenticated = true;
        return next();
    }

    if (req.path.startsWith('/api/') || req.xhr) {
        req.session.authenticated = false;
        // Return JSON error for API requests
        return res.status(401).json({ 
            error: 'Authentication required', 
            redirectTo: BASE_PATH + '/login'
        });
    } else {
        req.session.authenticated = false;
        // Preserve the original URL with query parameters for post-login redirect
        const originalUrl = req.originalUrl;
        const loginUrl = `${BASE_PATH}/login${originalUrl ? `?returnTo=${encodeURIComponent(originalUrl)}` : ''}`;
        debugLog('Redirecting to login with return URL:', loginUrl);
        return res.redirect(loginUrl);
    }
};

// --- STATIC FILES & CONFIG ---
app.get(BASE_PATH + '/config.js', async (req, res) => {
    debugLog('Serving config.js with basePath:', BASE_PATH);
    
    // Set proper MIME type
    res.setHeader('Content-Type', 'application/javascript');
    
    // First send the dynamic config
    res.write(`
        window.appConfig = {
            basePath: '${BASE_PATH}',
            debug: ${DEBUG},
            siteTitle: '${SITE_TITLE}',
            version: '${VERSION}',
        };
    `);
    
    // Then append the static config.js content
    try {
        const staticConfig = await fs.promises.readFile(path.join(__dirname, 'public', 'config.js'), 'utf8');
        res.write('\n\n' + staticConfig);
    } catch (error) {
        console.error('Error reading static config.js:', error);
    }
    
    res.end();
});

// Dynamic service worker with correct version
app.get(BASE_PATH + '/service-worker.js', async (req, res) => {
    debugLog('Serving service-worker.js with version:', VERSION);
    
    // Set proper MIME type
    res.setHeader('Content-Type', 'application/javascript');
    
    try {
        let swContent = await fs.promises.readFile(path.join(__dirname, 'public', 'service-worker.js'), 'utf8');
        
        // Replace the version initialization with the actual version from package.json
        swContent = swContent.replace(
            /let APP_VERSION = ".*?";/,
            `let APP_VERSION = "${VERSION}";`
        );
        
        res.write(swContent);
        res.end();
    } catch (error) {
        console.error('Error reading service-worker.js:', error);
        res.status(500).send('Error loading service worker');
    }
});

// Serve static files for public assets
app.use(BASE_PATH + '/', express.static(path.join(PUBLIC_DIR)));
app.get(BASE_PATH + "/manifest.json", (req, res) => {
    res.sendFile(path.join(ASSETS_DIR, "manifest.json"));
});
app.get(BASE_PATH + "/asset-manifest.json", (req, res) => {
    res.sendFile(path.join(ASSETS_DIR, "asset-manifest.json"));
});

// Unprotected routes and files (accessible without login)
app.get(BASE_PATH + '/login', (req, res) => {
    // If no PIN is set, redirect to return URL or main page (preserving any asset parameters)
    if (!PIN || PIN.trim() === '') {
        const returnTo = req.query.returnTo || (BASE_PATH + '/');
        debugLog('No PIN set, redirecting to:', returnTo);
        return res.redirect(returnTo);
    }
    
    // If already authenticated, redirect to return URL or main page
    if (req.session.authenticated) {
        const returnTo = req.query.returnTo || (BASE_PATH + '/');
        debugLog('Already authenticated, redirecting to:', returnTo);
        return res.redirect(returnTo);
    }
    
    // Store the return URL in the session if provided
    if (req.query.returnTo) {
        req.session.returnTo = req.query.returnTo;
        debugLog('Stored return URL in session:', req.query.returnTo);
    }
    
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get(BASE_PATH + '/pin-length', (req, res) => {
    if (!PIN || PIN.trim() === '') return res.json({ length: 0 });
    res.json({ length: PIN.length });
});

app.post(BASE_PATH + '/verify-pin', (req, res) => {
    debugLog('PIN verification attempt from IP:', req.ip);
    
    // If no PIN is set, authentication is successful
    if (!PIN || PIN.trim() === '') {
        debugLog('PIN verification bypassed - No PIN configured');
        req.session.authenticated = true;
        
        // Get the return URL from session, or default to main page
        const returnTo = req.session.returnTo || (BASE_PATH + '/');
        
        // Clear the return URL from session
        delete req.session.returnTo;
        
        debugLog('No PIN set, redirecting to:', returnTo);
        
        // Redirect to the intended destination
        return res.redirect(returnTo);
    }

    // Check if IP is locked out
    const ip = req.ip;
    if (isLockedOut(ip)) {
        const attempts = loginAttempts.get(ip);
        const timeLeft = Math.ceil((LOCKOUT_TIME - (Date.now() - attempts.lastAttempt)) / 1000 / 60);
        debugLog('PIN verification blocked - IP is locked out:', ip);
        return res.status(429).json({ 
            error: `Too many attempts. Please try again in ${timeLeft} minutes.`
        });
    }

    const { pin } = req.body;
    if (!pin || typeof pin !== 'string') {
        debugLog('PIN verification failed - Invalid PIN format');
        return res.status(400).json({ error: 'Invalid PIN format' });
    }

    // Verify PIN first
    const isPinValid = verifyPin(PIN, pin);
    if (isPinValid) {
        debugLog('PIN verification successful');
        // Reset attempts on successful login
        resetAttempts(ip);
        
        // Set authentication in session immediately
        req.session.authenticated = true;
        
        // Set secure cookie
        res.cookie(`${projectName}_PIN`, pin, {
            httpOnly: true,
            secure: req.secure || (BASE_URL.startsWith('https') && NODE_ENV === 'production'),
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });
        
        // Get the return URL from session, or default to main page
        const returnTo = req.session.returnTo || (BASE_PATH + '/');
        
        // Clear the return URL from session
        delete req.session.returnTo;
        
        debugLog('Redirecting after successful login to:', returnTo);
        
        // Redirect to the intended destination
        res.redirect(returnTo);
    } else {
        debugLog('PIN verification failed - Invalid PIN');
        // Record failed attempt
        recordAttempt(ip);
        
        const attempts = loginAttempts.get(ip);
        const attemptsLeft = MAX_ATTEMPTS - attempts.count;
        
        res.status(401).json({ 
            error: 'Invalid PIN',
            attemptsLeft: Math.max(0, attemptsLeft)
        });
    }
});

// Login page static assets (need to be accessible without authentication)
app.use(BASE_PATH + '/styles.css', express.static('public/styles.css'));
app.use(BASE_PATH + '/script.js', express.static('public/script.js'));

// Module files (need to be accessible for imports)
app.use(BASE_PATH + '/src/services/fileUpload', express.static('src/services/fileUpload'));
app.use(BASE_PATH + '/src/services/render', express.static('src/services/render'));

// Serve Chart.js from node_modules
app.use(BASE_PATH + '/js/chart.js', express.static('node_modules/chart.js/dist/chart.umd.js'));

// Serve uploaded files
app.use(BASE_PATH + '/Images', express.static('data/Images'));
app.use(BASE_PATH + '/Receipts', express.static('data/Receipts'));
app.use(BASE_PATH + '/Manuals', express.static('data/Manuals'));

// Protected API routes
app.use('/api', (req, res, next) => {
    console.log(`API Request: ${req.method} ${req.path}`);
    next();
});

// --- ASSET MANAGEMENT (existing code preserved) ---
// File paths
const assetsFilePath = path.join(__dirname, 'data', 'Assets.json');
const subAssetsFilePath = path.join(__dirname, 'data', 'SubAssets.json');

// Helper Functions
function ensureDirectoryExists(directory) {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
}

function readJsonFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return [];
    }
}

function writeJsonFile(filePath, data) {
    try {
        const dirPath = path.dirname(filePath);
        ensureDirectoryExists(dirPath);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Error writing to ${filePath}:`, error);
        return false;
    }
}

function generateId() {
    // Generate a 10-digit ID
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}


// Helper function to delete all files associated with an asset or sub-asset
function deleteAssetFiles(asset) {
    if (!asset) return;
    
    const filesToDelete = [];
    
    // Handle single file paths (legacy format)
    if (asset.photoPath) filesToDelete.push(asset.photoPath);
    if (asset.receiptPath) filesToDelete.push(asset.receiptPath);
    if (asset.manualPath) filesToDelete.push(asset.manualPath);
    
    // Handle multiple file paths (new format)
    if (asset.photoPaths && Array.isArray(asset.photoPaths)) {
        filesToDelete.push(...asset.photoPaths);
    }
    if (asset.receiptPaths && Array.isArray(asset.receiptPaths)) {
        filesToDelete.push(...asset.receiptPaths);
    }
    if (asset.manualPaths && Array.isArray(asset.manualPaths)) {
        filesToDelete.push(...asset.manualPaths);
    }
    
    // Handle legacy file info arrays (if they exist)
    if (asset.photoInfo && Array.isArray(asset.photoInfo)) {
        asset.photoInfo.forEach(info => {
            if (info.path) filesToDelete.push(info.path);
        });
    }
    if (asset.receiptInfo && Array.isArray(asset.receiptInfo)) {
        asset.receiptInfo.forEach(info => {
            if (info.path) filesToDelete.push(info.path);
        });
    }
    if (asset.manualInfo && Array.isArray(asset.manualInfo)) {
        asset.manualInfo.forEach(info => {
            if (info.path) filesToDelete.push(info.path);
        });
    }
    
    if (DEBUG && filesToDelete.length > 0) {
        console.log(`[DEBUG] Deleting ${filesToDelete.length} files for asset: ${asset.name || asset.id}`);
    }
    
    // Delete each file
    let deletedCount = 0;
    let errorCount = 0;
    
    filesToDelete.forEach(filePath => {
        if (filePath && typeof filePath === 'string') {
            try {
                // Normalize the file path
                let normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
                
                // If the path doesn't start with 'data/', prepend it
                if (!normalizedPath.startsWith('data/')) {
                    normalizedPath = path.join('data', normalizedPath);
                }
                
                const fullPath = path.join(__dirname, normalizedPath);
                
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                    deletedCount++;
                    if (DEBUG) {
                        console.log('[DEBUG] Successfully deleted file:', normalizedPath);
                    }
                } else if (DEBUG) {
                    console.log('[DEBUG] File not found (already deleted?):', normalizedPath);
                }
            } catch (error) {
                errorCount++;
                console.error('Error deleting file:', filePath, error.message);
                // Continue with other files even if one fails
            }
        }
    });
    
    if (DEBUG && (deletedCount > 0 || errorCount > 0)) {
        console.log(`[DEBUG] File deletion summary for ${asset.name || asset.id}: ${deletedCount} deleted, ${errorCount} errors`);
    }
}

// Initialize data directories
ensureDirectoryExists(path.join(__dirname, 'data', 'Images'));
ensureDirectoryExists(path.join(__dirname, 'data', 'Receipts'));
ensureDirectoryExists(path.join(__dirname, 'data', 'Manuals'));

// Initialize empty files if they don't exist
if (!fs.existsSync(assetsFilePath)) {
    writeJsonFile(assetsFilePath, []);
}

if (!fs.existsSync(subAssetsFilePath)) {
    writeJsonFile(subAssetsFilePath, []);
}

// API Routes
// Get all assets
app.get('/api/assets', (req, res) => {
    const assets = readJsonFile(assetsFilePath);
    res.json(assets);
});

// Get all sub-assets
app.get('/api/subassets', (req, res) => {
    const subAssets = readJsonFile(subAssetsFilePath);
    res.json(subAssets);
});

// Create a new asset
app.post('/api/asset', async (req, res) => {
    const assets = readJsonFile(assetsFilePath);
    const newAsset = req.body;

    // Ensure maintenanceEvents is always present (even if empty)
    newAsset.maintenanceEvents = newAsset.maintenanceEvents || [];
    
    // Ensure required fields
    if (!newAsset.name) {
        return res.status(400).json({ error: 'Asset name is required' });
    }
    
    // Generate ID if not provided
    if (!newAsset.id) {
        newAsset.id = generateId();
    }
    
    // Set timestamps
    newAsset.createdAt = new Date().toISOString();
    newAsset.updatedAt = new Date().toISOString();
    
    assets.push(newAsset);
    let success = writeJsonFile(assetsFilePath, assets);
    if (success) {
        if (DEBUG) {
            console.log('[DEBUG] Asset added:', { name: newAsset.name, modelNumber: newAsset.modelNumber, description: newAsset.description });
        }
        // Notification logic
        try {
            const configPath = path.join(__dirname, 'data', 'config.json');
            let config = {};
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
            const notificationSettings = config.notificationSettings || {};
            const appriseUrl = process.env.APPRISE_URL || (config.appriseUrl || null);
            if (DEBUG) {
                console.log('[DEBUG] Notification settings (add):', notificationSettings, 'Apprise URL:', appriseUrl);
            }
            if (notificationSettings.notifyAdd && appriseUrl) {
                await sendNotification('asset_added', {
                    id: newAsset.id,
                    name: newAsset.name,
                    modelNumber: newAsset.modelNumber,
                    description: newAsset.description
                }, {
                    appriseUrl,
                    baseUrl: getBaseUrl(req)
                });
                if (DEBUG) {
                    console.log('[DEBUG] Asset added notification sent.');
                }
            }
        } catch (err) {
            console.error('Failed to send asset added notification:', err.message);
        }
        res.status(201).json(newAsset);
    } else {
        res.status(500).json({ error: 'Failed to create asset' });
    }
});

// Update an existing asset
app.put('/api/asset', (req, res) => {
    const assets = readJsonFile(assetsFilePath);
    const updatedAsset = req.body;

    // Ensure maintenanceEvents is always present (even if empty)
    updatedAsset.maintenanceEvents = updatedAsset.maintenanceEvents || [];
    
    // Ensure required fields
    if (!updatedAsset.id || !updatedAsset.name) {
        return res.status(400).json({ error: 'Asset ID and name are required' });
    }
    
    const index = assets.findIndex(a => a.id === updatedAsset.id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Preserve creation date
    updatedAsset.createdAt = assets[index].createdAt;
    // Update the modification date
    updatedAsset.updatedAt = new Date().toISOString();
    
    assets[index] = updatedAsset;
    
    if (writeJsonFile(assetsFilePath, assets)) {
        if (DEBUG) {
            console.log('[DEBUG] Asset edited:', { id: updatedAsset.id, name: updatedAsset.name, modelNumber: updatedAsset.modelNumber });
        }
        // Notification logic
        try {
            const configPath = path.join(__dirname, 'data', 'config.json');
            let config = {};
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
            const notificationSettings = config.notificationSettings || {};
            const appriseUrl = process.env.APPRISE_URL || (config.appriseUrl || null);
            if (DEBUG) {
                console.log('[DEBUG] Notification settings (edit):', notificationSettings, 'Apprise URL:', appriseUrl);
            }
            if (notificationSettings.notifyEdit && appriseUrl) {
                sendNotification('asset_edited', {
                    id: updatedAsset.id,
                    name: updatedAsset.name,
                    modelNumber: updatedAsset.modelNumber,
                    description: updatedAsset.description
                }, {
                    appriseUrl,
                    baseUrl: getBaseUrl(req)
                });
                if (DEBUG) {
                    console.log('[DEBUG] Asset edited notification sent.');
                }
            }
        } catch (err) {
            console.error('Failed to send asset edited notification:', err.message);
        }
        res.json(updatedAsset);
    } else {
        res.status(500).json({ error: 'Failed to update asset' });
    }
});

// Delete an asset
app.delete('/api/asset/:id', (req, res) => {
    const assetId = req.params.id;
    const assets = readJsonFile(assetsFilePath);
    const subAssets = readJsonFile(subAssetsFilePath);
    
    // Find the asset to delete
    const assetIndex = assets.findIndex(a => a.id === assetId);
    
    if (assetIndex === -1) {
        return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Remove the asset
    const deletedAsset = assets.splice(assetIndex, 1)[0];
    
    // Remove all related sub-assets
    const updatedSubAssets = subAssets.filter(sa => sa.parentId !== assetId);
    
    // Delete associated files if they exist
    try {
        if (deletedAsset.photoPath) {
            const photoPath = path.join(__dirname, deletedAsset.photoPath.substring(1));
            if (fs.existsSync(photoPath)) {
                fs.unlinkSync(photoPath);
            }
        }
        
        if (deletedAsset.receiptPath) {
            const receiptPath = path.join(__dirname, deletedAsset.receiptPath.substring(1));
            if (fs.existsSync(receiptPath)) {
                fs.unlinkSync(receiptPath);
            }
        }

        if (deletedAsset.manualPath) {
            const manualPath = path.join(__dirname, deletedAsset.manualPath.substring(1));
            if (fs.existsSync(manualPath)) {
                fs.unlinkSync(manualPath);
            }
        }
    } catch (error) {
        console.error('Error deleting asset files:', error);
        // Continue with asset deletion even if file deletion fails
    }
    
    // Write updated assets
    if (writeJsonFile(assetsFilePath, assets) && writeJsonFile(subAssetsFilePath, updatedSubAssets)) {
        if (DEBUG) {
            console.log('[DEBUG] Asset deleted:', { id: deletedAsset.id, name: deletedAsset.name, modelNumber: deletedAsset.modelNumber });
        }
        // Notification logic
        try {
            const configPath = path.join(__dirname, 'data', 'config.json');
            let config = {};
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
            const notificationSettings = config.notificationSettings || {};
            const appriseUrl = process.env.APPRISE_URL || (config.appriseUrl || null);
            if (DEBUG) {
                console.log('[DEBUG] Notification settings (delete):', notificationSettings, 'Apprise URL:', appriseUrl);
            }
            if (notificationSettings.notifyDelete && appriseUrl) {
                sendNotification('asset_deleted', {
                    name: deletedAsset.name,
                    modelNumber: deletedAsset.modelNumber,
                    serialNumber: deletedAsset.serialNumber,
                    purchaseDate: deletedAsset.purchaseDate,
                    price: deletedAsset.price,
                    warranty: deletedAsset.warranty
                }, {
                    appriseUrl,
                    baseUrl: getBaseUrl(req)
                });
                if (DEBUG) {
                    console.log('[DEBUG] Asset deleted notification sent.');
                }
            }
        } catch (err) {
            console.error('Failed to send asset deleted notification:', err.message);
        }
        res.json({ message: 'Asset deleted successfully' });
    } else {
        res.status(500).json({ error: 'Failed to delete asset' });
    }
});

// Create a new sub-asset
app.post('/api/subasset', async (req, res) => {
    const subAssets = readJsonFile(subAssetsFilePath);
    const newSubAsset = req.body;
    // Remove legacy maintenanceReminder if present
    if (newSubAsset.maintenanceReminder) delete newSubAsset.maintenanceReminder;
    // Ensure maintenanceEvents is always present (even if empty)
    newSubAsset.maintenanceEvents = newSubAsset.maintenanceEvents || [];
    
    // Ensure required fields
    if (!newSubAsset.name || !newSubAsset.parentId) {
        return res.status(400).json({ error: 'Sub-asset name and parent ID are required' });
    }
    
    // Generate ID if not provided
    if (!newSubAsset.id) {
        newSubAsset.id = generateId();
    }
    
    // Set timestamps
    newSubAsset.createdAt = new Date().toISOString();
    newSubAsset.updatedAt = new Date().toISOString();
    
    subAssets.push(newSubAsset);
    
    if (writeJsonFile(subAssetsFilePath, subAssets)) {
        if (DEBUG) {
            console.log('[DEBUG] Sub-asset added:', { id: newSubAsset.id, name: newSubAsset.name, parentId: newSubAsset.parentId });
        }
        // Notification logic for sub-asset creation
        try {
            const configPath = path.join(__dirname, 'data', 'config.json');
            let config = {};
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
            const notificationSettings = config.notificationSettings || {};
            const appriseUrl = process.env.APPRISE_URL || (config.appriseUrl || null);
            if (DEBUG) {
                console.log('[DEBUG] Sub-asset notification settings (add):', notificationSettings, 'Apprise URL:', appriseUrl);
            }
            if (notificationSettings.notifyAdd && appriseUrl) {
                await sendNotification('asset_added', {
                    id: newSubAsset.id,
                    parentId: newSubAsset.parentId,
                    name: `${newSubAsset.name} (Component)`,
                    modelNumber: newSubAsset.modelNumber,
                    description: newSubAsset.description || newSubAsset.notes
                }, {
                    appriseUrl,
                    baseUrl: getBaseUrl(req)
                });
                if (DEBUG) {
                    console.log('[DEBUG] Sub-asset added notification sent.');
                }
            }
        } catch (err) {
            console.error('Failed to send sub-asset added notification:', err.message);
        }
        res.status(201).json(newSubAsset);
    } else {
        res.status(500).json({ error: 'Failed to create sub-asset' });
    }
});

// Update an existing sub-asset
app.put('/api/subasset', async (req, res) => {
    const subAssets = readJsonFile(subAssetsFilePath);
    const updatedSubAsset = req.body;
    // Remove legacy maintenanceReminder if present
    if (updatedSubAsset.maintenanceReminder) delete updatedSubAsset.maintenanceReminder;
    // Ensure maintenanceEvents is always present (even if empty)
    updatedSubAsset.maintenanceEvents = updatedSubAsset.maintenanceEvents || [];
    
    // Ensure required fields
    if (!updatedSubAsset.id || !updatedSubAsset.name || !updatedSubAsset.parentId) {
        return res.status(400).json({ error: 'Sub-asset ID, name, and parent ID are required' });
    }
    
    const index = subAssets.findIndex(sa => sa.id === updatedSubAsset.id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Sub-asset not found' });
    }
    
    // Preserve creation date
    updatedSubAsset.createdAt = subAssets[index].createdAt;
    // Update the modification date
    updatedSubAsset.updatedAt = new Date().toISOString();
    
    subAssets[index] = updatedSubAsset;
    
    if (writeJsonFile(subAssetsFilePath, subAssets)) {
        if (DEBUG) {
            console.log('[DEBUG] Sub-asset edited:', { id: updatedSubAsset.id, name: updatedSubAsset.name, parentId: updatedSubAsset.parentId });
        }
        // Notification logic for sub-asset edit
        try {
            const configPath = path.join(__dirname, 'data', 'config.json');
            let config = {};
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
            const notificationSettings = config.notificationSettings || {};
            const appriseUrl = process.env.APPRISE_URL || (config.appriseUrl || null);
            if (DEBUG) {
                console.log('[DEBUG] Sub-asset notification settings (edit):', notificationSettings, 'Apprise URL:', appriseUrl);
            }
            if (notificationSettings.notifyEdit && appriseUrl) {
                await sendNotification('asset_edited', {
                    id: updatedSubAsset.id,
                    parentId: updatedSubAsset.parentId,
                    name: `${updatedSubAsset.name} (Component)`,
                    modelNumber: updatedSubAsset.modelNumber,
                    description: updatedSubAsset.description || updatedSubAsset.notes
                }, {
                    appriseUrl,
                    baseUrl: getBaseUrl(req)
                });
                if (DEBUG) {
                    console.log('[DEBUG] Sub-asset edited notification sent.');
                }
            }
        } catch (err) {
            console.error('Failed to send sub-asset edited notification:', err.message);
        }
        res.json(updatedSubAsset);
    } else {
        res.status(500).json({ error: 'Failed to update sub-asset' });
    }
});

// Delete a sub-asset
app.delete('/api/subasset/:id', async (req, res) => {
    const subAssetId = req.params.id;
    const subAssets = readJsonFile(subAssetsFilePath);
    
    // Find the sub-asset to delete
    const subAssetIndex = subAssets.findIndex(sa => sa.id === subAssetId);
    
    if (subAssetIndex === -1) {
        return res.status(404).json({ error: 'Sub-asset not found' });
    }
    
    // Get the sub-asset to delete
    const deletedSubAsset = subAssets[subAssetIndex];
    
    // Ensure we don't delete a component that still has other parents
    const subAssetIdsToDelete = new Set([subAssetId]);
    let childrenToProcess = [deletedSubAsset];
    
    while (childrenToProcess.length > 0) {
        const current = childrenToProcess.shift();
        
        // Find all direct children of this component
        const directChildren = subAssets.filter(sa => 
            // Only include components where this is the direct parent
            sa.parentSubId === current.id && 
            // Don't include already processed components
            !subAssetIdsToDelete.has(sa.id) &&
            // Ensure the component isn't a child of any component we're not deleting
            !subAssets.some(other => 
                other.id !== current.id && 
                !subAssetIdsToDelete.has(other.id) && 
                sa.parentSubId === other.id
            )
        );
        
        // Add valid children to deletion set and processing queue
        directChildren.forEach(child => {
            subAssetIdsToDelete.add(child.id);
            childrenToProcess.push(child);
        });
    }
    
    // Filter out all sub-assets that need to be deleted
    const updatedSubAssets = subAssets.filter(sa => !subAssetIdsToDelete.has(sa.id));
    
    // Write updated sub-assets
    if (writeJsonFile(subAssetsFilePath, updatedSubAssets)) {
        if (DEBUG) {
            console.log('[DEBUG] Sub-asset deleted:', { id: deletedSubAsset.id, name: deletedSubAsset.name, parentId: deletedSubAsset.parentId });
        }
        // Notification logic for sub-asset deletion
        try {
            const configPath = path.join(__dirname, 'data', 'config.json');
            let config = {};
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
            const notificationSettings = config.notificationSettings || {};
            const appriseUrl = process.env.APPRISE_URL || (config.appriseUrl || null);
            if (DEBUG) {
                console.log('[DEBUG] Sub-asset notification settings (delete):', notificationSettings, 'Apprise URL:', appriseUrl);
            }
            if (notificationSettings.notifyDelete && appriseUrl) {
                await sendNotification('asset_deleted', {
                    name: `${deletedSubAsset.name} (Component)`,
                    modelNumber: deletedSubAsset.modelNumber,
                    serialNumber: deletedSubAsset.serialNumber,
                    purchaseDate: deletedSubAsset.purchaseDate,
                    price: deletedSubAsset.price || deletedSubAsset.purchasePrice,
                    warranty: deletedSubAsset.warranty
                }, {
                    appriseUrl,
                    baseUrl: getBaseUrl(req)
                });
                if (DEBUG) {
                    console.log('[DEBUG] Sub-asset deleted notification sent.');
                }
            }
        } catch (err) {
            console.error('Failed to send sub-asset deleted notification:', err.message);
        }
        
        // Try to delete image and receipt files if they exist
        try {
            if (deletedSubAsset.photoPath) {
                const photoPath = path.join(__dirname, deletedSubAsset.photoPath.substring(1));
                if (fs.existsSync(photoPath)) {
                    fs.unlinkSync(photoPath);
                }
            }
            
            if (deletedSubAsset.receiptPath) {
                const receiptPath = path.join(__dirname, deletedSubAsset.receiptPath.substring(1));
                if (fs.existsSync(receiptPath)) {
                    fs.unlinkSync(receiptPath);
                }
            }
            
            if (deletedSubAsset.manualPath) {
                const manualPath = path.join(__dirname, deletedSubAsset.manualPath.substring(1));
                if (fs.existsSync(manualPath)) {
                    fs.unlinkSync(manualPath);
                }
            }
        } catch (error) {
            console.error('Error deleting files:', error);
            // Continue even if file deletion fails
        }
        
        res.json({ message: 'Sub-asset deleted successfully' });
    } else {
        res.status(500).json({ error: 'Failed to delete sub-asset' });
    }
});

// File upload endpoints
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'data', 'Images'));
    },
    filename: (req, file, cb) => {
        cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
    }
});

const receiptStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'data', 'Receipts'));
    },
    filename: (req, file, cb) => {
        cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
    }
});

const manualStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'data', 'Manuals'));
    },
    filename: (req, file, cb) => {
        cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
    }
});

const uploadImage = multer({ 
    storage: imageStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

const uploadReceipt = multer({ 
    storage: receiptStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only image and PDF files are allowed'));
        }
    }
});

const uploadManual = multer({ 
    storage: manualStorage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
        }
    }
});

app.post('/api/upload/image', uploadImage.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    // Get file stats
    const stats = fs.statSync(req.file.path);
    
    res.json({
        path: `/Images/${req.file.filename}`,
        fileInfo: {
            originalName: req.file.originalname,
            size: stats.size,
            fileName: req.file.filename
        }
    });
});

app.post('/api/upload/receipt', uploadReceipt.single('receipt'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    // Get file stats
    const stats = fs.statSync(req.file.path);
    
    res.json({
        path: `/Receipts/${req.file.filename}`,
        fileInfo: {
            originalName: req.file.originalname,
            size: stats.size,
            fileName: req.file.filename
        }
    });
});

app.post('/api/upload/manual', uploadManual.single('manual'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    // Get file stats
    const stats = fs.statSync(req.file.path);
    
    res.json({
        path: `/Manuals/${req.file.filename}`,
        fileInfo: {
            originalName: req.file.originalname,
            size: stats.size,
            fileName: req.file.filename
        }
    });
});

// Delete a file (image, receipt, or manual)
app.post('/api/delete-file', (req, res) => {
    const { path: filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: 'No file path provided' });
    const absPath = path.join(__dirname, filePath.startsWith('/') ? filePath.substring(1) : filePath);
    fs.unlink(absPath, (err) => {
        if (err) {
            // If file doesn't exist, treat as success
            if (err.code === 'ENOENT') return res.json({ message: 'File already deleted' });
            return res.status(500).json({ error: 'Failed to delete file' });
        }
        res.json({ message: 'File deleted' });
    });
});

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Helper function to parse Excel dates
function parseExcelDate(value) {
    if (!value) return '';
    
    // If it's already a date string in ISO format, return as is
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
        return value;
    }
    
    // If it's a number (Excel date), convert it
    if (typeof value === 'number') {
        // Excel's epoch starts from Dec 30, 1899
        const date = new Date((value - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }
    
    // Try to parse MM/DD/YYYY format
    if (typeof value === 'string' && value.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const [month, day, year] = value.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    }
    
    // Try to parse as regular date string
    try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    } catch (e) {
        console.log('Failed to parse date:', value);
    }
    
    return '';
}

// Import assets route
app.post('/api/import-assets', authMiddleware, upload.single('file'), (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // If only headers are requested (first step), return headers
        if (!req.body.mappings) {
            let workbook = XLSX.read(file.buffer, { type: 'buffer' });
            let sheet = workbook.Sheets[workbook.SheetNames[0]];
            let json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            const headers = json[0] || [];
            return res.json({ headers });
        }
        // Parse mappings
        const mappings = JSON.parse(req.body.mappings);
        let workbook = XLSX.read(file.buffer, { type: 'buffer' });
        let sheet = workbook.Sheets[workbook.SheetNames[0]];
        let json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const headers = json[0] || [];
        const rows = json.slice(1);
        let importedCount = 0;
        let assets = readJsonFile(assetsFilePath);
        for (const row of rows) {
            if (!row.length) continue;
            const get = idx => (mappings[idx] !== undefined && mappings[idx] !== "" && row[mappings[idx]] !== undefined) ? row[mappings[idx]] : "";
            const name = get('name');
            if (!name) continue;
            // Parse lifetime warranty value
            const lifetimeValue = get('lifetime');
            const isLifetime = lifetimeValue ? 
                (lifetimeValue.toString().toLowerCase() === 'true' || 
                 lifetimeValue.toString().toLowerCase() === '1' || 
                 lifetimeValue.toString().toLowerCase() === 'yes') : false;

            const asset = {
                id: generateId(),
                name: name,
                manufacturer: get('manufacturer'),
                modelNumber: get('model'),
                serialNumber: get('serial'),
                purchaseDate: parseExcelDate(get('purchaseDate')),
                price: get('purchasePrice'),
                description: get('notes'),
                link: get('url'),
                warranty: {
                    scope: get('warranty'),
                    expirationDate: isLifetime ? null : parseExcelDate(get('warrantyExpiration')),
                    isLifetime: isLifetime
                },
                secondaryWarranty: {
                    scope: get('secondaryWarranty'),
                    expirationDate: parseExcelDate(get('secondaryWarrantyExpiration'))
                },
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            // Parse tags if mapped
            if (mappings.tags !== undefined && mappings.tags !== "" && row[mappings.tags] !== undefined) {
                const tagsRaw = row[mappings.tags];
                if (typeof tagsRaw === 'string') {
                    asset.tags = tagsRaw.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
                } else if (Array.isArray(tagsRaw)) {
                    asset.tags = tagsRaw.map(t => String(t).trim()).filter(Boolean);
                }
            }
            assets.push(asset);
            importedCount++;
        }
        writeJsonFile(assetsFilePath, assets);
        res.json({ importedCount });
    } catch (err) {
        console.error('Import error:', err);
        res.status(500).json({ error: 'Failed to import assets' });
    }
});

// Get all settings
app.get('/api/settings', authMiddleware, (req, res) => {
    try {
        const configPath = path.join(__dirname, 'data', 'config.json');
        if (!fs.existsSync(configPath)) {
            // Default settings if config does not exist
            return res.json({
                notificationSettings: {
                    notifyAdd: true,
                    notifyDelete: false,
                    notifyEdit: true,
                    notify1Month: true,
                    notify2Week: false,
                    notify7Day: true,
                    notify3Day: false,
                    notifyMaintenance: false
                },
                interfaceSettings: {
                    dashboardOrder: ["totals", "warranties", "analytics"],
                    dashboardVisibility: { totals: true, warranties: true, analytics: true }
                }
            });
        }
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        // Ensure dashboardVisibility always present
        if (!config.interfaceSettings) config.interfaceSettings = {};
        if (!config.interfaceSettings.dashboardVisibility) {
            config.interfaceSettings.dashboardVisibility = { totals: true, warranties: true, analytics: true };
        }
        // Ensure cardVisibility is present in interfaceSettings
        if (!config.interfaceSettings.cardVisibility) {
            config.interfaceSettings.cardVisibility = {
                assets: true,
                components: true,
                value: true,
                warranties: true,
                within60: true,
                within30: true,
                expired: true,
                active: true
            };
        }
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load settings' });
    }
});

// Save all settings
app.post('/api/settings', authMiddleware, express.json(), (req, res) => {
    try {
        const configPath = path.join(__dirname, 'data', 'config.json');
        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        // Update settings with the new values
        Object.keys(req.body).forEach(section => {
            if (section === 'interfaceSettings') {
                if (!config.interfaceSettings) config.interfaceSettings = {};
                // Merge dashboardOrder and dashboardVisibility
                if (req.body.interfaceSettings.dashboardOrder) {
                    config.interfaceSettings.dashboardOrder = req.body.interfaceSettings.dashboardOrder;
                }
                if (req.body.interfaceSettings.dashboardVisibility) {
                    config.interfaceSettings.dashboardVisibility = req.body.interfaceSettings.dashboardVisibility;
                }
                if (req.body.interfaceSettings.cardVisibility) {
                    config.interfaceSettings.cardVisibility = req.body.interfaceSettings.cardVisibility;
                }
            } else {
                config[section] = req.body[section];
            }
        });
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// Test notification endpoint
app.post('/api/notification-test', authMiddleware, async (req, res) => {
    if (DEBUG) {
        console.log('[DEBUG] /api/notification-test called');
    }
    try {
        const configPath = path.join(__dirname, 'data', 'config.json');
        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        // Use APPRISE_URL from env or config
        const appriseUrl = process.env.APPRISE_URL || (config.appriseUrl || null);
        // Get notification settings from request body
        const notificationSettings = req.body || {};
        // Ensure notification settings are present
        if (!notificationSettings) {
            return res.status(400).json({ error: 'No notification settings provided.' });
        }
        // Ensure notification settings are valid
        if (!notificationSettings.enabledTypes || !Array.isArray(notificationSettings.enabledTypes)) {
            return res.status(400).json({ error: 'Invalid notification settings provided.' });
        }
        // Ensure APPRISE_URL is present
        if (!appriseUrl) {
            return res.status(400).json({ error: 'No Apprise URL configured.' });
        }
        // Log the notification settings and Apprise URL for debugging
        if (DEBUG) {
            console.log('[DEBUG] Notification settings (test):', notificationSettings, 'Apprise URL:', appriseUrl);
        }
        if (!appriseUrl) return res.status(400).json({ error: 'No Apprise URL configured.' });

        // Get enabled notification types from request body
        const { enabledTypes } = notificationSettings;;
        if (!enabledTypes || !Array.isArray(enabledTypes)) {
            return res.status(400).json({ error: 'No enabled notification types provided.' });
        }

        // Send test notifications for each enabled type
        console.log('Enabled notification types:', enabledTypes);
        for (const type of enabledTypes) {
            let notificationData = {};
            let message = '';

            switch (type) {
                case 'notifyAdd':
                    notificationData = {
                        name: 'Quantum Router (notifyAdd Test)',
                        modelNumber: 'Q-Bit-9000',
                        serialNumber: '0xDEADBEEF',
                        description: "✅ It's in a superposition of working and not working."
                    };
                    message = `Test: Asset Added Notification\n\nTest Asset: ${notificationData.name} (Model: ${notificationData.modelNumber}, Serial: ${notificationData.serialNumber}) has been added to your inventory. ${notificationData.description}`;
                    break;
                case 'notifyDelete':
                    notificationData = {
                        name: 'Stack Overflow Generator (notifyDelete Test)',
                        modelNumber: 'SO-404',
                        serialNumber: 'NULL-PTR',
                        description: '❌ It finally found the answer it was looking for.'
                    };
                    message = `Test: Asset Deleted Notification\n\nTest Asset: ${notificationData.name} (Model: ${notificationData.modelNumber}, Serial: ${notificationData.serialNumber}) has been removed from your inventory. ${notificationData.description}`;
                    break;
                case 'notifyEdit':
                    notificationData = {
                        name: 'Recursive Coffee Maker (notifyEdit Test)',
                        modelNumber: 'Java-8',
                        serialNumber: 'Stack-Overflow',
                        description: '✏️ It now makes coffee while making coffee.'
                    };
                    message = `Test: Asset Edited Notification\n\nTest Asset: ${notificationData.name} (Model: ${notificationData.modelNumber}, Serial: ${notificationData.serialNumber}) has been updated. ${notificationData.description}`;
                    break;
                case 'notify1Month':
                    notificationData = {
                        name: 'Infinite Loop Detector (notify1Month Test)',
                        modelNumber: 'Break-1',
                        serialNumber: 'While-True',
                        description: '⏳ Without it, you might be stuck in an endless cycle of debugging.'
                    };
                    message = `Test: Warranty Expiring in 1 Month\n\nTest Asset: ${notificationData.name} (Model: ${notificationData.modelNumber}, Serial: ${notificationData.serialNumber}) warranty expires in 1 month. ${notificationData.description}`;
                    break;
                case 'notify2Week':
                    notificationData = {
                        name: 'Memory Leak Plug (notify2Week Test)',
                        modelNumber: 'GC-2023',
                        serialNumber: 'OutOfMemory',
                        description: '⏳ Without warranty, it might forget to forget things.'
                    };
                    message = `Test: Warranty Expiring in 2 Weeks\n\nTest Asset: ${notificationData.name} (Model: ${notificationData.modelNumber}, Serial: ${notificationData.serialNumber}) warranty expires in 2 weeks. ${notificationData.description}`;
                    break;
                case 'notify7Day':
                    notificationData = {
                        name: 'Binary Clock (notify7Day Test)',
                        modelNumber: '0x10',
                        serialNumber: '0b1010',
                        description: '⏳ Without warranty, it might start counting in hexadecimal.'
                    };
                    message = `Test: Warranty Expiring in 7 Days\n\nTest Asset: ${notificationData.name} (Model: ${notificationData.modelNumber}, Serial: ${notificationData.serialNumber}) warranty expires in 7 days. ${notificationData.description}`;
                    break;
                case 'notify3Day':
                    notificationData = {
                        name: 'Cache Warmer (notify3Day Test)',
                        modelNumber: 'L1-L2-L3',
                        serialNumber: 'Miss-Rate',
                        description: '⏳ Without warranty, your data might get cold feet.'
                    };
                    message = `Test: Warranty Expiring in 3 Days\n\nTest Asset: ${notificationData.name} (Model: ${notificationData.modelNumber}, Serial: ${notificationData.serialNumber}) warranty expires in 3 days. ${notificationData.description}`;
                    break;
                case 'notifyMaintenance':
                    notificationData = {
                        name: 'Entropy Reducer (notifyMaintenance Test)',
                        modelNumber: 'MTN-42',
                        serialNumber: 'SCH-2025',
                        description: '🛠️ Scheduled maintenance is due soon. Keep your assets running smoothly!'
                    };
                    message = `Test: Maintenance Schedule Notification\n\nTest Asset: ${notificationData.name} (Model: ${notificationData.modelNumber}, Serial: ${notificationData.serialNumber}) is due for scheduled maintenance. ${notificationData.description}`;
                    break;
            }

            // Send the notification
            await sendNotification('test', notificationData, {
                appriseUrl,
                appriseMessage: message
            });

            // Note: No manual delay needed - the notification queue handles delays automatically
        }

        if (DEBUG) {
            console.log('[DEBUG] Test notifications sent.');
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send test notifications.' });
    }
});

// --- CLEANUP LOCKOUTS ---
setInterval(() => {
    const now = Date.now();
    for (const [ip, attempts] of loginAttempts.entries()) {
        if (now - attempts.lastAttempt >= LOCKOUT_TIME) {
            loginAttempts.delete(ip);
        }
    }
}, 60000);

// Warranty expiration notification cron
startWarrantyCron();

// --- START SERVER ---
app.listen(PORT, () => {
    debugLog('Server Configuration:', {
        port: PORT,
        basePath: BASE_PATH,
        pinProtection: !!PIN,
        nodeEnv: NODE_ENV,
        debug: DEBUG,
        version: VERSION,
    });
    console.log(`Server running on: ${BASE_URL}`);
}); 
// --- END ---

// Add helper function to get base URL for notifications
function getBaseUrl(req) {
    // Try to get from environment variable first
    if (process.env.BASE_URL) {
        return process.env.BASE_URL;
    }
    
    // Try to construct from request headers
    if (req) {
        const protocol = req.secure || req.get('X-Forwarded-Proto') === 'https' ? 'https' : 'http';
        const host = req.get('Host') || req.get('X-Forwarded-Host');
        if (host) {
            return `${protocol}://${host}`;
        }
    }
    
    // Fallback to localhost with default port
    return 'http://localhost:3000';
}