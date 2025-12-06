# Crossview Helm Chart Repository

This is the Helm chart repository for Crossview.

## Add this repository

```bash
helm repo add crossview https://corpobit.github.io/crossview
helm repo update
```

## Install

```bash
helm install crossview crossview/crossview \
  --namespace crossview \
  --create-namespace \
  --set secrets.dbPassword=your-db-password \
  --set secrets.sessionSecret=$(openssl rand -base64 32)
```

## Repository Index

The chart index is available at: [index.yaml](./index.yaml)

## Charts

Chart packages are available in the [charts](./charts/) directory.
