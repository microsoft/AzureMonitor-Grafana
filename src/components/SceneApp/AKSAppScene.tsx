import React, { useContext } from "react";
import { useSceneApp } from "@grafana/scenes";
import { getSceneApp } from "./SceneApp";
import { PluginPropsContext } from "utils/utils.plugin";
import { AKSPluginProps } from "types";
import { usePluginInteractionReporter } from "@grafana/runtime";
import { TelemetryClient } from "telemetry/telemetry";

export function AKSAppScene() {
    const { configState, setConfigState } = useContext(PluginPropsContext) as AKSPluginProps;
    const report = usePluginInteractionReporter();
    const telemetryClient = new TelemetryClient(report);
    const scene = useSceneApp(() => getSceneApp(configState, setConfigState, telemetryClient));
  
    return <scene.Component model={scene} />;
  }
