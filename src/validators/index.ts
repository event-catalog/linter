export * from './schema-validator';
export * from './reference-validator';
export * from './best-practices-validator';

import { ParsedFile } from '../parser';
import { ValidationError } from '../types';
import { CatalogDependencies } from '../config';
import { validateAllSchemas } from './schema-validator';
import { validateReferences } from './reference-validator';
import { validateBestPractices } from './best-practices-validator';

export const validateCatalog = (parsedFiles: ParsedFile[], dependencies?: CatalogDependencies): ValidationError[] => {
  const schemaErrors = validateAllSchemas(parsedFiles);
  const referenceErrors = validateReferences(parsedFiles, dependencies);
  const bestPracticeErrors = validateBestPractices(parsedFiles);

  return [...schemaErrors, ...referenceErrors, ...bestPracticeErrors];
};
