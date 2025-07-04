import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  loadConfig,
  shouldIgnoreFile,
  getEffectiveRules,
  applyRuleSeverity,
  parseRuleConfig,
  DEFAULT_RULES,
} from '../src/config';
import { ValidationError } from '../src/types';

describe('Configuration', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-test-'));
    configPath = path.join(tempDir, '.eventcatalogrc.js');
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('loadConfig', () => {
    it('should return default config when no config file exists', () => {
      const config = loadConfig(tempDir);

      expect(config).toEqual({
        rules: DEFAULT_RULES,
        ignorePatterns: [],
        overrides: [],
      });
    });

    it('should load and merge config from .eventcatalogrc.js', () => {
      const configContent = `
        module.exports = {
          rules: {
            'schema/required-fields': 'warn',
            'refs/owner-exists': 'off',
          },
          ignorePatterns: ['**/archived/**', '**/drafts/**'],
          overrides: [
            {
              files: ['**/experimental/**'],
              rules: {
                'best-practices/owner-required': 'off'
              }
            }
          ]
        };
      `;

      fs.writeFileSync(configPath, configContent);

      const config = loadConfig(tempDir);

      expect(config.rules['schema/required-fields']).toBe('warn');
      expect(config.rules['refs/owner-exists']).toBe('off');
      expect(config.rules['schema/valid-email']).toBe('error'); // Should keep default
      expect(config.ignorePatterns).toEqual(['**/archived/**', '**/drafts/**']);
      expect(config.overrides).toHaveLength(1);
      expect(config.overrides![0].files).toEqual(['**/experimental/**']);
    });

    it('should handle invalid config file gracefully', () => {
      fs.writeFileSync(configPath, 'invalid javascript content {');

      const config = loadConfig(tempDir);

      expect(config).toEqual({
        rules: DEFAULT_RULES,
        ignorePatterns: [],
        overrides: [],
      });
    });
  });

  describe('parseRuleConfig', () => {
    it('should parse string severity', () => {
      const result = parseRuleConfig('warn');
      expect(result).toEqual({
        severity: 'warn',
        options: {},
      });
    });

    it('should parse array with severity and options', () => {
      const result = parseRuleConfig(['error', { max: 500 }]);
      expect(result).toEqual({
        severity: 'error',
        options: { max: 500 },
      });
    });
  });

  describe('shouldIgnoreFile', () => {
    it('should return false when no ignore patterns', () => {
      expect(shouldIgnoreFile('services/user-service/index.mdx', [])).toBe(false);
    });

    it('should ignore files matching patterns', () => {
      const patterns = ['**/archived/**', '**/drafts/**'];

      expect(shouldIgnoreFile('services/archived/old-service/index.mdx', patterns)).toBe(true);
      expect(shouldIgnoreFile('events/drafts/new-event/index.mdx', patterns)).toBe(true);
      expect(shouldIgnoreFile('services/user-service/index.mdx', patterns)).toBe(false);
    });

    it('should handle single wildcard patterns', () => {
      const patterns = ['*.tmp', 'test-*'];

      expect(shouldIgnoreFile('services/temp.tmp', patterns)).toBe(true);
      expect(shouldIgnoreFile('events/test-event.mdx', patterns)).toBe(true);
      expect(shouldIgnoreFile('services/user-service.mdx', patterns)).toBe(false);
    });
  });

  describe('getEffectiveRules', () => {
    it('should return base rules when no overrides match', () => {
      const config = {
        rules: {
          'schema/required-fields': 'warn',
          'refs/owner-exists': 'error',
        },
        ignorePatterns: [],
        overrides: [],
      };

      const rules = getEffectiveRules('services/user-service/index.mdx', config);

      expect(rules['schema/required-fields']).toEqual({
        severity: 'warn',
        options: {},
      });
      expect(rules['refs/owner-exists']).toEqual({
        severity: 'error',
        options: {},
      });
    });

    it('should apply overrides when file matches pattern', () => {
      const config = {
        rules: {
          'schema/required-fields': 'warn',
          'refs/owner-exists': 'error',
        },
        ignorePatterns: [],
        overrides: [
          {
            files: ['**/experimental/**'],
            rules: {
              'refs/owner-exists': 'off',
              'best-practices/owner-required': 'warn',
            },
          },
        ],
      };

      const rules = getEffectiveRules('services/experimental/new-service/index.mdx', config);

      expect(rules['schema/required-fields']).toEqual({
        severity: 'warn',
        options: {},
      });
      expect(rules['refs/owner-exists']).toEqual({
        severity: 'off',
        options: {},
      });
      expect(rules['best-practices/owner-required']).toEqual({
        severity: 'warn',
        options: {},
      });
    });

    it('should apply multiple matching overrides', () => {
      const config = {
        rules: {
          'schema/required-fields': 'error',
        },
        ignorePatterns: [],
        overrides: [
          {
            files: ['**/experimental/**'],
            rules: {
              'schema/required-fields': 'warn',
            },
          },
          {
            files: ['**/experimental/new-**'],
            rules: {
              'schema/required-fields': 'off',
            },
          },
        ],
      };

      const rules = getEffectiveRules('services/experimental/new-service/index.mdx', config);

      expect(rules['schema/required-fields']).toEqual({
        severity: 'off',
        options: {},
      });
    });
  });

  describe('applyRuleSeverity', () => {
    const sampleErrors: ValidationError[] = [
      {
        type: 'schema',
        resource: 'service/user-service',
        field: 'summary',
        message: 'Summary is required for better documentation',
        file: 'services/user-service/index.mdx',
        severity: 'error',
      },
      {
        type: 'reference',
        resource: 'service/user-service',
        field: 'owners',
        message: 'Referenced user/team "missing-owner" does not exist',
        file: 'services/user-service/index.mdx',
        severity: 'error',
      },
    ];

    it('should filter out disabled rules', () => {
      const rules = {
        'best-practices/summary-required': { severity: 'off' as const, options: {} },
        'refs/owner-exists': { severity: 'error' as const, options: {} },
      };

      const result = applyRuleSeverity(sampleErrors, rules);

      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('Referenced user/team');
    });

    it('should convert warn severity to warning', () => {
      const rules = {
        'best-practices/summary-required': { severity: 'warn' as const, options: {} },
        'refs/owner-exists': { severity: 'error' as const, options: {} },
      };

      const result = applyRuleSeverity(sampleErrors, rules);

      expect(result).toHaveLength(2);
      expect(result[0].severity).toBe('warning');
      expect(result[1].severity).toBe('error');
    });

    it('should keep error severity as error', () => {
      const rules = {
        'best-practices/summary-required': { severity: 'error' as const, options: {} },
        'refs/owner-exists': { severity: 'error' as const, options: {} },
      };

      const result = applyRuleSeverity(sampleErrors, rules);

      expect(result).toHaveLength(2);
      expect(result[0].severity).toBe('error');
      expect(result[1].severity).toBe('error');
    });

    it('should handle mixed known and unknown rules', () => {
      const rules = {
        'best-practices/summary-required': { severity: 'warn' as const, options: {} },
        'refs/owner-exists': { severity: 'error' as const, options: {} },
        'unknown/rule': { severity: 'off' as const, options: {} },
      };

      const result = applyRuleSeverity(sampleErrors, rules);

      // Both errors should be kept - summary as warning, reference as error
      expect(result).toHaveLength(2);
      expect(result[0].severity).toBe('warning'); // summary rule was set to warn
      expect(result[1].severity).toBe('error'); // reference rule was set to error
    });

    it('should map email validation errors correctly', () => {
      const emailError: ValidationError = {
        type: 'schema',
        resource: 'user/john-doe',
        field: 'email',
        message: 'email: Invalid email',
        file: 'users/john-doe.mdx',
        severity: 'error',
      };

      const rules = {
        'schema/valid-email': { severity: 'warn' as const, options: {} },
      };

      const result = applyRuleSeverity([emailError], rules);

      expect(result).toHaveLength(1);
      expect(result[0].severity).toBe('warning'); // email rule was set to warn
    });
  });
});
