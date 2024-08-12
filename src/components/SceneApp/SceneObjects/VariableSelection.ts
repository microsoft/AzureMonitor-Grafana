import { SceneObjectBase } from "@grafana/scenes";
import { ConfigurationState, VariableSelectionState } from "./types";
import { DataSourceRef } from "@grafana/schema";
import { VariableSelectionRenderer } from "../components/VariableSelectionRenderer";

export class VariableSelection extends SceneObjectBase<VariableSelectionState> {
    static Component = VariableSelectionRenderer;
    static setConfigState: (configState: Partial<ConfigurationState>) => void;

    public onClusterChange = (newCluster: string) => {
        this.setState({ selectedCluster: newCluster });
    };

    public onDatasourceChange = (newDatasource?: DataSourceRef) => {
        if (!!newDatasource) {
            this.setState({ selectedPromDatasource: newDatasource });
        }
    }

    public constructor(state?: Partial<VariableSelectionState>) {
        super({ 
                selectedCluster: state?.selectedCluster ?? "",
                selectedPromDatasource: state?.selectedPromDatasource ?? {type: "prometheus", uid: ""},
                ...state 
            });
    }
}
