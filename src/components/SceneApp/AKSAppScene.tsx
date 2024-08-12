import React, { useContext } from "react";
import { useSceneApp } from "@grafana/scenes";
import { getSceneApp } from "./SceneApp";
import { PluginPropsContext } from "utils/utils.plugin";
import { AKSPluginProps } from "types";

export function AKSAppScene() {
    const { configState, setConfigState } = useContext(PluginPropsContext) as AKSPluginProps;
    const scene = useSceneApp(() => getSceneApp(configState, setConfigState));
  
    return <scene.Component model={scene} />;
  }
