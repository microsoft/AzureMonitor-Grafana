//go:build mage
// +build mage

package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"

	// mage:import
	build "github.com/grafana/grafana-plugin-sdk-go/build"
)

func getValueFromJSON(fpath string, key string) (string, error) {
	byteValue, err := ioutil.ReadFile(fpath)
	if err != nil {
		return "", err
	}

	var result map[string]interface{}
	err = json.Unmarshal(byteValue, &result)
	if err != nil {
		return "", err
	}
	executable := result[key]
	name, ok := executable.(string)
	if !ok || name == "" {
		return "", fmt.Errorf("plugin.json is missing: %s", key)
	}
	return name, nil
}

func init() {
	pluginVersion, err := getValueFromJSON("src/version.json", "version")
	if err != nil || len(pluginVersion) == 0 {
		fmt.Println("build failed: get pluginVersion error", err)
	}
	fmt.Println("build pkg version: ", pluginVersion)
	build.SetBeforeBuildCallback(func(cfg build.Config) (build.Config, error) {
		cfg.CustomVars = map[string]string{
			"main.Version": pluginVersion,
		}
		return cfg, nil
	})
}

// Default configures the default target.
var Default = build.BuildAll
