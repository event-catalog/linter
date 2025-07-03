export * from './schema-validator';
export * from './reference-validator';

import { ParsedFile } from '../parser';
import { ValidationError } from '../types';
import { validateAllSchemas } from './schema-validator';
import { validateReferences } from './reference-validator';

export const validateCatalog = (parsedFiles: ParsedFile[]): ValidationError[] => {
  const schemaErrors = validateAllSchemas(parsedFiles);
  const referenceErrors = validateReferences(parsedFiles);

  return [...schemaErrors, ...referenceErrors];
};
