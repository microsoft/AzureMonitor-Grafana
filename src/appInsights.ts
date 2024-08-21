import {
  ApplicationInsights,
  ICustomProperties,
  IExceptionTelemetry,
  ITelemetryItem,
} from "@microsoft/applicationinsights-web";
import { CONNECTION_STRING_DEV, CONNECTION_STRING_PROD } from "./constants";
import VersionJson from "./version.json";
class AppInsights {
  private readonly instance: ApplicationInsights;

  constructor() {
    this.instance = new ApplicationInsights({
      config: {
        connectionString: isDev() ? CONNECTION_STRING_DEV : CONNECTION_STRING_PROD,
        loggingLevelConsole: isDev() ? 2 : 0,
        disableFetchTracking: true,
        extensions: [],
      },
    });
    this.instance.loadAppInsights();
    this.instance.context.application.ver = VersionJson.version;
  

    this.instance.addTelemetryInitializer((envelope: ITelemetryItem) => {
      // See https://github.com/grafana/grafana/issues/31599 for why we need to do this.
      if (envelope.data?.message === "ErrorEvent: ResizeObserver loop limit exceeded") {
        return false;
      }

      if (envelope.data?.message === "ErrorEvent: ResizeObserver loop completed with undelivered notifications.") {
        return false;
      }

      if (!envelope.data) {
        envelope.data = {};
      }

      const region = getAMGRegion();
      if (region) {
        // we are only keeping track of region and host for Azure Managed Grafana instances.
        envelope.data["region"] = region;
        envelope.data["host"] = window.location.host;
      }
      return;
    });
  }

  getInstance(): ApplicationInsights {
    return this.instance;
  }
}

let singleton: AppInsights;

const getAppInsights = async (): Promise<ApplicationInsights> => {
  if (!singleton) {
    singleton = new AppInsights();
  }
  return singleton.getInstance();
};

const getAMGRegion = () => {
  const host = window.location.host;
  if (host.includes("grafana.azure.com") || host.includes("azgrafana")) {
    const splits = host.split(".");
    return splits && splits.length > 1 ? splits[1] : undefined;
  }
  return undefined;
};

export const trackException = async (exception: IExceptionTelemetry, customProperties?: ICustomProperties) => {
  const appInsights = await getAppInsights();
  appInsights.trackException(exception, customProperties);
};

export const isDev = (): boolean => Boolean(VersionJson.version && VersionJson.version.indexOf("dev") !== -1);
