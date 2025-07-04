import { ParsedFile } from '../parser';
import { ValidationError } from '../types';

export const validateBestPractices = (parsedFiles: ParsedFile[]): ValidationError[] => {
  const errors: ValidationError[] = [];

  for (const parsedFile of parsedFiles) {
    const { file, frontmatter } = parsedFile;

    // Check for required summary
    if (!frontmatter.summary || (typeof frontmatter.summary === 'string' && frontmatter.summary.trim() === '')) {
      errors.push({
        type: 'schema',
        resource: `${file.resourceType}/${file.resourceId}`,
        field: 'summary',
        message: 'Summary is required for better documentation',
        file: file.relativePath,
        severity: 'error',
        rule: 'best-practices/summary-required',
      });
    }

    // Check for required owners
    if (!frontmatter.owners || !Array.isArray(frontmatter.owners) || frontmatter.owners.length === 0) {
      errors.push({
        type: 'schema',
        resource: `${file.resourceType}/${file.resourceId}`,
        field: 'owners',
        message: 'At least one owner is required',
        file: file.relativePath,
        severity: 'error',
        rule: 'best-practices/owner-required',
      });
    }
  }

  return errors;
};
