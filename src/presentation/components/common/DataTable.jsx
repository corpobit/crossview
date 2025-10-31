import {
  Box,
  Text,
  HStack,
} from '@chakra-ui/react';
import { useState, useMemo, useEffect } from 'react';
import { FiSearch, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { Input } from './Input.jsx';

export const DataTable = ({ 
  data = [], 
  columns = [], 
  searchableFields = [],
  itemsPerPage = 10,
  onRowClick,
  filters,
  fetchData, // Callback for server-side pagination: (page, limit) => Promise<{ items, totalCount?, continueToken? }>
  totalCount, // Total count for server-side pagination
  serverSidePagination = false, // Enable server-side pagination
  loading = false, // Loading state for server-side pagination
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [serverData, setServerData] = useState([]);
  const [serverTotalCount, setServerTotalCount] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch data for server-side pagination
  useEffect(() => {
    if (serverSidePagination && fetchData) {
      setIsLoading(true);
      fetchData(currentPage, itemsPerPage)
        .then(result => {
          setServerData(result.items || []);
          setServerTotalCount(result.totalCount !== undefined ? result.totalCount : null);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error fetching data:', error);
          setServerData([]);
          setServerTotalCount(null);
          setIsLoading(false);
        });
    }
  }, [serverSidePagination, fetchData, currentPage, itemsPerPage]);

  const filteredData = useMemo(() => {
    // For server-side pagination, use serverData directly (filtering/sorting should be done server-side)
    if (serverSidePagination) {
      return serverData;
    }
    
    let result = data;
    
    if (searchTerm && searchableFields.length > 0) {
      const lowerSearch = searchTerm.toLowerCase();
      result = data.filter(item => {
        return searchableFields.some(field => {
          const value = field.split('.').reduce((obj, key) => obj?.[key], item);
          return String(value || '').toLowerCase().includes(lowerSearch);
        });
      });
    }

    if (sortColumn) {
      const column = columns.find(col => col.accessor === sortColumn || col.header === sortColumn);
      if (column) {
        result = [...result].sort((a, b) => {
          let aValue = column.accessor ? column.accessor.split('.').reduce((obj, key) => obj?.[key], a) : a[sortColumn];
          let bValue = column.accessor ? column.accessor.split('.').reduce((obj, key) => obj?.[key], b) : b[sortColumn];
          
          if (aValue === null || aValue === undefined) aValue = '';
          if (bValue === null || bValue === undefined) bValue = '';
          
          if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
          }
          
          if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }

    return result;
  }, [data, searchTerm, searchableFields, sortColumn, sortDirection, columns, serverSidePagination, serverData]);

  const paginatedData = useMemo(() => {
    // For server-side pagination, data is already paginated
    if (serverSidePagination) {
      return filteredData;
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage, serverSidePagination]);

  const totalPages = useMemo(() => {
    if (serverSidePagination) {
      const count = totalCount !== undefined ? totalCount : serverTotalCount;
      if (count !== null && count !== undefined) {
        return Math.ceil(count / itemsPerPage);
      }
      // If we don't have total count, estimate based on current data
      return currentPage + (serverData.length === itemsPerPage ? 1 : 0);
    }
    return Math.ceil(filteredData.length / itemsPerPage);
  }, [serverSidePagination, totalCount, serverTotalCount, itemsPerPage, currentPage, serverData.length, filteredData.length]);

  const displayCount = useMemo(() => {
    if (serverSidePagination) {
      const count = totalCount !== undefined ? totalCount : serverTotalCount;
      if (count !== null && count !== undefined) {
        return count;
      }
      // Estimate: if we have a full page, there might be more
      return serverData.length === itemsPerPage ? (currentPage * itemsPerPage) + 1 : currentPage * itemsPerPage;
    }
    return filteredData.length;
  }, [serverSidePagination, totalCount, serverTotalCount, serverData.length, itemsPerPage, currentPage, filteredData.length]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSort = (columnAccessor) => {
    if (sortColumn === columnAccessor) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnAccessor);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  return (
    <Box display="flex" flexDirection="column" h="100%" minH={0}>
      <HStack spacing={3} align="center" flexWrap="wrap" mb={4} flexShrink={0}>
        <Box position="relative" flex={1} minW="250px" maxW="400px">
          <Box
            position="absolute"
            left={3}
            top="50%"
            transform="translateY(-50%)"
            color="gray.400"
            _dark={{ color: 'gray.400' }}
            pointerEvents="none"
            zIndex={1}
          >
            <FiSearch size={18} />
          </Box>
          <Input
            pl={10}
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
              setSortColumn(null);
              setSortDirection('asc');
            }}
          />
        </Box>
        {filters && (
          <HStack spacing={3} flexWrap="wrap">
            {filters}
          </HStack>
        )}
        <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }} whiteSpace="nowrap" ml="auto">
          {isLoading || loading ? 'Loading...' : `${displayCount} result${displayCount !== 1 ? 's' : ''}`}
        </Text>
      </HStack>

      <Box 
        borderRadius="lg"
        border="1px solid"
        boxShadow="sm"
        bg="white"
        _dark={{ bg: 'gray.800' }}
        overflow="hidden"
        flex={1}
        display="flex"
        flexDirection="column"
        minH={0}
        css={{
          borderColor: 'rgba(0, 0, 0, 0.08) !important',
          '.dark &': {
            borderColor: 'rgba(255, 255, 255, 0.1) !important',
          }
        }}
      >
      <Box overflowX="auto" overflowY="auto" flex={1} minH={0}>
        <Box 
          as="table" 
          w="100%" 
          style={{ borderCollapse: 'separate', borderSpacing: 0 }} 
          bg="white" 
          _dark={{ bg: 'gray.800' }}
          css={{
            '.dark & td, .dark & th': {
              color: 'white !important',
            },
            '.dark & td *, .dark & th *': {
              color: 'white !important',
            }
          }}
        >
          <Box as="thead">
            <Box as="tr">
              {columns.map((column, index) => {
                const columnAccessor = column.accessor || column.header;
                const isSorted = sortColumn === columnAccessor;
                return (
                  <Box
                    key={index}
                    as="th"
                    px={6}
                    py={4}
                    textAlign="left"
                    fontSize="xs"
                    fontWeight="700"
                    color="gray.700"
                    textTransform="uppercase"
                    letterSpacing="wider"
                    bg="gray.50"
                    borderBottom="2px solid"
                    _dark={{ color: 'gray.200', bg: 'gray.900' }}
                    minW={column.minWidth || 'auto'}
                    cursor={column.accessor ? "pointer" : "default"}
                    userSelect="none"
                    _hover={column.accessor ? { bg: 'gray.100', _dark: { bg: 'gray.800' } } : {}}
                    onClick={() => column.accessor && handleSort(columnAccessor)}
                    transition="all 0.2s ease"
                    position="sticky"
                    top={0}
                    zIndex={1}
                    _first={{
                      borderTopLeftRadius: 'lg',
                    }}
                    _last={{
                      borderTopRightRadius: 'lg',
                    }}
                    css={{
                      borderColor: 'rgba(0, 0, 0, 0.08) !important',
                      '.dark &': {
                        borderColor: 'rgba(255, 255, 255, 0.1) !important',
                        color: 'gray.200 !important',
                        backgroundColor: 'var(--chakra-colors-gray-900) !important',
                      },
                      '.dark & *': {
                        color: 'gray.200 !important',
                      },
                      '.dark &:hover': {
                        backgroundColor: 'var(--chakra-colors-gray-800) !important',
                      }
                    }}
                  >
                    <HStack spacing={2} align="center">
                      <Text>{column.header}</Text>
                      {isSorted && (
                        <Box color="blue.600" _dark={{ color: 'blue.400' }}>
                          {sortDirection === 'asc' ? (
                            <FiChevronUp size={16} />
                          ) : (
                            <FiChevronDown size={16} />
                          )}
                        </Box>
                      )}
                    </HStack>
                  </Box>
                );
              })}
            </Box>
          </Box>
          <Box as="tbody" bg="white" _dark={{ bg: 'gray.800' }}>
            {(isLoading || loading) ? (
              <Box as="tr" bg="white" _dark={{ bg: 'gray.800' }}>
                <Box
                  as="td"
                  colSpan={columns.length}
                  px={6}
                  py={12}
                  textAlign="center"
                  color="gray.500"
                  bg="white"
                  _dark={{ color: 'gray.400', bg: 'gray.800' }}
                  borderRadius="lg"
                  css={{
                    '.dark &': {
                      backgroundColor: 'var(--chakra-colors-gray-800) !important',
                    }
                  }}
                >
                  Loading...
                </Box>
              </Box>
            ) : paginatedData.length === 0 ? (
              <Box as="tr" bg="white" _dark={{ bg: 'gray.800' }}>
                <Box
                  as="td"
                  colSpan={columns.length}
                  px={6}
                  py={12}
                  textAlign="center"
                  color="gray.500"
                  bg="white"
                  _dark={{ color: 'gray.400', bg: 'gray.800' }}
                  borderRadius="lg"
                  css={{
                    '.dark &': {
                      backgroundColor: 'var(--chakra-colors-gray-800) !important',
                    }
                  }}
                >
                  No data found
                </Box>
              </Box>
            ) : (
              paginatedData.map((row, rowIndex) => {
                const isLastRow = rowIndex === paginatedData.length - 1;
                return (
                <Box
                  key={rowIndex}
                  as="tr"
                  bg="white"
                  _dark={{ bg: 'gray.800' }}
                  cursor={onRowClick ? 'pointer' : 'default'}
                  onClick={() => onRowClick && onRowClick(row)}
                    transition="all 0.2s ease"
                  css={{
                    '& td': {
                      backgroundColor: 'white',
                    },
                    '.dark & td': {
                      backgroundColor: 'var(--chakra-colors-gray-800) !important',
                    },
                    '&:hover td': {
                      backgroundColor: 'var(--chakra-colors-gray-50)',
                    },
                    '.dark &:hover td': {
                      backgroundColor: 'var(--chakra-colors-gray-700) !important',
                    }
                  }}
                  _hover={{ bg: 'gray.50', _dark: { bg: 'gray.700' } }}
                >
                    {columns.map((column, colIndex) => {
                      return (
                    <Box
                      key={colIndex}
                      as="td"
                          px={6}
                      py={4}
                      fontSize="sm"
                      color="gray.900"
                      bg="white"
                          transition="all 0.2s ease"
                          borderBottom={isLastRow ? 'none' : '1px solid'}
                          _dark={{ color: 'gray.100', bg: 'gray.800' }}
                          _first={{
                            borderBottomLeftRadius: isLastRow ? 'lg' : '0',
                          }}
                          _last={{
                            borderBottomRightRadius: isLastRow ? 'lg' : '0',
                          }}
                      css={{
                        borderColor: isLastRow ? 'transparent' : 'rgba(0, 0, 0, 0.08) !important',
                        '.dark &': {
                          borderColor: isLastRow ? 'transparent' : 'rgba(255, 255, 255, 0.1) !important',
                          color: 'gray.100 !important',
                          backgroundColor: 'var(--chakra-colors-gray-800) !important',
                        },
                        '.dark & *': {
                          color: 'gray.100 !important',
                        }
                      }}
                    >
                      {column.render ? column.render(row) : (
                        column.accessor.split('.').reduce((obj, key) => obj?.[key], row) || '-'
                      )}
                    </Box>
                      );
                    })}
                </Box>
                );
              })
            )}
          </Box>
          </Box>
        </Box>
      </Box>

      {totalPages > 1 && (
        <HStack spacing={2} justify="flex-end" mt={4} flexShrink={0}>
          <Box
            as="button"
            px={4}
            py={2}
            borderRadius="lg"
            bg={currentPage === 1 ? 'gray.100' : 'white'}
            border="1px solid"
            color={currentPage === 1 ? 'gray.400' : 'gray.700'}
            _dark={{ 
              bg: currentPage === 1 ? 'gray.700' : 'gray.800',
              color: currentPage === 1 ? 'gray.500' : 'white'
            }}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            cursor={currentPage === 1 ? 'not-allowed' : 'pointer'}
            _hover={currentPage === 1 ? {} : { bg: 'gray.50', _dark: { bg: 'gray.700', color: 'white' }, color: 'gray.900' }}
            transition="all 0.15s"
            fontSize="sm"
            fontWeight="500"
            css={{
              borderColor: 'rgba(0, 0, 0, 0.08) !important',
              '.dark &': {
                borderColor: 'rgba(255, 255, 255, 0.1) !important',
                backgroundColor: currentPage === 1 ? 'var(--chakra-colors-gray-700)' : 'var(--chakra-colors-gray-800)',
                color: currentPage === 1 ? 'var(--chakra-colors-gray-500)' : 'white',
              },
              '.dark &:hover:not(:disabled)': {
                backgroundColor: 'var(--chakra-colors-gray-700)',
                color: 'white',
              }
            }}
          >
            Previous
          </Box>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(page => {
              if (totalPages <= 7) return true;
              if (page === 1 || page === totalPages) return true;
              if (Math.abs(page - currentPage) <= 1) return true;
              return false;
            })
            .map((page, index, array) => {
              const prevPage = array[index - 1];
              const showEllipsis = prevPage && page - prevPage > 1;
              return (
                <HStack key={page} spacing={1}>
                  {showEllipsis && (
                    <Text px={2} color="gray.400" _dark={{ color: 'white' }}>
                      ...
                    </Text>
                  )}
                  <Box
                    as="button"
                    px={4}
                    py={2}
                    minW="44px"
                    borderRadius="lg"
                    bg={currentPage === page ? 'blue.600' : 'white'}
                    border="1px solid"
                    color={currentPage === page ? 'white' : 'gray.700'}
                    _dark={{ 
                      bg: currentPage === page ? 'blue.600' : 'gray.800',
                      color: 'white'
                    }}
                    onClick={() => handlePageChange(page)}
                    cursor="pointer"
                    _hover={currentPage === page ? {} : { bg: 'gray.50', _dark: { bg: 'gray.700', color: 'white' }, color: 'gray.900' }}
                    transition="all 0.15s"
                    fontWeight={currentPage === page ? '600' : '500'}
                    fontSize="sm"
                    css={{
                      borderColor: currentPage === page ? '#2563eb !important' : 'rgba(0, 0, 0, 0.08) !important',
                      '.dark &': {
                        borderColor: currentPage === page ? '#2563eb !important' : 'rgba(255, 255, 255, 0.1) !important',
                        backgroundColor: currentPage === page ? 'var(--chakra-colors-blue-600)' : 'var(--chakra-colors-gray-800)',
                        color: 'white',
                      },
                      '.dark &:hover': {
                        backgroundColor: currentPage === page ? 'var(--chakra-colors-blue-600)' : 'var(--chakra-colors-gray-700)',
                        color: 'white',
                      }
                    }}
                  >
                    {page}
                  </Box>
                </HStack>
              );
            })}
          <Box
            as="button"
            px={4}
            py={2}
            borderRadius="lg"
            bg={currentPage === totalPages ? 'gray.100' : 'white'}
            border="1px solid"
            color={currentPage === totalPages ? 'gray.400' : 'gray.700'}
            _dark={{ 
              bg: currentPage === totalPages ? 'gray.700' : 'gray.800',
              color: currentPage === totalPages ? 'gray.500' : 'white'
            }}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            cursor={currentPage === totalPages ? 'not-allowed' : 'pointer'}
            _hover={currentPage === totalPages ? {} : { bg: 'gray.50', _dark: { bg: 'gray.700', color: 'white' }, color: 'gray.900' }}
            transition="all 0.15s"
            fontSize="sm"
            fontWeight="500"
            css={{
              borderColor: 'rgba(0, 0, 0, 0.08) !important',
              '.dark &': {
                borderColor: 'rgba(255, 255, 255, 0.1) !important',
                backgroundColor: currentPage === totalPages ? 'var(--chakra-colors-gray-700)' : 'var(--chakra-colors-gray-800)',
                color: currentPage === totalPages ? 'var(--chakra-colors-gray-500)' : 'white',
              },
              '.dark &:hover:not(:disabled)': {
                backgroundColor: 'var(--chakra-colors-gray-700)',
                color: 'white',
              }
            }}
          >
            Next
          </Box>
        </HStack>
      )}
    </Box>
  );
};

