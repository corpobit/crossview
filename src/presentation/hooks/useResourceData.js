import { useEffect, useState } from 'react';
import { useAppContext } from '../providers/AppProvider.jsx';

export const useResourceData = (resource) => {
  const { kubernetesRepository, selectedContext } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [fullResource, setFullResource] = useState(resource);
  const [relatedResources, setRelatedResources] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    const loadFullResource = async () => {
      if (!resource || !selectedContext) return;
      
      try {
        setLoading(true);
        const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext.name || selectedContext;
        
        if (resource.apiVersion && resource.kind && resource.name) {
          let full = resource;
          try {
            const plural = resource.plural || null;
            const namespace = resource.namespace && resource.namespace !== 'undefined' ? resource.namespace : null;
            full = await kubernetesRepository.getResource(
              resource.apiVersion,
              resource.kind,
              resource.name,
              namespace,
              contextName,
              plural
            );
            setFullResource(full);
          } catch (error) {
            console.warn('[useResourceData] Failed to load full resource, using provided resource:', error.message);
            setFullResource(resource);
            full = resource;
          }
          
          const related = extractRelations(full, resource);
          setRelatedResources(related);
          await loadEvents(full, resource, contextName);
        }
      } catch (error) {
        console.error('[useResourceData] Error loading resource:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFullResource();
  }, [resource, selectedContext, kubernetesRepository]);

  const mergeSpec = (full, originalResource) => {
    if (!full.spec) {
      full.spec = originalResource?.spec || {};
    }
    if (originalResource) {
      full.spec = {
        ...full.spec,
        resourceRef: full.spec.resourceRef || originalResource.resourceRef || originalResource.spec?.resourceRef,
        compositionRef: full.spec.compositionRef || originalResource.compositionRef || originalResource.spec?.compositionRef,
        writeConnectionSecretToRef: full.spec.writeConnectionSecretToRef || originalResource.writeConnectionSecretToRef || originalResource.spec?.writeConnectionSecretToRef,
        resourceRefs: full.spec.resourceRefs || originalResource.resourceRefs || originalResource.spec?.resourceRefs || [],
        claimRef: full.spec.claimRef || originalResource.claimRef || originalResource.spec?.claimRef,
        writeConnectionSecretsTo: full.spec.writeConnectionSecretsTo || originalResource.writeConnectionSecretsTo || originalResource.spec?.writeConnectionSecretsTo,
      };
    }
  };

  const mergeMetadata = (full, originalResource) => {
    if (!full.metadata) {
      full.metadata = {};
    }
    if (originalResource) {
      full.metadata = {
        ...full.metadata,
        name: full.metadata.name || originalResource.name,
        namespace: full.metadata.namespace || originalResource.namespace,
        labels: full.metadata.labels || originalResource.labels || originalResource.metadata?.labels || {},
        ownerReferences: full.metadata.ownerReferences || originalResource.metadata?.ownerReferences || []
      };
    }
  };

  const extractRelations = (full, originalResource) => {
    const related = [];
    
    mergeSpec(full, originalResource);
    mergeMetadata(full, originalResource);
    
    const resourceRef = full.spec?.resourceRef || full.resourceRef || originalResource?.resourceRef || originalResource?.spec?.resourceRef;
    if (resourceRef) {
      related.push({
        type: 'Composite Resource',
        apiVersion: resourceRef.apiVersion,
        kind: resourceRef.kind,
        name: resourceRef.name,
        namespace: null,
        plural: null,
      });
    }
    
    const compositionRef = full.spec?.compositionRef || full.compositionRef || originalResource?.compositionRef || originalResource?.spec?.compositionRef;
    if (compositionRef) {
      const compName = typeof compositionRef === 'string' ? compositionRef : (compositionRef.name || compositionRef);
      related.push({
        type: 'Composition',
        apiVersion: 'apiextensions.crossplane.io/v1',
        kind: 'Composition',
        name: compName,
        namespace: null,
      });
    }
    
    if (full.spec?.claimRef) {
      related.push({
        type: 'Claim',
        apiVersion: full.spec.claimRef.apiVersion,
        kind: full.spec.claimRef.kind,
        name: full.spec.claimRef.name,
        namespace: full.spec.claimRef.namespace,
      });
    }
    
    if (full.spec?.writeConnectionSecretToRef) {
      related.push({
        type: 'Secret',
        apiVersion: 'v1',
        kind: 'Secret',
        name: full.spec.writeConnectionSecretToRef.name,
        namespace: full.spec.writeConnectionSecretToRef.namespace || originalResource.namespace,
      });
    }
    
    if (full.spec?.writeConnectionSecretsTo) {
      full.spec.writeConnectionSecretsTo.forEach((secretRef) => {
        related.push({
          type: 'Secret',
          apiVersion: 'v1',
          kind: 'Secret',
          name: secretRef.name,
          namespace: secretRef.namespace || originalResource.namespace,
        });
      });
    }
    
    if (full.spec?.resourceRefs) {
      const parentNamespace = full.spec?.claimRef?.namespace || full.metadata?.namespace || originalResource.namespace || null;
      full.spec.resourceRefs.forEach((ref) => {
        let refNamespace = ref.namespace;
        if (!refNamespace && parentNamespace) {
          const coreKinds = ['Deployment', 'Service', 'Pod', 'ConfigMap', 'Secret', 'ReplicaSet', 'StatefulSet', 'DaemonSet'];
          if (coreKinds.includes(ref.kind)) {
            refNamespace = parentNamespace;
          }
        }
        related.push({
          type: 'Managed Resource',
          apiVersion: ref.apiVersion,
          kind: ref.kind,
          name: ref.name,
          namespace: refNamespace || null,
        });
      });
    }
    
    if (full.metadata?.ownerReferences) {
      full.metadata.ownerReferences.forEach((ownerRef) => {
        if (ownerRef.controller) {
          const ownerNamespace = ownerRef.kind && ownerRef.kind.startsWith('X') ? null : (full.metadata?.namespace || originalResource.namespace || null);
          related.push({
            type: 'Owner',
            apiVersion: ownerRef.apiVersion,
            kind: ownerRef.kind,
            name: ownerRef.name,
            namespace: ownerNamespace,
          });
        } else if (ownerRef.apiVersion?.includes('crossplane.io')) {
          const ownerNamespace = ownerRef.kind && ownerRef.kind.startsWith('X') ? null : (full.metadata?.namespace || originalResource.namespace || null);
          related.push({
            type: 'Owner',
            apiVersion: ownerRef.apiVersion,
            kind: ownerRef.kind,
            name: ownerRef.name,
            namespace: ownerNamespace,
          });
        }
      });
    }
    
    const labels = full.metadata?.labels || {};
    
    if (labels['crossplane.io/composite']) {
      const compositeName = labels['crossplane.io/composite'];
      const ownerRef = full.metadata?.ownerReferences?.find(ref => ref.kind && ref.kind.startsWith('X') && ref.name === compositeName);
      const compositeApiVersion = ownerRef?.apiVersion || 'unknown';
      const compositeKind = ownerRef?.kind || 'CompositeResource';
      
      related.push({
        type: 'Composite Resource (Owner)',
        apiVersion: compositeApiVersion,
        kind: compositeKind,
        name: compositeName,
        namespace: null,
      });
    }
    
    if (labels['crossplane.io/claim-name'] && labels['crossplane.io/claim-namespace']) {
      const claimName = labels['crossplane.io/claim-name'];
      const claimNamespace = labels['crossplane.io/claim-namespace'];
      const ownerRef = full.metadata?.ownerReferences?.find(ref => ref.kind && ref.kind.startsWith('X'));
      const claimApiVersion = ownerRef?.apiVersion || full.apiVersion || originalResource.apiVersion || 'unknown';
      const claimKind = ownerRef?.kind ? ownerRef.kind.substring(1) : 
                       (full.kind ? full.kind.substring(1) : 
                       (originalResource.kind ? originalResource.kind.substring(1) : 'Claim'));
      
      related.push({
        type: 'Claim (Owner)',
        apiVersion: claimApiVersion,
        kind: claimKind,
        name: claimName,
        namespace: claimNamespace,
      });
    }
    
    if (full.kind === 'CompositeResourceDefinition' || originalResource.kind === 'CompositeResourceDefinition') {
      if (full.spec?.defaultCompositionRef?.name) {
        related.push({
          type: 'Default Composition',
          apiVersion: 'apiextensions.crossplane.io/v1',
          kind: 'Composition',
          name: full.spec.defaultCompositionRef.name,
          namespace: null,
        });
      }
    }
    
    const processedRefs = new Set(['resourceRef', 'claimRef', 'compositionRef', 'compositionRevisionRef', 'writeConnectionSecretToRef', 'writeConnectionSecretsTo', 'resourceRefs', 'defaultCompositionRef']);
    
    if (full.spec) {
      Object.keys(full.spec).forEach((key) => {
        if ((key.endsWith('Ref') || key.endsWith('Refs')) && full.spec[key] && !processedRefs.has(key)) {
          const refValue = full.spec[key];
          const refType = key.replace(/Refs?$/, '').replace(/([A-Z])/g, ' $1').trim() || 'Resource';
          
          const addRef = (ref) => {
              if (ref && ref.name) {
                related.push({
                  type: refType,
                  apiVersion: ref.apiVersion || 'unknown',
                  kind: ref.kind || refType,
                  name: ref.name,
                  namespace: ref.namespace || null,
                });
              }
          };
          
          if (Array.isArray(refValue)) {
            refValue.forEach(addRef);
          } else if (refValue && typeof refValue === 'object' && refValue.name) {
            addRef(refValue);
          }
        }
      });
    }
    
    const seen = new Set();
    return related.filter(rel => {
      const key = `${rel.type}-${rel.name}-${rel.namespace || 'null'}`;
      if (seen.has(key)) return false;
        seen.add(key);
      return true;
    });
  };

  const loadEvents = async (full, originalResource, contextName) => {
    let resourceNamespace = full.metadata?.namespace || originalResource.namespace || full.namespace || null;
    if (resourceNamespace === 'undefined' || resourceNamespace === 'null') {
      resourceNamespace = null;
    }
    
    const resourceKind = full.kind || originalResource.kind;
    const resourceName = full.metadata?.name || originalResource.name || full.name;
    
    const clusterScopedKinds = ['CompositeResourceDefinition', 'Composition', 'Provider', 'ProviderConfig', 'ClusterRole', 'ClusterRoleBinding', 'Namespace', 'Node', 'PersistentVolume'];
    const isCompositeResource = resourceKind && resourceKind.startsWith('X') && !resourceNamespace;
    const isClusterScoped = clusterScopedKinds.includes(resourceKind) || isCompositeResource;
    
    const allEvents = [];
    
    if (!isClusterScoped && resourceKind && resourceName) {
      if (resourceNamespace) {
        try {
          setEventsLoading(true);
          console.log('[useResourceData] Loading events for resource:', { kind: resourceKind, name: resourceName, namespace: resourceNamespace });
          const eventsData = await kubernetesRepository.getEvents(
            resourceKind,
            resourceName,
            resourceNamespace,
            contextName
          );
          console.log('[useResourceData] Events loaded:', { count: eventsData.length, events: eventsData });
          allEvents.push(...eventsData);
        } catch (error) {
          console.warn('[useResourceData] Failed to load events for resource:', error);
        } finally {
          setEventsLoading(false);
        }
      } else {
        console.warn('[useResourceData] Skipping events - no namespace for resource:', { kind: resourceKind, name: resourceName });
      }
    }
    
    const resourceRef = full.spec?.resourceRef || full.resourceRef || originalResource?.resourceRef || originalResource?.spec?.resourceRef;
    if (resourceRef && resourceRef.kind && resourceRef.name && resourceNamespace) {
          try {
            const compositeEvents = await kubernetesRepository.getEvents(
              resourceRef.kind,
              resourceRef.name,
          resourceNamespace,
              contextName
            );
            if (compositeEvents.length > 0) {
              allEvents.push(...compositeEvents);
        }
      } catch (error) {
        console.warn('[useResourceData] Failed to load events for Composite Resource:', error);
      }
    }
    
    const uniqueEvents = [];
    const seen = new Set();
    allEvents.forEach(event => {
      const key = `${event.type}-${event.reason}-${event.message}-${event.lastTimestamp}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueEvents.push(event);
      }
    });
    
    uniqueEvents.sort((a, b) => {
      const timeA = a.lastTimestamp || a.firstTimestamp || '';
      const timeB = b.lastTimestamp || b.firstTimestamp || '';
      return timeB.localeCompare(timeA);
    });
    
    setEvents(uniqueEvents);
    setEventsLoading(false);
  };

  return {
    loading,
    fullResource,
    relatedResources,
    events,
    eventsLoading,
  };
};
