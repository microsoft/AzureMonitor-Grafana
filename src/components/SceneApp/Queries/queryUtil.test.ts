import { getDataSourceSrv } from "@grafana/runtime";
import { createMappingFromSeries, getAMWToGrana, safeHost } from "./queryUtil";

jest.mock("@grafana/scenes", () => ({
  SceneQueryRunner: class {},
}));

jest.mock("@grafana/runtime", () => ({
  ...jest.requireActual("@grafana/runtime"),
  getDataSourceSrv: jest.fn(),
}));

const mockDatasources = (list: unknown[]) => {
  (getDataSourceSrv as jest.Mock).mockReturnValue({ getList: () => list });
};

// Real-world shaped fixtures (cluster name has an underscore; the DCRA id embeds
// the cluster name in its /managedClusters/<name>/ segment, and the AMW query
// endpoint is <amw-name>-<hash>.<region>.prometheus.monitor.azure.com).
const CLUSTER = "aks-i4c-aks_shared-de-001";
const DCRA_ID =
  "/subscriptions/x/resourceGroups/rgp-i4c-aks_shared-de-001/providers/Microsoft.ContainerService/managedClusters/aks-i4c-aks_shared-de-001/providers/Microsoft.Insights/dataCollectionRuleAssociations/MSProm-westeurope-aks-i4c-aks-shared-de-001";
const AMW = "amw-tec-pr-weu-monitor";
const ENDPOINT = "https://amw-tec-pr-weu-monitor-abc.westeurope.prometheus.monitor.azure.com";

const clusters = [CLUSTER];
const clusterIds = ["/subscriptions/x/.../managedClusters/aks-i4c-aks_shared-de-001"];
const workspaces = [AMW];
const workspaceIds = [DCRA_ID];
const endpoints = [ENDPOINT];

describe("safeHost", () => {
  it("extracts a lowercased host from a URL", () => {
    expect(safeHost("https://AMW-Tec-PR-WEU-monitor-abc.westeurope.prometheus.monitor.azure.com")).toBe(
      "amw-tec-pr-weu-monitor-abc.westeurope.prometheus.monitor.azure.com"
    );
  });

  it("returns empty string for undefined/empty", () => {
    expect(safeHost(undefined)).toBe("");
    expect(safeHost("")).toBe("");
  });

  it("falls back to lowercased input for non-URLs", () => {
    expect(safeHost("Not A Url")).toBe("not a url");
  });
});

describe("getAMWToGrana", () => {
  it("matches an underscore cluster name via the managedClusters segment and returns amw + endpoint", () => {
    const [amw, wsId, endpoint] = getAMWToGrana(workspaces, workspaceIds, CLUSTER, endpoints);
    expect(amw).toBe(AMW);
    expect(wsId).toBe(DCRA_ID);
    expect(endpoint).toBe(ENDPOINT);
  });

  it("returns empty amw/undefined when no DCRA id contains the cluster name", () => {
    const [amw, wsId, endpoint] = getAMWToGrana(workspaces, workspaceIds, "aks-does-not-exist", endpoints);
    expect(amw).toBe("");
    expect(wsId).toBeUndefined();
    expect(endpoint).toBeUndefined();
  });
});

describe("createMappingFromSeries datasource resolution", () => {
  afterEach(() => jest.clearAllMocks());

  it("resolves the datasource whose directUrl host matches the AMW endpoint", () => {
    mockDatasources([
      { uid: "itn", type: "prometheus", name: "itn", jsonData: { directUrl: "https://amw-tec-pr-itn-monitor-xyz.italynorth.prometheus.monitor.azure.com" } },
      { uid: "weu", type: "prometheus", name: "weu", jsonData: { directUrl: ENDPOINT } },
    ]);

    const mapping = createMappingFromSeries(workspaces, workspaceIds, clusters, clusterIds, undefined, endpoints);
    expect(mapping[CLUSTER].promDs?.uid).toBe("weu");
    expect(mapping[CLUSTER].promEndpoint).toBe(ENDPOINT);
  });

  it("picks the correct datasource when another URL merely contains the AMW name as a substring (collision)", () => {
    // Both datasources' directUrl contain "amw-tec-pr-weu-monitor"; only the endpoint host is exact.
    mockDatasources([
      { uid: "decoy", type: "prometheus", name: "decoy", jsonData: { directUrl: "https://amw-tec-pr-weu-monitor-DECOY.eastus.prometheus.monitor.azure.com" } },
      { uid: "weu", type: "prometheus", name: "weu", jsonData: { directUrl: ENDPOINT } },
    ]);

    const mapping = createMappingFromSeries(workspaces, workspaceIds, clusters, clusterIds, undefined, endpoints);
    expect(mapping[CLUSTER].promDs?.uid).toBe("weu");
  });

  it("recognizes the grafana-azureprometheus-datasource plugin type", () => {
    mockDatasources([
      { uid: "azprom", type: "grafana-azureprometheus-datasource", name: "azp", jsonData: { directUrl: ENDPOINT } },
    ]);

    const mapping = createMappingFromSeries(workspaces, workspaceIds, clusters, clusterIds, undefined, endpoints);
    expect(mapping[CLUSTER].promDs?.uid).toBe("azprom");
  });

  it("ignores non-Prometheus datasource types", () => {
    mockDatasources([
      { uid: "azmon", type: "grafana-azure-monitor-datasource", name: "azmon", jsonData: { directUrl: ENDPOINT } },
    ]);

    const mapping = createMappingFromSeries(workspaces, workspaceIds, clusters, clusterIds, undefined, endpoints);
    expect(mapping[CLUSTER].promDs).toBeUndefined();
  });

  it("falls back to name-substring matching when no endpoint is available (no regression)", () => {
    mockDatasources([
      { uid: "byname", type: "prometheus", name: "n", jsonData: { directUrl: ENDPOINT } },
    ]);

    const mapping = createMappingFromSeries(workspaces, workspaceIds, clusters, clusterIds, undefined, undefined);
    expect(mapping[CLUSTER].promDs?.uid).toBe("byname");
  });

  it("does not throw when a datasource has no directUrl/url and still resolves the correct one", () => {
    mockDatasources([
      { uid: "nourl", type: "prometheus", name: "nourl", jsonData: {} },
      { uid: "weu", type: "prometheus", name: "weu", jsonData: { directUrl: ENDPOINT } },
    ]);

    expect(() => createMappingFromSeries(workspaces, workspaceIds, clusters, clusterIds, undefined, endpoints)).not.toThrow();
    const mapping = createMappingFromSeries(workspaces, workspaceIds, clusters, clusterIds, undefined, endpoints);
    expect(mapping[CLUSTER].promDs?.uid).toBe("weu");
  });

  it("leaves promDs undefined when no datasource matches by endpoint or name", () => {
    mockDatasources([
      { uid: "other", type: "prometheus", name: "other", jsonData: { directUrl: "https://something-else.eastus.prometheus.monitor.azure.com" } },
    ]);

    const mapping = createMappingFromSeries(workspaces, workspaceIds, clusters, clusterIds, undefined, endpoints);
    expect(mapping[CLUSTER].promDs).toBeUndefined();
  });
});
