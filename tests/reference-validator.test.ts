import { describe, it, expect } from 'vitest';
import { buildResourceIndex, validateReferences } from '../src/validators/reference-validator';
import { ParsedFile } from '../src/parser';
import { CatalogFile } from '../src/scanner';

const createParsedFile = (resourceType: any, resourceId: string, frontmatter: any): ParsedFile => {
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

describe('buildResourceIndex', () => {
  it('should build index with resources and versions', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'user-service', { version: '1.0.0' }),
      createParsedFile('service', 'user-service', { version: '2.0.0' }),
      createParsedFile('event', 'user-created', { version: '1.0.0' }),
      createParsedFile('user', 'john-doe', {}),
    ];

    const index = buildResourceIndex(parsedFiles);

    expect(index.service['user-service']).toBeDefined();
    expect(index.service['user-service'].has('1.0.0')).toBe(true);
    expect(index.service['user-service'].has('2.0.0')).toBe(true);
    expect(index.event['user-created'].has('1.0.0')).toBe(true);
    expect(index.user['john-doe']).toBeDefined();
  });
});

describe('validateReferences', () => {
  it('should not report errors for valid references', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('domain', 'sales', {
        version: '1.0.0',
        services: [{ id: 'order-service' }],
        entities: [{ id: 'order', version: '1.0.0' }],
      }),
      createParsedFile('service', 'order-service', { version: '1.0.0' }),
      createParsedFile('entity', 'order', { version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(0);
  });

  it('should report errors for missing references', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('domain', 'sales', {
        version: '1.0.0',
        services: [{ id: 'missing-service' }],
      }),
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('reference');
    expect(errors[0].message).toContain('missing-service');
  });

  it('should report errors for wrong version references', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'user-service', {
        version: '1.0.0',
        sends: [{ id: 'user-created', version: '2.0.0' }],
      }),
      createParsedFile('event', 'user-created', { version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('version: 2.0.0');
  });

  it('should check message references in multiple types', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'user-service', {
        version: '1.0.0',
        sends: [{ id: 'user-updated' }],
      }),
      createParsedFile('event', 'user-updated', { version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(0);
  });

  it('should validate flow step references', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('flow', 'user-registration', {
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            title: 'Send command',
            message: { id: 'create-user', version: '1.0.0' },
          },
          {
            id: 'step2',
            title: 'Process in service',
            service: { id: 'missing-service', version: '1.0.0' },
          },
        ],
      }),
      createParsedFile('command', 'create-user', { version: '1.0.0' }),
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toContain('steps[1].service');
  });

  it('should validate owner references', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'user-service', {
        version: '1.0.0',
        owners: ['john-doe', 'platform-team'],
      }),
      createParsedFile('user', 'john-doe', {}),
      createParsedFile('team', 'platform-team', {}),
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(0);
  });

  it('should validate team member references', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('team', 'platform-team', {
        members: ['john-doe', 'jane-doe'],
      }),
      createParsedFile('user', 'john-doe', {}),
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('jane-doe');
  });

  it('should use frontmatter id for user and team references instead of filename', () => {
    const parsedFiles: ParsedFile[] = [
      createParsedFile('service', 'user-service', {
        version: '1.0.0',
        owners: ['asmith', 'msmith'], // lowercase refs
      }),
      createParsedFile('team', 'platform-team', {
        members: ['asmith'], // lowercase ref
      }),
      // User files with filename mismatch - filename has capital letters, frontmatter has lowercase
      {
        ...createParsedFile('user', 'aSmith', { id: 'asmith' }), // filename: aSmith, frontmatter: asmith
        file: {
          ...createParsedFile('user', 'aSmith', {}).file,
          path: '/test/users/aSmith.mdx',
          relativePath: 'users/aSmith.mdx',
        },
      },
      {
        ...createParsedFile('user', 'mSmith', { id: 'msmith' }), // filename: mSmith, frontmatter: msmith
        file: {
          ...createParsedFile('user', 'mSmith', {}).file,
          path: '/test/users/mSmith.mdx',
          relativePath: 'users/mSmith.mdx',
        },
      },
    ];

    const errors = validateReferences(parsedFiles);
    expect(errors).toHaveLength(0); // Should not report any errors
  });

  describe('semver version matching', () => {
    it('should support "latest" version references', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('service', 'inventory-service', {
          version: '1.0.0',
          sends: [{ id: 'OutOfStock', version: 'latest' }],
        }),
        createParsedFile('event', 'OutOfStock', { version: '2.0.0' }),
        createParsedFile('event', 'OutOfStock', { version: '1.5.0' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0);
    });

    it('should support x-pattern version matching like "0.0.x"', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('service', 'inventory-service', {
          version: '1.0.0',
          sends: [{ id: 'GetInventoryList', version: '0.0.x' }],
        }),
        createParsedFile('command', 'GetInventoryList', { version: '0.0.1' }),
        createParsedFile('command', 'GetInventoryList', { version: '0.0.5' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0);
    });

    it('should support semver range patterns like "^1.0.0"', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('service', 'user-service', {
          version: '1.0.0',
          sends: [{ id: 'UserCreated', version: '^1.0.0' }],
        }),
        createParsedFile('event', 'UserCreated', { version: '1.2.0' }),
        createParsedFile('event', 'UserCreated', { version: '1.0.5' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0);
    });

    it('should support tilde range patterns like "~1.2.0"', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('service', 'user-service', {
          version: '1.0.0',
          sends: [{ id: 'UserUpdated', version: '~1.2.0' }],
        }),
        createParsedFile('event', 'UserUpdated', { version: '1.2.3' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid version patterns', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('service', 'inventory-service', {
          version: '1.0.0',
          sends: [{ id: 'GetInventoryList', version: '0.1.x' }], // No 0.1.x available
        }),
        createParsedFile('command', 'GetInventoryList', { version: '0.0.1' }),
        createParsedFile('command', 'GetInventoryList', { version: '0.2.1' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('version: 0.1.x');
    });

    it('should reject semver patterns that do not match any available versions', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('service', 'user-service', {
          version: '1.0.0',
          sends: [{ id: 'UserCreated', version: '^2.0.0' }], // No 2.x versions available
        }),
        createParsedFile('event', 'UserCreated', { version: '1.2.0' }),
        createParsedFile('event', 'UserCreated', { version: '1.5.0' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('version: ^2.0.0');
    });

    it('should handle resources with "latest" version when requested with patterns', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('service', 'inventory-service', {
          version: '1.0.0',
          sends: [{ id: 'StockUpdate', version: '^1.0.0' }],
        }),
        createParsedFile('event', 'StockUpdate', {}), // No version specified, defaults to 'latest'
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(1); // Should fail because 'latest' doesn't match semver pattern
    });

    it('should allow exact version matches even when semver patterns fail', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('service', 'inventory-service', {
          version: '1.0.0',
          sends: [{ id: 'OutOfStock', version: '1.0.0' }], // Exact match
        }),
        createParsedFile('event', 'OutOfStock', { version: '1.0.0' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0);
    });
  });

  describe('domain-to-domain references', () => {
    it('should not report errors for valid domain references', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('domain', 'e-commerce', {
          version: '1.0.0',
          domains: [
            { id: 'orders', version: '1.0.0' },
            { id: 'payments' }, // No version specified, should use latest
          ],
          services: [{ id: 'user-service' }],
        }),
        createParsedFile('domain', 'orders', { version: '1.0.0' }),
        createParsedFile('domain', 'payments', { version: '2.0.0' }),
        createParsedFile('service', 'user-service', { version: '1.0.0' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0);
    });

    it('should report errors for missing domain references', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('domain', 'e-commerce', {
          version: '1.0.0',
          domains: [
            { id: 'orders' },
            { id: 'missing-domain' }, // This domain doesn't exist
          ],
        }),
        createParsedFile('domain', 'orders', { version: '1.0.0' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('reference');
      expect(errors[0].field).toBe('domains');
      expect(errors[0].message).toContain('missing-domain');
      expect(errors[0].message).toContain('does not exist');
    });

    it('should report errors for domain references with wrong versions', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('domain', 'e-commerce', {
          version: '1.0.0',
          domains: [
            { id: 'orders', version: '2.0.0' }, // Version 2.0.0 doesn't exist
          ],
        }),
        createParsedFile('domain', 'orders', { version: '1.0.0' }), // Only 1.0.0 exists
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('reference');
      expect(errors[0].field).toBe('domains');
      expect(errors[0].message).toContain('orders');
      expect(errors[0].message).toContain('version: 2.0.0');
    });

    it('should support semver patterns in domain references', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('domain', 'parent-domain', {
          version: '1.0.0',
          domains: [
            { id: 'child-domain', version: '^1.0.0' }, // Should match 1.2.0
          ],
        }),
        createParsedFile('domain', 'child-domain', { version: '1.2.0' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0);
    });

    it('should validate complex domain hierarchies', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('domain', 'enterprise', {
          version: '1.0.0',
          domains: [{ id: 'e-commerce' }, { id: 'analytics' }],
        }),
        createParsedFile('domain', 'e-commerce', {
          version: '1.0.0',
          domains: [{ id: 'orders' }, { id: 'payments' }],
          services: [{ id: 'user-service' }],
        }),
        createParsedFile('domain', 'analytics', { version: '1.0.0' }),
        createParsedFile('domain', 'orders', { version: '1.0.0' }),
        createParsedFile('domain', 'payments', { version: '1.0.0' }),
        createParsedFile('service', 'user-service', { version: '1.0.0' }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0);
    });

    it('should catch circular domain references', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('domain', 'domain-a', {
          version: '1.0.0',
          domains: [{ id: 'domain-b' }],
        }),
        createParsedFile('domain', 'domain-b', {
          version: '1.0.0',
          domains: [{ id: 'domain-a' }], // Circular reference
        }),
      ];

      // The validator doesn't prevent circular references, it just validates they exist
      // This should pass because both domains exist
      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0);
    });

    it('should resolve domain references without versions to latest', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('domain', 'e-commerce', {
          id: 'E-Commerce', // Different case from directory name
          version: '1.0.0',
          domains: [
            { id: 'Orders' }, // No version specified - should resolve to latest
            { id: 'Payments' }, // No version specified - should resolve to latest
          ],
        }),
        createParsedFile('domain', 'orders', {
          id: 'Orders', // Different case from directory name
          version: '2.0.0',
        }),
        createParsedFile('domain', 'payments', {
          id: 'Payments', // Different case from directory name
          version: '1.5.0',
        }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0); // Should pass - latest versions found
    });

    it('should handle case sensitivity between directory names and frontmatter IDs', () => {
      const parsedFiles: ParsedFile[] = [
        createParsedFile('domain', 'e-commerce', {
          id: 'E-Commerce', // Uppercase ID in lowercase directory
          version: '1.0.0',
          domains: [
            { id: 'Order-Management', version: '1.0.0' }, // Reference with specific version
          ],
        }),
        createParsedFile('domain', 'order-management', {
          id: 'Order-Management', // Different case from directory name
          version: '1.0.0',
        }),
      ];

      const errors = validateReferences(parsedFiles);
      expect(errors).toHaveLength(0); // Should pass - IDs match frontmatter, not directory names
    });
  });
});
