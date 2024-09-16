import { css } from '@emotion/css';
import { DataSourceInstanceSettings } from '@grafana/data';
import { DataSourceRef } from '@grafana/schema';
import { Select } from '@grafana/ui';
import React, { useMemo } from 'react';
const getStyles = () => {
    return  {
        selector: css({
            marginRight: "10px",
        }),
    };
};

interface DatasourceForTypeDropdownProps {
    currentValue: DataSourceRef | undefined;
    onChange: (selectedCluster: DataSourceRef) => void;
    dsType: string;
    datasources: DataSourceInstanceSettings[];
}



export function DatasourceForTypeDropdown({ currentValue, onChange, datasources, dsType}: DatasourceForTypeDropdownProps) {
    const styles = getStyles();
    // prom datasource options
    const promOptions = useMemo(() => {
        return datasources && datasources.length > 0 ? datasources.map((datasource) => { return {label: datasource.name, value: datasource.uid, key: datasource.uid}}) : [];
    }, [datasources]);
    return (
        <>
           <div className="gf-form">
                <label className="gf-form-label width-10">Prometheus datasource</label>
                <Select<string>
                    width={34}
                    options={promOptions}
                    value={currentValue?.uid}
                    placeholder="Select a datasource"
                    onChange={(selectedDatasource) => onChange({type: `${dsType}`, uid: selectedDatasource.value})}
                    className={styles.selector}
                />
            </div>
        </>
    )
}
