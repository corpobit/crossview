package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
)

func (k *KubernetesService) GetResources(apiVersion, kind, namespace, contextName, plural string, limit *int64, continueToken string) (map[string]interface{}, error) {
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
	}

	config, err := k.GetConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to get kubernetes config: %w", err)
	}

	if apiVersion == "" {
		return nil, fmt.Errorf("apiVersion is required")
	}

	apiVersionParts := strings.Split(apiVersion, "/")
	if len(apiVersionParts) != 2 {
		return nil, fmt.Errorf("invalid apiVersion format: %s, expected group/version", apiVersion)
	}

	group := strings.TrimSpace(apiVersionParts[0])
	version := strings.TrimSpace(apiVersionParts[1])

	if group == "" {
		return nil, fmt.Errorf("invalid apiVersion format: %s, group is required", apiVersion)
	}
	if version == "" {
		return nil, fmt.Errorf("invalid apiVersion format: %s, version is required", apiVersion)
	}

	if plural == "" {
		cacheKey := fmt.Sprintf("%s/%s", apiVersion, kind)
		k.mu.RLock()
		cachedPlural, exists := k.pluralCache[cacheKey]
		k.mu.RUnlock()
		
		if exists {
			plural = cachedPlural
		} else {
			resolvedPlural, err := k.resolvePluralName(apiVersion, kind, contextName)
			if err == nil && resolvedPlural != "" {
				plural = resolvedPlural
				k.mu.Lock()
				k.pluralCache[cacheKey] = plural
				k.mu.Unlock()
			} else {
				plural = strings.ToLower(kind) + "s"
			}
		}
	}

	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}

	gvr := schema.GroupVersionResource{
		Group:    group,
		Version:  version,
		Resource: plural,
	}

	listOptions := metav1.ListOptions{}
	if continueToken != "" {
		listOptions.Continue = continueToken
	}
	if limit != nil {
		listOptions.Limit = *limit
	}

	var items []interface{}
	var continueTokenResult *string
	var remainingItemCount *int64

	if namespace != "" && namespace != "undefined" && namespace != "null" {
		list, listErr := dynamicClient.Resource(gvr).Namespace(namespace).List(context.Background(), listOptions)
		if listErr != nil {
			if strings.Contains(listErr.Error(), "404") || strings.Contains(listErr.Error(), "NotFound") || strings.Contains(listErr.Error(), "does not exist") {
				return map[string]interface{}{
					"items":              []interface{}{},
					"continueToken":      nil,
					"remainingItemCount": nil,
				}, nil
			}
			return nil, fmt.Errorf("failed to list resources: %w", listErr)
		}
		items = make([]interface{}, len(list.Items))
		for i, item := range list.Items {
			items[i] = item.UnstructuredContent()
		}
		if list.GetContinue() != "" {
			ct := list.GetContinue()
			continueTokenResult = &ct
		}
		remainingItemCount = list.GetRemainingItemCount()
	} else {
		list, listErr := dynamicClient.Resource(gvr).List(context.Background(), listOptions)
		if listErr != nil {
			if strings.Contains(listErr.Error(), "404") || strings.Contains(listErr.Error(), "NotFound") || strings.Contains(listErr.Error(), "does not exist") {
				return map[string]interface{}{
					"items":              []interface{}{},
					"continueToken":      nil,
					"remainingItemCount": nil,
				}, nil
			}
			return nil, fmt.Errorf("failed to list resources: %w", listErr)
		}
		items = make([]interface{}, len(list.Items))
		for i, item := range list.Items {
			items[i] = item.UnstructuredContent()
		}
		if list.GetContinue() != "" {
			ct := list.GetContinue()
			continueTokenResult = &ct
		}
		remainingItemCount = list.GetRemainingItemCount()
	}

	result := map[string]interface{}{
		"items": items,
	}

	if continueTokenResult != nil {
		result["continueToken"] = *continueTokenResult
	} else {
		result["continueToken"] = nil
	}

	if remainingItemCount != nil {
		result["remainingItemCount"] = *remainingItemCount
	} else {
		result["remainingItemCount"] = nil
	}

	return result, nil
}

func (k *KubernetesService) GetResource(apiVersion, kind, name, namespace, contextName, plural string) (map[string]interface{}, error) {
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
	}

	config, err := k.GetConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to get kubernetes config: %w", err)
	}

	if apiVersion == "" {
		return nil, fmt.Errorf("apiVersion is required")
	}
	if kind == "" {
		return nil, fmt.Errorf("kind is required")
	}
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}

	clientset, err := k.GetClientset()
	if err != nil {
		return nil, fmt.Errorf("failed to get clientset: %w", err)
	}

	if apiVersion == "v1" {
		if namespace != "" && namespace != "undefined" && namespace != "null" {
			switch kind {
			case "Service":
				svc, err := clientset.CoreV1().Services(namespace).Get(context.Background(), name, metav1.GetOptions{})
				if err != nil {
					return nil, fmt.Errorf("failed to get service: %w", err)
				}
				return k.objectToMap(svc), nil
			case "Pod":
				pod, err := clientset.CoreV1().Pods(namespace).Get(context.Background(), name, metav1.GetOptions{})
				if err != nil {
					return nil, fmt.Errorf("failed to get pod: %w", err)
				}
				return k.objectToMap(pod), nil
			case "ConfigMap":
				cm, err := clientset.CoreV1().ConfigMaps(namespace).Get(context.Background(), name, metav1.GetOptions{})
				if err != nil {
					return nil, fmt.Errorf("failed to get configmap: %w", err)
				}
				return k.objectToMap(cm), nil
			case "Secret":
				secret, err := clientset.CoreV1().Secrets(namespace).Get(context.Background(), name, metav1.GetOptions{})
				if err != nil {
					return nil, fmt.Errorf("failed to get secret: %w", err)
				}
				return k.objectToMap(secret), nil
			}
		} else {
			switch kind {
			case "Namespace":
				ns, err := clientset.CoreV1().Namespaces().Get(context.Background(), name, metav1.GetOptions{})
				if err != nil {
					return nil, fmt.Errorf("failed to get namespace: %w", err)
				}
				return k.objectToMap(ns), nil
			case "Node":
				node, err := clientset.CoreV1().Nodes().Get(context.Background(), name, metav1.GetOptions{})
				if err != nil {
					return nil, fmt.Errorf("failed to get node: %w", err)
				}
				return k.objectToMap(node), nil
			case "PersistentVolume":
				pv, err := clientset.CoreV1().PersistentVolumes().Get(context.Background(), name, metav1.GetOptions{})
				if err != nil {
					return nil, fmt.Errorf("failed to get persistentvolume: %w", err)
				}
				return k.objectToMap(pv), nil
			}
		}
	}

	if apiVersion == "apps/v1" && namespace != "" && namespace != "undefined" && namespace != "null" {
		switch kind {
		case "Deployment":
			deploy, err := clientset.AppsV1().Deployments(namespace).Get(context.Background(), name, metav1.GetOptions{})
			if err != nil {
				return nil, fmt.Errorf("failed to get deployment: %w", err)
			}
			return k.objectToMap(deploy), nil
		case "StatefulSet":
			sts, err := clientset.AppsV1().StatefulSets(namespace).Get(context.Background(), name, metav1.GetOptions{})
			if err != nil {
				return nil, fmt.Errorf("failed to get statefulset: %w", err)
			}
			return k.objectToMap(sts), nil
		case "DaemonSet":
			ds, err := clientset.AppsV1().DaemonSets(namespace).Get(context.Background(), name, metav1.GetOptions{})
			if err != nil {
				return nil, fmt.Errorf("failed to get daemonset: %w", err)
			}
			return k.objectToMap(ds), nil
		case "ReplicaSet":
			rs, err := clientset.AppsV1().ReplicaSets(namespace).Get(context.Background(), name, metav1.GetOptions{})
			if err != nil {
				return nil, fmt.Errorf("failed to get replicaset: %w", err)
			}
			return k.objectToMap(rs), nil
		}
	}

	apiVersionParts := strings.Split(apiVersion, "/")
	if len(apiVersionParts) != 2 {
		return nil, fmt.Errorf("invalid apiVersion format: %s, expected group/version", apiVersion)
	}

	group := strings.TrimSpace(apiVersionParts[0])
	version := strings.TrimSpace(apiVersionParts[1])

	if plural == "" {
		cacheKey := fmt.Sprintf("%s/%s", apiVersion, kind)
		k.mu.RLock()
		cachedPlural, exists := k.pluralCache[cacheKey]
		k.mu.RUnlock()
		
		if exists {
			plural = cachedPlural
		} else {
			resolvedPlural, err := k.resolvePluralName(apiVersion, kind, contextName)
			if err == nil && resolvedPlural != "" {
				plural = resolvedPlural
				k.mu.Lock()
				k.pluralCache[cacheKey] = plural
				k.mu.Unlock()
			} else {
				plural = strings.ToLower(kind) + "s"
			}
		}
	}

	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}

	gvr := schema.GroupVersionResource{
		Group:    group,
		Version:  version,
		Resource: plural,
	}

	var obj interface{}
	if namespace != "" && namespace != "undefined" && namespace != "null" {
		obj, err = dynamicClient.Resource(gvr).Namespace(namespace).Get(context.Background(), name, metav1.GetOptions{})
	} else {
		obj, err = dynamicClient.Resource(gvr).Get(context.Background(), name, metav1.GetOptions{})
	}

	if err != nil {
		if strings.Contains(err.Error(), "404") || strings.Contains(err.Error(), "NotFound") {
			return nil, fmt.Errorf("resource not found: %s/%s", kind, name)
		}
		return nil, fmt.Errorf("failed to get resource: %w", err)
	}

	if unstructuredObj, ok := obj.(*unstructured.Unstructured); ok {
		data, err := json.Marshal(unstructuredObj)
		if err != nil {
			return unstructuredObj.UnstructuredContent(), nil
		}
		var result map[string]interface{}
		if err := json.Unmarshal(data, &result); err != nil {
			return unstructuredObj.UnstructuredContent(), nil
		}
		return result, nil
	}

	return k.objectToMap(obj), nil
}

