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
    let yaml = '';
    obj.forEach((item) => {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        // Array of objects - first property on same line as '-', rest indented
        const itemYaml = jsonToYaml(item, 0);
        const lines = itemYaml.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
          yaml += `${indentStr}- ${lines[0]}\n`;
          lines.slice(1).forEach(line => {
            yaml += `${indentStr}  ${line}\n`;
          });
        }
      } else {
        // Array of primitives or arrays
        const itemYaml = jsonToYaml(item, 0);
        yaml += `${indentStr}- ${itemYaml}\n`;
      }
    });
    return yaml.trimEnd();
  }
  
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return '{}';
    }
    let yaml = '';
    keys.forEach((key) => {
      const value = obj[key];
      if (value === null || value === undefined) {
        yaml += `${indentStr}${key}: null\n`;
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          yaml += `${indentStr}${key}: []\n`;
        } else {
          yaml += `${indentStr}${key}:\n`;
          value.forEach((item) => {
            if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
              // Array of objects - first property on same line as '-', rest indented
              // Generate YAML with base indentation, then adjust for array item format
              const itemYaml = jsonToYaml(item, 0);
              const lines = itemYaml.split('\n').filter(line => line.trim());
              if (lines.length > 0) {
                // First line: '- key: value' at indent + 2
                yaml += `${indentStr}  - ${lines[0]}\n`;
                // Subsequent lines: '  key: value' at indent + 4
                lines.slice(1).forEach(line => {
                  yaml += `${indentStr}    ${line}\n`;
                });
              }
            } else {
              // Array of primitives
              const itemYaml = jsonToYaml(item, 0);
              yaml += `${indentStr}  - ${itemYaml}\n`;
            }
          });
        }
      } else if (typeof value === 'object') {
        // Nested object
        yaml += `${indentStr}${key}:\n`;
        const valueYaml = jsonToYaml(value, indent + 1);
        const lines = valueYaml.split('\n').filter(line => line.trim());
        lines.forEach(line => {
          yaml += `${indentStr}  ${line}\n`;
        });
      } else {
        // Primitive value
        const valueYaml = jsonToYaml(value, 0);
        yaml += `${indentStr}${key}: ${valueYaml}\n`;
      }
    });
    return yaml.trimEnd();
  }
  
  return String(obj);
};

