const DEMO_MODE = process.env.DEMO_MODE === 'true';

function demoModeMiddleware(req, res, next) {
  if (DEMO_MODE && (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE' || req.method === 'PATCH')) {
      // If in demo mode, block write operations
      console.warn(`Demo mode: Write operation attempted: METHOD: ${req.method}, IP: ${req.ip}, ORIGIN: ${req.headers.referer || req.headers.origin}`);
      return res.status(403).json({ 
          error: 'Operation disabled in demo mode 🫠',
          demoMode: true 
      });
  }
  next();
}

module.exports = {
  demoModeMiddleware,
}