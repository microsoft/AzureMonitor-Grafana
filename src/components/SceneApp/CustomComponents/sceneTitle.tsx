import { Stack, Text } from "@grafana/ui";
import { AzureIcon } from "components/img/AzureIcon";
import * as React from "react";

interface SceneTitleProps {
    title: string;
}

const SceneTitle = (props: SceneTitleProps) => {
    return (
        <Stack direction="row" gap={1} alignItems="center" justifyContent="center">
            <AzureIcon/>
            <Text element="h1">{props.title}</Text>
        </Stack>
    )
}

export default SceneTitle;
