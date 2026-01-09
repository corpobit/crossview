import {
  Box,
  Text,
  HStack,
  VStack,
  Button,
  Badge,
  Spinner,
  IconButton,
  SimpleGrid,
} from '@chakra-ui/react';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../providers/AppProvider.jsx';
import { Dialog } from '../components/common/Dialog.jsx';
import { getTextColor } from '../utils/theme.js';
import { DataTable } from '../components/common/DataTable.jsx';
import { ResourceDetails } from '../components/common/ResourceDetails.jsx';
import { QuickFilters } from '../components/common/QuickFilters.jsx';
import { Input } from '../components/common/Input.jsx';
import { SearchResourcesUseCase } from '../../domain/usecases/SearchResourcesUseCase.js';
import { FiX, FiBookmark, FiSearch, FiTrash2, FiTag, FiLayers, FiFolder, FiHash } from 'react-icons/fi';
import { getStatusColor, getStatusText, getSyncedStatus, getReadyStatus, getResponsiveStatus } from '../utils/resourceStatus.js';

export const Search = () => {
  const { kubernetesRepository, selectedContext, saveSearch, savedSearches, deleteSearch, colorMode } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchToDelete, setSearchToDelete] = useState({ id: null, name: null });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const searchBarRef = useRef(null);
  
  const onOpen = () => setIsOpen(true);
  const onClose = () => {
    setIsOpen(false);
    setSearchName('');
  };

  const query = searchParams.get('q') || '';

  useEffect(() => {
    setSearchQuery(query);
  }, [query]);

  useEffect(() => {
    if (!query) {
      inputRef.current?.focus();
    }
  }, [query]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery.trim() });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        const selectedSuggestion = suggestions[selectedSuggestionIndex];
        setSearchQuery(selectedSuggestion.value);
        setSearchParams({ q: selectedSuggestion.value });
        setShowSuggestions(false);
      } else {
        handleSearch();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchParams({});
    inputRef.current?.focus();
  };

  const loadSavedSearch = (savedSearch) => {
    setSearchQuery(savedSearch.query || '');
    setSearchParams({ q: savedSearch.query || '' });
    if (savedSearch.filters) {
      setFilters(savedSearch.filters);
    }
  };

  const handleDeleteSavedSearch = (e, searchId, searchName) => {
    e.stopPropagation();
    setSearchToDelete({ id: searchId, name: searchName || 'this search' });
    setDeleteDialogOpen(true);
  };
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    kind: [],
    namespace: [],
    resourceType: [],
    labels: {},
    annotations: {},
    dateRange: {},
  });
  const [quickFilter, setQuickFilter] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [useAutoHeight, setUseAutoHeight] = useState(false);
  const tableContainerRef = useRef(null);

  useEffect(() => {
    setSelectedResource(null);
    setNavigationHistory([]);
  }, [location.pathname]);

  useEffect(() => {
    let isCancelled = false;
    
    const performSearch = async () => {
      if (!selectedContext || !query) {
        setResults([]);
        setFilteredResults([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const contextName = typeof selectedContext === 'string' 
          ? selectedContext 
          : selectedContext.name || selectedContext;
        
        const useCase = new SearchResourcesUseCase(kubernetesRepository);
        let searchResults = await useCase.execute(contextName, query, filters);

        if (isCancelled) return;

        // Apply quick filter if active
        if (quickFilter === 'failed') {
          searchResults = useCase.getFailedResources(searchResults);
        } else if (quickFilter === 'recent') {
          searchResults = useCase.getRecentResources(searchResults, 24);
        } else if (quickFilter === 'ready') {
          searchResults = useCase.getReadyResources(searchResults);
        }

        if (isCancelled) return;

        setResults(searchResults);
        setFilteredResults(searchResults);
      } catch (err) {
        if (isCancelled) return;
        setError(err.message);
        setResults([]);
        setFilteredResults([]);
      } finally {
        if (!isCancelled) {
        setLoading(false);
        }
      }
    };

    performSearch();

    return () => {
      isCancelled = true;
    };
  }, [query, filters, quickFilter, selectedContext, kubernetesRepository]);

  const handleSaveSearch = () => {
    if (searchName.trim()) {
      const searchQuery = {
        name: searchName.trim(),
        query,
        filters,
        quickFilter,
      };
      saveSearch?.(searchQuery);
      setSearchName('');
      onClose();
    }
  };

  const handleRowClick = (resource) => {
    setNavigationHistory(prev => [...prev, selectedResource]);
    setSelectedResource(resource);
  };

  const handleClose = () => {
    setSelectedResource(null);
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

  const handleNavigate = (resource) => {
    setNavigationHistory([]);
    setSelectedResource(resource);
  };

  const availableKinds = [...new Set(results.map(r => r.kind).filter(Boolean))].sort();
  const availableNamespaces = [...new Set(results.map(r => r.namespace || '').filter(ns => ns !== null))].sort();

  useEffect(() => {
    const generateSuggestions = async () => {
      if (!selectedContext) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      const query = searchQuery.trim().toLowerCase();
      const isEmpty = !query;
      const suggestionList = [];

      if (savedSearches && savedSearches.length > 0) {
        savedSearches.forEach(saved => {
          if (isEmpty || (saved.query && saved.query.toLowerCase().includes(query))) {
            suggestionList.push({
              type: 'saved',
              value: saved.query || '',
              label: saved.name || saved.query || 'Unnamed Search',
              icon: FiBookmark,
              savedId: saved.id,
              savedName: saved.name || 'Unnamed Search',
            });
          }
        });
      }

      availableKinds.forEach(kind => {
        if (isEmpty || kind.toLowerCase().includes(query)) {
          suggestionList.push({
            type: 'kind',
            value: kind,
            label: `Kind: ${kind}`,
            icon: null,
          });
        }
      });

      availableNamespaces.forEach(ns => {
        if (ns && (isEmpty || ns.toLowerCase().includes(query))) {
          suggestionList.push({
            type: 'namespace',
            value: ns,
            label: `Namespace: ${ns}`,
            icon: null,
          });
        }
      });

      if (results.length > 0) {
        const uniqueNames = [...new Set(results.map(r => r.name).filter(Boolean))];
        uniqueNames.slice(0, 5).forEach(name => {
          if (isEmpty || name.toLowerCase().includes(query)) {
            suggestionList.push({
              type: 'resource',
              value: name,
              label: name,
              icon: null,
            });
          }
        });
      }

      const limit = isEmpty ? 10 : 8;
      setSuggestions(suggestionList.slice(0, limit));
      setSelectedSuggestionIndex(-1);
    };

    const isEmpty = !searchQuery.trim();
    const timeoutId = setTimeout(generateSuggestions, isEmpty ? 0 : 200);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, savedSearches, availableKinds, availableNamespaces, results, selectedContext]);

  useEffect(() => {
    if (!selectedResource || !tableContainerRef.current) {
      setUseAutoHeight(false);
      return;
    }

    const checkTableHeight = () => {
      const container = tableContainerRef.current;
      if (!container) return;
      
      const viewportHeight = window.innerHeight;
      const halfViewport = (viewportHeight - 100) * 0.5; // Account for header
      const tableHeight = container.scrollHeight;
      
      setUseAutoHeight(tableHeight > halfViewport);
    };

    checkTableHeight();

    const resizeObserver = new ResizeObserver(checkTableHeight);
    resizeObserver.observe(tableContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [selectedResource, results]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      if (searchBarRef.current && !searchBarRef.current.contains(target)) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      minWidth: '200px',
      render: (row) => (
        <Text fontWeight="semibold" fontSize="sm">{row.name}</Text>
      ),
    },
    {
      header: 'Kind',
      accessor: 'kind',
      minWidth: '150px',
      render: (row) => (
        row.kind ? (
          <Badge colorScheme="blue" fontSize="xs">{row.kind}</Badge>
        ) : (
          <Text fontSize="sm" color="gray.400" _dark={{ color: 'gray.500' }}>-</Text>
        )
      ),
    },
    {
      header: 'Type',
      accessor: 'resourceType',
      minWidth: '120px',
      render: (row) => (
        <Badge fontSize="xs">{row.resourceType}</Badge>
      ),
    },
    {
      header: 'Namespace',
      accessor: 'namespace',
      minWidth: '150px',
      render: (row) => (
        <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
          {row.namespace || '(none)'}
        </Text>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      minWidth: '160px',
      render: (row) => {
        const syncedStatus = getSyncedStatus(row.conditions);
        const readyStatus = getReadyStatus(row.conditions);
        const responsiveStatus = getResponsiveStatus(row.conditions);
        const statusText = getStatusText(row.conditions, row.kind);
        
        const statusBadges = [syncedStatus, readyStatus, responsiveStatus].filter(Boolean);
        
        if (statusBadges.length > 0) {
          return (
            <HStack spacing={2}>
              {statusBadges.map((status, idx) => (
                <Box
                  key={idx}
                  as="span"
                  display="inline-block"
                  px={2}
                  py={1}
                  borderRadius="md"
                  fontSize="xs"
                  fontWeight="semibold"
                  bg={`${status.color}.100`}
                  _dark={{ bg: `${status.color}.800`, color: `${status.color}.100` }}
                  color={`${status.color}.800`}
                >
                  {status.text}
                </Box>
              ))}
            </HStack>
          );
        }
        
        const statusColor = getStatusColor(row.conditions, row.kind);
        return (
          <Box
            as="span"
            display="inline-block"
            px={2}
            py={1}
            borderRadius="md"
            fontSize="xs"
            fontWeight="semibold"
            bg={`${statusColor}.100`}
            _dark={{ bg: `${statusColor}.800`, color: `${statusColor}.100` }}
            color={`${statusColor}.800`}
          >
            {statusText}
          </Box>
        );
      },
    },
    {
      header: 'Created',
      accessor: 'creationTimestamp',
      minWidth: '150px',
      render: (row) => row.creationTimestamp 
        ? new Date(row.creationTimestamp).toLocaleDateString() 
        : '-',
    },
  ];

    return (
    <>
      {!query ? (
      <Box
        display="flex"
        flexDirection="column"
        minH="calc(100vh - 164px)"
        justifyContent="center"
        alignItems="center"
        w="100%"
          animation="fadeIn 0.3s ease-in"
          px={6}
      >
        <VStack spacing={10} align="center" w="100%" maxW="1000px" mx="auto">
          <VStack spacing={4} align="center">
            <Text
              fontSize="6xl"
              fontWeight="bold"
              textAlign="center"
              color="gray.900"
              _dark={{ color: 'white' }}
              letterSpacing="-0.04em"
              lineHeight="1"
              mb={2}
            >
              Search Resources
            </Text>
            <Text
              fontSize="lg"
              textAlign="center"
              color="gray.500"
              _dark={{ color: 'gray.400' }}
              maxW="700px"
              lineHeight="1.7"
              fontWeight="normal"
            >
              Discover and explore Crossplane resources across your cluster with powerful search capabilities
            </Text>
          </VStack>
          
          <Box ref={searchBarRef} position="relative" w="100%" maxW="800px" mx="auto" mt={2}>
            <Box
              position="absolute"
              left="24px"
              top="50%"
              transform="translateY(-50%)"
              zIndex={1}
              pointerEvents="none"
              color="gray.400"
              _dark={{ color: 'gray.500' }}
            >
              <FiSearch size={24} />
            </Box>
            <Input
              ref={inputRef}
              placeholder="Search by name, kind, namespace, or labels..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setShowSuggestions(true);
              }}
              pl="64px"
              pr={searchQuery ? "56px" : "24px"}
              size="lg"
              fontSize="md"
              h="64px"
              borderRadius="xl"
              border="2px solid"
              borderColor="gray.200"
              bg="white"
              color="gray.900"
              _dark={{
                borderColor: 'gray.700',
                bg: 'gray.800',
                color: 'gray.100'
              }}
              _placeholder={{
                color: 'gray.500',
                _dark: { color: 'gray.400' }
              }}
              _hover={{
                borderColor: 'gray.300',
                _dark: { borderColor: 'gray.600' }
              }}
              _focus={{
                borderColor: 'blue.500',
                boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.1)',
                _dark: {
                  borderColor: 'blue.400',
                  boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.2)',
                }
              }}
              transition="all 0.2s"
            />
            {searchQuery && (
              <Box
                position="absolute"
                right="16px"
                top="50%"
                transform="translateY(-50%)"
                zIndex={1}
              >
                <IconButton
                  size="sm"
                  variant="ghost"
                  icon={<FiX />}
                  onClick={clearSearch}
                  aria-label="Clear search"
                />
              </Box>
            )}
            
            {showSuggestions && suggestions.length > 0 && (
              <Box
                ref={suggestionsRef}
                position="absolute"
                top="100%"
                left={0}
                right={0}
                mt={1}
                bg="white"
                border="1px solid"
                borderColor="gray.200"
                _dark={{ 
                  bg: 'gray.800',
                  borderColor: 'gray.700'
                }}
                borderRadius="lg"
                boxShadow="xl"
                zIndex={1000}
                maxH="400px"
                overflowY="auto"
              >
                <VStack spacing={0} align="stretch" p={2}>
                  {suggestions.map((suggestion, index) => {
                    const Icon = suggestion.icon;
                    return (
                      <Box
                        key={`${suggestion.type}-${suggestion.value}-${index}`}
                        px={4}
                        py={3}
                        borderRadius="md"
                        cursor="pointer"
                        bg={selectedSuggestionIndex === index ? 'blue.50' : 'transparent'}
                        _dark={{
                          bg: selectedSuggestionIndex === index ? 'blue.900' : 'transparent'
                        }}
                        _hover={{
                          bg: 'gray.50',
                          _dark: { bg: 'gray.700' }
                        }}
                        onClick={() => {
                          setSearchQuery(suggestion.value);
                          setSearchParams({ q: suggestion.value });
                          setShowSuggestions(false);
                        }}
                      >
                        <HStack spacing={3} justify="space-between">
                          <HStack spacing={3} flex={1}>
                            {Icon && (
                              <Icon size={16} color="var(--chakra-colors-blue-500)" />
                            )}
                            <Text
                              fontSize="sm"
                              color="gray.900"
                              _dark={{ color: 'white' }}
                              fontWeight={suggestion.type === 'saved' ? 'medium' : 'normal'}
                            >
                              {suggestion.label}
                            </Text>
                            {suggestion.type === 'kind' && (
                              <Badge colorScheme="blue" fontSize="xs">
                                Kind
                              </Badge>
                            )}
                            {suggestion.type === 'namespace' && (
                              <Badge colorScheme="purple" fontSize="xs">
                                Namespace
                              </Badge>
                            )}
                            {suggestion.type === 'saved' && (
                              <Badge colorScheme="yellow" fontSize="xs">
                                Saved
                              </Badge>
                            )}
                          </HStack>
                          {suggestion.type === 'saved' && suggestion.savedId && (
                            <IconButton
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSearchToDelete({ id: suggestion.savedId, name: suggestion.savedName });
                                setDeleteDialogOpen(true);
                              }}
                              aria-label={`Delete saved search: ${suggestion.savedName}`}
                              colorScheme="red"
                              _hover={{ 
                                bg: 'red.50', 
                                _dark: { bg: 'red.900' }
                              }}
                              _active={{
                                bg: 'red.100',
                                _dark: { bg: 'red.800' }
                              }}
                              flexShrink={0}
                              minW="32px"
                              h="32px"
                            >
                              <FiTrash2 size={16} color="var(--chakra-colors-red-500)" />
                            </IconButton>
                          )}
                        </HStack>
                      </Box>
                    );
                  })}
                </VStack>
              </Box>
            )}
          </Box>
        </VStack>

        <Box
          w="100%"
           maxW="1000px"
          mx="auto"
           mt={16}
         >
           <VStack spacing={8} align="stretch">
             <VStack spacing={2} align="center">
               <Text
                 fontSize="sm"
                 fontWeight="semibold"
                 color="gray.500"
                 _dark={{ color: 'gray.400' }}
                 textAlign="center"
                 letterSpacing="0.1em"
                 textTransform="uppercase"
               >
               Search Capabilities
               </Text>
               <Box w="40px" h="1px" bg="gray.300" _dark={{ bg: 'gray.600' }} />
             </VStack>
             <Box
               display="grid"
               gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}
               gap={8}
               w="100%"
             >
               <Box
                 p={6}
                 borderRadius="lg"
          border="1px solid"
          borderColor="gray.200"
          bg="white"
          _dark={{ 
            borderColor: 'gray.700',
            bg: 'gray.800'
          }}
                 transition="all 0.2s"
                 w="100%"
                 _hover={{
                   borderColor: 'blue.300',
                   boxShadow: 'md',
                   transform: 'translateY(-2px)',
                   _dark: {
                     borderColor: 'blue.500',
                     boxShadow: 'lg',
                   }
                 }}
        >
                 <VStack spacing={4} align="start">
                   <Box
                     p={3}
                     borderRadius="lg"
                     bg="blue.50"
                     color="blue.600"
                     _dark={{ bg: 'blue.900/30', color: 'blue.400' }}
                   >
                     <FiTag size={22} />
                   </Box>
                   <VStack spacing={2} align="start">
            <Text
                       fontSize="md"
              fontWeight="semibold"
              color="gray.900"
                       _dark={{ color: 'gray.100' }}
            >
                       By Name
            </Text>
                <Text 
                  fontSize="sm" 
                       color="gray.600"
                  _dark={{ color: 'gray.300' }}
                       lineHeight="1.6"
                >
                       Search resources by their exact or partial name
                </Text>
              </VStack>
                 </VStack>
               </Box>

               <Box
                 p={6}
                 borderRadius="lg"
                 border="1px solid"
                 borderColor="gray.200"
                 bg="white"
                 _dark={{ 
                   borderColor: 'gray.700',
                   bg: 'gray.800'
                 }}
                 transition="all 0.2s"
                 _hover={{
                   borderColor: 'green.300',
                   boxShadow: 'md',
                   transform: 'translateY(-2px)',
                   _dark: {
                     borderColor: 'green.500',
                     boxShadow: 'lg',
                   }
                 }}
               >
                 <VStack spacing={4} align="start">
                   <Box
                     p={3}
                     borderRadius="lg"
                     bg="green.50"
                     color="green.600"
                     _dark={{ bg: 'green.900/30', color: 'green.400' }}
                   >
                     <FiLayers size={22} />
                   </Box>
                   <VStack spacing={2} align="start">
                     <Text
                       fontSize="md"
                       fontWeight="semibold"
                       color="gray.900"
                       _dark={{ color: 'gray.100' }}
                     >
                       By Kind
                     </Text>
                <Text 
                  fontSize="sm" 
                       color="gray.600"
                  _dark={{ color: 'gray.300' }}
                       lineHeight="1.6"
                >
                       Filter by resource type like XRD, Composition, or Provider
                </Text>
              </VStack>
                 </VStack>
               </Box>

               <Box
                 p={6}
                 borderRadius="lg"
                 border="1px solid"
                 borderColor="gray.200"
                 bg="white"
                 _dark={{ 
                   borderColor: 'gray.700',
                   bg: 'gray.800'
                 }}
                 transition="all 0.2s"
                 _hover={{
                   borderColor: 'purple.300',
                   boxShadow: 'md',
                   transform: 'translateY(-2px)',
                   _dark: {
                     borderColor: 'purple.500',
                     boxShadow: 'lg',
                   }
                 }}
               >
                 <VStack spacing={4} align="start">
                   <Box
                     p={3}
                     borderRadius="lg"
                     bg="purple.50"
                     color="purple.600"
                     _dark={{ bg: 'purple.900/30', color: 'purple.400' }}
                   >
                     <FiFolder size={22} />
                   </Box>
                   <VStack spacing={2} align="start">
                     <Text
                       fontSize="md"
                       fontWeight="semibold"
                       color="gray.900"
                       _dark={{ color: 'gray.100' }}
                     >
                       By Namespace
                     </Text>
                <Text 
                  fontSize="sm" 
                       color="gray.600"
                  _dark={{ color: 'gray.300' }}
                       lineHeight="1.6"
                >
                       Find resources within specific namespaces
                </Text>
              </VStack>
                 </VStack>
               </Box>

               <Box
                 p={6}
                 borderRadius="lg"
                 border="1px solid"
                 borderColor="gray.200"
                 bg="white"
                 _dark={{ 
                   borderColor: 'gray.700',
                   bg: 'gray.800'
                 }}
                 transition="all 0.2s"
                 _hover={{
                   borderColor: 'orange.300',
                   boxShadow: 'md',
                   transform: 'translateY(-2px)',
                   _dark: {
                     borderColor: 'orange.500',
                     boxShadow: 'lg',
                   }
                 }}
               >
                 <VStack spacing={4} align="start">
                   <Box
                     p={3}
                     borderRadius="lg"
                     bg="orange.50"
                     color="orange.600"
                     _dark={{ bg: 'orange.900/30', color: 'orange.400' }}
                   >
                     <FiHash size={22} />
                   </Box>
                   <VStack spacing={2} align="start">
                     <Text
                       fontSize="md"
                       fontWeight="semibold"
                       color="gray.900"
                       _dark={{ color: 'gray.100' }}
                     >
                       By Labels
                     </Text>
                <Text 
                  fontSize="sm" 
                       color="gray.600"
                  _dark={{ color: 'gray.300' }}
                       lineHeight="1.6"
                >
                       Search using label selectors and key-value pairs
                </Text>
              </VStack>
          </VStack>
        </Box>
      </Box>
           </VStack>
         </Box>
      </Box>
      ) : (
    <Box
      display="flex"
      flexDirection="column"
      position="relative"
      animation="fadeIn 0.3s ease-in"
      w="100%"
    >
      <VStack spacing={6} align="stretch" w="100%">
        <Box>
          <HStack justify="space-between" align="flex-start" spacing={4}>
            <VStack align="start" spacing={3} flex={1}>
              <HStack spacing={4} align="center" flexWrap="wrap">
                <Text fontSize="2xl" fontWeight="bold" color="gray.900" _dark={{ color: 'white' }}>
                Search Results
              </Text>
                <Badge 
                  colorScheme="blue" 
                  fontSize="sm" 
                  px={3} 
                  py={1.5}
                  borderRadius="full"
                  fontWeight="semibold"
                >
                {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
              </Badge>
            </HStack>
              <HStack spacing={2} align="center">
                <Text fontSize="sm" color="gray.500" _dark={{ color: 'gray.400' }} fontWeight="medium">
                  Query:
            </Text>
                <Text 
                  fontSize="sm" 
                  color="gray.700" 
                  fontFamily="mono"
                  px={2}
                  py={1}
                  bg="gray.50"
                  _dark={{ color: 'gray.300', bg: 'gray.700' }}
                  borderRadius="md"
                >
                  &quot;{query}&quot;
                </Text>
              </HStack>
          </VStack>
          <Button
            leftIcon={<FiBookmark />}
            size="md"
            variant="outline"
            onClick={onOpen}
            colorScheme="blue"
              borderRadius="lg"
              fontWeight="medium"
          >
            Save Search
          </Button>
        </HStack>
      </Box>

      {query && (
        <>
            <Box>
            <QuickFilters 
              onQuickFilter={(id) => setQuickFilter(quickFilter === id ? null : id)}
              activeFilter={quickFilter}
            />
          </Box>

          <Box
            display="flex"
            flexDirection="column"
              gap={6}
              w="100%"
          >
            {loading ? (
              <Box 
                display="flex" 
                flexDirection="column"
                justifyContent="center" 
                alignItems="center" 
                minH="400px"
                gap={4}
              >
                <Spinner size="xl" color="blue.500" thickness="4px" />
                <Text color="gray.500" _dark={{ color: 'gray.400' }} fontSize="sm">
                  Searching resources...
                </Text>
              </Box>
            ) : error ? (
              <Box 
                p={6} 
                bg="red.50" 
                borderRadius="xl" 
                color="red.800"
                border="1px solid"
                borderColor="red.200"
                _dark={{ bg: 'red.900/20', borderColor: 'red.800', color: 'red.200' }}
              >
                <Text fontWeight="semibold" mb={1}>Error loading search results</Text>
                <Text fontSize="sm">{error}</Text>
              </Box>
            ) : (
              <Box
                ref={tableContainerRef}
                flex={selectedResource ? (useAutoHeight ? '0 0 50%' : '0 0 auto') : '1'}
                display="flex"
                flexDirection="column"
                minH={0}
                maxH={selectedResource && useAutoHeight ? '50vh' : 'none'}
                overflowY={selectedResource && useAutoHeight ? 'auto' : 'visible'}
              >
                <DataTable
                  data={filteredResults}
                  columns={columns}
                  searchableFields={['name', 'kind', 'namespace']}
                  itemsPerPage={20}
                  onRowClick={handleRowClick}
                />
              </Box>
            )}

            {selectedResource && (
              <Box
                flex="1"
                display="flex"
                flexDirection="column"
              >
                <ResourceDetails
                  resource={selectedResource}
                  onClose={handleClose}
                  onNavigate={handleNavigate}
                  onBack={navigationHistory.length > 0 ? handleBack : handleClose}
                />
              </Box>
            )}
          </Box>
        </>
      )}
      </VStack>
      </Box>
      )}

      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        onConfirm={handleSaveSearch}
        title="Save Search"
        confirmLabel="Save"
        cancelLabel="Cancel"
        confirmColorScheme="blue"
        colorMode={colorMode}
            maxW="500px"
        isConfirmDisabled={!searchName.trim()}
      >
            <VStack spacing={4} align="stretch">
              <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={2} color={getTextColor(colorMode, 'primary')}>
              Search Name
            </Text>
                <Input
                  placeholder="My saved search"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchName.trim()) {
                      e.preventDefault();
                      handleSaveSearch();
                    }
                  }}
                />
              </Box>
              <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={2} color={getTextColor(colorMode, 'primary')}>
              Query
            </Text>
            <Text fontSize="sm" color={getTextColor(colorMode, 'secondary')}>{query}</Text>
              </Box>
            </VStack>
      </Dialog>

      <Dialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSearchToDelete({ id: null, name: null });
        }}
        onConfirm={() => {
          if (searchToDelete.id) {
            deleteSearch(searchToDelete.id);
          }
          setDeleteDialogOpen(false);
          setSearchToDelete({ id: null, name: null });
        }}
        title="Delete Saved Search"
        message={`Are you sure you want to delete "${searchToDelete.name}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmColorScheme="red"
        colorMode={colorMode}
      />
    </>
  );
};

