import { ParsedFile } from '../parser';
import { ValidationError, ResourceReference } from '../types';
import { ResourceType } from '../schemas';
import semver from 'semver';

interface ResourceIndex {
  [resourceType: string]: {
    [resourceId: string]: Set<string>;
  };
}

export const buildResourceIndex = (parsedFiles: ParsedFile[]): ResourceIndex => {
  const index: ResourceIndex = {};

  for (const parsedFile of parsedFiles) {
    const { file, frontmatter } = parsedFile;
    const { resourceType } = file;

    // For users, teams, and domains, use the frontmatter id field instead of filename/directory
    // This handles cases where filename is "aSmith.mdx" but frontmatter has id: "asmith"
    // And where directory is "e-commerce" but frontmatter has id: "E-Commerce"
    let resourceId = file.resourceId;
    if (
      (resourceType === 'user' || resourceType === 'team' || resourceType === 'domain') &&
      frontmatter.id &&
      typeof frontmatter.id === 'string'
    ) {
      resourceId = frontmatter.id;
    }

    if (!index[resourceType]) {
      index[resourceType] = {};
    }

    if (!index[resourceType][resourceId]) {
      index[resourceType][resourceId] = new Set();
    }

    if (frontmatter.version && typeof frontmatter.version === 'string') {
      index[resourceType][resourceId].add(frontmatter.version);
    } else {
      index[resourceType][resourceId].add('latest');
    }
  }

  return index;
};

const checkResourceExists = (ref: ResourceReference, resourceType: ResourceType, index: ResourceIndex): boolean => {
  const resourceVersions = index[resourceType]?.[ref.id];

  if (!resourceVersions || resourceVersions.size === 0) {
    return false;
  }

  if (!ref.version) {
    return true;
  }

  const refVersion = ref.version === 'latest' ? ref.version : ref.version;
  const availableVersions = Array.from(resourceVersions);

  // Handle 'latest' specifically
  if (refVersion === 'latest') {
    return availableVersions.includes('latest') || availableVersions.length > 0;
  }

  // Check for exact match first
  if (availableVersions.includes(refVersion)) {
    return true;
  }

  // Handle semver patterns like '0.0.x', '^1.0.0', '~1.2.0', etc.
  try {
    // Filter out 'latest' from available versions for semver matching
    const semverVersions = availableVersions.filter((v) => v !== 'latest' && semver.valid(v));

    // Check if any available version satisfies the requested version pattern
    for (const availableVersion of semverVersions) {
      if (semver.satisfies(availableVersion, refVersion)) {
        return true;
      }
    }

    // Special handling for patterns like '0.0.x' which aren't standard semver ranges
    if (refVersion.includes('.x')) {
      const pattern = refVersion.replace(/\.x/g, '');
      for (const availableVersion of semverVersions) {
        if (availableVersion.startsWith(pattern)) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    // If semver parsing fails, fall back to exact string match
    return availableVersions.includes(refVersion);
  }
};

interface ReferenceInfo {
  ref: ResourceReference;
  possibleTypes: ResourceType[];
  field: string;
}

const extractReferences = (parsedFile: ParsedFile): ReferenceInfo[] => {
  const { file, frontmatter } = parsedFile;
  const references: ReferenceInfo[] = [];

  if (file.resourceType === 'domain') {
    if (frontmatter.services && Array.isArray(frontmatter.services)) {
      frontmatter.services.forEach((ref: ResourceReference) => {
        references.push({ ref, possibleTypes: ['service'], field: 'services' });
      });
    }
    if (frontmatter.domains && Array.isArray(frontmatter.domains)) {
      frontmatter.domains.forEach((ref: ResourceReference) => {
        references.push({ ref, possibleTypes: ['domain'], field: 'domains' });
      });
    }
    if (frontmatter.entities && Array.isArray(frontmatter.entities)) {
      frontmatter.entities.forEach((ref: ResourceReference) => {
        references.push({ ref, possibleTypes: ['entity'], field: 'entities' });
      });
    }
  }

  if (file.resourceType === 'service') {
    if (frontmatter.sends && Array.isArray(frontmatter.sends)) {
      frontmatter.sends.forEach((ref: ResourceReference) => {
        references.push({ ref, possibleTypes: ['event', 'command', 'query'], field: 'sends' });
      });
    }
    if (frontmatter.receives && Array.isArray(frontmatter.receives)) {
      frontmatter.receives.forEach((ref: ResourceReference) => {
        references.push({ ref, possibleTypes: ['event', 'command', 'query'], field: 'receives' });
      });
    }
    if (frontmatter.entities && Array.isArray(frontmatter.entities)) {
      frontmatter.entities.forEach((ref: ResourceReference) => {
        references.push({ ref, possibleTypes: ['entity'], field: 'entities' });
      });
    }
  }

  if (file.resourceType === 'flow' && frontmatter.steps && Array.isArray(frontmatter.steps)) {
    frontmatter.steps.forEach((step: Record<string, unknown>, index: number) => {
      if (step.message) {
        references.push({
          ref: step.message as ResourceReference,
          possibleTypes: ['event', 'command', 'query'],
          field: `steps[${index}].message`,
        });
      }
      if (step.service) {
        references.push({ ref: step.service as ResourceReference, possibleTypes: ['service'], field: `steps[${index}].service` });
      }
    });
  }

  if (file.resourceType === 'entity' && frontmatter.properties && Array.isArray(frontmatter.properties)) {
    frontmatter.properties.forEach((prop: Record<string, unknown>, index: number) => {
      if (prop.references) {
        references.push({
          ref: { id: prop.references as string },
          possibleTypes: ['entity'],
          field: `properties[${index}].references`,
        });
      }
    });
  }

  if (frontmatter.owners && Array.isArray(frontmatter.owners)) {
    frontmatter.owners.forEach((owner: string) => {
      references.push({ ref: { id: owner }, possibleTypes: ['user', 'team'], field: 'owners' });
    });
  }

  if (file.resourceType === 'team' && frontmatter.members && Array.isArray(frontmatter.members)) {
    frontmatter.members.forEach((member: string) => {
      references.push({ ref: { id: member }, possibleTypes: ['user'], field: 'members' });
    });
  }

  return references;
};

export const validateReferences = (parsedFiles: ParsedFile[]): ValidationError[] => {
  const index = buildResourceIndex(parsedFiles);
  const errors: ValidationError[] = [];

  for (const parsedFile of parsedFiles) {
    const references = extractReferences(parsedFile);

    for (const { ref, possibleTypes, field } of references) {
      const found = possibleTypes.some((type) => checkResourceExists(ref, type, index));

      if (!found) {
        const versionStr = ref.version ? ` (version: ${ref.version})` : '';
        const typeStr = possibleTypes.length === 1 ? possibleTypes[0] : possibleTypes.join('/');

        let rule = 'refs/resource-exists';
        if (field === 'owners') {
          rule = 'refs/owner-exists';
        } else if (ref.version) {
          rule = 'refs/valid-version-range';
        }

        errors.push({
          type: 'reference',
          resource: `${parsedFile.file.resourceType}/${parsedFile.file.resourceId}`,
          field,
          message: `Referenced ${typeStr} "${ref.id}"${versionStr} does not exist`,
          file: parsedFile.file.relativePath,
          rule,
        });
      }
    }
  }

  return errors;
};
