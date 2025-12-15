package services

import (
	"context"
	"fmt"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func (k *KubernetesService) GetEvents(kind, name, namespace, contextName string) ([]map[string]interface{}, error) {
	if namespace == "" || namespace == "undefined" || namespace == "null" {
		return []map[string]interface{}{}, nil
	}

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

	clientset, err := k.GetClientset()
	if err != nil {
		return nil, fmt.Errorf("failed to get clientset: %w", err)
	}

	fieldSelector := fmt.Sprintf("involvedObject.kind=%s,involvedObject.name=%s,involvedObject.namespace=%s", kind, name, namespace)

	events, err := clientset.CoreV1().Events(namespace).List(context.Background(), metav1.ListOptions{
		FieldSelector: fieldSelector,
	})
	if err != nil {
		fallbackSelector := fmt.Sprintf("involvedObject.kind=%s,involvedObject.name=%s", kind, name)
		events, err = clientset.CoreV1().Events(namespace).List(context.Background(), metav1.ListOptions{
			FieldSelector: fallbackSelector,
		})
		if err != nil {
			return []map[string]interface{}{}, nil
		}
	}

	result := make([]map[string]interface{}, 0)
	for _, event := range events.Items {
		involvedObject := event.InvolvedObject
		if involvedObject.Kind == kind && involvedObject.Name == name {
			if involvedObject.Namespace == namespace || (involvedObject.Namespace == "" && namespace == "") {
				result = append(result, k.objectToMap(&event))
			}
		}
	}

	return result, nil
}

