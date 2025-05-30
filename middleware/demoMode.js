/**
 * Demo Mode Middleware
 * Blocks all modifying HTTP methods when DEMO_MODE is enabled
 */

const DEMO_MODE = process.env.DEMO_MODE === 'true';

/**
 * Middleware to block modifying operations in demo mode
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function demoModeMiddleware(req, res, next) {
    if (!DEMO_MODE) {
        return next();
    }

    const modifyingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    
    // Allow PIN verification even in demo mode
    if (req.path.includes('/verify-pin')) {
        return next();
    }

    // Allow GET requests for settings and other read operations
    if (req.method === 'GET') {
        return next();
    }

    // Block all modifying operations
    if (modifyingMethods.includes(req.method)) {
        return res.status(403).json({
            error: 'Demo Mode Active',
            message: 'Modifying operations are disabled in demo mode. This is a read-only demonstration.',
            demoMode: true
        });
    }

    next();
}

module.exports = {
    demoModeMiddleware,
    DEMO_MODE
}; 