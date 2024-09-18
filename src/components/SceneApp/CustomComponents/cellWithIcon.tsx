import { Icon, IconName, Stack, Text } from "@grafana/ui";
import * as React from "react";

interface CellWithIconProps {
    iconName: IconName;
    color: string;
    cellValue: string;
}

const CellWithIcon = (props: CellWithIconProps) => {
    return (
        <Stack direction="row" alignItems="center" justifyContent="center" gap={1}>
            <Icon name={props.iconName} style={{ color: props.color }}/>
            <Text>{props.cellValue}</Text>
        </Stack>
    );
}

export default CellWithIcon;
