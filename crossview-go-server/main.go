package main

import (
	"os"
	"crossview-go-server/bootstrap"
	
	// Import OIDC auth provider for Kubernetes client
	_ "k8s.io/client-go/plugin/pkg/client/auth/oidc"
)

func init() {
	os.Setenv("AWS_SDK_LOAD_CONFIG", "false")
	os.Setenv("AWS_SHARED_CREDENTIALS_FILE", "")
	os.Setenv("AWS_PROFILE", "")
}

func main() {
	err := bootstrap.RootApp.Execute()
	if err != nil {
		return
	}
}
