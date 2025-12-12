import {
  Box,
  Text,
  VStack,
} from '@chakra-ui/react';
import { lazy, Suspense, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../providers/AppProvider.jsx';
import { ResourceDetails } from '../components/common/ResourceDetails.jsx';

const ProvidersStatusWidget = lazy(() => import('../components/widgets/ProvidersStatusWidget.jsx').then(module => ({ default: module.ProvidersStatusWidget })));
const CompositionsCountWidget = lazy(() => import('../components/widgets/CompositionsCountWidget.jsx').then(module => ({ default: module.CompositionsCountWidget })));
const ClaimsCountWidget = lazy(() => import('../components/widgets/ClaimsCountWidget.jsx').then(module => ({ default: module.ClaimsCountWidget })));
const XRDCountWidget = lazy(() => import('../components/widgets/XRDCountWidget.jsx').then(module => ({ default: module.XRDCountWidget })));
const CompositeResourcesWidget = lazy(() => import('../components/widgets/CompositeResourcesWidget.jsx').then(module => ({ default: module.CompositeResourcesWidget })));
const ResourceHealthWidget = lazy(() => import('../components/widgets/ResourceHealthWidget.jsx').then(module => ({ default: module.ResourceHealthWidget })));
const ManagedResourcesCountWidget = lazy(() => import('../components/widgets/ManagedResourcesCountWidget.jsx').then(module => ({ default: module.ManagedResourcesCountWidget })));
const NamespaceDistributionWidget = lazy(() => import('../components/widgets/NamespaceDistributionWidget.jsx').then(module => ({ default: module.NamespaceDistributionWidget })));
const RecentActivityWidget = lazy(() => import('../components/widgets/RecentActivityWidget.jsx').then(module => ({ default: module.RecentActivityWidget })));

// Loading fallback component for each widget
// eslint-disable-next-line react/prop-types
const WidgetSuspense = ({ children }) => (
  <Suspense fallback={
    <Box 
      p={6} 
      bg="white" 
      _dark={{ bg: 'gray.800', borderColor: 'gray.700' }} 
      border="1px solid" 
      borderColor="gray.200"
      borderRadius="md" 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minH="150px"
    >
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
    <Box position="relative" pb={8}>
      <Box mb={4}>
        <Text fontSize="3xl" fontWeight="semibold" color="gray.900" _dark={{ color: 'gray.100' }} mb={2}>
          Dashboard
        </Text>
        <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
          Overview of your Crossplane resources and cluster status
        </Text>
      </Box>

      <Box
        display="grid"
        gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }}
        gap={4}
        mb={4}
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
          <ManagedResourcesCountWidget />
        </WidgetSuspense>

        <WidgetSuspense>
          <ProvidersStatusWidget />
        </WidgetSuspense>
      </Box>

      <Box
        display="grid"
        gridTemplateColumns={{ base: '1fr', lg: '1fr 1fr' }}
        gap={4}
        mb={4}
      >
        <WidgetSuspense>
          <ResourceHealthWidget />
        </WidgetSuspense>
        
        <WidgetSuspense>
          <NamespaceDistributionWidget />
        </WidgetSuspense>
      </Box>

      <Box
        display="grid"
        gridTemplateColumns={{ base: '1fr', lg: '400px 1fr' }}
        gap={4}
        alignItems="stretch"
      >
        <Box h="100%">
          <WidgetSuspense>
            <RecentActivityWidget />
          </WidgetSuspense>
        </Box>
        
        <Box h="100%">
          <WidgetSuspense>
            <CompositeResourcesWidget onResourceClick={handleResourceClick} />
          </WidgetSuspense>
        </Box>
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
