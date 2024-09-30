import React, { useContext } from "react";
import { useSceneApp } from "@grafana/scenes";
import { getSceneApp } from "./SceneApp";
import { PluginPropsContext } from "utils/utils.plugin";
import { AKSPluginProps } from "types";
import { usePluginInteractionReporter } from "@grafana/runtime";

export function AKSAppScene() {
    const { configState, setConfigState } = useContext(PluginPropsContext) as AKSPluginProps;
    const report = usePluginInteractionReporter();
    const scene = useSceneApp(() => getSceneApp(configState, setConfigState, report));
  
    return <scene.Component model={scene} />;
  }
