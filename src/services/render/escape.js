/**
 * HTML escaping helpers for rendering user-controlled data into innerHTML.
 *
 * Always escape values interpolated into HTML strings — both text content
 * and attribute values. For URLs used in href/src, also pass them through
 * safeUrl() to neutralize javascript:/data:/vbscript: schemes.
 */

export function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function safeUrl(value) {
    if (value === null || value === undefined) return '#';
    const s = String(value).trim();
    if (!s) return '#';
    if (/^(javascript|data|vbscript):/i.test(s)) return '#';
    return s;
}
