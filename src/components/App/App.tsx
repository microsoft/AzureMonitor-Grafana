import React, { useState } from 'react';
import { AppRootProps } from '@grafana/data';
import { AKSAppScene } from 'components/SceneApp/AKSAppScene';
import { PluginPropsContext } from 'utils/utils.plugin';
import { ConfigurationState } from 'components/SceneApp/SceneObjects/types';

export function App(props: AppRootProps) {
  const [configState, setConfigState] = useState<Partial<ConfigurationState>>({});
  const newProps = {
    ...props,
    configState,
    setConfigState,
  };
  return (
    <PluginPropsContext.Provider value={newProps}>
        <AKSAppScene />
    </PluginPropsContext.Provider>
  )
}
