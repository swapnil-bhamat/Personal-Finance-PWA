import React from "react";
import { InputGroup, Form, Button } from "react-bootstrap";
import { BsSearch, BsPlus } from "react-icons/bs";

interface SearchInputProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAdd: () => void;
  extraActions?: React.ReactNode;
  title: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  searchQuery,
  onSearchChange,
  onAdd,
  extraActions,
}) => {
  return (
    <div className="d-flex gap-2">
      <InputGroup className="flex-grow-1">
        <InputGroup.Text className="bg-body-secondary border-end-0">
          <BsSearch className="text-muted" />
        </InputGroup.Text>
        <Form.Control
          type="search"
          placeholder="  Search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="border-start-0 ps-0 bg-body"
        />
        <Button
          variant="outline-primary"
          className="d-flex align-items-center gap-1 px-3"
          onClick={onAdd}
        >
          <BsPlus size={20} />
          <span className="d-none d-sm-inline">Add</span>
        </Button>
        {extraActions}
      </InputGroup>
    </div>
  );
};
