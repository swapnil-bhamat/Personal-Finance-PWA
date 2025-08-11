import { z } from 'zod';

// Types for different error categories
export type ValidationError = {
  type: 'validation';
  message: string;
  field?: string;
  details?: z.ZodError;
};

export type DatabaseError = {
  type: 'database';
  message: string;
  details?: Error;
};

export type AppError = ValidationError | DatabaseError;

// Central error handling function
export const handleError = (error: unknown): AppError => {
  if (error instanceof z.ZodError) {
    // Format Zod validation errors
    const message = error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    return {
      type: 'validation',
      message,
      details: error,
    };
  }

  if (error instanceof Error) {
    // Handle database or other errors
    return {
      type: 'database',
      message: error.message,
      details: error,
    };
  }

  // Handle unknown errors
  return {
    type: 'database',
    message: 'An unexpected error occurred',
    details: error instanceof Error ? error : new Error(String(error)),
  };
};

// Helper to format error message for display
export const formatErrorMessage = (error: AppError): string => {
  switch (error.type) {
    case 'validation':
      return `Validation Error: ${error.message}`;
    case 'database':
      return `Database Error: ${error.message}`;
    default:
      return 'An unexpected error occurred';
  }
};
