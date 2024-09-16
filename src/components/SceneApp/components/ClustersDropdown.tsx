import { css } from '@emotion/css';
import { Select } from '@grafana/ui';
import React from 'react';

interface ClusterDropdownProps {
    clusterOptions: Array<{
        label: string;
        value: string;
        key: string;
    }>;
    currentValue: string;
    onChange: (selectedCluster: string) => void;
    workspaceName?: string;
}

const getStyles = () => {
    return {
        selector: css({
            marginRight: "10px",
        }),
    };
};

export function ClustersDropdown({clusterOptions, currentValue, onChange}: ClusterDropdownProps) {
    const styles = getStyles();
    return (
        <>
            <div className="gf-form">
                <label className="gf-form-label width-6">AKS Cluster&nbsp;&nbsp;</label>
                <Select<string>
                    width={34}
                    options={clusterOptions}
                    value={currentValue}
                    placeholder="Select a cluster"
                    onChange={(selectedCluster) => onChange(selectedCluster.value ?? "")}
                    className={styles.selector}
                />
            </div>
        </>
    )
}
