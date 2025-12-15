package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

func (k *KubernetesService) resolvePluralName(apiVersion, kind, contextName string) (string, error) {
	if contextName != "" {
		if err := k.SetContext(contextName); err != nil {
			return "", err
		}
	}

	config, err := k.GetConfig()
	if err != nil {
		return "", err
	}

	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return "", err
	}

	apiVersionParts := strings.Split(apiVersion, "/")
	if len(apiVersionParts) != 2 {
		return "", fmt.Errorf("invalid apiVersion format")
	}

	group := strings.TrimSpace(apiVersionParts[0])

	crdGVR := schema.GroupVersionResource{
		Group:    "apiextensions.k8s.io",
		Version:  "v1",
		Resource: "customresourcedefinitions",
	}

	crdList, err := dynamicClient.Resource(crdGVR).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return "", err
	}

	for _, crdItem := range crdList.Items {
		crd := crdItem.UnstructuredContent()
		spec, _ := crd["spec"].(map[string]interface{})
		if spec == nil {
			continue
		}

		crdGroup, _ := spec["group"].(string)
		if crdGroup != group {
			continue
		}

		names, _ := spec["names"].(map[string]interface{})
		if names == nil {
			continue
		}

		crdKind, _ := names["kind"].(string)
		if crdKind == kind {
			if plural, ok := names["plural"].(string); ok && plural != "" {
				return plural, nil
			}
		}
	}

	if group == "apiextensions.crossplane.io" || strings.HasSuffix(group, ".crossplane.io") {
		versions := []string{"v2", "v1"}
		for _, xrdVersion := range versions {
			xrdGVR := schema.GroupVersionResource{
				Group:    "apiextensions.crossplane.io",
				Version:  xrdVersion,
				Resource: "compositeresourcedefinitions",
			}

			xrdList, err := dynamicClient.Resource(xrdGVR).List(context.Background(), metav1.ListOptions{})
			if err == nil {
				for _, xrdItem := range xrdList.Items {
					xrd := xrdItem.UnstructuredContent()
					spec, _ := xrd["spec"].(map[string]interface{})
					if spec == nil {
						continue
					}

					xrdGroup, _ := spec["group"].(string)
					if xrdGroup != group {
						continue
					}

					names, _ := spec["names"].(map[string]interface{})
					if names == nil {
						continue
					}

					xrdKind, _ := names["kind"].(string)
					if xrdKind == kind {
						if plural, ok := names["plural"].(string); ok && plural != "" {
							return plural, nil
						}
					}
				}
			}
		}
	}

	return "", fmt.Errorf("plural not found")
}

func (k *KubernetesService) objectToMap(obj interface{}) map[string]interface{} {
	if objMap, ok := obj.(map[string]interface{}); ok {
		return objMap
	}
	if unstructuredObj, ok := obj.(*unstructured.Unstructured); ok {
		return unstructuredObj.UnstructuredContent()
	}
	if unstructuredObj, ok := obj.(interface{ Object() map[string]interface{} }); ok {
		return unstructuredObj.Object()
	}
	if runtimeObj, ok := obj.(runtime.Object); ok {
		data, err := json.Marshal(runtimeObj)
		if err != nil {
			return make(map[string]interface{})
		}
		var result map[string]interface{}
		if err := json.Unmarshal(data, &result); err != nil {
			return make(map[string]interface{})
		}
		return result
	}
	return make(map[string]interface{})
}

