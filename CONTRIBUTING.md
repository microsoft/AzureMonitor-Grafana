# Grafana Azure Cloud Native Monitoring

This repo has been configured within a Visual Studio Code devcontainer with all the necessary tools and dependencies.

## .env file

The provisioned datasources use App Registration authentication and you will need to have this previously set up and grant it access to your AKS cluster and Azure Monitor Workspace.

Create a `.env` file that contains the following items

```
PORT=
TENANT_ID=
CLIENT_ID=
SECRET_ID=
```

#### PORT
The port where you would like localhost to load your local set up

#### CONTOSO_TENANT_ID(optional)
This is used for the automatically provisioned Azure Monitor and Prometheus datasources. It should match the Tenant ID of the Tenant where your App Registration is located.

#### CONTOSO_CLIENT_ID(optional)
This is used for the automatically provisioned Azure Monitor and Prometheus datasources. This matches the Client ID of your App registration which can be found in your App Registration `Overview` section in the Azure Portal

#### CONTOSO_SECRET_ID(optional)
This is used for the automatically provisioned Azure Monitor and Prometheus datasources. This matches the Client Secret of your App registration which can be found in your App Registration `Certificates and Secrets` section in the Azure Portal. Make sure you copy the ID and not the Value.

