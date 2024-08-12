import { AppRootProps } from "@grafana/data";
import { DataSourceRef } from "@grafana/schema";
import { ConfigurationState } from "components/SceneApp/SceneObjects/types";

export interface AKSPluginProps extends AppRootProps {
    configState: Partial<ConfigurationState>;
    setConfigState: (configState: Partial<ConfigurationState>) => void;
}

export interface ClusterMapping {
    cluster?: string;
    clusterId?: string;
    workspaceId?: string;
    amw?: string
    promDs?: DataSourceRef;
    law?: string;
}
