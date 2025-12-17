package services

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"crossview-go-server/lib"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd/api"
)

type KubernetesServiceInterface interface {
	SetContext(ctxName string) error
	GetCurrentContext() string
	GetContexts() ([]string, error)
	GetClientset() (kubernetes.Interface, error)
	GetConfig() (*rest.Config, error)
	IsConnected(ctxName string) (bool, error)
	AddKubeConfig(kubeConfigYAML string) ([]string, error)
	RemoveContext(ctxName string) error
	ClearFailedContext(ctxName string)
	GetResources(apiVersion, kind, namespace, contextName, plural string, limit *int64, continueToken string) (map[string]interface{}, error)
	GetResource(apiVersion, kind, name, namespace, contextName, plural string) (map[string]interface{}, error)
	GetEvents(kind, name, namespace, contextName string) ([]map[string]interface{}, error)
	GetManagedResources(contextName string, forceRefresh bool) (map[string]interface{}, error)
}

type KubernetesService struct {
	logger        lib.Logger
	env           lib.Env
	currentContext string
	kubeConfig    *api.Config
	clientset     kubernetes.Interface
	config        *rest.Config
	dynamicClient interface{}
	pluralCache   map[string]string
	failedContexts map[string]bool
	mu            sync.RWMutex
}

func NewKubernetesService(logger lib.Logger, env lib.Env) KubernetesServiceInterface {
	service := &KubernetesService{
		logger:        logger,
		env:           env,
		pluralCache:   make(map[string]string),
		failedContexts: make(map[string]bool),
	}

	serviceAccountPath := "/var/run/secrets/kubernetes.io/serviceaccount"
	if fileExists(serviceAccountPath) && 
		fileExists(filepath.Join(serviceAccountPath, "token")) &&
		fileExists(filepath.Join(serviceAccountPath, "ca.crt")) {
		if err := service.SetContext(""); err != nil {
			logger.Warnf("Failed to auto-initialize Kubernetes service account: %s", err.Error())
		} else {
			logger.Info("Kubernetes service initialized with service account (in-cluster mode)")
		}
	}

	return service
}

func (k *KubernetesService) GetCurrentContext() string {
	k.mu.RLock()
	defer k.mu.RUnlock()
	return k.currentContext
}

func (k *KubernetesService) GetContexts() ([]string, error) {
	serviceAccountPath := "/var/run/secrets/kubernetes.io/serviceaccount"
	if fileExists(serviceAccountPath) && 
		fileExists(filepath.Join(serviceAccountPath, "token")) &&
		fileExists(filepath.Join(serviceAccountPath, "ca.crt")) {
		return []string{"in-cluster"}, nil
	}

	k.mu.RLock()
	defer k.mu.RUnlock()

	if k.kubeConfig == nil {
		k.mu.RUnlock()
		if err := k.loadKubeConfig(); err != nil {
			return nil, err
		}
		k.mu.RLock()
	}

	contexts := make([]string, 0, len(k.kubeConfig.Contexts))
	for name := range k.kubeConfig.Contexts {
		contexts = append(contexts, name)
	}
	return contexts, nil
}

func (k *KubernetesService) GetClientset() (kubernetes.Interface, error) {
	k.mu.RLock()
	defer k.mu.RUnlock()

	if k.clientset == nil {
		return nil, fmt.Errorf("kubernetes client not initialized, call SetContext first")
	}
	return k.clientset, nil
}

func (k *KubernetesService) GetConfig() (*rest.Config, error) {
	k.mu.RLock()
	defer k.mu.RUnlock()

	if k.config == nil {
		return nil, fmt.Errorf("kubernetes config not initialized, call SetContext first")
	}
	return k.config, nil
}

func (k *KubernetesService) ClearFailedContext(ctxName string) {
	k.mu.Lock()
	defer k.mu.Unlock()
	
	targetContext := ctxName
	if k.isInCluster() {
		targetContext = "in-cluster"
	}
	
	delete(k.failedContexts, targetContext)
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return !os.IsNotExist(err)
}
