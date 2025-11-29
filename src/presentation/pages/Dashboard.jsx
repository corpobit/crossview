import {
  Box,
  Text,
} from '@chakra-ui/react';
import { lazy, Suspense } from 'react';
import { useAppContext } from '../providers/AppProvider.jsx';

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
  const { selectedContext } = useAppContext();

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
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={6}>
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
        gridTemplateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }}
        gap={6}
        mb={8}
      >
        <WidgetSuspense>
          <ResourceHealthWidget />
        </WidgetSuspense>
        
        <WidgetSuspense>
          <CompositeResourcesWidget />
        </WidgetSuspense>
      </Box>
    </Box>
  );
};
