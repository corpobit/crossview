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
import { useSearchParams, useLocation } from 'react-router-dom';
import { useAppContext } from '../providers/AppProvider.jsx';
import { DataTable } from '../components/common/DataTable.jsx';
import { ResourceDetails } from '../components/common/ResourceDetails.jsx';
import { QuickFilters } from '../components/common/QuickFilters.jsx';
import { Input } from '../components/common/Input.jsx';
import { SearchResourcesUseCase } from '../../domain/usecases/SearchResourcesUseCase.js';
import { FiX, FiBookmark, FiSearch, FiTrash2 } from 'react-icons/fi';
import { getStatusColor, getStatusText, getSyncedStatus, getReadyStatus, getResponsiveStatus } from '../utils/resourceStatus.js';

export const Search = () => {
  const { kubernetesRepository, selectedContext, saveSearch, savedSearches, deleteSearch } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
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
    if (window.confirm(`Are you sure you want to delete "${searchName || 'this search'}"?`)) {
      deleteSearch(searchId);
    }
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
                <Badge key={idx} colorScheme={status.color} fontSize="xs">
                  {status.text}
                </Badge>
              ))}
            </HStack>
          );
        }
        
        const statusColor = getStatusColor(row.conditions, row.kind);
        return (
          <Badge colorScheme={statusColor} fontSize="xs">
            {statusText}
          </Badge>
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

  if (!query) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        minH="calc(100vh - 164px)"
        justifyContent="center"
        alignItems="center"
        w="100%"
      >
        <VStack spacing={8} align="center" mb={12} w="100%" maxW="900px" mx="auto">
          <VStack spacing={6} align="center">
            <Text
              fontSize="5xl"
              fontWeight="bold"
              textAlign="center"
              color="gray.900"
              _dark={{ color: 'white' }}
              letterSpacing="-0.03em"
              lineHeight="1.1"
            >
              Search Resources
            </Text>
            <Text
              fontSize="xl"
              textAlign="center"
              color="gray.600"
              _dark={{ color: 'gray.400' }}
              maxW="600px"
              lineHeight="1.6"
            >
              Find Crossplane resources across your cluster by name, kind, namespace, or labels
            </Text>
          </VStack>
          
          <Box ref={searchBarRef} position="relative" w="100%" maxW="900px" mx="auto" mt={4}>
            <Box
              position="absolute"
              left="20px"
              top="50%"
              transform="translateY(-50%)"
              zIndex={1}
              pointerEvents="none"
              color="gray.400"
            >
              <FiSearch size={22} />
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
              pl="60px"
              pr={searchQuery ? "50px" : "20px"}
              size="lg"
              fontSize="md"
              h="56px"
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
                                if (window.confirm(`Are you sure you want to delete "${suggestion.savedName}"?`)) {
                                  deleteSearch(suggestion.savedId);
                                }
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
          maxW="900px"
          mx="auto"
          mt={0}
          p={8}
          borderRadius="xl"
          border="1px solid"
          borderColor="gray.200"
          bg="white"
          _dark={{ 
            borderColor: 'gray.700',
            bg: 'gray.800'
          }}
        >
          <VStack spacing={6} align="center">
            <Text
              fontSize="2xl"
              fontWeight="semibold"
              color="gray.900"
              _dark={{ color: 'white' }}
              textAlign="center"
              letterSpacing="-0.01em"
              mb={6}
            >
              Search Tips
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacingX={6} spacingY={10} w="100%">
              <VStack spacing={0} align="start" py={2}>
                <Badge colorScheme="blue" fontSize="sm" px={2} py={1} borderRadius="md" mb={0.5}>
                  Name
                </Badge>
                <Text 
                  fontSize="sm" 
                  color="gray.700" 
                  _dark={{ color: 'gray.300' }}
                  textAlign="left"
                >
                  Search by resource name
                </Text>
              </VStack>
              
              <VStack spacing={0} align="start" py={2}>
                <Badge colorScheme="green" fontSize="sm" px={2} py={1} borderRadius="md" mb={0.5}>
                  Kind
                </Badge>
                <Text 
                  fontSize="sm" 
                  color="gray.700" 
                  _dark={{ color: 'gray.300' }}
                  textAlign="left"
                >
                  Filter by resource type (XRD, Composition, etc.)
                </Text>
              </VStack>
              
              <VStack spacing={0} align="start" py={2}>
                <Badge colorScheme="purple" fontSize="sm" px={2} py={1} borderRadius="md" mb={0.5}>
                  Namespace
                </Badge>
                <Text 
                  fontSize="sm" 
                  color="gray.700" 
                  _dark={{ color: 'gray.300' }}
                  textAlign="left"
                >
                  Search within specific namespaces
                </Text>
              </VStack>
              
              <VStack spacing={0} align="start" py={2}>
                <Badge colorScheme="orange" fontSize="sm" px={2} py={1} borderRadius="md" mb={0.5}>
                  Labels
                </Badge>
                <Text 
                  fontSize="sm" 
                  color="gray.700" 
                  _dark={{ color: 'gray.300' }}
                  textAlign="left"
                >
                  Find resources by label selectors
                </Text>
              </VStack>
            </SimpleGrid>
          </VStack>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      position="relative"
    >
      <Box
        mb={6}
        p={4}
        borderRadius="lg"
        bg="white"
        border="1px solid"
        borderColor="gray.200"
        _dark={{ 
          bg: 'gray.800',
          borderColor: 'gray.700'
        }}
        boxShadow="sm"
      >
        <HStack justify="space-between" align="center">
          <VStack align="start" spacing={1}>
            <HStack spacing={3}>
              <Text fontSize="xl" fontWeight="bold" color="gray.900" _dark={{ color: 'white' }}>
                Search Results
              </Text>
              <Badge colorScheme="blue" fontSize="sm" px={3} py={1}>
                {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
              </Badge>
            </HStack>
            <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
              Searching for: &quot;{query}&quot;
            </Text>
          </VStack>
          <Button
            leftIcon={<FiBookmark />}
            size="md"
            variant="outline"
            onClick={onOpen}
            colorScheme="blue"
          >
            Save Search
          </Button>
        </HStack>
      </Box>

      {query && (
        <>
          <Box mb={4}>
            <QuickFilters 
              onQuickFilter={(id) => setQuickFilter(quickFilter === id ? null : id)}
              activeFilter={quickFilter}
            />
          </Box>


          <Box
            display="flex"
            flexDirection="column"
            gap={4}
          >
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
                <Spinner size="xl" />
              </Box>
            ) : error ? (
              <Box p={6} bg="red.50" _dark={{ bg: 'red.900', color: 'red.100' }} borderRadius="md" color="red.800">
                <Text>Error loading search results: {error}</Text>
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
                mb={8}
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

      {isOpen && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="blackAlpha.600"
          zIndex={1000}
          display="flex"
          alignItems="center"
          justifyContent="center"
          onClick={onClose}
        >
          <Box
            p={6}
            maxW="500px"
            w="90%"
            bg="white"
            border="1px solid"
            borderRadius="md"
            borderColor="gray.200"
            _dark={{ bg: 'gray.800', borderColor: 'gray.700' }}
            boxShadow="xl"
            onClick={(e) => e.stopPropagation()}
            position="relative"
            zIndex={1001}
          >
            <HStack justify="space-between" mb={4}>
              <Text fontSize="xl" fontWeight="bold">Save Search</Text>
              <IconButton
                icon={<FiX />}
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Close"
              />
            </HStack>
            <VStack spacing={4} align="stretch">
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={2}>Search Name</Text>
                <Input
                  placeholder="My saved search"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveSearch()}
                />
              </Box>
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={2}>Query</Text>
                <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>{query}</Text>
              </Box>
            </VStack>
            <HStack justify="flex-end" mt={6}>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={handleSaveSearch} isDisabled={!searchName.trim()}>
                Save
              </Button>
            </HStack>
          </Box>
        </Box>
      )}
    </Box>
  );
};

