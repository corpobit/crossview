import {
  Box,
  Text,
  HStack,
} from '@chakra-ui/react';
import { useState, useMemo, useEffect } from 'react';
import { FiSearch, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { Input } from './Input.jsx';
import { colors, getBorderColor, getBackgroundColor, getTextColor, getAccentColor } from '../../utils/theme.js';
import { useAppContext } from '../../providers/AppProvider.jsx';

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
  colorMode: propColorMode, // Color mode for theme (optional, will use context if not provided)
}) => {
  const appContext = useAppContext();
  const contextColorMode = appContext?.colorMode;
  const colorMode = propColorMode || contextColorMode || 'light';
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
    let result = serverSidePagination ? serverData : data;
    
    if (searchTerm && searchableFields.length > 0) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(item => {
        return searchableFields.some(field => {
          const value = field.split('.').reduce((obj, key) => obj?.[key], item);
          return String(value || '').toLowerCase().includes(lowerSearch);
        });
      });
    }

    if (sortColumn) {
      const column = columns.find(col => col.header === sortColumn);
      if (column) {
        result = [...result].sort((a, b) => {
          let aValue, bValue;
          
          if (typeof column.accessor === 'function') {
            try {
              aValue = a ? column.accessor(a) : '';
              bValue = b ? column.accessor(b) : '';
            } catch (err) {
              console.warn('Error in accessor function:', err);
              aValue = '';
              bValue = '';
            }
          } else if (typeof column.accessor === 'string') {
            aValue = column.accessor.split('.').reduce((obj, key) => obj?.[key], a);
            bValue = column.accessor.split('.').reduce((obj, key) => obj?.[key], b);
          } else {
            aValue = a[sortColumn];
            bValue = b[sortColumn];
          }
          
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
    // For server-side pagination with search, we still need to paginate the filtered results
    if (serverSidePagination && searchTerm) {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredData.slice(startIndex, startIndex + itemsPerPage);
    }
    // For server-side pagination without search, data is already paginated
    if (serverSidePagination) {
      return filteredData;
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage, serverSidePagination, searchTerm]);

  const totalPages = useMemo(() => {
    if (serverSidePagination) {
      // If searching, calculate pages from filtered data
      if (searchTerm) {
        return Math.ceil(filteredData.length / itemsPerPage);
      }
      const count = totalCount !== undefined ? totalCount : serverTotalCount;
      if (count !== null && count !== undefined) {
        return Math.ceil(count / itemsPerPage);
      }
      // If we don't have total count, estimate based on current data
      return currentPage + (serverData.length === itemsPerPage ? 1 : 0);
    }
    return Math.ceil(filteredData.length / itemsPerPage);
  }, [serverSidePagination, totalCount, serverTotalCount, itemsPerPage, currentPage, serverData.length, filteredData.length, searchTerm]);

  const displayCount = useMemo(() => {
    if (serverSidePagination) {
      // If searching, show filtered count; otherwise show server count
      if (searchTerm) {
        return filteredData.length;
      }
      const count = totalCount !== undefined ? totalCount : serverTotalCount;
      if (count !== null && count !== undefined) {
        return count;
      }
      // Estimate: if we have a full page, there might be more
      return serverData.length === itemsPerPage ? (currentPage * itemsPerPage) + 1 : currentPage * itemsPerPage;
    }
    return filteredData.length;
  }, [serverSidePagination, totalCount, serverTotalCount, serverData.length, itemsPerPage, currentPage, filteredData.length, searchTerm]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSort = (columnHeader) => {
    if (sortColumn === columnHeader) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnHeader);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  return (
    <Box display="flex" flexDirection="column" minH={0}>
      <HStack spacing={3} align="center" flexWrap="wrap" mb={4} flexShrink={0}>
        <Box position="relative" flex={1} minW="250px" maxW="400px">
          <Box
            position="absolute"
            left={3}
            top="50%"
            transform="translateY(-50%)"
            color={getTextColor(colorMode, 'tertiary')}
            _dark={{ color: getTextColor('dark', 'tertiary') }}
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
        <Text fontSize="sm" color={getTextColor(colorMode, 'secondary')} _dark={{ color: getTextColor('dark', 'tertiary') }} whiteSpace="nowrap" ml="auto">
          {isLoading || loading ? 'Loading...' : `${displayCount} result${displayCount !== 1 ? 's' : ''}`}
        </Text>
      </HStack>

      <Box 
        borderRadius="lg"
        border="1px solid"
        boxShadow="sm"
        bg={getBackgroundColor(colorMode, 'header')}
        _dark={{ bg: getBackgroundColor('dark', 'header') }}
        overflow="hidden"
        display="flex"
        flexDirection="column"
        css={{
          borderColor: `${getBorderColor('light')} !important`,
          '.dark &': {
            borderColor: `${getBorderColor('dark')} !important`,
          }
        }}
      >
      <Box overflowX="auto" overflowY="auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        <Box 
          as="table" 
          w="100%" 
          style={{ borderCollapse: 'separate', borderSpacing: 0 }} 
          bg={getBackgroundColor(colorMode, 'header')} 
          _dark={{ bg: getBackgroundColor('dark', 'header') }}
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
                const isSorted = sortColumn === column.header;
                return (
                  <Box
                    key={index}
                    as="th"
                    px={6}
                    py={4}
                    textAlign="left"
                    fontSize="xs"
                    fontWeight="700"
                    color={getTextColor(colorMode, 'primary')}
                    textTransform="uppercase"
                    letterSpacing="wider"
                    bg={getBackgroundColor(colorMode, 'secondary')}
                    borderBottom="2px solid"
                    _dark={{ color: getTextColor('dark', 'primary'), bg: getBackgroundColor('dark', 'quaternary') }}
                    minW={column.minWidth || 'auto'}
                    cursor={column.accessor ? "pointer" : "default"}
                    userSelect="none"
                    _hover={column.accessor ? { bg: getBackgroundColor(colorMode, 'tertiary'), _dark: { bg: getBackgroundColor('dark', 'secondary') } } : {}}
                    onClick={() => column.accessor && handleSort(column.header)}
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
                      borderColor: `${getBorderColor('light')} !important`,
                      '.dark &': {
                        borderColor: `${getBorderColor('dark')} !important`,
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
                        <Box color={getAccentColor('blue', 'primary')} _dark={{ color: getAccentColor('blue', 'light') }}>
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
          <Box as="tbody" bg={getBackgroundColor(colorMode, 'header')} _dark={{ bg: getBackgroundColor('dark', 'header') }}>
            {(isLoading || loading) ? (
              <Box as="tr" bg={getBackgroundColor(colorMode, 'header')} _dark={{ bg: getBackgroundColor('dark', 'header') }}>
                <Box
                  as="td"
                  colSpan={columns.length}
                  px={6}
                  py={12}
                  textAlign="center"
                  color={getTextColor(colorMode, 'tertiary')}
                  bg={getBackgroundColor(colorMode, 'header')}
                  _dark={{ color: getTextColor('dark', 'tertiary'), bg: getBackgroundColor('dark', 'header') }}
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
              <Box as="tr" bg={getBackgroundColor(colorMode, 'header')} _dark={{ bg: getBackgroundColor('dark', 'header') }}>
                <Box
                  as="td"
                  colSpan={columns.length}
                  px={6}
                  py={12}
                  textAlign="center"
                  color={getTextColor(colorMode, 'tertiary')}
                  bg={getBackgroundColor(colorMode, 'header')}
                  _dark={{ color: getTextColor('dark', 'tertiary'), bg: getBackgroundColor('dark', 'header') }}
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
                const rowBg = getBackgroundColor(colorMode, 'header');
                const rowHoverBg = getBackgroundColor(colorMode, 'secondary');
                const darkRowBg = getBackgroundColor('dark', 'header');
                const darkRowHoverBg = getBackgroundColor('dark', 'tertiary');
                return (
                <Box
                  key={rowIndex}
                  as="tr"
                  bg={rowBg}
                  _dark={{ bg: darkRowBg }}
                  cursor={onRowClick ? 'pointer' : 'default'}
                  onClick={() => onRowClick && onRowClick(row)}
                    transition="all 0.2s ease"
                  css={{
                    '& td': {
                      backgroundColor: `${rowBg} !important`,
                    },
                    '.dark & td': {
                      backgroundColor: `${darkRowBg} !important`,
                    },
                    '&:hover td': {
                      backgroundColor: `${rowHoverBg} !important`,
                    },
                    '.dark &:hover td': {
                      backgroundColor: `${darkRowHoverBg} !important`,
                    }
                  }}
                  _hover={{ bg: rowHoverBg, _dark: { bg: darkRowHoverBg } }}
                >
                    {columns.map((column, colIndex) => {
                      return (
                    <Box
                      key={colIndex}
                      as="td"
                          px={6}
                      py={4}
                      fontSize="sm"
                      color={getTextColor(colorMode, 'primary')}
                      bg={getBackgroundColor(colorMode, 'header')}
                          transition="all 0.2s ease"
                          borderBottom={isLastRow ? 'none' : '1px solid'}
                          _dark={{ color: getTextColor('dark', 'primary'), bg: getBackgroundColor('dark', 'header') }}
                          _first={{
                            borderBottomLeftRadius: isLastRow ? 'lg' : '0',
                          }}
                          _last={{
                            borderBottomRightRadius: isLastRow ? 'lg' : '0',
                          }}
                      css={{
                        borderColor: isLastRow ? 'transparent' : `${getBorderColor('light')} !important`,
                        '.dark &': {
                          borderColor: isLastRow ? 'transparent' : `${getBorderColor('dark')} !important`,
                          color: 'gray.100 !important',
                          backgroundColor: `${getBackgroundColor('dark', 'header')} !important`,
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
            bg={currentPage === 1 ? getBackgroundColor(colorMode, 'secondary') : getBackgroundColor(colorMode, 'primary')}
            border="1px solid"
            color={currentPage === 1 ? getTextColor(colorMode, 'tertiary') : getTextColor(colorMode, 'primary')}
            _dark={{ 
              bg: currentPage === 1 ? getBackgroundColor('dark', 'tertiary') : getBackgroundColor('dark', 'secondary'),
              color: currentPage === 1 ? getTextColor('dark', 'tertiary') : getTextColor('dark', 'inverse')
            }}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            cursor={currentPage === 1 ? 'not-allowed' : 'pointer'}
            _hover={currentPage === 1 ? {} : { bg: getBackgroundColor(colorMode, 'secondary'), _dark: { bg: getBackgroundColor('dark', 'tertiary'), color: getTextColor('dark', 'inverse') }, color: getTextColor(colorMode, 'primary') }}
            transition="all 0.15s"
            fontSize="sm"
            fontWeight="500"
            css={{
              borderColor: `${getBorderColor('light')} !important`,
              '.dark &': {
                borderColor: `${getBorderColor('dark')} !important`,
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
              const pageBorderColor = currentPage === page ? getAccentColor('blue', 'primary') : getBorderColor(colorMode);
              const darkPageBorderColor = currentPage === page ? getAccentColor('blue', 'primary') : getBorderColor('dark');
              return (
                <HStack key={page} spacing={1}>
                  {showEllipsis && (
                    <Text px={2} color={getTextColor(colorMode, 'tertiary')} _dark={{ color: getTextColor('dark', 'inverse') }}>
                      ...
                    </Text>
                  )}
                  <Box
                    as="button"
                    px={4}
                    py={2}
                    minW="44px"
                    borderRadius="lg"
                    bg={currentPage === page ? getAccentColor('blue', 'primary') : getBackgroundColor(colorMode, 'primary')}
                    border="1px solid"
                    color={currentPage === page ? getTextColor(colorMode, 'inverse') : getTextColor(colorMode, 'primary')}
                    _dark={{ 
                      bg: currentPage === page ? getAccentColor('blue', 'primary') : getBackgroundColor('dark', 'secondary'),
                      color: getTextColor('dark', 'inverse')
                    }}
                    onClick={() => handlePageChange(page)}
                    cursor="pointer"
                    _hover={currentPage === page ? {} : { bg: 'gray.50', _dark: { bg: 'gray.700', color: 'white' }, color: 'gray.900' }}
                    transition="all 0.15s"
                    fontWeight={currentPage === page ? '600' : '500'}
                    fontSize="sm"
                    css={{
                      borderColor: `${pageBorderColor} !important`,
                      '.dark &': {
                        borderColor: `${darkPageBorderColor} !important`,
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
              borderColor: `${getBorderColor('light')} !important`,
              '.dark &': {
                borderColor: `${getBorderColor('dark')} !important`,
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

