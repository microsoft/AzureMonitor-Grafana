import React, { useState } from 'react';
// import { Route, Switch } from 'react-router-dom';
import { AppRootProps } from '@grafana/data';
// import { ROUTES } from '../../constants';
// import { PageFour, PageOne, PageThree, PageTwo } from '../../pages';
// import { prefixRoute } from '../../utils/utils.routing';
import { AKSAppScene } from 'components/SceneApp/AKSAppScene';
import { PluginPropsContext } from 'utils/utils.plugin';
import { ConfigurationState } from 'components/SceneApp/SceneObjects/types';

export function App(props: AppRootProps) {
  // return (
  //   <Switch>
  //     <Route exact path={prefixRoute(ROUTES.Two)} component={PageTwo} />
  //     <Route exact path={prefixRoute(`${ROUTES.Three}/:id?`)} component={PageThree} />

  //     {/* Full-width page (this page will have no side navigation) */}
  //     <Route exact path={prefixRoute(ROUTES.Four)} component={PageFour} />

  //     {/* Default page */}
  //     <Route component={PageOne} />
  //   </Switch>
  // );
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
