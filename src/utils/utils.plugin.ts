import { createContext, useContext } from "react";
// import { AppRootProps } from "@grafana/data";
import { AKSPluginProps } from "types";

// This is used to be able to retrieve the root plugin props anywhere inside the app.
export const PluginPropsContext = createContext<AKSPluginProps | null>(null);

// ok to have no import, since this will be used by grafanacore to load plugin// eslint-disable-next-line import/no-unused-modules
export const usePluginProps = () => {
  const pluginProps = useContext(PluginPropsContext);

  return pluginProps;
};

// ok to have no import, since this will be used by grafanacore to load plugin// eslint-disable-next-line import/no-unused-modules
export const usePluginMeta = () => {
  const pluginProps = usePluginProps();

  return pluginProps?.meta;
};
