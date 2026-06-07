#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const moduleNameInput = process.argv[2];
const targetRoot = process.argv[3] || 'src/modules';

if (!moduleNameInput) {
  console.error('Usage: npm run module -- <module-name> [targetRoot]');
  process.exit(1);
}

const toPascalCase = (value) => {
  return value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join('');
};

const toKebabCase = (value) => {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()
    .replace(/^-+|-+$/g, '');
};

const moduleName = toKebabCase(moduleNameInput);
const pascalName = toPascalCase(moduleNameInput);

if (!moduleName) {
  console.error('Module name is invalid.');
  process.exit(1);
}

const moduleDir = path.join(process.cwd(), targetRoot, moduleName);

if (fs.existsSync(moduleDir)) {
  console.error(`Module already exists at: ${moduleDir}`);
  process.exit(1);
}

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const writeFile = (filePath, content) => {
  fs.writeFileSync(filePath, content, { encoding: 'utf8' });
};

ensureDir(moduleDir);

const dirs = [
  'application/ports',
  'application/services',
  'domain/exceptions',
  'domain/interfaces',
  'domain/models',
  'infrastructure/repositories',
  'presentation/controllers',
  'presentation/dto/requests',
  'presentation/dto/responses',
];

for (const dir of dirs) {
  ensureDir(path.join(moduleDir, dir));
}

writeFile(
  path.join(moduleDir, `${moduleName}.module.ts`),
  `import { Module } from '@nestjs/common';\n\nimport { ${pascalName}Controller } from './presentation/controllers/${moduleName}.controller';\nimport { ${pascalName}ProfileService } from './application/services/${moduleName}-profile.service';\nimport { ${pascalName}ManagementService } from './application/services/${moduleName}-management.service';\nimport { ${pascalName}Repository } from './infrastructure/repositories/${moduleName}.repository';\nimport { ${pascalName.toUpperCase()}_REPOSITORY } from './application/ports';\n\n@Module({\n  controllers: [${pascalName}Controller],\n  providers: [\n    ${pascalName}ProfileService,\n    ${pascalName}ManagementService,\n    ${pascalName}Repository,\n    {\n      provide: ${pascalName.toUpperCase()}_REPOSITORY,\n      useClass: ${pascalName}Repository,\n    },\n  ],\n  exports: [\n    ${pascalName}ProfileService,\n    ${pascalName}ManagementService,\n    ${pascalName.toUpperCase()}_REPOSITORY,\n  ],\n})\nexport class ${pascalName}Module {}\n`,
);

writeFile(
  path.join(moduleDir, 'application/ports/index.ts'),
  `export const ${pascalName.toUpperCase()}_REPOSITORY = Symbol('${pascalName}Repository');\n\nexport type { I${pascalName}Repository } from './${moduleName}.repository.port';\n`,
);

writeFile(
  path.join(moduleDir, `application/ports/${moduleName}.repository.port.ts`),
  `import type { ${pascalName}Profile } from '../../domain/models/${moduleName}-profile.model';\n\nexport interface I${pascalName}Repository {\n  findAll(skip: number, take: number): Promise<${pascalName}Profile[]>;\n  findById(id: string): Promise<${pascalName}Profile | null>;\n  count(): Promise<number>;\n}\n`,
);

writeFile(
  path.join(moduleDir, `application/services/${moduleName}-profile.service.ts`),
  `import { Inject, Injectable } from '@nestjs/common';\nimport type { I${pascalName}Repository } from '../ports';\nimport { ${pascalName.toUpperCase()}_REPOSITORY } from '../ports';\n\n@Injectable()\nexport class ${pascalName}ProfileService {\n  constructor(\n    @Inject(${pascalName.toUpperCase()}_REPOSITORY)\n    private readonly repository: I${pascalName}Repository,\n  ) {}\n\n  async getProfile(id: string) {\n    return this.repository.findById(id);\n  }\n}\n`,
);

writeFile(
  path.join(
    moduleDir,
    `application/services/${moduleName}-management.service.ts`,
  ),
  `import { Inject, Injectable } from '@nestjs/common';\nimport type { I${pascalName}Repository } from '../ports';\nimport { ${pascalName.toUpperCase()}_REPOSITORY } from '../ports';\n\n@Injectable()\nexport class ${pascalName}ManagementService {\n  constructor(\n    @Inject(${pascalName.toUpperCase()}_REPOSITORY)\n    private readonly repository: I${pascalName}Repository,\n  ) {}\n\n  async list(page = 1, limit = 10) {\n    const skip = (page - 1) * limit;\n    const [items, total] = await Promise.all([\n      this.repository.findAll(skip, limit),\n      this.repository.count(),\n    ]);\n\n    return {\n      items,\n      total,\n      page,\n      pages: Math.ceil(total / limit),\n    };\n  }\n}\n`,
);

writeFile(
  path.join(moduleDir, `domain/models/${moduleName}-profile.model.ts`),
  `export class ${pascalName}Profile {\n  constructor(private readonly data: Record<string, unknown>) {}\n\n  toJSON() {\n    return { ...this.data };\n  }\n}\n`,
);

writeFile(
  path.join(moduleDir, `domain/exceptions/${moduleName}.exceptions.ts`),
  `export class ${pascalName}NotFoundException extends Error {\n  constructor(id: string) {\n    super('${pascalName} not found: ' + id);\n  }\n}\n`,
);

writeFile(
  path.join(
    moduleDir,
    `infrastructure/repositories/${moduleName}.repository.ts`,
  ),
  `import { Injectable } from '@nestjs/common';\nimport type { I${pascalName}Repository } from '../../application/ports';\nimport { ${pascalName}Profile } from '../../domain/models/${moduleName}-profile.model';\n\n@Injectable()\nexport class ${pascalName}Repository implements I${pascalName}Repository {\n  async findAll(): Promise<${pascalName}Profile[]> {\n    return [];\n  }\n\n  async findById(): Promise<${pascalName}Profile | null> {\n    return null;\n  }\n\n  async count(): Promise<number> {\n    return 0;\n  }\n}\n`,
);

writeFile(
  path.join(moduleDir, `presentation/controllers/${moduleName}.controller.ts`),
  `import { Controller, Get, Param } from '@nestjs/common';\nimport { ${pascalName}ProfileService } from '../../application/services/${moduleName}-profile.service';\nimport { ${pascalName}ManagementService } from '../../application/services/${moduleName}-management.service';\n\n@Controller('${moduleName}s')\nexport class ${pascalName}Controller {\n  constructor(\n    private readonly profileService: ${pascalName}ProfileService,\n    private readonly managementService: ${pascalName}ManagementService,\n  ) {}\n\n  @Get()\n  async list() {\n    return this.managementService.list();\n  }\n\n  @Get(':id')\n  async getById(@Param('id') id: string) {\n    return this.profileService.getProfile(id);\n  }\n}\n`,
);

writeFile(
  path.join(moduleDir, 'presentation/dto/requests/index.ts'),
  `export type { ${pascalName}UpdateDto } from './update-${moduleName}.dto';\n`,
);

writeFile(
  path.join(moduleDir, `presentation/dto/requests/update-${moduleName}.dto.ts`),
  `export class ${pascalName}UpdateDto {\n  // Add fields for update payload\n}\n`,
);

writeFile(
  path.join(moduleDir, 'presentation/dto/responses/index.ts'),
  `export type { ${pascalName}ResponseDto } from './${moduleName}-response.dto';\n`,
);

writeFile(
  path.join(
    moduleDir,
    `presentation/dto/responses/${moduleName}-response.dto.ts`,
  ),
  `export class ${pascalName}ResponseDto {\n  // Add fields for response payload\n}\n`,
);

console.log(`Created module at ${path.join(targetRoot, moduleName)}`);
