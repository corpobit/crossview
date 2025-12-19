import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from './AppProvider.jsx';

const OnWatchResourcesContext = createContext(null);

export const useOnWatchResources = () => {
  const context = useContext(OnWatchResourcesContext);
  if (!context) {
    throw new Error('useOnWatchResources must be used within OnWatchResourcesProvider');
  }
  return context;
};

export const OnWatchResourcesProvider = ({ children }) => {
  const { selectedContext, user } = useAppContext();
  const [watchedResources, setWatchedResources] = useState(() => {
    try {
      const saved = localStorage.getItem('onWatchResources');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('onWatchResourcesCollapsed');
    return saved === 'true';
  });
  const [updatingResources, setUpdatingResources] = useState(new Set());
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const watchedResourcesRef = useRef(watchedResources);

  const saveToLocalStorage = useCallback((resources) => {
    localStorage.setItem('onWatchResources', JSON.stringify(resources));
  }, []);

  const getResourceKey = useCallback((resource) => {
    return `${resource.apiVersion || ''}:${resource.kind || ''}:${resource.metadata?.namespace || ''}:${resource.metadata?.name || ''}`;
  }, []);

  const addResource = useCallback((resource) => {
    if (!resource || !resource.metadata || !resource.kind) {
      return false;
    }

    const key = getResourceKey(resource);
    setWatchedResources(prev => {
      if (prev.some(r => getResourceKey(r) === key)) {
        return prev;
      }
      const updated = [...prev, { ...resource, _key: key, _addedAt: Date.now() }];
      saveToLocalStorage(updated);
      return updated;
    });
    return true;
  }, [getResourceKey, saveToLocalStorage]);

  const removeResource = useCallback((resourceKey) => {
    setWatchedResources(prev => {
      const updated = prev.filter(r => r._key !== resourceKey);
      saveToLocalStorage(updated);
      return updated;
    });
  }, [saveToLocalStorage]);

  const clearAll = useCallback(() => {
    setWatchedResources([]);
    saveToLocalStorage([]);
  }, [saveToLocalStorage]);

  useEffect(() => {
    watchedResourcesRef.current = watchedResources;
  }, [watchedResources]);

  const connectWebSocket = useCallback(() => {
    if (!user || !selectedContext) return;

    const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext?.name || selectedContext;
    if (!contextName) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/watch?context=${encodeURIComponent(contextName)}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket opened, subscribing to resources');
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        const currentResources = watchedResourcesRef.current;
        if (currentResources.length > 0) {
          const resources = currentResources.map(r => ({
            apiVersion: r.apiVersion,
            kind: r.kind,
            name: r.metadata?.name,
            namespace: r.metadata?.namespace || '',
            plural: r._plural || '',
          }));

          console.log('Sending subscribe message for', resources.length, 'resources');
          ws.send(JSON.stringify({
            type: 'subscribe',
            resources: resources,
          }));
        } else {
          console.log('No resources to subscribe to');
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message.type, message.resource ? `${message.resource.kind}/${message.resource.metadata?.name}` : '');
          
          if (message.type === 'updated' && message.resource) {
            const resource = message.resource;
            const key = getResourceKey(resource);
            console.log('Updating watched resource:', key);
            
            setUpdatingResources(prev => new Set(prev).add(key));
            
            setWatchedResources(prev => {
              const found = prev.find(r => r._key === key);
              if (!found) {
                console.warn('Received update for resource not in watch list:', key);
                return prev;
              }
              const updated = prev.map(r => {
                if (r._key === key) {
                  return { ...resource, _key: key, _addedAt: r._addedAt, _plural: r._plural };
                }
                return r;
              });
              saveToLocalStorage(updated);
              return updated;
            });

            setTimeout(() => {
              setUpdatingResources(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
              });
            }, 500);
          } else if (message.type === 'deleted' && message.resource) {
            const resource = message.resource;
            const key = getResourceKey(resource);
            console.log('Resource deleted, removing from watch list:', key);
            removeResource(key);
          } else if (message.type === 'error') {
            console.error('WebSocket error:', message.error);
          }
        } catch (error) {
          console.error('Failed to parse websocket message:', error, event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        const currentResources = watchedResourcesRef.current;
        if (currentResources.length > 0 && user && selectedContext) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [user, selectedContext, getResourceKey, removeResource, saveToLocalStorage]);

  useEffect(() => {
    if (watchedResources.length === 0 || !user || !selectedContext) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      return;
    }

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [watchedResources.length, user, selectedContext, connectWebSocket]);

  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && watchedResources.length > 0) {
      const resources = watchedResources.map(r => ({
        apiVersion: r.apiVersion,
        kind: r.kind,
        name: r.metadata?.name,
        namespace: r.metadata?.namespace || '',
        plural: r._plural || '',
      }));

      console.log('Sending subscribe message for', resources.length, 'resources (connection already open)');
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        resources: resources,
      }));
    }
  }, [watchedResources]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem('onWatchResourcesCollapsed', String(newValue));
      return newValue;
    });
  }, []);

  const value = {
    watchedResources,
    addResource,
    removeResource,
    clearAll,
    isCollapsed,
    toggleCollapse,
    updatingResources,
  };

  return (
    <OnWatchResourcesContext.Provider value={value}>
      {children}
    </OnWatchResourcesContext.Provider>
  );
};
