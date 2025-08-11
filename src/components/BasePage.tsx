import { useState } from 'react';
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
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

interface Column<T> {
  field: keyof T;
  headerName: string;
  width?: number;
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
  }>;
}

export default function BasePage<T extends { id: string | number }>({
  title,
  data,
  columns,
  onAdd,
  onEdit,
  onDelete,
  FormComponent,
}: BasePageProps<T>) {
  const [selectedItem, setSelectedItem] = useState<T | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);

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
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{ 
            alignSelf: { xs: 'stretch', sm: 'auto' },
            minHeight: { xs: 40, sm: 'auto' }
          }}
        >
          Add New
        </Button>
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
            {data.map((item) => (
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
                      onClick={() => handleEdit(item)}
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => onDelete(item)}
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
          onSave={async (item) => {
            try {
              if (selectedItem) {
                await onEdit(item as T);
              } else {
                await onAdd(item);
              }
              handleClose();
            } catch (error) {
              console.error('Failed to save item:', error);
              // Re-throw to let the form handle the error
              throw error;
            }
          }}
        />
      </Dialog>
    </Box>
  );
}
