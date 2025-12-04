import {
  Box,
  Text,
} from '@chakra-ui/react';
import { lazy, Suspense, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../providers/AppProvider.jsx';
import { ResourceDetails } from '../components/common/ResourceDetails.jsx';

// Lazy load widgets - each widget loads independently
const ProvidersStatusWidget = lazy(() => import('../components/widgets/ProvidersStatusWidget.jsx').then(module => ({ default: module.ProvidersStatusWidget })));
const CompositionsCountWidget = lazy(() => import('../components/widgets/CompositionsCountWidget.jsx').then(module => ({ default: module.CompositionsCountWidget })));
const ClaimsCountWidget = lazy(() => import('../components/widgets/ClaimsCountWidget.jsx').then(module => ({ default: module.ClaimsCountWidget })));
const XRDCountWidget = lazy(() => import('../components/widgets/XRDCountWidget.jsx').then(module => ({ default: module.XRDCountWidget })));
const CompositeResourcesWidget = lazy(() => import('../components/widgets/CompositeResourcesWidget.jsx').then(module => ({ default: module.CompositeResourcesWidget })));
const ResourceHealthWidget = lazy(() => import('../components/widgets/ResourceHealthWidget.jsx').then(module => ({ default: module.ResourceHealthWidget })));

// Loading fallback component for each widget
// eslint-disable-next-line react/prop-types
const WidgetSuspense = ({ children }) => (
  <Suspense fallback={
    <Box p={6} bg="white" _dark={{ bg: 'gray.800' }} border="1px solid" borderRadius="md" display="flex" justifyContent="center" alignItems="center" minH="150px">
      <Text fontSize="sm" color="gray.500">Loading...</Text>
    </Box>
  }>
    {children}
  </Suspense>
);

export const Dashboard = () => {
  const location = useLocation();
  const { selectedContext } = useAppContext();
  const [selectedResource, setSelectedResource] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState([]);

  // Close resource detail when route changes
  useEffect(() => {
    setSelectedResource(null);
    setNavigationHistory([]);
  }, [location.pathname]);

  const handleResourceClick = (resource) => {
    // If clicking the same resource that's already open, close the slideout
    if (selectedResource && 
        selectedResource.name === resource.name &&
        selectedResource.kind === resource.kind &&
        selectedResource.apiVersion === resource.apiVersion &&
        selectedResource.namespace === resource.namespace) {
      setSelectedResource(null);
      setNavigationHistory([]);
      return;
    }

    // Otherwise, open/update the slideout with the new resource
    setNavigationHistory([]);
    setSelectedResource(resource);
  };

  const handleNavigate = (resource) => {
    setNavigationHistory(prev => [...prev, selectedResource]);
    setSelectedResource(resource);
  };

  const handleBack = () => {
    if (navigationHistory.length > 0) {
      const previous = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      setSelectedResource(previous);
    } else {
      setSelectedResource(null);
    }
  };

  const handleClose = () => {
    setSelectedResource(null);
    setNavigationHistory([]);
  };

  if (!selectedContext) {
    return (
      <Box>
        <Text fontSize="2xl" fontWeight="bold" mb={6}>
          Dashboard
        </Text>
        <Box p={6} bg="yellow.50" _dark={{ bg: 'yellow.900', color: 'yellow.100' }} borderRadius="md" color="yellow.800">
          <Text>Please select a Kubernetes context to view the dashboard.</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box position="relative">
      <Text fontSize="2xl" fontWeight="bold" mb={6} color="gray.900" _dark={{ color: 'gray.100' }}>
        Dashboard
      </Text>

      {/* Stats Row - Quick Overview Widgets */}
      <Box
        display="grid"
        gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}
        gap={6}
        mb={8}
      >
        <WidgetSuspense>
          <CompositionsCountWidget />
        </WidgetSuspense>
        
        <WidgetSuspense>
          <ClaimsCountWidget />
        </WidgetSuspense>

        <WidgetSuspense>
          <XRDCountWidget />
        </WidgetSuspense>

        <WidgetSuspense>
          <ProvidersStatusWidget />
        </WidgetSuspense>
      </Box>

      {/* Detailed Widgets Row */}
      <Box
        display="grid"
        gridTemplateColumns={{ base: '1fr', lg: '1fr 3fr' }}
        gap={6}
        mb={8}
      >
        <WidgetSuspense>
          <ResourceHealthWidget />
        </WidgetSuspense>
        
        <WidgetSuspense>
          <CompositeResourcesWidget onResourceClick={handleResourceClick} />
        </WidgetSuspense>
      </Box>

      {selectedResource && (
        <ResourceDetails
          resource={selectedResource}
          onClose={handleClose}
          onNavigate={handleNavigate}
          onBack={navigationHistory.length > 0 ? handleBack : undefined}
        />
      )}
    </Box>
  );
};
