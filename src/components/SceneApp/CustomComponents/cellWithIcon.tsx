import { css } from "@emotion/css";
import { GrafanaTheme2 } from "@grafana/data";
import { Icon, IconName, Link, Stack, Text, useTheme2 } from "@grafana/ui";
import * as React from "react";

interface BaseProps {
    cellValue: string;
    link?: string;
}

interface IconProps extends BaseProps {
    type: "grafana-builtin";
    iconName: IconName;
    color: string;
}

interface CustomIconProps extends BaseProps {
    type: "custom";
    customIcon: React.JSX.Element;
}

type CellWithIconProps = IconProps | CustomIconProps;

const useStyles = (theme: GrafanaTheme2) => {
    return {
        link: css({
            color: theme.colors.text.link,
            textDecoration: "underline",
        })
    }
};

const CellWithIcon = (props: CellWithIconProps) => {
    const theme = useTheme2();
    const styles = useStyles(theme);
    return (
        <Stack direction="row" alignItems="center" justifyContent="center" gap={1}>
            {props.type === "grafana-builtin" && (
                <Icon name={props.iconName} style={{ color: props.color }}/>
            )}
            {props.type === "custom" && (props.customIcon)}
            {!!props.link ? (<Link href={props.link} className={styles.link}>{props.cellValue}</Link>) : <Text>{props.cellValue}</Text>}
        </Stack>
    );
}

export default CellWithIcon;
