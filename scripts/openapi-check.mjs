#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const ROOT = process.cwd();
const TARGET_SPEC = path.join(ROOT, 'docs/architecture/openapi-v1.yaml');
const RUNTIME_SPEC = path.join(ROOT, 'docs/architecture/openapi-runtime-v0.yaml');
const FREEZE_FILE = path.join(ROOT, 'docs/architecture/sprint1-contract-freeze.json');

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

function fail(message) {
  throw new Error(message);
}

function parseSemver(version) {
  const match = String(version || '').match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
}

function readYaml(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`Missing OpenAPI file: ${path.relative(ROOT, filePath)}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return yaml.load(content);
}

function validateOperation(pathKey, method, operation, mode) {
  if (!operation || typeof operation !== 'object') {
    fail(`[${mode}] ${method.toUpperCase()} ${pathKey} has invalid operation object`);
  }
  if (!operation.responses || typeof operation.responses !== 'object') {
    fail(`[${mode}] ${method.toUpperCase()} ${pathKey} is missing responses`);
  }
  const responseCodes = Object.keys(operation.responses);
  if (responseCodes.length === 0) {
    fail(`[${mode}] ${method.toUpperCase()} ${pathKey} has empty responses`);
  }
}

function validateSpec(spec, mode) {
  if (!spec || typeof spec !== 'object') {
    fail(`[${mode}] spec is not an object`);
  }
  if (!String(spec.openapi || '').startsWith('3.')) {
    fail(`[${mode}] openapi version must start with 3.x`);
  }
  if (!spec.info || typeof spec.info !== 'object') {
    fail(`[${mode}] missing info object`);
  }
  if (!spec.info.title) {
    fail(`[${mode}] info.title is required`);
  }
  const version = parseSemver(spec.info.version);
  if (!version) {
    fail(`[${mode}] info.version must be semver (x.y.z)`);
  }

  if (mode === 'runtime' && version.major !== 0) {
    fail(`[${mode}] expected runtime major version 0, got ${spec.info.version}`);
  }
  if (mode === 'target' && version.major < 1) {
    fail(`[${mode}] expected target major version >=1, got ${spec.info.version}`);
  }

  if (!spec.paths || typeof spec.paths !== 'object') {
    fail(`[${mode}] paths object is required`);
  }

  const pathKeys = Object.keys(spec.paths);
  if (pathKeys.length === 0) {
    fail(`[${mode}] paths object is empty`);
  }

  for (const pathKey of pathKeys) {
    if (!pathKey.startsWith('/')) {
      fail(`[${mode}] path '${pathKey}' must start with '/'`);
    }

    if (mode === 'runtime' && pathKey.startsWith('/v1/')) {
      fail(`[${mode}] runtime path '${pathKey}' must not be version-prefixed`);
    }
    if (mode === 'target' && !pathKey.startsWith('/v1/')) {
      fail(`[${mode}] target path '${pathKey}' must start with '/v1/'`);
    }

    const pathItem = spec.paths[pathKey] || {};
    const methods = Object.keys(pathItem).filter((key) => HTTP_METHODS.has(key));
    if (methods.length === 0) {
      fail(`[${mode}] path '${pathKey}' has no HTTP operations`);
    }
    for (const method of methods) {
      validateOperation(pathKey, method, pathItem[method], mode);
    }
  }

  return {
    version,
    pathKeys
  };
}

function validateFreezePolicy(targetPathKeys, runtimePathKeys) {
  if (!fs.existsSync(FREEZE_FILE)) {
    fail(`Missing freeze policy: ${path.relative(ROOT, FREEZE_FILE)}`);
  }
  const freeze = JSON.parse(fs.readFileSync(FREEZE_FILE, 'utf8'));
  const lockedPrefixes = Array.isArray(freeze.lockedPrefixes) ? freeze.lockedPrefixes : [];
  const runtimeRequiredPaths = Array.isArray(freeze.runtimeRequiredPaths) ? freeze.runtimeRequiredPaths : [];

  if (lockedPrefixes.length === 0) {
    fail('Freeze policy must contain at least one locked prefix');
  }
  if (runtimeRequiredPaths.length === 0) {
    fail('Freeze policy must contain runtimeRequiredPaths');
  }

  for (const prefix of lockedPrefixes) {
    if (!targetPathKeys.some((pathKey) => pathKey.startsWith(prefix))) {
      fail(`Freeze prefix '${prefix}' has no matching path in target spec`);
    }
  }

  for (const requiredPath of runtimeRequiredPaths) {
    if (!runtimePathKeys.includes(requiredPath)) {
      fail(`Runtime required path missing from runtime spec: ${requiredPath}`);
    }
  }
}

try {
  const runtimeSpec = readYaml(RUNTIME_SPEC);
  const targetSpec = readYaml(TARGET_SPEC);

  const runtimeValidation = validateSpec(runtimeSpec, 'runtime');
  const targetValidation = validateSpec(targetSpec, 'target');

  validateFreezePolicy(targetValidation.pathKeys, runtimeValidation.pathKeys);

  console.log(
    `[openapi-check] OK: runtime=${runtimeValidation.pathKeys.length} paths, target=${targetValidation.pathKeys.length} paths`
  );
} catch (error) {
  console.error(`[openapi-check] FAILED: ${error.message}`);
  process.exit(1);
}
