import React, { useState, useMemo } from "react";
import { Container, Alert, Button } from "react-bootstrap";
import { BsSearch, BsPlus } from "react-icons/bs";
import { SearchInput } from "./common/SearchInput";
import { DeleteConfirmationModal } from "./common/DeleteConfirmationModal";
import { SaveConfirmationModal } from "./common/SaveConfirmationModal";
import { MobileCardView } from "./common/MobileCardView";
import { DesktopTableView } from "./common/DesktopTableView";
import { Column, BaseRecord } from "../types/ui";

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

  return (
    <Container
      fluid
      className="p-0 h-100 d-flex flex-column"
      style={{ maxHeight: "85vh" }}
    >
      {/* Sticky Header Section */}
      <div
        className="bg-body border-bottom sticky-top shadow-sm"
        style={{ zIndex: 1020 }}
      >
        <div className="p-3">
          <SearchInput
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAdd={handleAdd}
            extraActions={extraActions}
            title={title}
          />
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
        <MobileCardView
          data={filteredData}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />

        {/* Desktop Table View */}
        <DesktopTableView
          data={filteredData}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        itemName={title.replace(/s$/, "")}
      />

      {/* Save Confirmation Modal */}
      <SaveConfirmationModal
        show={showSaveModal}
        onHide={() => setShowSaveModal(false)}
        onConfirm={handleSaveConfirm}
        isEdit={!!selectedItem}
        itemName={title.replace(/s$/, "")}
        isValid={!!isValid}
      />

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
