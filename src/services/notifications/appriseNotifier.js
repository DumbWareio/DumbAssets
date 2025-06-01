/**
 * Apprise Notification Service for DumbAssets
 * Encapsulates Apprise CLI integration for sending notifications about asset events.
 * Handles message formatting, CLI invocation, and error logging.
 */

const { spawn } = require('child_process');
const path = require('path');
const { formatDate, sanitizeText } = require('./utils');
const notificationQueue = require('./notificationQueue');

function formatNotification(eventType, assetData, baseUrl = '') {
  let lines = [];
  
  // Create direct link to asset if we have an ID and baseUrl
  let assetLink = '';
  if (assetData.id && baseUrl) {
    // For sub-assets, we need to include both parent and sub-asset info
    if (assetData.parentId) {
      assetLink = `${baseUrl}?ass=${assetData.parentId}&sub=${assetData.id}`;
    } else {
      assetLink = `${baseUrl}?ass=${assetData.id}`;
    }
  }
  
  if (eventType === 'asset_added') {
    lines.push('✅ Asset Added');
    // Add component identifier if this is a sub-asset
    if (assetData.parentId) {
      lines.push('📦 Component');
    }
  } else if (eventType === 'asset_deleted') {
    lines.push('❌ Asset Deleted');
    // Add component identifier if this is a sub-asset
    if (assetData.parentId) {
      lines.push('📦 Component');
    }
    // Add detailed asset information for deletion
    if (assetData.name) lines.push(`Name: ${assetData.name}`);
    if (assetData.modelNumber) lines.push(`Model #: ${assetData.modelNumber}`);
    if (assetData.serialNumber) lines.push(`Serial #: ${assetData.serialNumber}`);
    if (assetData.purchaseDate) lines.push(`Purchase Date: ${assetData.purchaseDate}`);
    if (assetData.price) lines.push(`Price: ${assetData.price}`);
    if (assetData.warranty) {
      if (assetData.warranty.scope) lines.push(`Warranty: ${assetData.warranty.scope}`);
      if (assetData.warranty.expirationDate) lines.push(`Warranty Expiration: ${assetData.warranty.expirationDate}`);
    }
  } else if (eventType === 'asset_edited') {
    lines.push('✏️ Asset Edited');
    // Add component identifier if this is a sub-asset
    if (assetData.parentId) {
      lines.push('📦 Component');
    }
  } else if (eventType === 'warranty_expiring') {
    lines.push(`⏰ Warranty Expiring in ${assetData.days ? assetData.days + ' days' : assetData.time || ''}`);
    if (assetData.assetType === 'Component') {
      lines.push(`Component: ${assetData.name}`);
    } else {
      lines.push(`Asset: ${assetData.name}`);
    }
    if (assetData.modelNumber) lines.push(`Model #: ${assetData.modelNumber}`);
    if (assetData.warrantyType) lines.push(assetData.warrantyType);
    if (assetData.expirationDate) lines.push(`Expires: ${assetData.expirationDate}`);
  } else if (eventType === 'maintenance_schedule') {
    lines.push('🛠️ Maintenance Schedule');
    if (assetData.type === 'Component') {
      lines.push(`Component: ${assetData.name}`);
      if (assetData.parentAsset) lines.push(`Parent Asset: ${assetData.parentAsset}`);
    } else {
      lines.push(`Asset: ${assetData.name}`);
    }
    if (assetData.modelNumber) lines.push(`Model #: ${assetData.modelNumber}`);
    if (assetData.eventName) lines.push(`Event: ${assetData.eventName}`);
    if (assetData.schedule) lines.push(`Schedule: ${assetData.schedule}`);
    if (assetData.notes) lines.push(`Notes: ${assetData.notes}`);
  } else if (eventType === 'test') {
    lines.push('🧪🔔 Test Notification');
  } else {
    lines.push('🔔 Notification');
  }
  
  // Add basic info for other event types
  if (!['asset_deleted','maintenance_schedule','warranty_expiring'].includes(eventType)) {
    if (assetData.name) lines.push(assetData.name);
    if (assetData.modelNumber) lines.push(assetData.modelNumber);
    if (assetData.description) lines.push(assetData.description);
  }
  
  // Add direct link if available
  if (assetLink) {
    lines.push('');
    lines.push(`🔗 View Asset: ${assetLink}`);
  }
  
  return lines.join('\n');
}

/**
 * Internal function to actually send the notification (used by the queue)
 * @param {string} eventType - Type of event
 * @param {Object} assetData - Data about the asset/event
 * @param {Object} config - Configuration object
 * @returns {Promise<void>}
 */
async function _sendNotificationImmediate(eventType, assetData, config) {
  const { appriseUrl, appriseMessage, baseUrl } = config;
  if (!appriseUrl) return;

  try {
    // Sanitize asset data for message
    const safeData = {};
    for (const key in assetData) {
      safeData[key] = sanitizeText(assetData[key]);
    }
    // Add eventType and date
    safeData.eventType = eventType;
    safeData.date = formatDate(new Date());

    // Use formatted message for known event types
    let message = appriseMessage;
    if (!appriseMessage || ['asset_added','asset_deleted','asset_edited','warranty_expiring','test'].includes(eventType)) {
      message = formatNotification(eventType, safeData, baseUrl);
    } else {
      Object.entries(safeData).forEach(([key, value]) => {
        message = message.replace(new RegExp(`{${key}}`, 'g'), value);
      });
    }

    return new Promise((resolve, reject) => {
      const appriseProcess = spawn('apprise', [appriseUrl, '-b', message]);
      appriseProcess.stdout.on('data', (data) => {
        console.info(`Apprise Output: ${data.toString().trim()}`);
      });
      appriseProcess.stderr.on('data', (data) => {
        console.error(`Apprise Error: ${data.toString().trim()}`);
      });
      appriseProcess.on('close', (code) => {
        if (code === 0) {
          console.info(`Notification sent: ${eventType} (${safeData.name || ''})`);
          resolve();
        } else {
          reject(new Error(`Apprise process exited with code ${code}`));
        }
      });
      appriseProcess.on('error', (err) => {
        reject(new Error(`Apprise process failed to start: ${err.message}`));
      });
    });
  } catch (err) {
    console.error(`Failed to send notification: ${err.message}`);
    throw err;
  }
}

/**
 * Send a notification using Apprise (queued with 5-second delays between notifications)
 * @param {string} eventType - Type of event (e.g., 'asset_added', 'import_complete')
 * @param {Object} assetData - Data about the asset/event (e.g., { name, modelNumber, price })
 * @param {Object} config - Configuration object (appriseUrl, appriseMessage, etc.)
 * @returns {Promise<void>}
 */
async function sendNotification(eventType, assetData, config) {
  // Add the notification to the queue instead of sending immediately
  notificationQueue.enqueue(_sendNotificationImmediate, [eventType, assetData, config]);
}

module.exports = {
  sendNotification,
};