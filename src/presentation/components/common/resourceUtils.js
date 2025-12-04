/**
 * Utility functions for resource display
 */

export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const now = new Date();
  const created = new Date(timestamp);
  const diffMs = now - created;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    const remainingMinutes = diffMinutes % 60;
    return `${diffDays}d ${remainingHours}h ${remainingMinutes}m ago`;
  } else if (diffHours > 0) {
    const remainingMinutes = diffMinutes % 60;
    return `${diffHours}h ${remainingMinutes}m ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  } else {
    return `${diffSeconds}s ago`;
  }
};

export const jsonToYaml = (obj, indent = 0) => {
  const indentStr = '  '.repeat(indent);
  
  if (obj === null || obj === undefined) {
    return 'null';
  }
  
  if (typeof obj === 'string') {
    // Escape strings that need quoting
    if (obj.includes('\n') || obj.includes(':') || obj.includes('#') || obj.includes('|') || obj.includes('&') || obj.includes('*') || obj.includes('!') || obj.includes('%') || obj.includes('@') || obj.includes('`') || obj.trim() !== obj) {
      return `"${obj.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
    }
    return obj;
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return '[]';
    }
    const lines = [];
    obj.forEach((item) => {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        // Array of objects - first property on same line as '-', rest indented
        const itemYaml = jsonToYaml(item, 0);
        const itemLines = itemYaml.split('\n').filter(line => line.trim());
        if (itemLines.length > 0) {
          lines.push(`${indentStr}- ${itemLines[0]}`);
          itemLines.slice(1).forEach(line => {
            lines.push(`${indentStr}  ${line}`);
          });
        }
      } else {
        // Array of primitives or arrays
        const itemYaml = jsonToYaml(item, 0);
        lines.push(`${indentStr}- ${itemYaml}`);
      }
    });
    return lines.join('\n');
  }
  
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return '{}';
    }
    const lines = [];
    keys.forEach((key) => {
      const value = obj[key];
      if (value === null || value === undefined) {
        lines.push(`${indentStr}${key}: null`);
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          lines.push(`${indentStr}${key}: []`);
        } else {
          lines.push(`${indentStr}${key}:`);
          value.forEach((item) => {
            if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
              // Array of objects - first property on same line as '-', rest indented
              const itemYaml = jsonToYaml(item, 0);
              const itemLines = itemYaml.split('\n').filter(line => line.trim());
              if (itemLines.length > 0) {
                lines.push(`${indentStr}  - ${itemLines[0]}`);
                itemLines.slice(1).forEach(line => {
                  lines.push(`${indentStr}    ${line}`);
                });
              }
            } else {
              // Array of primitives
              const itemYaml = jsonToYaml(item, 0);
              lines.push(`${indentStr}  - ${itemYaml}`);
            }
          });
        }
      } else if (typeof value === 'object') {
        // Nested object
        lines.push(`${indentStr}${key}:`);
        const valueYaml = jsonToYaml(value, indent + 1);
        const valueLines = valueYaml.split('\n').filter(line => line.trim());
        valueLines.forEach(line => {
          lines.push(`${indentStr}  ${line}`);
        });
      } else {
        // Primitive value
        const valueYaml = jsonToYaml(value, 0);
        lines.push(`${indentStr}${key}: ${valueYaml}`);
      }
    });
    return lines.join('\n');
  }
  
  return String(obj);
};

