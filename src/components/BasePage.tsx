import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  InputAdornment,
  Alert,
  Snackbar,
} from '@mui/material';
import { type AppError, formatErrorMessage } from '../utils/errorUtils';
import { 
  AddCircle as AddIcon, 
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

interface Column<T> {
  field: keyof T;
  headerName: string;
  width?: number;
  renderCell?: (item: T) => React.ReactNode;
}

interface Column<T> {
  field: keyof T;
  headerName: string;
  width?: number;
  required?: boolean;
  renderCell?: (item: T) => React.ReactNode;
}

interface BasePageProps<T> {
  title: string;
  data: T[];
  columns: Column<T>[];
  onAdd: (item: Partial<T>) => Promise<void>;
  onEdit: (item: T) => Promise<void>;
  onDelete: (item: T) => Promise<void>;
  FormComponent: React.ComponentType<{
    open: boolean;
    onClose: () => void;
    item?: T;
    onSave: (item: T | Partial<T>) => Promise<void>;
    isValid?: boolean;
  }>;
  validateForm?: (item: Partial<T>) => boolean;
}

export default function BasePage<T extends { id: string | number }>({
  title,
  data,
  columns,
  onAdd,
  onEdit,
  onDelete,
  FormComponent,
  validateForm,
}: BasePageProps<T>) {
  const [selectedItem, setSelectedItem] = useState<T | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<T | undefined>();
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [itemToSave, setItemToSave] = useState<T | Partial<T> | undefined>();
  const [formData, setFormData] = useState<Partial<T> | undefined>();
  const [error, setError] = useState<AppError | null>(null);
  const isValid = formData && (!validateForm || validateForm(formData));

  const handleAdd = () => {
    setSelectedItem(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (item: T) => {
    setSelectedItem(item);
    setIsFormOpen(true);
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setSelectedItem(undefined);
    setItemToSave(undefined);
  };

  const handleSaveClick = async (item: T | Partial<T>) => {
    // Update form data for validation
    setFormData(item);

    // Check if the form is valid
    if (validateForm && !validateForm(item)) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const handleConfirm = async () => {
        try {
          if (selectedItem) {
            await onEdit(item as T);
          } else {
            await onAdd(item);
          }
          setSaveConfirmOpen(false);
          setItemToSave(undefined);
          setFormData(undefined);
          setIsFormOpen(false);
          setSelectedItem(undefined);
          setError(null);
          resolve();
        } catch (err) {
          const appError = err as AppError;
          setError(appError);
          reject(appError);
        }
      };

      // Store the confirmation handler for later use
      setItemToSave(item);
      // Store the resolve function to be called after confirmation
      // @ts-expect-error - Adding a custom property to the item
      setItemToSave(prev => ({ ...prev, _resolve: handleConfirm }));
      setSaveConfirmOpen(true);
    });
  };

  const handleSaveConfirm = async () => {
    if (itemToSave) {
      // @ts-expect-error - Using the stored confirmation handler
      const resolve = itemToSave._resolve;
      if (resolve) {
        await resolve();
      }
    }
  };

  const handleSaveCancel = () => {
    setSaveConfirmOpen(false);
    setItemToSave(undefined);
  };

  const handleDeleteClick = (item: T) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (itemToDelete) {
      try {
        await onDelete(itemToDelete);
        setDeleteConfirmOpen(false);
        setItemToDelete(undefined);
        setError(null);
      } catch (err) {
        const appError = err as AppError;
        setError(appError);
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setItemToDelete(undefined);
  };

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    
    // Helper function to extract text from React elements
    const getTextContent = (node: React.ReactNode): string => {
      if (typeof node === 'string' || typeof node === 'number') {
        return node.toString();
      }
      if (Array.isArray(node)) {
        return node.map(getTextContent).join(' ');
      }
      if (React.isValidElement(node)) {
        const element = node as React.ReactElement<{ children?: React.ReactNode }>;
        return getTextContent(element.props.children || '');
      }
      return '';
    };

    // Helper function to clean up text for searching
    // Removes commas and currency symbols, converts to lowercase
    const cleanTextForSearch = (text: string) => {
      return text.replace(/[,₹]/g, '').toLowerCase();
    };

    // Clean up the search query
    const cleanedSearchQuery = cleanTextForSearch(searchQuery);

    // If search is empty, return all data
    if (!cleanedSearchQuery) {
      return data;
    }

    // Filter the data
    return data.filter((item) => {
      return columns.some((column) => {
        // Get the value to search (either raw or rendered)
        const rawValue = column.renderCell 
          ? getTextContent(column.renderCell(item))
          : item[column.field]?.toString() || '';

        // Clean up the value and check if it matches the search
        const cleanedValue = cleanTextForSearch(rawValue);
        return cleanedValue.includes(cleanedSearchQuery);
      });
    });
  }, [data, columns, searchQuery]);

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <Snackbar 
        open={Boolean(error)} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setError(null)} 
          severity={error?.type === 'validation' ? 'warning' : 'error'} 
          sx={{ width: '100%' }}
        >
          {error ? formatErrorMessage(error) : ''}
        </Alert>
      </Snackbar>
      
      <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' }, 
          justifyContent: 'space-between', 
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          mb: 2,
          px: { xs: 1, sm: 0 }
        }}>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' },
            overflowWrap: 'break-word',
            wordBreak: 'break-word'
          }}
        >
          {title}
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          gap: 2,
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          flex: { xs: '1', sm: '0 1 auto' },
          maxWidth: { xs: '100%', sm: '600px' }
        }}>
          <TextField
            size="small"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ 
              flex: { xs: '1', sm: '1 1 300px' },
              minWidth: { sm: '200px' }
            }}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            sx={{ 
              alignSelf: { xs: 'stretch', sm: 'auto' },
              minHeight: { xs: 40, sm: 'auto' }
            }}
          >
            New {title.replace(/s$/, '')}
          </Button>
        </Box>
      </Box>

      <TableContainer 
        component={Paper} 
        sx={{ 
          overflowX: 'auto',
          width: '100%',
          maxWidth: '100%',
          mx: 'auto',
          mb: 2,
          '& .MuiTable-root': {
            width: '100%',
            borderCollapse: 'collapse',
          },
          '& .MuiTableCell-root': {
            px: { xs: 1, sm: 2 },
            py: { xs: 1, sm: 1.5 },
            whiteSpace: 'nowrap',
            fontSize: { xs: '0.8125rem', sm: '0.875rem' },
          }
        }}
      >
        <Table sx={{ 
          minWidth: { xs: '100%', sm: 650 },
          tableLayout: 'fixed'
        }}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell 
                  key={String(column.field)} 
                  sx={{ 
                    width: column.width,
                    fontWeight: 'bold',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {column.headerName}
                </TableCell>
              ))}
              <TableCell sx={{ width: { xs: 100, sm: 120 } }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((item) => (
              <TableRow key={item.id}>
                {columns.map((column) => (
                  <TableCell 
                    key={String(column.field)}
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {column.renderCell
                      ? column.renderCell(item)
                      : String(item[column.field])}
                  </TableCell>
                ))}
                <TableCell>
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 0.5,
                    flexWrap: 'nowrap',
                    justifyContent: 'flex-start',
                    '& .MuiButton-root': {
                      minWidth: { xs: '32px', sm: '64px' },
                      px: { xs: 1, sm: 2 }
                    }
                  }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleEdit(item)}
                      startIcon={<EditIcon />}
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleDeleteClick(item)}
                      startIcon={<DeleteIcon />}
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
                    >
                      Delete
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography id="delete-dialog-description">
            Are you sure you want to delete this {title.replace(/s$/, '')}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Save Confirmation Dialog */}
      <Dialog
        open={saveConfirmOpen}
        onClose={handleSaveCancel}
        aria-labelledby="save-dialog-title"
        aria-describedby="save-dialog-description"
      >
        <DialogTitle id="save-dialog-title">
          Confirm {selectedItem ? 'Edit' : 'Add'}
        </DialogTitle>
        <DialogContent>
          <Typography id="save-dialog-description">
            Are you sure you want to {selectedItem ? 'save changes to' : 'add'} this {title.replace(/s$/, '')}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveCancel} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleSaveConfirm} 
            color="primary" 
            variant="contained" 
            autoFocus
            disabled={!isValid}
          >
            {selectedItem ? 'Save Changes' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Form Dialog */}
      <Dialog 
        open={isFormOpen} 
        onClose={handleClose} 
        maxWidth="sm" 
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            margin: { xs: 2, sm: 3 },
            width: { xs: 'calc(100% - 16px)', sm: 'auto' },
            maxHeight: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 64px)' }
          }
        }}
      >
        <FormComponent
          open={isFormOpen}
          onClose={handleClose}
          item={selectedItem}
          onSave={handleSaveClick}
          isValid={isValid}
        />
      </Dialog>
    </Box>
  );
}
