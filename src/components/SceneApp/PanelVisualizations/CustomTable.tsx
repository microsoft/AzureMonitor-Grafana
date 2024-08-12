import { PanelProps } from '@grafana/data';
import { Table, TableSortByFieldState } from '@grafana/ui';
import React from 'react';

export interface CustomTableVizOptions {
    initialSortBy: TableSortByFieldState[];
    noHeader?: boolean;
    noValue?: string;
}

export interface CustomTableVizFieldOptions {
}

interface Props extends PanelProps<CustomTableVizOptions> {
}

export function CustomTable(props: Props) {
    const { data, width, height, options } = props;

    return (
        <div>
            {data.state === "Done" && (data.series.map((series, idx) => {
                return <Table data={series} width={width} height={height} key={idx} initialSortBy={options.initialSortBy ?? []} noHeader={options.noHeader ?? false} resizable={true}/>;
            }))}
            {
                data.state === "Done" && data.series.length === 0 && (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: height }}>
                        {!!options.noValue ? options.noValue : "No data"}
                    </div>
                )
            }
        </div>
      );
}
