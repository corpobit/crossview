package services

import (
	"context"
	"fmt"
	"sync"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

func (k *KubernetesService) GetManagedResources(contextName string, forceRefresh bool) (map[string]interface{}, error) {
	if contextName != "" {
		if err := k.SetContext(contextName); err != nil {
			return nil, fmt.Errorf("failed to set context: %w", err)
		}
	} else {
		currentContext := k.GetCurrentContext()
		if currentContext == "" {
			if err := k.SetContext(""); err != nil {
				return nil, fmt.Errorf("failed to initialize kubernetes context: %w", err)
			}
		}
		contextName = k.GetCurrentContext()
	}

	// Check cache if not forcing refresh
	if !forceRefresh {
		k.mu.RLock()
		if cachedResult, exists := k.managedResourcesCache[contextName]; exists {
			if cacheTime, timeExists := k.managedResourcesCacheTime[contextName]; timeExists {
				if time.Since(cacheTime) < k.managedResourcesCacheTTL {
					k.logger.Infof("Returning cached managed resources for context: %s", contextName)
					// Create a copy with fromCache: true
					result := make(map[string]interface{})
					for key, value := range cachedResult {
						result[key] = value
					}
					result["fromCache"] = true
					k.mu.RUnlock()
					return result, nil
				}
			}
		}
		k.mu.RUnlock()
	}

	k.logger.Infof("Fetching fresh managed resources for context: %s (forceRefresh: %t)", contextName, forceRefresh)

	config, err := k.GetConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to get kubernetes config: %w", err)
	}

	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}

	providersResult, err := k.GetResources("pkg.crossplane.io/v1", "Provider", "", contextName, "", nil, "")
	if err != nil {
		return nil, fmt.Errorf("failed to get providers: %w", err)
	}
	providers, _ := providersResult["items"].([]interface{})
	if providers == nil {
		providers = []interface{}{}
	}

	revisionsResult, err := k.GetResources("pkg.crossplane.io/v1", "ProviderRevision", "", contextName, "", nil, "")
	if err != nil {
		return nil, fmt.Errorf("failed to get provider revisions: %w", err)
	}
	revisions, _ := revisionsResult["items"].([]interface{})
	if revisions == nil {
		revisions = []interface{}{}
	}

	revisionToProvider := make(map[string]string)
	for _, rev := range revisions {
		revMap, _ := rev.(map[string]interface{})
		if revMap == nil {
			continue
		}
		metadata, _ := revMap["metadata"].(map[string]interface{})
		if metadata == nil {
			continue
		}
		revName, _ := metadata["name"].(string)
		ownerRefs, _ := metadata["ownerReferences"].([]interface{})
		for _, ownerRef := range ownerRefs {
			owner, _ := ownerRef.(map[string]interface{})
			if owner == nil {
				continue
			}
			ownerKind, _ := owner["kind"].(string)
			ownerAPIVersion, _ := owner["apiVersion"].(string)
			ownerName, _ := owner["name"].(string)
			if ownerKind == "Provider" && ownerAPIVersion == "pkg.crossplane.io/v1" {
				for _, prov := range providers {
					provMap, _ := prov.(map[string]interface{})
					if provMap == nil {
						continue
					}
					provMetadata, _ := provMap["metadata"].(map[string]interface{})
					if provMetadata == nil {
						continue
					}
					provName, _ := provMetadata["name"].(string)
					if provName == ownerName {
						revisionToProvider[revName] = ownerName
						break
					}
				}
			}
		}
	}

	crdGVR := schema.GroupVersionResource{
		Group:    "apiextensions.k8s.io",
		Version:  "v1",
		Resource: "customresourcedefinitions",
	}
	crdList, err := dynamicClient.Resource(crdGVR).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list CRDs: %w", err)
	}

	providerCRDs := make(map[string][]map[string]interface{})
	for _, crdItem := range crdList.Items {
		crd := crdItem.UnstructuredContent()
		metadata, _ := crd["metadata"].(map[string]interface{})
		if metadata == nil {
			continue
		}
		ownerRefs, _ := metadata["ownerReferences"].([]interface{})
		for _, ownerRef := range ownerRefs {
			owner, _ := ownerRef.(map[string]interface{})
			if owner == nil {
				continue
			}
			ownerKind, _ := owner["kind"].(string)
			ownerAPIVersion, _ := owner["apiVersion"].(string)
			ownerName, _ := owner["name"].(string)

			var providerName string
			if ownerKind == "Provider" && ownerAPIVersion == "pkg.crossplane.io/v1" {
				for _, prov := range providers {
					provMap, _ := prov.(map[string]interface{})
					if provMap == nil {
						continue
					}
					provMetadata, _ := provMap["metadata"].(map[string]interface{})
					if provMetadata == nil {
						continue
					}
					provName, _ := provMetadata["name"].(string)
					if provName == ownerName {
						providerName = ownerName
						break
					}
				}
			} else if ownerKind == "ProviderRevision" && ownerAPIVersion == "pkg.crossplane.io/v1" {
				providerName = revisionToProvider[ownerName]
			}

			if providerName != "" {
				if providerCRDs[providerName] == nil {
					providerCRDs[providerName] = []map[string]interface{}{}
				}
				providerCRDs[providerName] = append(providerCRDs[providerName], crd)
				break
			}
		}
	}

	mrdList := make([]map[string]interface{}, 0)
	for _, crds := range providerCRDs {
		for _, crd := range crds {
			spec, _ := crd["spec"].(map[string]interface{})
			if spec == nil {
				continue
			}
			names, _ := spec["names"].(map[string]interface{})
			if names == nil {
				continue
			}
			kind, _ := names["kind"].(string)
			if kind == "ProviderConfig" || kind == "ProviderConfigUsage" {
				continue
			}
			mrdList = append(mrdList, crd)
		}
	}

	type resourceResult struct {
		items []interface{}
		err   error
	}

	resourceChan := make(chan resourceResult, len(mrdList))
	var wg sync.WaitGroup

	for _, mrd := range mrdList {
		spec, _ := mrd["spec"].(map[string]interface{})
		if spec == nil {
			continue
		}

		group, _ := spec["group"].(string)
		if group == "" {
			continue
		}

		versions, _ := spec["versions"].([]interface{})
		var version string
		if len(versions) > 0 {
			if v, ok := versions[0].(map[string]interface{}); ok {
				version, _ = v["name"].(string)
			}
		}
		if version == "" {
			if v, ok := spec["version"].(string); ok {
				version = v
			}
		}
		if version == "" {
			version = "v1"
		}

		names, _ := spec["names"].(map[string]interface{})
		plural, _ := names["plural"].(string)
		kind, _ := names["kind"].(string)
		if plural == "" || kind == "" {
			continue
		}

		apiVersion := fmt.Sprintf("%s/%s", group, version)

		wg.Add(1)
		go func(apiVer, resourceKind, pl string) {
			defer wg.Done()
			result, err := k.GetResources(apiVer, resourceKind, "", contextName, pl, nil, "")
			if err != nil {
				resourceChan <- resourceResult{items: nil, err: err}
				return
			}

			items, _ := result["items"].([]interface{})
			resultItems := make([]interface{}, 0)
			if items != nil {
				for _, item := range items {
					if itemMap, ok := item.(map[string]interface{}); ok {
						itemMapCopy := make(map[string]interface{})
						for key, val := range itemMap {
							itemMapCopy[key] = val
						}
						itemMapCopy["apiVersion"] = apiVer
						itemMapCopy["kind"] = resourceKind
						resultItems = append(resultItems, itemMapCopy)
					}
				}
			}
			resourceChan <- resourceResult{items: resultItems, err: nil}
		}(apiVersion, kind, plural)
	}

	go func() {
		wg.Wait()
		close(resourceChan)
	}()

	allResources := make([]interface{}, 0)
	for result := range resourceChan {
		if result.err == nil && result.items != nil {
			allResources = append(allResources, result.items...)
		}
	}

	// Cache the results
	result := map[string]interface{}{
		"items":     allResources,
		"fromCache": false,
	}

	k.mu.Lock()
	k.managedResourcesCache[contextName] = result
	k.managedResourcesCacheTime[contextName] = time.Now()
	k.mu.Unlock()

	k.logger.Infof("Cached managed resources for context: %s (%d items)", contextName, len(allResources))

	return result, nil
}

