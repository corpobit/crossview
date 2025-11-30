import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Login } from './pages/Login.jsx';
import { Settings } from './pages/Settings.jsx';
import { Providers } from './pages/Providers.jsx';
import { Compositions } from './pages/Compositions.jsx';
import { CompositeResourceDefinitions } from './pages/CompositeResourceDefinitions.jsx';
import { CompositeResources } from './pages/CompositeResources.jsx';
import { Claims } from './pages/Claims.jsx';
import { Resources } from './pages/Resources.jsx';
import { ResourceKind } from './pages/ResourceKind.jsx';
import { CompositeResourceKind } from './pages/CompositeResourceKind.jsx';
import { Search } from './pages/Search.jsx';
import { useAppContext } from './providers/AppProvider.jsx';
import { Box, Text } from '@chakra-ui/react';

const ProtectedRoute = ({ children }) => {
  const { user, authChecked } = useAppContext();

  if (!authChecked) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="100vh">
        <Text>Loading...</Text>
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, authChecked } = useAppContext();

  if (!authChecked) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="100vh">
        <Text>Loading...</Text>
      </Box>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route index element={<Dashboard />} />
                <Route path="providers" element={<Providers />} />
                <Route path="compositions" element={<Compositions />} />
                <Route path="xrds" element={<CompositeResourceDefinitions />} />
                <Route path="composite-resources" element={<CompositeResources />} />
                <Route path="composite-resources/:kind" element={<CompositeResourceKind />} />
                <Route path="claims" element={<Claims />} />
                <Route path="resources" element={<Resources />} />
                <Route path="resources/:kind" element={<ResourceKind />} />
                <Route path="search" element={<Search />} />
                <Route path="settings/*" element={<Settings />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
