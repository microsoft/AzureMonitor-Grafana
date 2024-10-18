import { usePluginContext } from "@grafana/data";
import { useSceneApp } from "@grafana/scenes";
import React, { useContext } from "react";
import { Reporter } from "reporter/reporter";
import { AKSPluginProps } from "types";
import { PluginPropsContext } from "utils/utils.plugin";
import { getSceneApp } from "./SceneApp";

export function AKSAppScene() {
    const { configState, setConfigState } = useContext(PluginPropsContext) as AKSPluginProps;
    const pluginContext = usePluginContext();
    const pluginReporter = new Reporter(pluginContext);
    const scene = useSceneApp(() => getSceneApp(configState, setConfigState, pluginReporter));
  
    return <scene.Component model={scene} />;
  }
