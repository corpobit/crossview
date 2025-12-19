import { useState, useEffect, useRef } from 'react';
import { FiX, FiChevronRight, FiChevronLeft, FiTrash2, FiRefreshCw, FiEye } from 'react-icons/fi';
import { useOnWatchResources } from '../../providers/OnWatchResourcesProvider.jsx';
import { getStatusColor, getStatusText } from '../../utils/resourceStatus.js';
import { getBorderColor, getBackgroundColor, getTextColor, colors } from '../../utils/theme.js';
import { useAppContext } from '../../providers/AppProvider.jsx';

export const OnWatchResourcesSlideout = () => {
  const {
    watchedResources,
    removeResource,
    clearAll,
    isCollapsed,
    toggleCollapse,
    updatingResources,
  } = useOnWatchResources();
  const { colorMode } = useAppContext();
  const [selectedResourceKey, setSelectedResourceKey] = useState(null);
  const isMountedRef = useRef(true);
  const borderColor = getBorderColor(colorMode);
  const isDark = colorMode === 'dark';
  
  // Use theme colors matching sidebar
  const bgColor = getBackgroundColor(colorMode, 'primary'); // white in light, #1a1a1a in dark
  const headerBg = getBackgroundColor(colorMode, 'primary'); // Same as main background
  const textColor = getTextColor(colorMode, 'primary'); // #111111 in light, #e5e5e5 in dark
  const textSecondary = colors.sidebar[colorMode].inactiveText; // #6b7280 in light, #9ca3af in dark
  const hoverBg = colors.sidebar[colorMode].hoverBg; // rgba(0, 194, 255, 0.05) in light, rgba(255, 255, 255, 0.05) in dark
  const selectedBg = getBackgroundColor(colorMode, 'secondary'); // #f8f9fa in light, #242424 in dark

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Auto-select first resource if none selected, or update selection if current selection was removed
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    // Only run if component is mounted and has resources
    if (watchedResources.length === 0) {
      if (isMountedRef.current) {
        setSelectedResourceKey(null);
      }
      return;
    }
    
    // Use requestAnimationFrame to avoid state updates during render
    requestAnimationFrame(() => {
      if (!isMountedRef.current) return;
      
      if (watchedResources.length === 0) {
        setSelectedResourceKey(null);
        return;
      }
      
      if (!selectedResourceKey || !watchedResources.find(r => r._key === selectedResourceKey)) {
        if (watchedResources[0]?._key) {
          setSelectedResourceKey(watchedResources[0]._key);
        }
      }
    });
  }, [watchedResources.length, selectedResourceKey]);

  if (watchedResources.length === 0) {
    return null;
  }

  const selectedResource = watchedResources.find(r => r._key === selectedResourceKey) || (watchedResources.length > 0 ? watchedResources[0] : null);
  const sidebarColors = colors.sidebar[colorMode];

  // Handle resource removal - select next available if current was removed
  const handleRemoveResource = (key) => {
    const currentIndex = watchedResources.findIndex(r => r._key === key);
    const isSelected = selectedResourceKey === key;
    
    // Calculate what the next selection should be before removing
    const remaining = watchedResources.filter(r => r._key !== key);
    let nextSelection = null;
    
    if (isSelected && remaining.length > 0) {
      const nextIndex = currentIndex < remaining.length ? currentIndex : remaining.length - 1;
      nextSelection = remaining[nextIndex]._key;
    }
    
    // Remove the resource first
    removeResource(key);
    
    // Update selection after removal in next tick to avoid state update during render
    if (isSelected) {
      requestAnimationFrame(() => {
        if (!isMountedRef.current) return;
        if (nextSelection !== null) {
          setSelectedResourceKey(nextSelection);
        } else {
          setSelectedResourceKey(null);
        }
      });
    }
  };

  const statusColorMap = {
    green: colors.status.green,
    red: colors.status.red,
    yellow: colors.status.yellow,
    gray: colors.status.gray,
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          right: isCollapsed ? '0' : '400px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1001,
          transition: 'right 0.3s ease',
        }}
      >
        <button
          onClick={toggleCollapse}
          aria-label={isCollapsed ? 'Show OnWatch Resources' : 'Hide OnWatch Resources'}
          style={{
            background: colors.accent.blue.primary,
            color: 'white',
            border: 'none',
            borderRadius: '6px 0 0 6px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            minHeight: '60px',
            width: '40px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: '8px 4px',
          }}
        >
          <FiEye size={18} />
          <span style={{ 
            fontSize: '11px', 
            fontWeight: 700,
            lineHeight: 1,
          }}>
            {watchedResources.length}
          </span>
        </button>
      </div>
      <div
        style={{
          position: 'fixed',
          right: isCollapsed ? '-400px' : '0',
          top: '64px',
          bottom: '0',
          width: '400px',
          background: bgColor,
          borderLeft: `1px solid ${borderColor}`,
          transition: 'right 0.3s ease',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            background: headerBg,
            padding: '16px',
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: textColor }}>OnWatch Resources</span>
            <span
              style={{
                background: colors.accent.blue.primary,
                color: 'white',
                borderRadius: '9999px',
                padding: '2px 8px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {watchedResources.length}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {watchedResources.length > 0 && (
              <button
                onClick={clearAll}
                aria-label="Clear All"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: textSecondary,
                }}
                title="Clear All"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = getTextColor(colorMode, 'primary');
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = textSecondary;
                }}
              >
                <FiTrash2 size={16} />
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div
            style={{
              flex: selectedResource ? '0 1 auto' : '1',
              maxHeight: selectedResource ? '50%' : '100%',
              minHeight: 0,
              overflowY: 'auto',
              padding: '8px',
              borderBottom: selectedResource ? `1px solid ${borderColor}` : 'none',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {watchedResources.map((resource) => {
                const key = resource._key;
                const isSelected = selectedResourceKey === key || (!selectedResourceKey && resource === watchedResources[0]);
                const isUpdating = updatingResources.has(key);
                const name = resource.metadata?.name || 'Unknown';
                const kind = resource.kind || 'Unknown';
                const namespace = resource.metadata?.namespace || '';
                const conditions = resource.status?.conditions || [];
                const statusColor = getStatusColor(conditions, kind);
                const statusText = getStatusText(conditions, kind);

                return (
                  <div
                    key={key}
                    onClick={() => setSelectedResourceKey(key)}
                    style={{
                      padding: '12px',
                      borderBottom: `1px solid ${borderColor}`,
                      background: isSelected 
                        ? selectedBg
                        : 'transparent',
                      cursor: 'pointer',
                      borderLeft: isSelected ? `3px solid ${colors.accent.blue.primary}` : '3px solid transparent',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      if (isSelected) {
                        e.currentTarget.style.background = getBackgroundColor(colorMode, 'tertiary');
                      } else {
                        e.currentTarget.style.background = hoverBg;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isSelected 
                        ? selectedBg
                        : 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ 
                              fontSize: '14px', 
                              fontWeight: 600, 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              whiteSpace: 'nowrap',
                              color: textColor
                            }}>
                              {name}
                            </span>
                            {isUpdating && (
                              <div
                                style={{
                                  width: '12px',
                                  height: '12px',
                                  animation: 'spin 1s linear infinite',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <FiRefreshCw size={12} color={colors.accent.blue.primary} />
                              </div>
                            )}
                          </div>
                          <span style={{ fontSize: '12px', color: textSecondary }}>
                            {kind}
                          </span>
                          {namespace && (
                            <span style={{ fontSize: '12px', color: textSecondary }}>
                              {namespace}
                            </span>
                          )}
                          {statusText && statusText !== 'Unknown' && (
                            <span
                              style={{
                                background: statusColorMap[statusColor] || colors.status.gray,
                                color: 'white',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '11px',
                                width: 'fit-content',
                                fontWeight: 600,
                              }}
                            >
                              {statusText}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveResource(key);
                          }}
                          aria-label="Unwatch"
                          title="Unwatch resource"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: colors.status.red,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = colors.accent.red.dark;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = colors.status.red;
                          }}
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedResource && (
            <div
              style={{
                flex: '1',
                overflowY: 'auto',
                padding: '16px',
                background: headerBg,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: textColor }}>
                    {selectedResource.metadata?.name || 'Unknown'}
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: colors.accent.blue.primary,
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {selectedResource.kind}
                    </span>
                    {selectedResource.metadata?.namespace && (
                      <span
                        style={{
                          background: getTextColor(colorMode, 'tertiary'),
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {selectedResource.metadata.namespace}
                      </span>
                    )}
                    {(() => {
                      const conditions = selectedResource.status?.conditions || [];
                      const statusColor = getStatusColor(conditions, selectedResource.kind);
                      const statusText = getStatusText(conditions, selectedResource.kind);
                      if (statusText && statusText !== 'Unknown') {
                        return (
                          <span
                            style={{
                              background: statusColorMap[statusColor] || '#a0aec0',
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                            }}
                          >
                            {statusText}
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                <div
                  style={{
                    height: '1px',
                    background: borderColor,
                    margin: '8px 0',
                  }}
                />

                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: textColor }}>Status Conditions</h4>
                  {selectedResource.status?.conditions && selectedResource.status.conditions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {selectedResource.status.conditions.map((condition, idx) => {
                        const isReady = condition.status === 'True';
                        const isFalse = condition.status === 'False';
                        const statusColor = isReady ? colors.status.green : isFalse ? colors.status.red : colors.status.yellow;
                        const conditionBg = isDark 
                          ? getBackgroundColor(colorMode, 'secondary') // Use secondary background in dark
                          : getBackgroundColor(colorMode, 'secondary'); // Use secondary background in light
                        const conditionBorder = statusColor;
                        const conditionText = getTextColor(colorMode, 'primary');
                        return (
                          <div
                            key={idx}
                            style={{
                              padding: '16px',
                              background: conditionBg,
                              borderRadius: '6px',
                              border: `1px solid ${conditionBorder}`,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ 
                                fontSize: '14px', 
                                fontWeight: 600, 
                                color: conditionText
                              }}>
                                {condition.type}
                              </span>
                              <span
                                style={{
                                  background: isReady ? colors.status.green : isFalse ? colors.status.red : colors.status.yellow,
                                  color: 'white',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                }}
                              >
                                {condition.status}
                              </span>
                            </div>
                            {condition.reason && (
                              <div style={{ fontSize: '12px', color: textSecondary, marginBottom: '4px' }}>
                                Reason: {condition.reason}
                              </div>
                            )}
                            {condition.message && (
                              <div style={{ fontSize: '12px', color: textSecondary }}>
                                {condition.message}
                              </div>
                            )}
                            {condition.lastTransitionTime && (
                              <div style={{ fontSize: '11px', color: textSecondary, marginTop: '8px' }}>
                                Last Transition: {new Date(condition.lastTransitionTime).toLocaleString()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', background: bgColor, borderRadius: '6px' }}>
                      <span style={{ color: textSecondary }}>No status conditions available</span>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    height: '1px',
                    background: borderColor,
                    margin: '8px 0',
                  }}
                />

                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: textColor }}>Overview</h4>
                  <div style={{ padding: '16px', background: bgColor, borderRadius: '6px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                      {selectedResource.metadata?.name && (
                        <div style={{ padding: '12px', background: getBackgroundColor(colorMode, 'primary'), borderRadius: '6px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: textSecondary, marginBottom: '4px' }}>Name</div>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: textColor }}>
                            {selectedResource.metadata.name}
                          </div>
                        </div>
                      )}
                      {selectedResource.metadata?.namespace && (
                        <div style={{ padding: '12px', background: getBackgroundColor(colorMode, 'primary'), borderRadius: '6px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: textSecondary, marginBottom: '4px' }}>Namespace</div>
                          <div style={{ fontSize: '14px', color: textColor }}>
                            {selectedResource.metadata.namespace}
                          </div>
                        </div>
                      )}
                      {selectedResource.metadata?.uid && (
                        <div style={{ padding: '12px', background: getBackgroundColor(colorMode, 'primary'), borderRadius: '6px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: textSecondary, marginBottom: '4px' }}>UID</div>
                          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: textSecondary }}>
                            {selectedResource.metadata.uid}
                          </div>
                        </div>
                      )}
                      {selectedResource.metadata?.creationTimestamp && (
                        <div style={{ padding: '12px', background: getBackgroundColor(colorMode, 'primary'), borderRadius: '6px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: textSecondary, marginBottom: '4px' }}>Created</div>
                          <div style={{ fontSize: '14px', color: textColor }}>
                            {new Date(selectedResource.metadata.creationTimestamp).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <style>
          {`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </>
  );
};
