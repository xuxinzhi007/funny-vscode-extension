/**
 * Formatters - Utility functions for formatting numbers, time, and other data
 */

/**
 * Format a number with K/M/B suffixes
 * @param {number} num - Number to format
 * @param {number} [decimals=2] - Number of decimal places
 * @returns {string} Formatted number
 */
function formatNumber(num, decimals = 2) {
  if (num === 0) return '0';
  if (num < 1000) return Math.floor(num).toString();
  
  const k = 1000;
  const sizes = ['', 'K', 'M', 'B', 'T'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  
  if (i >= sizes.length) {
    return (num / Math.pow(k, sizes.length - 1)).toFixed(decimals) + sizes[sizes.length - 1];
  }
  
  return (num / Math.pow(k, i)).toFixed(decimals) + sizes[i];
}

/**
 * Format a number with commas as thousands separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumberWithCommas(num) {
  return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format seconds to human-readable time (e.g., "1h 23m 45s")
 * @param {number} seconds - Seconds
 * @param {boolean} [short=false] - Use short format (e.g., "1:23:45")
 * @returns {string} Formatted time
 */
function formatTime(seconds, short = false) {
  if (seconds < 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (short) {
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else if (minutes > 0) {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `0:${secs.toString().padStart(2, '0')}`;
    }
  } else {
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    return parts.join(' ');
  }
}

/**
 * Format milliseconds to human-readable time
 * @param {number} ms - Milliseconds
 * @param {boolean} [short=false] - Use short format
 * @returns {string} Formatted time
 */
function formatMilliseconds(ms, short = false) {
  return formatTime(ms / 1000, short);
}

/**
 * Format a duration in minutes to human-readable format
 * @param {number} minutes - Minutes
 * @returns {string} Formatted duration
 */
function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours} hr`;
  }
  
  return `${hours} hr ${mins} min`;
}

/**
 * Format a date to relative time (e.g., "2 hours ago")
 * @param {Date|number} date - Date object or timestamp
 * @returns {string} Relative time string
 */
function formatRelativeTime(date) {
  const timestamp = date instanceof Date ? date.getTime() : date;
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  } else if (hours > 0) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  } else if (minutes > 0) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  } else {
    return 'just now';
  }
}

/**
 * Format bytes to human-readable size
 * @param {number} bytes - Bytes
 * @param {number} [decimals=2] - Number of decimal places
 * @returns {string} Formatted size
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Format a percentage
 * @param {number} value - Value (0-1 or 0-100)
 * @param {boolean} [isDecimal=true] - Whether value is decimal (0-1) or percentage (0-100)
 * @param {number} [decimals=1] - Number of decimal places
 * @returns {string} Formatted percentage
 */
function formatPercentage(value, isDecimal = true, decimals = 1) {
  const percent = isDecimal ? value * 100 : value;
  return percent.toFixed(decimals) + '%';
}

/**
 * Format a date to a readable string
 * @param {Date|number} date - Date object or timestamp
 * @param {boolean} [includeTime=false] - Include time in output
 * @returns {string} Formatted date
 */
function formatDate(date, includeTime = false) {
  const d = date instanceof Date ? date : new Date(date);
  
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  
  if (!includeTime) {
    return `${year}-${month}-${day}`;
  }
  
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Format a multiplier (e.g., 1.5x, 2x)
 * @param {number} multiplier - Multiplier value
 * @param {number} [decimals=1] - Number of decimal places
 * @returns {string} Formatted multiplier
 */
function formatMultiplier(multiplier, decimals = 1) {
  if (multiplier === Math.floor(multiplier)) {
    return `${multiplier}x`;
  }
  return `${multiplier.toFixed(decimals)}x`;
}

/**
 * Truncate a string to a maximum length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} [suffix='...'] - Suffix to add if truncated
 * @returns {string} Truncated string
 */
function truncate(str, maxLength, suffix = '...') {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Pluralize a word based on count
 * @param {number} count - Count
 * @param {string} singular - Singular form
 * @param {string} [plural] - Plural form (defaults to singular + 's')
 * @returns {string} Pluralized string with count
 */
function pluralize(count, singular, plural) {
  const word = count === 1 ? singular : (plural || singular + 's');
  return `${count} ${word}`;
}

/**
 * Format a productivity score (0-100)
 * @param {number} score - Score value
 * @returns {Object} Formatted score with label and color
 */
function formatProductivityScore(score) {
  let label, color;
  
  if (score >= 90) {
    label = 'Excellent';
    color = '#00ff00';
  } else if (score >= 70) {
    label = 'Good';
    color = '#7CFC00';
  } else if (score >= 50) {
    label = 'Average';
    color = '#FFD700';
  } else if (score >= 30) {
    label = 'Below Average';
    color = '#FFA500';
  } else {
    label = 'Poor';
    color = '#FF4500';
  }
  
  return {
    score: Math.round(score),
    label,
    color,
    formatted: `${Math.round(score)} (${label})`
  };
}

module.exports = {
  formatNumber,
  formatNumberWithCommas,
  formatTime,
  formatMilliseconds,
  formatDuration,
  formatRelativeTime,
  formatBytes,
  formatPercentage,
  formatDate,
  formatMultiplier,
  truncate,
  pluralize,
  formatProductivityScore
};
