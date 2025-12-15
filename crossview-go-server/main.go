package main

import (
	"os"
	"crossview-go-server/bootstrap"
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
