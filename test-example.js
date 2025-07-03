#!/usr/bin/env node

// Quick test to demonstrate the exact scenario you mentioned
const { validateReferences } = require('./dist/validators/reference-validator.js');

const parsedFiles = [
  {
    file: {
      path: '/test/domains/sales/index.mdx',
      relativePath: 'domains/sales/index.mdx',
      resourceType: 'domain',
      resourceId: 'sales',
    },
    frontmatter: {
      version: '1.0.0',
      services: [{ id: 'InventoryService' }, { id: 'OrdersService' }, { id: 'NotificationService' }, { id: 'ShippingService' }],
    },
    content: '',
    raw: '',
  },
  {
    file: {
      path: '/test/services/InventoryService/index.mdx',
      relativePath: 'services/InventoryService/index.mdx',
      resourceType: 'service',
      resourceId: 'InventoryService',
    },
    frontmatter: { version: '2.1.0' },
    content: '',
    raw: '',
  },
  {
    file: {
      path: '/test/services/OrdersService/index.mdx',
      relativePath: 'services/OrdersService/index.mdx',
      resourceType: 'service',
      resourceId: 'OrdersService',
    },
    frontmatter: { version: '1.5.0' },
    content: '',
    raw: '',
  },
  {
    file: {
      path: '/test/services/NotificationService/index.mdx',
      relativePath: 'services/NotificationService/index.mdx',
      resourceType: 'service',
      resourceId: 'NotificationService',
    },
    frontmatter: { version: '3.0.0' },
    content: '',
    raw: '',
  },
  {
    file: {
      path: '/test/services/ShippingService/index.mdx',
      relativePath: 'services/ShippingService/index.mdx',
      resourceType: 'service',
      resourceId: 'ShippingService',
    },
    frontmatter: { version: '1.0.0' },
    content: '',
    raw: '',
  },
];

const errors = validateReferences(parsedFiles);

console.log('Testing the exact scenario you mentioned:');
console.log('Domain with services without version specified:');
console.log(`  - InventoryService (no version)`);
console.log(`  - OrdersService (no version)`);
console.log(`  - NotificationService (no version)`);
console.log(`  - ShippingService (no version)`);
console.log('');
console.log('Services exist with versions:');
console.log(`  - InventoryService v2.1.0`);
console.log(`  - OrdersService v1.5.0`);
console.log(`  - NotificationService v3.0.0`);
console.log(`  - ShippingService v1.0.0`);
console.log('');
console.log(`Validation errors: ${errors.length}`);

if (errors.length > 0) {
  console.log('Errors found:');
  errors.forEach((error) => {
    console.log(`  - ${error.message}`);
  });
} else {
  console.log('✅ No errors - references without versions work correctly!');
}
