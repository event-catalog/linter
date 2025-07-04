import fs from 'fs';
import path from 'path';
import { ValidationError } from '../types';

export type RuleSeverity = 'error' | 'warn' | 'off';

export interface RuleConfig {
  severity: RuleSeverity;
  options?: Record<string, any>;
}

export interface ConfigOverride {
  files: string[];
  rules: Record<string, RuleSeverity | [RuleSeverity, Record<string, any>]>;
}

export interface LinterConfig {
  rules: Record<string, RuleSeverity | [RuleSeverity, Record<string, any>]>;
  ignorePatterns?: string[];
  overrides?: ConfigOverride[];
}

export const DEFAULT_RULES: Record<string, RuleSeverity> = {
  'schema/required-fields': 'error',
  'schema/valid-semver': 'error',
  'schema/valid-email': 'error',
  'refs/owner-exists': 'error',
  'refs/valid-version-range': 'error',
  'best-practices/summary-required': 'error',
  'best-practices/owner-required': 'error',
  'naming/service-id-format': 'error',
  'naming/event-id-format': 'error',
  'versions/consistent-format': 'error',
  'versions/no-deprecated': 'error',
};

export const loadConfig = (rootDir: string): LinterConfig => {
  const configPath = path.join(rootDir, '.eventcatalogrc.js');

  if (!fs.existsSync(configPath)) {
    // Return default config if no config file exists
    return {
      rules: DEFAULT_RULES,
      ignorePatterns: [],
      overrides: [],
    };
  }

  try {
    // Clear module cache to ensure fresh load
    delete require.cache[require.resolve(configPath)];
    const config = require(configPath);

    // Merge with defaults
    const mergedConfig: LinterConfig = {
      rules: { ...DEFAULT_RULES, ...config.rules },
      ignorePatterns: config.ignorePatterns || [],
      overrides: config.overrides || [],
    };

    return mergedConfig;
  } catch (error) {
    console.warn(`Warning: Could not load .eventcatalogrc.js: ${error instanceof Error ? error.message : String(error)}`);
    return {
      rules: DEFAULT_RULES,
      ignorePatterns: [],
      overrides: [],
    };
  }
};

export const parseRuleConfig = (rule: RuleSeverity | [RuleSeverity, Record<string, any>]): RuleConfig => {
  if (Array.isArray(rule)) {
    return {
      severity: rule[0],
      options: rule[1],
    };
  }
  return {
    severity: rule,
    options: {},
  };
};

export const shouldIgnoreFile = (filePath: string, ignorePatterns: string[]): boolean => {
  if (!ignorePatterns || ignorePatterns.length === 0) {
    return false;
  }

  const normalizedPath = filePath.replace(/\\/g, '/');

  for (const pattern of ignorePatterns) {
    // Simple glob matching for now
    const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
    if (regex.test(normalizedPath)) {
      return true;
    }
  }

  return false;
};

export const getEffectiveRules = (filePath: string, config: LinterConfig): Record<string, RuleConfig> => {
  let effectiveRules = { ...config.rules };

  // Apply overrides
  if (config.overrides) {
    for (const override of config.overrides) {
      const matchesFile = override.files.some((pattern) => {
        const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
        return regex.test(filePath);
      });

      if (matchesFile) {
        effectiveRules = { ...effectiveRules, ...override.rules };
      }
    }
  }

  // Parse rules into RuleConfig objects
  const parsedRules: Record<string, RuleConfig> = {};
  for (const [ruleName, ruleValue] of Object.entries(effectiveRules)) {
    parsedRules[ruleName] = parseRuleConfig(ruleValue);
  }

  return parsedRules;
};

export const applyRuleSeverity = (errors: ValidationError[], rules: Record<string, RuleConfig>): ValidationError[] => {
  const result: ValidationError[] = [];

  for (const error of errors) {
    // Map validation errors to rule names
    const ruleName = mapErrorToRuleName(error);
    const rule = rules[ruleName];

    if (!rule || rule.severity === 'off') {
      continue; // Skip disabled rules
    }

    result.push({
      ...error,
      severity: rule.severity === 'warn' ? ('warning' as const) : ('error' as const),
    });
  }

  return result;
};

const mapErrorToRuleName = (error: ValidationError): string => {
  // Map validation errors to rule names based on the error type and content
  if (error.type === 'schema') {
    // Check field-specific rules first
    if (error.field === 'summary') {
      return 'best-practices/summary-required';
    }
    if (error.field === 'owners') {
      return 'best-practices/owner-required';
    }

    // Check message content for specific validation types
    if (error.message.includes('email') || error.message.includes('Invalid email')) {
      return 'schema/valid-email';
    }
    if (error.message.includes('version') || error.message.includes('semantic')) {
      return 'schema/valid-semver';
    }
    if (error.message.includes('Required') || error.message.includes('Expected')) {
      return 'schema/required-fields';
    }

    return 'schema/required-fields';
  }

  if (error.type === 'reference') {
    if (error.message.includes('user') || error.message.includes('team')) {
      return 'refs/owner-exists';
    }
    if (error.message.includes('version')) {
      return 'refs/valid-version-range';
    }
    // Service, domain, entity, and other references are always validated and not configurable
    return 'schema/required-fields'; // Map to a default rule so they remain as errors
  }

  return 'schema/required-fields';
};
