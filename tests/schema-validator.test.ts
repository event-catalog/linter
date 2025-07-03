import { describe, it, expect } from 'vitest';
import { validateSchema } from '../src/validators/schema-validator';
import { ParsedFile } from '../src/parser';
import { CatalogFile } from '../src/scanner';

const createParsedFile = (resourceType: any, frontmatter: any, resourceId = 'test-resource'): ParsedFile => {
  const file: CatalogFile = {
    path: `/test/${resourceType}s/${resourceId}/index.mdx`,
    relativePath: `${resourceType}s/${resourceId}/index.mdx`,
    resourceType,
    resourceId,
  };

  return {
    file,
    frontmatter,
    content: '',
    raw: '',
  };
};

describe('validateSchema', () => {
  describe('domain validation', () => {
    it('should pass with valid domain frontmatter', () => {
      const parsedFile = createParsedFile('domain', {
        id: 'sales',
        name: 'Sales Domain',
        version: '1.0.0',
      });

      const errors = validateSchema(parsedFile);
      expect(errors).toHaveLength(0);
    });

    it('should fail with missing required fields', () => {
      const parsedFile = createParsedFile('domain', {
        id: 'sales',
      });

      const errors = validateSchema(parsedFile);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe('schema');
    });

    it('should fail with invalid version format', () => {
      const parsedFile = createParsedFile('domain', {
        id: 'sales',
        name: 'Sales Domain',
        version: 'invalid-version',
      });

      const errors = validateSchema(parsedFile);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('semantic version');
    });
  });

  describe('service validation', () => {
    it('should pass with valid service frontmatter', () => {
      const parsedFile = createParsedFile('service', {
        id: 'user-service',
        name: 'User Service',
        version: '2.1.0',
        sends: [{ id: 'user-created' }],
        receives: [{ id: 'create-user', version: '1.0.0' }],
      });

      const errors = validateSchema(parsedFile);
      expect(errors).toHaveLength(0);
    });

    it('should pass with deprecated field', () => {
      const parsedFile = createParsedFile('service', {
        id: 'user-service',
        name: 'User Service',
        version: '2.1.0',
        deprecated: {
          date: '2024-01-01',
          message: 'Use new-user-service instead',
        },
      });

      const errors = validateSchema(parsedFile);
      expect(errors).toHaveLength(0);
    });
  });

  describe('event validation', () => {
    it('should pass with valid event frontmatter', () => {
      const parsedFile = createParsedFile('event', {
        id: 'user-created',
        name: 'User Created',
        version: '1.0.0',
        draft: true,
      });

      const errors = validateSchema(parsedFile);
      expect(errors).toHaveLength(0);
    });

    it('should pass with draft object', () => {
      const parsedFile = createParsedFile('event', {
        id: 'user-created',
        name: 'User Created',
        version: '1.0.0',
        draft: {
          title: 'Work in Progress',
          message: 'This event is still being designed',
        },
      });

      const errors = validateSchema(parsedFile);
      expect(errors).toHaveLength(0);
    });
  });

  describe('flow validation', () => {
    it('should pass with valid flow frontmatter', () => {
      const parsedFile = createParsedFile('flow', {
        id: 'user-registration',
        name: 'User Registration Flow',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            title: 'User submits form',
            actor: { name: 'User' },
            next_step: 'step2',
          },
          {
            id: 'step2',
            title: 'Service creates user',
            service: { id: 'user-service', version: '1.0.0' },
          },
        ],
      });

      const errors = validateSchema(parsedFile);
      expect(errors).toHaveLength(0);
    });
  });

  describe('entity validation', () => {
    it('should pass with valid entity frontmatter', () => {
      const parsedFile = createParsedFile('entity', {
        id: 'user',
        name: 'User',
        version: '1.0.0',
        aggregateRoot: true,
        identifier: 'userId',
        properties: [
          {
            name: 'userId',
            type: 'string',
            required: true,
            description: 'Unique identifier',
          },
          {
            name: 'orders',
            type: 'Order[]',
            references: 'order',
            relationType: 'one-to-many',
          },
        ],
      });

      const errors = validateSchema(parsedFile);
      expect(errors).toHaveLength(0);
    });
  });
});
