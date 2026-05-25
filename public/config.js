/**
 * Configuration settings for DumbAssets
 * Contains site settings and constants
 */

// Site title configuration from environment variable or default
const SITE_TITLE = 'DumbAssets';

// Debug function
function debug(message) {
  console.log(`[Theme Debug] ${message}`);
}

// Cookie helper functions
function setCookie(name, value, days = 365) {
  const d = new Date();
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "expires=" + d.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/;SameSite=Strict";
  // debug(`Set cookie ${name}=${value}`);
}

function getCookie(name) {
  const cookieName = name + "=";
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i].trim();
    if (cookie.indexOf(cookieName) === 0) {
      return cookie.substring(cookieName.length, cookie.length);
    }
  }
  return "";
}

// Toggle between light and dark themes
function toggleTheme(event) {
  // console.log("toggleTheme function called directly");
  // debug("toggleTheme function called directly");
  
  // Prevent any default behavior
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  // debug(`Changing theme from ${currentTheme} to ${newTheme}`);
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  // Force update the toggle button state
  updateThemeToggleState(newTheme);
}

// Update theme toggle button state
function updateThemeToggleState(theme) {
  const toggleButton = document.getElementById('themeToggle');
  if (toggleButton) {
    // debug(`Updating toggle button state for theme: ${theme}`);
    toggleButton.setAttribute('aria-pressed', theme === 'dark');
    toggleButton.setAttribute('title', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  }
}

// Set up theme toggle functionality
function setupThemeToggle() {
  // console.log("Setting up theme toggle");
  // debug("Setting up theme toggle");
  
  const themeToggle = document.getElementById('themeToggle');
  // console.log("Theme toggle element:", themeToggle);
  
  if (!themeToggle) {
    // console.log("Theme toggle button not found!");
    // debug("Theme toggle button not found");
    return false;
  }
  
  // Remove any existing listeners
  themeToggle.onclick = null;
  
  // Add click handler directly
  themeToggle.onclick = function(e) {
    // console.log("Theme toggle clicked via onclick");
    toggleTheme(e);
  };
  
  // Add keyboard support
  themeToggle.onkeydown = function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      // console.log("Theme toggle triggered via keyboard");
      e.preventDefault();
      toggleTheme(e);
    }
  };
  
  // Set initial ARIA attributes
  themeToggle.setAttribute('role', 'button');
  themeToggle.setAttribute('aria-label', 'Toggle theme');
  
  // Update initial state
  const currentTheme = document.documentElement.getAttribute('data-theme');
  updateThemeToggleState(currentTheme);
  
  // console.log("Theme toggle setup complete");
  // debug("Theme toggle setup complete");
  return true;
}

// Initialize theme based on localStorage or system preference
function initTheme() {
  // debug("Initializing theme");
  const savedTheme = localStorage.getItem('theme');
  // debug(`Saved theme from localStorage: ${savedTheme || 'none'}`);
  
  const prefersDarkMedia = window.matchMedia('(prefers-color-scheme: dark)');
  const prefersDark = prefersDarkMedia.matches;
  // debug(`System prefers dark mode: ${prefersDark}`);
  
  // Set initial theme
  let initialTheme;
  if (savedTheme) {
    // User has explicitly chosen a theme
    initialTheme = savedTheme;
    // debug(`Using saved theme: ${savedTheme}`);
  } else {
    // Use system preference
    initialTheme = prefersDark ? 'dark' : 'light';
    // debug(`Using system theme: ${initialTheme}`);
  }
  
  // Apply the theme
  document.documentElement.setAttribute('data-theme', initialTheme);
  // debug(`Applied theme: ${initialTheme}`);
  
  // Listen for system preference changes
  prefersDarkMedia.addEventListener('change', (e) => {
    // Only update theme automatically if user hasn't set a preference
    if (!localStorage.getItem('theme')) {
      const newTheme = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      updateThemeToggleState(newTheme);
      // debug(`System preference changed, set theme to: ${newTheme}`);
    }
  });
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // console.log("DOM Content Loaded - setting up theme");
  // debug("DOM Content Loaded - setting up theme");
  
  // Update page titles
  const pageTitle = document.getElementById('pageTitle');
  const siteTitle = document.getElementById('siteTitle');
  
  if (pageTitle) pageTitle.textContent = SITE_TITLE;
  if (siteTitle) siteTitle.textContent = SITE_TITLE;
  
  // Initialize theme
  initTheme();
  
  // Set up theme toggle
  setupThemeToggle();
});

// Also try on window load just in case
window.addEventListener('load', () => {
  // console.log("Window loaded - checking theme toggle");
  setupThemeToggle();
});

// Make theme functions globally available
window.toggleTheme = toggleTheme;

// Apply i18n translations after DOM load if i18n module is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.i18n && window.i18n.applyTranslations) {
        window.i18n.applyTranslations();
    }
});