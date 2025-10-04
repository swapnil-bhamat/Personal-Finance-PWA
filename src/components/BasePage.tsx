import React, { useState, useMemo } from "react";
import {
  Container,
  Card,
  Table,
  Button,
  Form,
  Modal,
  Alert,
  InputGroup,
  Row,
  Col,
} from "react-bootstrap";
import { BsPlus, BsSearch, BsPencil, BsTrash } from "react-icons/bs";

interface Column<T> {
  field: keyof T;
  headerName: string;
  required?: boolean;
  renderCell?: (item: T) => React.ReactNode;
  priority?: "high" | "medium" | "low"; // For responsive display
}

interface BaseRecord {
  id: string | number;
}

export interface BasePageFormProps<T> {
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
  extraActions?: React.ReactNode;
}

type AppError = {
  type: "database" | "validation";
  message: string;
};

export default function BasePage<T extends BaseRecord>({
  title,
  data,
  columns,
  onAdd,
  onEdit,
  onDelete,
  FormComponent,
  validateForm,
  extraActions,
}: BasePageProps<T>) {
  const [selectedItem, setSelectedItem] = useState<T | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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
      if (typeof node === "string" || typeof node === "number") {
        return node.toString();
      }
      if (Array.isArray(node)) {
        return node.map(getTextContent).join(" ");
      }
      if (React.isValidElement(node)) {
        const element = node as React.ReactElement<{
          children?: React.ReactNode;
        }>;
        return getTextContent(element.props.children || "");
      }
      return "";
    };

    const cleanTextForSearch = (text: string) => {
      return text.replace(/[,₹]/g, "").toLowerCase();
    };

    const cleanedSearchQuery = cleanTextForSearch(searchQuery);

    if (!cleanedSearchQuery) {
      return data;
    }

    return data.filter((item) => {
      return columns.some((column) => {
        const rawValue = column.renderCell
          ? getTextContent(column.renderCell(item))
          : item[column.field]?.toString() || "";
        const cleanedValue = cleanTextForSearch(rawValue);
        return cleanedValue.includes(cleanedSearchQuery);
      });
    });
  }, [data, columns, searchQuery]);

  const formatErrorMessage = (error: AppError): string => {
    switch (error.type) {
      case "validation":
        return `Validation Error: ${error.message}`;
      case "database":
        return `Database Error: ${error.message}`;
      default:
        return "An unexpected error occurred";
    }
  };

  // Separate columns by priority for mobile view
  const primaryColumns = columns.slice(0, 2); // Show first 2 columns prominently
  const secondaryColumns = columns.slice(2); // Rest are secondary

  return (
    <Container fluid className="p-0 h-100 d-flex flex-column">
      {/* Sticky Header Section */}
      <div
        className="bg-body border-bottom sticky-top shadow-sm"
        style={{ zIndex: 1020 }}
      >
        <div className="p-3">
          {/* Search and Add Button Row */}
          <div className="d-flex gap-2">
            <InputGroup className="flex-grow-1">
              <InputGroup.Text className="bg-body-secondary border-end-0">
                <BsSearch className="text-muted" />
              </InputGroup.Text>
              <Form.Control
                type="search"
                placeholder="  Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-start-0 ps-0 bg-body"
              />
              <div className="d-flex gap-2">
                <Button
                  variant="primary"
                  className="d-flex align-items-center gap-1 px-3"
                  onClick={handleAdd}
                >
                  <BsPlus size={20} />
                  <span className="d-none d-sm-inline">Add</span>
                </Button>
                {extraActions}
              </div>
            </InputGroup>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="px-3 pt-3">
          <Alert
            variant={error.type === "validation" ? "warning" : "danger"}
            dismissible
            onClose={() => setError(null)}
            className="mb-0"
          >
            <div className="d-flex align-items-start gap-2">
              <span className="fw-bold">⚠️</span>
              <div className="flex-grow-1">{formatErrorMessage(error)}</div>
            </div>
          </Alert>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-grow-1 overflow-auto">
        {/* Empty State */}
        {filteredData.length === 0 && (
          <div className="text-center py-5 px-3">
            <div className="text-muted mb-3">
              <BsSearch size={48} />
            </div>
            <h5 className="text-muted">No items found</h5>
            <p className="text-muted small mb-3">
              {searchQuery
                ? "Try adjusting your search"
                : `No ${title.toLowerCase()} available`}
            </p>
            {!searchQuery && (
              <Button variant="outline-primary" onClick={handleAdd}>
                <BsPlus size={20} className="me-1" />
                Add {title.replace(/s$/, "")}
              </Button>
            )}
          </div>
        )}

        {/* Mobile Compact Card View */}
        <div className="d-lg-none p-3">
          {filteredData.map((item, index) => (
            <Card
              key={item.id}
              className={`border shadow-sm ${
                index < filteredData.length - 1 ? "mb-2" : ""
              }`}
            >
              <Card.Body className="p-3">
                {/* Compact Header with Primary Info */}
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="flex-grow-1 me-2 w-75">
                    {primaryColumns.map((column, colIndex) => {
                      const cellValue = column.renderCell
                        ? column.renderCell(item)
                        : String(item[column.field]) || "-";
                      const isCurrency =
                        typeof cellValue === "string" &&
                        cellValue.includes("₹");

                      return (
                        <div
                          key={String(column.field)}
                          className={colIndex > 0 ? "mt-1" : ""}
                        >
                          {colIndex === 0 ? (
                            // First field - prominent
                            <div
                              className={`fw-bold fs-6 text-truncate ${
                                isCurrency ? "fw-bold text-success" : ""
                              }`}
                            >
                              {cellValue}
                            </div>
                          ) : (
                            // Second field - subdued
                            <div
                              className={`small text-truncate ${
                                isCurrency
                                  ? "fw-bold text-success fs-6"
                                  : "text-muted"
                              }`}
                            >
                              {cellValue}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Compact Action Buttons */}
                  <div className="d-flex gap-1 flex-shrink-0">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="p-1"
                      style={{ width: "32px", height: "32px" }}
                      onClick={() => handleEdit(item)}
                    >
                      <BsPencil size={14} />
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="p-1"
                      style={{ width: "32px", height: "32px" }}
                      onClick={() => handleDeleteClick(item)}
                    >
                      <BsTrash size={14} />
                    </Button>
                  </div>
                </div>

                {/* Secondary Info - Compact Grid */}
                {secondaryColumns.length > 0 && (
                  <Row className="g-2 mt-1 pt-2 border-top border-opacity-25">
                    {secondaryColumns.map((column) => {
                      const cellValue = column.renderCell
                        ? column.renderCell(item)
                        : String(item[column.field]) || "-";
                      const isCurrency =
                        typeof cellValue === "string" &&
                        cellValue.includes("₹");

                      return (
                        <Col xs={6} key={String(column.field)}>
                          <div
                            className="small text-muted text-uppercase"
                            style={{
                              fontSize: "0.7rem",
                              letterSpacing: "0.3px",
                            }}
                          >
                            {column.headerName}
                          </div>
                          <div
                            className={`small fw-medium text-truncate ${
                              isCurrency ? "fw-bold text-success fs-6" : ""
                            }`}
                            title={String(cellValue)}
                          >
                            {cellValue}
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                )}
              </Card.Body>
            </Card>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="d-none d-lg-block p-3">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={String(column.field)}
                      className="border-bottom border-2 text-uppercase small fw-semibold"
                      style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}
                    >
                      {column.headerName}
                    </th>
                  ))}
                  <th
                    className="border-bottom border-2 text-uppercase small fw-semibold text-end"
                    style={{
                      fontSize: "0.75rem",
                      letterSpacing: "0.5px",
                      width: "150px",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id}>
                    {columns.map((column) => {
                      const cellValue = column.renderCell
                        ? column.renderCell(item)
                        : String(item[column.field]) || "-";
                      const isCurrency =
                        typeof cellValue === "string" &&
                        cellValue.includes("₹");

                      return (
                        <td
                          key={String(column.field)}
                          className={`align-middle ${
                            isCurrency ? "fw-bold text-success fs-6" : ""
                          }`}
                        >
                          {cellValue}
                        </td>
                      );
                    })}
                    <td className="align-middle text-end">
                      <div className="d-flex gap-2 justify-content-end">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="d-flex align-items-center gap-1"
                          onClick={() => handleEdit(item)}
                        >
                          <BsPencil size={14} />
                          <span>Edit</span>
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="d-flex align-items-center gap-1"
                          onClick={() => handleDeleteClick(item)}
                        >
                          <BsTrash size={14} />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        backdrop="static"
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2">
          <p className="mb-0">
            Are you sure you want to delete this {title.replace(/s$/, "")}? This
            action cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="outline-secondary"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Save Confirmation Modal */}
      <Modal
        show={showSaveModal}
        onHide={() => setShowSaveModal(false)}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">
            Confirm {selectedItem ? "Edit" : "Add"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2">
          <p className="mb-0">
            Are you sure you want to {selectedItem ? "save changes to" : "add"}{" "}
            this {title.replace(/s$/, "")}?
          </p>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="outline-secondary"
            onClick={() => setShowSaveModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveConfirm}
            disabled={!isValid}
          >
            {selectedItem ? "Save Changes" : "Add"}
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
    </Container>
  );
}
