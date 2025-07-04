export * from './schema-validator';
export * from './reference-validator';
export * from './best-practices-validator';

import { ParsedFile } from '../parser';
import { ValidationError } from '../types';
import { validateAllSchemas } from './schema-validator';
import { validateReferences } from './reference-validator';
import { validateBestPractices } from './best-practices-validator';

export const validateCatalog = (parsedFiles: ParsedFile[]): ValidationError[] => {
  const schemaErrors = validateAllSchemas(parsedFiles);
  const referenceErrors = validateReferences(parsedFiles);
  const bestPracticeErrors = validateBestPractices(parsedFiles);

  return [...schemaErrors, ...referenceErrors, ...bestPracticeErrors];
};
