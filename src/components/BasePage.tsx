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
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Add New
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={String(column.field)} style={{ width: column.width }}>
                  {column.headerName}
                </TableCell>
              ))}
              <TableCell style={{ width: 120 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                {columns.map((column) => (
                  <TableCell key={String(column.field)}>
                    {column.renderCell
                      ? column.renderCell(item)
                      : String(item[column.field])}
                  </TableCell>
                ))}
                <TableCell>
                  <Button
                    size="small"
                    onClick={() => handleEdit(item)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => onDelete(item)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={isFormOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <FormComponent
          open={isFormOpen}
          onClose={handleClose}
          item={selectedItem}
          onSave={(item) => {
            if (selectedItem) {
              onEdit(item);
            } else {
              onAdd();
            }
            handleClose();
          }}
        />
      </Dialog>
    </Box>
  );
}
