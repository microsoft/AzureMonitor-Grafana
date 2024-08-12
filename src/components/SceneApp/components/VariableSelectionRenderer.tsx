import React, { useContext, useMemo } from "react";
import { SceneComponentProps } from "@grafana/scenes";
import { ClustersDropdown } from "./ClustersDropdown";
import { DatasourceForTypeDropdown } from "./DatasourceForTypeDropdown";
import { VariableSelection } from "../SceneObjects/VariableSelection";
import { AKSPluginProps } from "types";
import { PluginPropsContext } from "utils/utils.plugin";

export function VariableSelectionRenderer({model}: SceneComponentProps<VariableSelection>) {
    // const { clusters, defaultCluster, workspaceName, defaultDatasource, datasources } = model.useState();
    const { selectedCluster, selectedPromDatasource } = model.useState();
    const { configState } = useContext(PluginPropsContext) as AKSPluginProps;
    const clusters = configState.clusters;

    // cluster options
    const clusterOptions = useMemo(() => {
        return clusters && clusters.length > 0 ? clusters?.map((cluster) => { return {label: cluster, value: cluster, key: cluster}}) : [];
    }, [clusters]);

    

    return (
        <div>
            <div className="gf-form gf-form--grow">
                <ClustersDropdown
                    clusterOptions={clusterOptions}
                    currentValue={selectedCluster}
                    onChange={(selectedCluster) => model.onClusterChange(selectedCluster)}
                    workspaceName={configState.workspaceName}
                />
                <DatasourceForTypeDropdown
                    currentValue={selectedPromDatasource}
                    onChange={(selectedDatasource) => model.onDatasourceChange(selectedDatasource)}
                    dsType="prometheus"
                    datasources={configState.datasources ?? []}
                />
            </div>
        </div>
    );
}


