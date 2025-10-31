# Crossview - Crossplane Dashboard

A React-based dashboard for managing and monitoring Crossplane resources in Kubernetes.

## Architecture

This project follows Clean Architecture principles with three main layers:

### Domain Layer (`src/domain/`)
- **Entities**: Domain models (e.g., `CrossplaneResource`)
- **Repositories**: Repository interfaces (e.g., `IKubernetesRepository`)
- **Use Cases**: Business logic (e.g., `GetDashboardDataUseCase`)

### Data Layer (`src/data/`)
- **Repositories**: Concrete implementations of repository interfaces
  - `KubernetesApiRepository`: Frontend implementation that calls backend API
  - `KubernetesRepository`: Node.js implementation for backend (reads from ~/.kube/config)

### Presentation Layer (`src/presentation/`)
- **Components**: Reusable UI components
- **Pages**: Page-level components
- **Providers**: Context providers for dependency injection

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

Build for production:

```bash
npm run build
```

## Backend API

The frontend expects a backend API at `/api` with the following endpoints:

- `GET /api/health` - Health check and connection status
- `GET /api/namespaces` - List all namespaces
- `GET /api/resources?apiVersion=&kind=&namespace=` - List resources
- `GET /api/resource?apiVersion=&kind=&name=&namespace=` - Get single resource
- `GET /api/crossplane/resources?namespace=` - List Crossplane resources

The backend should use `KubernetesRepository` from `src/data/repositories/KubernetesRepository.js` to access Kubernetes clusters via `~/.kube/config` or service account tokens when deployed in Kubernetes.

## Tech Stack

- **React** - UI library
- **Vite** - Build tool and dev server
- **Chakra UI** - Component library
- **React Router** - Routing
- **@kubernetes/client-node** - Kubernetes client (for backend)
