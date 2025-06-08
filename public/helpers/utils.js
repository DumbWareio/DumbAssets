// Utility functions for DumbAssets
// Place in public/helpers/utils.js

export function generateId() {
    // Generate a 10-digit ID
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

export function formatDate(dateString, forSearch = false) {
    if (!dateString && !forSearch) return 'N/A';
    else if (!dateString) return '';
    
    let date;
    
    // Handle ISO date format (YYYY-MM-DD) to prevent timezone shift
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Parse as local date by splitting components and creating date with local timezone
        const [year, month, day] = dateString.split('-').map(Number);
        date = new Date(year, month - 1, day); // month is 0-indexed
    } else {
        // For other date formats, use standard parsing
        date = new Date(dateString);
    }
    
    // Format as MM/dd/YYYY with leading zeros
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${month}/${day}/${year}`;
}

export function formatCurrency(amount, forSearch = false) {
    if (amount === null || amount === undefined) return 'N/A';
    else if (!amount && !forSearch) return '';
    
    // Get currency configuration from global app config
    const currencyCode = window.appConfig?.currency?.code || 'USD';
    const currencyLocale = window.appConfig?.currency?.locale || 'en-US';
    
    return new Intl.NumberFormat(currencyLocale, {
        style: 'currency',
        currency: currencyCode
    }).format(amount);
}
