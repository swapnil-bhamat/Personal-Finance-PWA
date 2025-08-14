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
import './BasePage.scss';

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
    <Box className="base-page">
      <Snackbar 
        open={Boolean(error)} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setError(null)} 
          severity={error?.type === 'validation' ? 'warning' : 'error'} 
          className="base-page__alert"
        >
          {error ? formatErrorMessage(error) : ''}
        </Alert>
      </Snackbar>
      <div className="base-page__container">
        <div className="base-page__header">
          <Typography 
            variant="h4" 
            component="h1" 
            className="base-page__title"
          >
            {title}
          </Typography>
          <div className="base-page__controls">
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
              className="base-page__search"
              fullWidth
            />
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              className="base-page__add-button"
            >
              New {title.replace(/s$/, '')}
            </Button>
          </div>
        </div>

      {/* Mobile Card View */}
      <div className="base-page__card-list">
        {filteredData.map((item) => (
          <Paper key={item.id} className="base-page__card">
            {columns.map((column) => (
              <div 
                key={String(column.field)}
                className="base-page__card-field"
              >
                <Typography 
                  component="span" 
                  className="base-page__card-label"
                >
                  {column.headerName}:
                </Typography>
                <Typography 
                  component="span"
                  className="base-page__card-value"
                >
                  {column.renderCell
                    ? column.renderCell(item)
                    : String(item[column.field])}
                </Typography>
              </div>
            ))}
            <div className="base-page__card-actions">
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleEdit(item)}
                startIcon={<EditIcon />}
              >
                Edit
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => handleDeleteClick(item)}
                startIcon={<DeleteIcon />}
              >
                Delete
              </Button>
            </div>
          </Paper>
        ))}
      </div>

      {/* Desktop Table View */}
      <TableContainer 
        component={Paper} 
        className="base-page__table-container"
      >
        <Table className="base-page__table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell 
                  key={String(column.field)} 
                  className="base-page__table-header-cell"
                  style={{ width: column.width }}
                >
                  {column.headerName}
                </TableCell>
              ))}
              <TableCell className="base-page__table-actions-header">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((item) => (
              <TableRow key={item.id}>
                {columns.map((column) => (
                  <TableCell 
                    key={String(column.field)}
                    className="base-page__table-cell"
                  >
                    {column.renderCell
                      ? column.renderCell(item)
                      : String(item[column.field])}
                  </TableCell>
                ))}
                <TableCell>
                  <div className="base-page__table-actions">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleEdit(item)}
                      startIcon={<EditIcon />}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleDeleteClick(item)}
                      startIcon={<DeleteIcon />}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      </div>

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
        className="base-page__dialog"
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
