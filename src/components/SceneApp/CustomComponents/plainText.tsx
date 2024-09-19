import { Text } from "@grafana/ui";
import * as React from "react";

interface PlainTextProps {
    value: string
}

const PlainText = (props: PlainTextProps) => {
    return (
        <Text>{props.value}</Text>
    )
}

export default PlainText;
