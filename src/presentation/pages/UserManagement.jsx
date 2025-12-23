import {
  Box,
  VStack,
  Text,
  HStack,
  Button,
} from '@chakra-ui/react';
import { Input } from '../components/common/Input.jsx';
import { Dropdown } from '../components/common/Dropdown.jsx';
import { DataTable } from '../components/common/DataTable.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Dialog } from '../components/common/Dialog.jsx';
import { getTextColor } from '../utils/theme.js';
import { FiPlus, FiEdit2 } from 'react-icons/fi';
import { useAppContext } from '../providers/AppProvider.jsx';
import { useState, useEffect } from 'react';

export const UserManagement = () => {
  const { user, userService, colorMode } = useAppContext();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    role: 'user',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsers();
    } else {
      setLoading(false);
    }
  }, [user]);

  const onCreateOpen = () => {
    setIsCreateOpen(true);
  };
  
  const onCreateClose = () => {
    setIsCreateOpen(false);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setFormData({
      username: '',
      email: '',
      password: '',
      passwordConfirmation: '',
      role: 'user',
    });
    setFormError('');
    setEditingUser(null);
    onCreateOpen();
  };

  const handleEditUser = (userToEdit) => {
    setFormData({
      username: userToEdit.username,
      email: userToEdit.email,
      password: '',
      passwordConfirmation: '',
      role: userToEdit.role,
    });
    setFormError('');
    setEditingUser(userToEdit);
    onCreateOpen();
  };

  const handleSubmit = async (e) => {
    if (e) {
    e.preventDefault();
    }
    setFormError('');
    setSubmitting(true);

    try {
      if (!formData.username || !formData.email) {
        setFormError('Username and email are required');
        setSubmitting(false);
        return;
      }

      if (editingUser) {
        // Update user
        const updateData = {
          username: formData.username,
          email: formData.email,
          role: formData.role,
        };
        
        if (formData.password) {
          if (formData.password !== formData.passwordConfirmation) {
            setFormError('Passwords do not match');
            setSubmitting(false);
            return;
          }
          updateData.password = formData.password;
        }

        await userService.updateUser(editingUser.id, updateData);
      } else {
        // Create user
        if (!formData.password) {
          setFormError('Password is required');
          setSubmitting(false);
          return;
        }

        if (formData.password !== formData.passwordConfirmation) {
          setFormError('Passwords do not match');
          setSubmitting(false);
          return;
        }

        await userService.createUser({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        });
      }

      onCreateClose();
      await loadUsers();
      setFormData({
        username: '',
        email: '',
        password: '',
        passwordConfirmation: '',
        role: 'user',
      });
      setEditingUser(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Username',
      accessor: 'username',
      minWidth: '150px',
    },
    {
      header: 'Email',
      accessor: 'email',
      minWidth: '200px',
    },
    {
      header: 'Role',
      accessor: 'role',
      minWidth: '100px',
      render: (row) => (
        <Box
          as="span"
          display="inline-block"
          px={2}
          py={1}
          borderRadius="md"
          fontSize="xs"
          fontWeight="semibold"
          bg={row.role === 'admin' ? 'blue.100' : 'gray.100'}
          _dark={{
            bg: row.role === 'admin' ? 'blue.800' : 'gray.700',
            color: row.role === 'admin' ? 'blue.100' : 'gray.300'
          }}
          color={row.role === 'admin' ? 'blue.800' : 'gray.600'}
        >
          {row.role}
        </Box>
      ),
    },
    {
      header: 'Created',
      accessor: 'created_at',
      minWidth: '150px',
      render: (row) => row.created_at ? new Date(row.created_at).toLocaleString() : '-',
    },
    {
      header: 'Actions',
      accessor: 'actions',
      minWidth: '100px',
      render: (row) => (
        <Button
          size="sm"
          variant="ghost"
          leftIcon={<FiEdit2 />}
          onClick={() => handleEditUser(row)}
        >
          Edit
        </Button>
      ),
    },
  ];

  if (user?.role !== 'admin') {
    return (
      <Box>
        <Text fontSize="2xl" fontWeight="bold" mb={6}>
          User Management
        </Text>
        <Box
          p={6}
          bg="yellow.50"
          _dark={{ bg: 'yellow.900', borderColor: 'yellow.700', color: 'yellow.100' }}
          border="1px"
          borderColor="yellow.200"
          borderRadius="md"
          color="yellow.800"
        >
          <Text fontWeight="bold" mb={2}>Access Denied</Text>
          <Text>You need admin privileges to access user management.</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Text fontSize="2xl" fontWeight="bold">
          User Management
        </Text>
        <Button
          leftIcon={<FiPlus />}
          onClick={handleCreateUser}
          size="sm"
        >
          Create User
        </Button>
      </HStack>

      {loading ? (
        <LoadingSpinner message="Loading users..." minH="200px" />
      ) : error ? (
        <Box
          p={4}
          bg="red.50"
          _dark={{ bg: 'red.900', borderColor: 'red.700', color: 'red.100' }}
          border="1px"
          borderColor="red.200"
          borderRadius="md"
          color="red.800"
        >
          <Text fontWeight="bold" mb={2}>Error loading users</Text>
          <Text>{error}</Text>
        </Box>
      ) : (
        <DataTable
          data={users}
          columns={columns}
          searchableFields={['username', 'email', 'role']}
          itemsPerPage={10}
        />
      )}

      <Dialog
        isOpen={isCreateOpen}
        onClose={onCreateClose}
        onConfirm={handleSubmit}
        title={editingUser ? 'Edit User' : 'Create User'}
        confirmLabel={submitting ? 'Processing...' : editingUser ? 'Update' : 'Create'}
        cancelLabel="Cancel"
        confirmColorScheme="blue"
        colorMode={colorMode}
            maxW="500px"
        isConfirmDisabled={submitting}
          >
        <Box as="form" onSubmit={handleSubmit}>
            {formError && (
              <Box
                p={3}
                mb={4}
                bg="red.50"
                _dark={{ bg: 'red.900', borderColor: 'red.700', color: 'red.100' }}
                border="1px"
                borderColor="red.200"
                borderRadius="md"
                color="red.800"
              >
                <Text fontSize="sm">{formError}</Text>
              </Box>
            )}

              <VStack spacing={4} align="stretch">
                <Box>
              <Text fontSize="sm" fontWeight="500" mb={2} color={getTextColor(colorMode, 'primary')}>
                    Username
                  </Text>
                  <Input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </Box>

                <Box>
              <Text fontSize="sm" fontWeight="500" mb={2} color={getTextColor(colorMode, 'primary')}>
                    Email
                  </Text>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </Box>

                <Box>
              <Text fontSize="sm" fontWeight="500" mb={2} color={getTextColor(colorMode, 'primary')}>
                    Role
                  </Text>
                  <Dropdown
                    value={formData.role}
                    onChange={(value) => setFormData({ ...formData, role: value })}
                    options={[
                      { value: 'user', label: 'User' },
                      { value: 'admin', label: 'Admin' },
                    ]}
                  />
                </Box>

                <Box>
              <Text fontSize="sm" fontWeight="500" mb={2} color={getTextColor(colorMode, 'primary')}>
                    Password {editingUser && '(leave blank to keep current)'}
                  </Text>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                  />
                </Box>

                {formData.password && (
                  <Box>
                <Text fontSize="sm" fontWeight="500" mb={2} color={getTextColor(colorMode, 'primary')}>
                      Confirm Password
                    </Text>
                    <Input
                      type="password"
                      value={formData.passwordConfirmation}
                      onChange={(e) => setFormData({ ...formData, passwordConfirmation: e.target.value })}
                      required={!!formData.password}
                    />
                  </Box>
                )}
              </VStack>
        </Box>
      </Dialog>
    </Box>
  );
};

