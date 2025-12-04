# Crossview Features & Capabilities

## Core Features

### 📊 Dashboard
- **Overview Metrics** - Quick view of resource counts and health status
- **Health Monitoring** - Real-time status of Crossplane resources
- **Widget-Based Layout** - Customizable dashboard widgets
- **Resource Counts** - Track Claims, XRDs, Compositions, and Providers

### 🔍 Resource Management
- **Advanced Search** - Search across all resource types and namespaces
- **Resource Browser** - Navigate resources by type, namespace, or label
- **Resource Details** - Comprehensive view of resource specifications
- **YAML Editor** - View and understand resource definitions
- **Resource Relations** - Visualize relationships between resources

![Global Search](../public/images/global-search.png)

### 📦 Crossplane-Specific Features
- **Claims Management** - View and manage Crossplane Claims
- **Composite Resources** - Monitor Composite Resources (XRs)
- **Compositions** - Browse and understand Composition definitions
- **XRD Browser** - Explore Composite Resource Definitions
- **Provider Status** - Monitor Crossplane Provider health

![Composition Resources](../public/images/composition-resources.png)

### 🔐 Security & Access
- **User Authentication** - Secure login system
- **Session Management** - PostgreSQL-backed sessions
- **SSO Support** - Single Sign-On via OIDC or SAML
- **RBAC Integration** - Uses Kubernetes RBAC for resource access

### 🎨 User Experience
- **Modern UI** - Built with React and Chakra UI
- **Responsive Design** - Works on desktop and tablet
- **Dark Mode** - Theme customization
- **Fast Navigation** - Optimized for large resource sets

## Use Cases

### Infrastructure Teams
- Monitor infrastructure-as-code deployments
- Track resource health across environments
- Debug Crossplane resource issues
- Audit infrastructure changes

### Platform Engineers
- Manage Crossplane Compositions
- Monitor Provider status
- Validate resource configurations
- Onboard new team members

### DevOps Teams
- Search and filter resources quickly
- Understand resource relationships
- Troubleshoot deployment issues
- Manage multiple Kubernetes clusters

## Technical Capabilities

### Multi-Cluster Support
- Connect to multiple Kubernetes contexts
- Switch between clusters seamlessly
- Context-aware resource browsing

### Performance
- Paginated resource lists
- Efficient API calls
- Client-side caching
- Optimized for large-scale deployments

### Integration
- Kubernetes-native (uses service accounts)
- Helm chart available
- Docker image ready
- RESTful API for automation

## What Crossview Does NOT Do

- **Resource Modification** - Read-only dashboard (for safety)
- **Resource Creation** - Use kubectl or GitOps for creating resources
- **Policy Enforcement** - Use Crossplane policies for that
- **CI/CD Integration** - Focuses on visualization and monitoring

## Comparison with Other Tools

### vs kubectl
- **Visual Interface** - No need to remember kubectl commands
- **Crossplane-Focused** - Optimized for Crossplane resources
- **Search** - Advanced filtering and search capabilities
- **Relationships** - Visual resource relationship mapping

### vs Kubernetes Dashboard
- **Crossplane-Specific** - Built for Crossplane workflows
- **Resource Relations** - Understand Crossplane resource hierarchy
- **Composition View** - Specialized views for Compositions and Claims
- **Provider Monitoring** - Track Crossplane Provider status

