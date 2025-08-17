import React, { useState, useMemo } from 'react';
import {
  Container,
  Card,
  Table,
  Button,
  Form,
  Modal,
  Alert
} from 'react-bootstrap';
import { 
  BsPlus, 
  BsSearch, 
  BsPencil, 
  BsTrash 
} from 'react-icons/bs';
import { type AppError, formatErrorMessage } from '../utils/errorUtils';

interface Column<T> {
  field: keyof T;
  headerName: string;
  required?: boolean;
  renderCell?: (item: T) => React.ReactNode;
}

interface BaseRecord {
  id: string | number;
}

interface BasePageFormProps<T> {
  show: boolean;
  onHide: () => void;
  item?: T;
  onSave: (item: T | Partial<T>) => Promise<void>;
  isValid?: boolean;
}

interface BasePageProps<T extends BaseRecord> {
  title: string;
  data: T[];
  columns: Column<T>[];
  onAdd: (item: Partial<T>) => Promise<void>;
  onEdit: (item: T) => Promise<void>;
  onDelete: (item: T) => Promise<void>;
  FormComponent: React.ComponentType<BasePageFormProps<T>>;
  validateForm?: (item: Partial<T>) => boolean;
}

export default function BasePage<T extends BaseRecord>({
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
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<T | undefined>();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [itemToSave, setItemToSave] = useState<T | Partial<T> | undefined>();
  const [formData, setFormData] = useState<Partial<T> | undefined>();
  const [error, setError] = useState<AppError | null>(null);
  const isValid = formData && (!validateForm || validateForm(formData));

  const handleAdd = () => {
    setSelectedItem(undefined);
    setShowForm(true);
  };

  const handleEdit = (item: T) => {
    setSelectedItem(item);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setSelectedItem(undefined);
    setItemToSave(undefined);
  };

  const handleSaveClick = async (item: T | Partial<T>) => {
    setFormData(item);

    if (validateForm && !validateForm(item)) {
      return;
    }

    setItemToSave(item);
    setShowSaveModal(true);
  };

  const handleSaveConfirm = async () => {
    if (!itemToSave) return;

    try {
      if (selectedItem) {
        await onEdit(itemToSave as T);
      } else {
        await onAdd(itemToSave);
      }
      setShowSaveModal(false);
      setItemToSave(undefined);
      setFormData(undefined);
      setShowForm(false);
      setSelectedItem(undefined);
      setError(null);
    } catch (err) {
      setError(err as AppError);
    }
  };

  const handleDeleteClick = (item: T) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      await onDelete(itemToDelete);
      setShowDeleteModal(false);
      setItemToDelete(undefined);
      setError(null);
    } catch (err) {
      setError(err as AppError);
    }
  };

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    
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

    const cleanTextForSearch = (text: string) => {
      return text.replace(/[,₹]/g, '').toLowerCase();
    };

    const cleanedSearchQuery = cleanTextForSearch(searchQuery);

    if (!cleanedSearchQuery) {
      return data;
    }

    return data.filter((item) => {
      return columns.some((column) => {
        const rawValue = column.renderCell 
          ? getTextContent(column.renderCell(item))
          : item[column.field]?.toString() || '';
        const cleanedValue = cleanTextForSearch(rawValue);
        return cleanedValue.includes(cleanedSearchQuery);
      });
    });
  }, [data, columns, searchQuery]);

  return (
    <Container fluid className="py-4 h-100 overflow-auto pt-0 mt-3">
      {error && (
        <Alert 
          variant={error.type === 'validation' ? 'warning' : 'danger'}
          dismissible
          onClose={() => setError(null)}
          className="mb-3"
        >
          {formatErrorMessage(error)}
        </Alert>
      )}

      {/* Sticky Title & Search Container */}
      <div className="sticky-top z-3">
        <div className="d-flex align-items-center gap-2">
          <div className="position-relative flex-grow-1">
            <Form.Control
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-5"
            />
            <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-secondary">
              <BsSearch />
            </span>
          </div>
          <button className="btn btn-primary flex-shrink-0" onClick={handleAdd}><BsPlus className="me-2" />Add New</button>
        </div>
      </div>

      {/* Add padding-top to main content to prevent overlap */}
      <div className="pt-4">

      {/* Mobile Card View with scroll */}
      <div className="d-lg-none">
        {filteredData.map((item) => (
          <Card key={item.id} className="mb-3 shadow-sm">
            <Card.Body>
              {columns.map((column) => (
                <div key={String(column.field)} className="mb-2">
                  <span className="fw-bold text-secondary me-2">
                    {column.headerName}:
                  </span>
                  <span>
                    {column.renderCell
                      ? column.renderCell(item)
                      : String(item[column.field])}
                  </span>
                </div>
              ))}
              <div className="d-flex gap-2 mt-3 justify-content-end">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => handleEdit(item)}
                >
                  <BsPencil className="me-1" />
                  Edit
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleDeleteClick(item)}
                >
                  <BsTrash className="me-1" />
                  Delete
                </Button>
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="d-none d-lg-block">
        <Table hover responsive className="align-middle">
          <thead className="table-light">
            <tr>
              {columns.map((column) => (
                <th key={String(column.field)} className="w-auto">
                  {column.headerName}
                </th>
              ))}
              <th className="w-auto text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => (
              <tr key={item.id}>
                {columns.map((column) => (
                  <td key={String(column.field)} className="w-auto">
                    {column.renderCell
                      ? column.renderCell(item)
                      : String(item[column.field])}
                  </td>
                ))}
                <td className="w-auto text-end">
                  <div className="d-flex gap-2 justify-content-end">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleEdit(item)}
                    >
                      <BsPencil className="me-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDeleteClick(item)}
                    >
                      <BsTrash className="me-1" />
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this {title.replace(/s$/, '')}? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Save Confirmation Modal */}
      <Modal show={showSaveModal} onHide={() => setShowSaveModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Confirm {selectedItem ? 'Edit' : 'Add'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to {selectedItem ? 'save changes to' : 'add'} this {title.replace(/s$/, '')}?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSaveModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSaveConfirm}
            disabled={!isValid}
          >
            {selectedItem ? 'Save Changes' : 'Add'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Form Modal */}
      {showForm && (
        <FormComponent
          show={showForm}
          onHide={handleClose}
          item={selectedItem}
          onSave={handleSaveClick}
          isValid={isValid}
        />
      )}
      </div>
    </Container>
  );
}
