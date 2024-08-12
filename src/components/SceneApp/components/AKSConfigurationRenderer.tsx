import React, { useMemo } from "react";
import { SceneComponentProps } from "@grafana/scenes";
import { AKSConfiguration } from "../SceneObjects/AKSConfiguration";
import {  Icon } from "@grafana/ui";
import { mergeStyleSets } from "@uifabric/merge-styles";
import { ClustersDropdown } from "./ClustersDropdown";
import { DatasourceForTypeDropdown } from "./DatasourceForTypeDropdown";

const getStyles = () => {
    return mergeStyleSets({
        configSubheaders: {
            fontSize: "25px"
        },
        amwNotification: {
            fontSize: "15px",
            color: "#427f3a",
        }
    })
};
export function AKSConfigurationRenderer({model}: SceneComponentProps<AKSConfiguration>) {
    const { clusters, defaultCluster, workspaceName, defaultDatasource, datasources } = model.useState();
    const styles = getStyles();

    // cluster options
    const clusterOptions = useMemo(() => {
        return clusters && clusters.length > 0 ? clusters?.map((cluster) => { return {label: cluster, value: cluster, key: cluster}}) : [];
    }, [clusters]);

    

    return (
        <div style={{width: "100%"}}>
            <div className={styles.configSubheaders}>Cluster Configuration</div>
            <br/>
            <ClustersDropdown
                clusterOptions={clusterOptions}
                currentValue={defaultCluster}
                onChange={(selectedCluster) => model.onClusterChange(selectedCluster)}
                workspaceName={workspaceName}
            />
            {workspaceName && (<div className={styles.amwNotification}><Icon name="check"/>&nbsp;Found Azure Monitor Workspace: {workspaceName}</div>)}
            <br/>
            <br/>
            <div className={styles.configSubheaders}>Datasource Configuration</div>
            <br/>
            <DatasourceForTypeDropdown
                currentValue={defaultDatasource}
                onChange={(selectedDatasource) => model.onDatasourceChange(selectedDatasource)}
                dsType="prometheus"
                datasources={datasources}
            />
            {defaultDatasource && (<div className={styles.amwNotification}><Icon name="check"/>&nbsp;Found linked Prometheus datasource</div>)}
        </div>
    );
}


