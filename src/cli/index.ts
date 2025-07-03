#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { scanCatalogFiles } from '../scanner';
import { parseAllFiles } from '../parser';
import { validateCatalog } from '../validators';
import { reportErrors } from '../reporters';
import { LinterOptions } from '../types';

const program = new Command();

program
  .name('eventcatalog-linter')
  .description('Lint your EventCatalog for frontmatter and reference validation')
  .version('0.1.0')
  .argument('[directory]', 'EventCatalog directory to lint', '.')
  .option('-v, --verbose', 'Show verbose output', false)
  .option('--fail-on-warning', 'Exit with non-zero code on warnings', false)
  .action(async (directory: string, options: Partial<LinterOptions>) => {
    const rootDir = path.resolve(directory);
    const spinner = ora('Scanning EventCatalog files...').start();

    try {
      const files = await scanCatalogFiles(rootDir);
      spinner.text = `Found ${files.length} catalog files`;

      if (files.length === 0) {
        spinner.warn('No EventCatalog files found');
        process.exit(0);
      }

      spinner.text = 'Parsing frontmatter...';
      const { parsed, errors: parseErrors } = await parseAllFiles(files);

      spinner.text = 'Validating catalog...';
      const validationErrors = validateCatalog(parsed);

      spinner.stop();

      const summary = reportErrors(validationErrors, parseErrors, options.verbose);

      // Show scan summary
      if (summary.totalErrors === 0) {
        console.log(chalk.dim(`\n  ${files.length} files checked`));
      }

      if (summary.totalErrors > 0 || (options.failOnWarning && summary.totalWarnings > 0)) {
        process.exit(1);
      }
    } catch (error) {
      spinner.fail('An error occurred');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program.parse();
