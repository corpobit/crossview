# CrossView Roadmap

This roadmap outlines the planned direction for **CrossView**, the open-source dashboard for visualizing and managing Crossplane resources in Kubernetes clusters. It is a living document and subject to change based on community feedback, contributor priorities, and the evolving needs of the Crossplane ecosystem.

We welcome contributions, discussions, and new ideas via GitHub Issues, Discussions, or Pull Requests!

## Current Status (as of February 2026)
- Stable core features: real-time resource watching, interactive relationship graphs, multi-cluster support, detailed resource views, OIDC/SAML SSO, Helm chart deployment
- Latest release: v3.5.0 (February 2026)
- Actively maintained with frequent updates

## Short-term (Next 3–6 months) – v3.6 – v4.x
Focus: Security hardening, usability improvements, and production readiness

- **Fine-grained RBAC permissions**  
  Implement Kubernetes-native authorization checks (via SubjectAccessReview API) so users only see/edit resources they are allowed to access. Support Crossplane-specific verbs (e.g., view compositions, approve claims).

- **Customizable dashboard**  
  Allow users to create personalized views: rearrange widgets, pin favorite resources/clusters, create custom filters/queries, and save dashboard layouts per user or team.

- **Automatic user role sync from Identity Provider (IDP) when SSO is enabled**  
  When using OIDC/SAML, automatically map IDP groups/roles/claims to CrossView permissions or Kubernetes RBAC bindings. Support common providers (Keycloak, Okta, Auth0, Azure AD) with configurable mapping rules.

- **Improved search and filtering**  
  Advanced full-text search across all resource fields, saved searches, and quick filters (e.g., by status, provider, composition name).

- **Events & audit log viewer**  
  Dedicated tab for browsing Kubernetes events and Crossplane reconciliation events with filtering, timestamps, and correlation to resources.

- **Dark mode refinements & accessibility improvements**  
  Full WCAG compliance checks, keyboard navigation, screen reader support.

## Medium-term (6–12 months) – v4.x – v5.x
Focus: Deeper Crossplane integration, observability, and extensibility

- **Composition & claim workflow enhancements**  
  Visual editor for creating/editing Compositions and Claims (with YAML preview and validation), dry-run previews, and one-click apply.

- **Provider & managed resource health dashboard**  
  Aggregated health overview per provider (e.g., AWS, GCP, Azure), showing unhealthy resources, drift detection alerts, and quick actions.

- **Multi-tenancy & team workspaces**  
  Namespace/project-based isolation, team-specific dashboards, and resource quotas visibility.

- **Alerting & notifications**  
  Integrate with common tools (Slack, PagerDuty, email) for critical events (e.g., reconciliation failures, resource deletion, composition drift).

- **Resource diff & history viewer**  
  Show changes over time (generation diffs), previous states, and who/what triggered updates.

- **CLI companion tool**  
  Lightweight `crossview` CLI for quick resource lookups, context switching, and dashboard URL generation.

## Long-term (12+ months) – v5.x+
Focus: Ecosystem leadership and advanced features

- **Crossplane-native plugin system**  
  Allow community extensions (custom widgets, resource renderers, actions) via WebAssembly or simple JS plugins.

- **Cost & usage insights**  
  Integrate with provider-specific cost APIs (where available) to show estimated costs per composition/claim.

- **GitOps integration**  
  Show Git commit links for managed resources (via annotations), drift detection against Git source.

- **AI-assisted troubleshooting**  
  Natural language query support and suggested fixes (optional opt-in, using local or user-provided LLM).

## How to Influence the Roadmap
- Open a GitHub Issue or Discussion for feature requests
- Upvote existing issues to show demand
- Contribute code, tests, docs, or design feedback

We aim to release major versions roughly every 3–4 months, with patch releases in between. Thank you for using and supporting CrossView!