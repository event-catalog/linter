import { z } from 'zod';
import { schemas } from '../schemas';
import { ParsedFile } from '../parser';
import { ValidationError } from '../types';

export const validateSchema = (parsedFile: ParsedFile): ValidationError[] => {
  const { file, frontmatter } = parsedFile;
  const schema = schemas[file.resourceType];
  const errors: ValidationError[] = [];

  try {
    schema.parse(frontmatter);
  } catch (error) {
    if (error instanceof z.ZodError) {
      for (const issue of error.issues) {
        const field = issue.path.join('.');
        let message = issue.message;

        if (issue.code === 'invalid_type') {
          message = `Expected ${issue.expected}, but received ${issue.received}`;
        }

        errors.push({
          type: 'schema',
          resource: `${file.resourceType}/${file.resourceId}`,
          field: field || undefined,
          message: field ? `${field}: ${message}` : message,
          file: file.relativePath,
        });
      }
    } else {
      errors.push({
        type: 'schema',
        resource: `${file.resourceType}/${file.resourceId}`,
        message: error instanceof Error ? error.message : String(error),
        file: file.relativePath,
      });
    }
  }

  return errors;
};

export const validateAllSchemas = (parsedFiles: ParsedFile[]): ValidationError[] => {
  const errors: ValidationError[] = [];

  for (const parsedFile of parsedFiles) {
    errors.push(...validateSchema(parsedFile));
  }

  return errors;
};
