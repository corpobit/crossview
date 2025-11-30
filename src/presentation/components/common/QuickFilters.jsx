import {
  Box,
  HStack,
  Button,
  Badge,
} from '@chakra-ui/react';
import { FiAlertCircle, FiClock, FiCheckCircle } from 'react-icons/fi';

export const QuickFilters = ({ onQuickFilter, activeFilter }) => {
  const quickFilters = [
    {
      id: 'failed',
      label: 'Failed Resources',
      icon: FiAlertCircle,
      colorScheme: 'red',
    },
    {
      id: 'recent',
      label: 'Recent Changes',
      icon: FiClock,
      colorScheme: 'blue',
    },
    {
      id: 'ready',
      label: 'Ready Resources',
      icon: FiCheckCircle,
      colorScheme: 'green',
    },
  ];

  return (
    <HStack spacing={2} flexWrap="wrap">
      {quickFilters.map(filter => {
        const Icon = filter.icon;
        const isActive = activeFilter === filter.id;
        return (
          <Button
            key={filter.id}
            leftIcon={<Icon />}
            size="sm"
            variant={isActive ? 'solid' : 'outline'}
            colorScheme={filter.colorScheme}
            onClick={() => onQuickFilter(filter.id)}
          >
            {filter.label}
          </Button>
        );
      })}
    </HStack>
  );
};

