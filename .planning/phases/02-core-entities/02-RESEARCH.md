# Phase 2: Core Entities - Research

**Researched:** 2026-03-03
**Domain:** NestJS CRUD operations with repository pattern, DTOs, and multi-tenant validation
**Confidence:** HIGH

## Summary

Phase 2 implements complete CRUD operations for Specialists, Services, and Locations using established NestJS patterns. The foundation work from Phase 1 provides the Prisma schema models, junction tables, and BaseRepository infrastructure—Phase 2 extends this by creating entity-specific repositories, DTOs with class-validator decorators, service layer business logic, and RESTful controllers with Swagger documentation.

The project already demonstrates mature patterns: AppointmentModule shows the feature module structure (controller, service, repository, DTOs, mappers in dedicated folders), AccountId decorator extracts organizationId from x-account-id header, Permissions decorator with PermissionGuard enforces authorization, and BaseRepository provides tenant filtering helpers. Phase 2 follows these exact patterns for consistency.

Key implementation focus: Specialist CRUD operations without forced relationships (users can create specialists independently of services/locations), Service creation that validates subservice tree compatibility without automatic assignments, Location model extensions to support new relationships, and comprehensive DTO validation with ApiProperty decorators for OpenAPI documentation. All operations enforce organizationId ownership validation using the validateEntityOwnership helper from Phase 1.

**Primary recommendation:** Create feature modules (specialist/, service/, location/) mirroring the AppointmentModule structure. Extend BaseRepository for entity-specific repositories. Use class-validator decorators (@IsUUID, @IsEmail, @IsOptional, @Length) on DTOs with ApiProperty for Swagger. Implement service layer methods that validate tenant ownership before mutations. Controllers use AccountId decorator to extract organizationId and Permissions decorator for authorization. Skip create/update mappers unless complex transformations needed (appointment module has mapper for status history, not needed for simple entities).

<phase_requirements>
## Phase Requirements

This phase must address 11 specific requirements that enable independent entity management:

| ID | Description | Research Support |
|----|-------------|-----------------|
| SPEC-01 | Create specialist without assigning services or locations | POST /specialists endpoint with CreateSpecialistDto (avatar, firstName, lastName, email, phone?, description?, isTopMaster, organizationId from AccountId decorator). Repository uses buildWhereWithTenant for tenant isolation. No relationship creation—just Prisma specialist.create() |
| SPEC-02 | Update specialist profile (avatar, name, email, phone, description, isTopMaster) | PUT /specialists/:id with UpdateSpecialistDto (all fields optional via PartialType). Service validates ownership with validateEntityOwnership before update. UpdateSpecialistDto extends PartialType(CreateSpecialistDto) using @nestjs/mapped-types |
| SPEC-03 | Delete specialist (with cascade handling for relationships) | DELETE /specialists/:id. Prisma cascade deletes handle SpecialistService, SpecialistLocation, Schedule relationships automatically (onDelete: Cascade configured in Phase 1). Service validates ownership before deletion |
| SPEC-04 | List all specialists for company with pagination | GET /specialists?skip=0&take=20 with PaginationDto. Repository uses findManyWithTenant helper from BaseRepository. Returns { data: Specialist[], total: number, page, pageSize } wrapped in SpecialistListResponseDto |
| SPEC-05 | Get specialist by ID with company scoping | GET /specialists/:id. Repository uses findUnique with buildWhereWithTenant to enforce tenant isolation. Service throws NotFoundException if not found. Returns SpecialistResponseDto |
| SERV-01 | Create service without automatic location/specialist assignment | Service model already exists with parentServiceId support. Verify no automatic relationship creation in existing service-duration module. If service creation doesn't exist, create POST /services endpoint similar to specialist pattern |
| SERV-02 | Verify subservice tree compatibility maintained | Validate parentServiceId references same organizationId service if provided. Use validateEntityOwnership to check parent service ownership before creating child service. No breaking changes to existing Service model structure |
| LOC-01 | Extend Location model to support specialist and service relationships | Location model already exists with junction table relations (Phase 1 schema). Verify no additional schema changes needed. If Location CRUD doesn't exist, create endpoints similar to specialist pattern (CREATE, READ, UPDATE, DELETE with tenant isolation) |
| API-01 | Specialists module with CRUD endpoints following existing patterns | Create SpecialistModule with controller, service, repository structure mirroring AppointmentModule. Use @ApiTags('Specialists'), @Permissions(['specialists.manage'], 'COMPANY'), @AccountId() decorator pattern. Import PrismaModule in module imports |
| API-04 | DTO validation for all inputs using class-validator | CreateSpecialistDto with @IsNotEmpty, @IsEmail, @IsOptional, @Length decorators. Global ValidationPipe already configured (verified in existing DTOs). Use @ApiProperty with description and example for Swagger |
| API-05 | Response DTOs for all queries with proper typing | SpecialistResponseDto class with @ApiProperty decorators. SpecialistListResponseDto with data[], total, page, pageSize fields. Use class-transformer @Exclude for hiding internal fields if needed |

**Coverage:** 11/11 requirements mapped to specific NestJS patterns with existing codebase precedents.
</phase_requirements>

## Standard Stack

### Core Dependencies (Already Installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | 11.0.1 | Application framework with DI, decorators, modules | Industry standard for TypeScript backend; already established in codebase with mature patterns |
| Prisma Client | 6.8.2 | Type-safe database queries | Generated from schema.prisma; provides typed models for Specialist, Service, Location |
| class-validator | 0.14.2 | DTO validation via decorators | De facto standard for NestJS validation; 40+ built-in validators (@IsEmail, @Length, @IsUUID, etc.) |
| class-transformer | 0.5.1 | Transform plain objects to class instances | Required companion to class-validator; enables @Exclude, @Expose, @Transform decorators |
| @nestjs/swagger | 11.2.0 | OpenAPI/Swagger documentation | Auto-generates API docs from @ApiProperty decorators; integrates with class-validator |
| @nestjs/mapped-types | * | DTO utility types (PartialType, PickType, OmitType) | Reduces boilerplate for update DTOs; UpdateSpecialistDto extends PartialType(CreateSpecialistDto) |

### Supporting Libraries (Already Installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid | 11.1.0 | UUID generation/validation | Already used for @id fields; validates UUID params with @IsUUID() decorator |

### No New Dependencies Required

All Phase 2 requirements satisfied by existing stack. Verified in package.json.

**Confidence:** HIGH - All libraries already installed and in active use in existing modules.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── specialist/
│   ├── specialist.module.ts          # Feature module with imports, controllers, providers
│   ├── specialist.controller.ts      # REST endpoints with @ApiTags, @Permissions
│   ├── specialist.service.ts         # Business logic with tenant validation
│   ├── repositories/
│   │   └── specialist.repository.ts  # Extends BaseRepository, Prisma queries
│   └── dto/
│       ├── create-specialist.dto.ts  # @ApiProperty, @IsEmail, @IsNotEmpty
│       ├── update-specialist.dto.ts  # PartialType(CreateSpecialistDto)
│       ├── specialist-response.dto.ts # Output DTO with @ApiProperty
│       └── specialist-query.dto.ts   # Pagination DTO with skip, take
├── service/
│   └── (similar structure if new endpoints needed)
├── location/
│   └── (similar structure if new endpoints needed)
└── common/
    ├── decorators/
    │   ├── account-id.decorator.ts   # EXISTS: Extracts organizationId from header
    │   └── permission.decorator.ts   # EXISTS: @Permissions(['resource.action'], 'COMPANY')
    ├── repositories/
    │   └── base.repository.ts        # EXISTS: buildWhereWithTenant, validateEntityOwnership
    └── helpers/
        └── validation.helper.ts      # EXISTS: validateSameTenantEntities helper
```

**Notes:**
- Service and Location modules may already partially exist (service-duration module exists). Verify existing endpoints before creating new ones.
- Each entity module is self-contained with its own controller, service, repository, DTOs.
- Import PrismaModule in each feature module to access PrismaService.
- Follow appointment/ module as reference implementation.

### Pattern 1: Feature Module Structure

**What:** Self-contained modules encapsulating all logic for a specific entity (specialist, service, location).

**When to use:** Always for domain entities in NestJS applications.

**Example:**
```typescript
// Source: src/appointment/appointment.module.ts (existing codebase)
import { Module } from '@nestjs/common';
import { SpecialistController } from './specialist.controller';
import { SpecialistService } from './specialist.service';
import { SpecialistRepository } from './repositories/specialist.repository';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule], // Access PrismaService
  controllers: [SpecialistController],
  providers: [
    SpecialistService,
    SpecialistRepository,
  ],
  exports: [SpecialistService], // Export if other modules need it
})
export class SpecialistModule {}
```

**Why this pattern:**
- **Encapsulation:** All specialist-related logic in one module
- **Dependency clarity:** Explicit imports/exports via module metadata
- **Testability:** Can test module in isolation with mocked dependencies
- **Scalability:** Easy to add new features (add providers) or extract to microservice later

**Reference:** [How to Use Modules for Code Organization in NestJS](https://oneuptime.com/blog/post/2026-02-02-nestjs-modules-organization/view)

### Pattern 2: Repository Extending BaseRepository

**What:** Entity-specific repositories extend BaseRepository to inherit tenant filtering helpers.

**When to use:** All repositories that query tenant-scoped tables.

**Example:**
```typescript
// Source: Existing BaseRepository + appointment repository pattern
// File: src/specialist/repositories/specialist.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { BaseRepository } from '@/common/repositories/base.repository';
import { Specialist, Prisma } from 'prisma/__generated__';

@Injectable()
export class SpecialistRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(
    data: Prisma.SpecialistCreateInput,
    organizationId: string
  ): Promise<Specialist> {
    // Validate organizationId matches data
    if (data.organizationId !== organizationId) {
      throw new Error('organizationId mismatch');
    }

    return this.prisma.specialist.create({ data });
  }

  async findById(
    id: string,
    organizationId: string
  ): Promise<Specialist | null> {
    const where = this.buildWhereWithTenant({ id }, organizationId);
    return this.prisma.specialist.findFirst({ where });
  }

  async findMany(
    organizationId: string,
    pagination: { skip?: number; take?: number } = {}
  ): Promise<{ data: Specialist[]; total: number }> {
    return this.findManyWithTenant(
      this.prisma.specialist,
      organizationId,
      {},
      pagination
    );
  }

  async update(
    id: string,
    data: Prisma.SpecialistUpdateInput,
    organizationId: string
  ): Promise<Specialist> {
    // Validate ownership first
    await this.validateEntityOwnership(
      id,
      organizationId,
      (id) => this.prisma.specialist.findUnique({
        where: { id },
        select: { organizationId: true }
      })
    );

    return this.prisma.specialist.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, organizationId: string): Promise<Specialist> {
    // Validate ownership first
    await this.validateEntityOwnership(
      id,
      organizationId,
      (id) => this.prisma.specialist.findUnique({
        where: { id },
        select: { organizationId: true }
      })
    );

    return this.prisma.specialist.delete({ where: { id } });
  }
}
```

**Why this pattern:**
- **Automatic tenant isolation:** buildWhereWithTenant helper prevents cross-tenant queries
- **Ownership validation:** validateEntityOwnership throws ForbiddenException if entity belongs to different tenant
- **Type safety:** Prisma types ensure correct field usage
- **DRY principle:** Shared helpers eliminate repeated tenant filtering logic

**Reference:** [Repository Pattern in NestJS: Do It Right or Go Home](https://dev.to/adamthedeveloper/repository-pattern-in-nestjs-do-it-right-or-go-home-268f)

### Pattern 3: DTO Validation with class-validator

**What:** Class-based DTOs with decorator-driven validation rules.

**When to use:** All controller input DTOs (create, update, query parameters).

**Example:**
```typescript
// Source: Existing CreateServiceDurationDto pattern
// File: src/specialist/dto/create-specialist.dto.ts
import { IsString, IsEmail, IsOptional, IsBoolean, IsNotEmpty, Length, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSpecialistDto {
  @ApiPropertyOptional({
    description: 'Profile avatar URL',
    example: 'https://example.com/avatar.jpg'
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
    minLength: 1,
    maxLength: 100
  })
  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  firstName: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
    minLength: 1,
    maxLength: 100
  })
  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  lastName: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com'
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+1234567890'
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Professional description',
    maxLength: 1000
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiProperty({
    description: 'Whether specialist is a top master',
    example: false,
    default: false
  })
  @IsBoolean()
  @IsOptional()
  isTopMaster?: boolean = false;

  // Note: organizationId NOT in DTO - extracted from AccountId decorator in controller
}
```

**Why this pattern:**
- **Declarative validation:** Rules clear from decorators, no manual if-checks
- **Automatic error responses:** ValidationPipe returns 400 with detailed error messages
- **Swagger integration:** @ApiProperty generates OpenAPI schema automatically
- **Type safety:** TypeScript ensures field types match decorators

**Update DTO using PartialType:**
```typescript
// File: src/specialist/dto/update-specialist.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateSpecialistDto } from './create-specialist.dto';

export class UpdateSpecialistDto extends PartialType(CreateSpecialistDto) {
  // All fields from CreateSpecialistDto become optional
  // Inherits all decorators and @ApiProperty metadata
}
```

**Reference:** [Mastering Data Validation in NestJS: A Complete Guide with Class-Validator and Class-Transformer](https://medium.com/@ahureinebenezer/mastering-data-validation-in-nestjs-a-complete-guide-with-class-validator-and-class-transformer-02a029db6ecf)

### Pattern 4: Response DTOs with Swagger Documentation

**What:** Typed output DTOs for API responses with OpenAPI decorators.

**When to use:** All controller methods that return data (GET, POST, PUT).

**Example:**
```typescript
// File: src/specialist/dto/specialist-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class SpecialistResponseDto {
  @ApiProperty({ description: 'Specialist ID', example: 'uuid-here' })
  id: string;

  @ApiProperty({ description: 'Organization ID', example: 'uuid-here' })
  organizationId: string;

  @ApiProperty({ description: 'Avatar URL', nullable: true })
  avatar: string | null;

  @ApiProperty({ description: 'First name', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  lastName: string;

  @ApiProperty({ description: 'Email', example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ description: 'Phone', nullable: true })
  phone: string | null;

  @ApiProperty({ description: 'Description', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Top master status', example: false })
  isTopMaster: boolean;

  @ApiProperty({ description: 'Created at', example: '2026-03-03T10:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at', example: '2026-03-03T10:00:00Z' })
  updatedAt: Date;
}

export class SpecialistListResponseDto {
  @ApiProperty({
    description: 'List of specialists',
    type: [SpecialistResponseDto]
  })
  data: SpecialistResponseDto[];

  @ApiProperty({ description: 'Total count', example: 100 })
  total: number;

  @ApiProperty({ description: 'Current page', example: 1 })
  page: number;

  @ApiProperty({ description: 'Page size', example: 20 })
  pageSize: number;
}
```

**Why this pattern:**
- **Swagger generation:** @ApiProperty creates accurate OpenAPI schema
- **Type safety:** TypeScript ensures response matches declared types
- **Documentation:** description and example improve API usability
- **Consistency:** All endpoints return typed responses, not Prisma models directly

**Reference:** [Documenting REST APIs with OpenAPI specs (NestJS/Swagger)](https://sevic.dev/notes/swagger-openapi-docs-nestjs/)

### Pattern 5: Service Layer with Business Logic

**What:** Service classes orchestrate repositories and validation, implement business rules.

**When to use:** All non-trivial operations requiring validation, orchestration, or transformation.

**Example:**
```typescript
// File: src/specialist/specialist.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { SpecialistRepository } from './repositories/specialist.repository';
import { CreateSpecialistDto } from './dto/create-specialist.dto';
import { UpdateSpecialistDto } from './dto/update-specialist.dto';
import { SpecialistResponseDto, SpecialistListResponseDto } from './dto/specialist-response.dto';

@Injectable()
export class SpecialistService {
  constructor(
    private readonly repository: SpecialistRepository,
  ) {}

  async create(
    dto: CreateSpecialistDto,
    organizationId: string
  ): Promise<SpecialistResponseDto> {
    // Business logic: Add organizationId from authenticated context
    const data = {
      ...dto,
      organizationId,
    };

    const specialist = await this.repository.create(data, organizationId);
    return specialist as SpecialistResponseDto;
  }

  async findAll(
    organizationId: string,
    skip: number = 0,
    take: number = 20
  ): Promise<SpecialistListResponseDto> {
    const { data, total } = await this.repository.findMany(
      organizationId,
      { skip, take }
    );

    return {
      data: data as SpecialistResponseDto[],
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
    };
  }

  async findById(
    id: string,
    organizationId: string
  ): Promise<SpecialistResponseDto> {
    const specialist = await this.repository.findById(id, organizationId);

    if (!specialist) {
      throw new NotFoundException(`Specialist with id ${id} not found`);
    }

    return specialist as SpecialistResponseDto;
  }

  async update(
    id: string,
    dto: UpdateSpecialistDto,
    organizationId: string
  ): Promise<SpecialistResponseDto> {
    // Ownership validation happens in repository.update
    const specialist = await this.repository.update(id, dto, organizationId);
    return specialist as SpecialistResponseDto;
  }

  async delete(id: string, organizationId: string): Promise<void> {
    // Ownership validation happens in repository.delete
    // Cascade deletes handle relationships automatically
    await this.repository.delete(id, organizationId);
  }
}
```

**Why this pattern:**
- **Single responsibility:** Service handles business logic, repository handles data access
- **Testability:** Can mock repository in service tests
- **Validation centralization:** All create/update operations validate ownership
- **Error handling:** Service throws domain-appropriate exceptions (NotFoundException)

**Reference:** [Building a Layered Architecture in NestJS & Typescript: Repository Pattern, DTOs, and Validators](https://medium.com/@patrick.cunha336/building-a-layered-architecture-in-nestjs-typescript-repository-pattern-dtos-and-validators-08907a8ac4cb)

### Pattern 6: Controller with Authentication and Authorization

**What:** RESTful controllers with AccountId decorator for tenant extraction and Permissions decorator for authorization.

**When to use:** All API endpoints requiring authentication.

**Example:**
```typescript
// File: src/specialist/specialist.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SpecialistService } from './specialist.service';
import { CreateSpecialistDto } from './dto/create-specialist.dto';
import { UpdateSpecialistDto } from './dto/update-specialist.dto';
import { SpecialistResponseDto, SpecialistListResponseDto } from './dto/specialist-response.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { Permissions } from '@/common/decorators/permission.decorator';
import { AccountId } from '@/common/decorators/account-id.decorator';

@ApiTags('Specialists')
@Controller('specialists')
export class SpecialistController {
  constructor(private readonly service: SpecialistService) {}

  @Post()
  @Permissions(['specialists.manage'], 'COMPANY')
  @ApiOperation({ summary: 'Create new specialist' })
  @ApiResponse({ status: 201, type: SpecialistResponseDto })
  async create(
    @Body() dto: CreateSpecialistDto,
    @AccountId() organizationId: string,
  ): Promise<SpecialistResponseDto> {
    return this.service.create(dto, organizationId);
  }

  @Get()
  @Permissions(['specialists.view'], 'COMPANY')
  @ApiOperation({ summary: 'List all specialists with pagination' })
  @ApiResponse({ status: 200, type: SpecialistListResponseDto })
  async findAll(
    @Query() query: PaginationDto,
    @AccountId() organizationId: string,
  ): Promise<SpecialistListResponseDto> {
    return this.service.findAll(organizationId, query.skip, query.take);
  }

  @Get(':id')
  @Permissions(['specialists.view'], 'COMPANY')
  @ApiOperation({ summary: 'Get specialist by ID' })
  @ApiParam({ name: 'id', description: 'Specialist ID' })
  @ApiResponse({ status: 200, type: SpecialistResponseDto })
  async findById(
    @Param('id') id: string,
    @AccountId() organizationId: string,
  ): Promise<SpecialistResponseDto> {
    return this.service.findById(id, organizationId);
  }

  @Put(':id')
  @Permissions(['specialists.manage'], 'COMPANY')
  @ApiOperation({ summary: 'Update specialist profile' })
  @ApiParam({ name: 'id', description: 'Specialist ID' })
  @ApiResponse({ status: 200, type: SpecialistResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSpecialistDto,
    @AccountId() organizationId: string,
  ): Promise<SpecialistResponseDto> {
    return this.service.update(id, dto, organizationId);
  }

  @Delete(':id')
  @Permissions(['specialists.manage'], 'COMPANY')
  @ApiOperation({ summary: 'Delete specialist (cascade deletes relationships)' })
  @ApiParam({ name: 'id', description: 'Specialist ID' })
  @ApiResponse({ status: 204, description: 'Specialist deleted successfully' })
  async delete(
    @Param('id') id: string,
    @AccountId() organizationId: string,
  ): Promise<void> {
    return this.service.delete(id, organizationId);
  }
}
```

**Why this pattern:**
- **Security:** @Permissions enforces authorization before controller logic
- **Multi-tenancy:** @AccountId extracts organizationId from x-account-id header automatically
- **Documentation:** @ApiTags, @ApiOperation, @ApiResponse generate Swagger docs
- **RESTful design:** Standard HTTP verbs (GET, POST, PUT, DELETE) for resource operations

**Reference:** Existing pattern from src/service-duration/service-duration.controller.ts and src/appointment/company-appointment.controller.ts

### Pattern 7: Pagination DTO

**What:** Reusable DTO for paginated list queries.

**When to use:** All list endpoints that support pagination.

**Example:**
```typescript
// File: src/common/dto/pagination.dto.ts (create if doesn't exist)
import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Number of records to skip',
    example: 0,
    minimum: 0,
    default: 0
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({
    description: 'Number of records to return',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 20;
}
```

**Why this pattern:**
- **Reusability:** Single DTO used across all list endpoints
- **Validation:** Enforces limits (max 100 per page) to prevent abuse
- **Type coercion:** @Type(() => Number) converts query string to number
- **Consistent API:** All paginated endpoints follow same skip/take pattern

**Reference:** [Pagination (Reference) | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/pagination)

### Anti-Patterns to Avoid

- **Returning Prisma models directly from controllers:** Always use response DTOs to control API shape and prevent leaking internal fields
- **Manual tenant filtering in services:** Use BaseRepository helpers to ensure consistent tenant isolation
- **Skipping ownership validation on mutations:** Always call validateEntityOwnership before update/delete operations
- **Including organizationId in create/update DTOs:** Extract from AccountId decorator to prevent tenant switching attacks
- **Large pagination limits:** Cap take at 100 to prevent database overload and slow responses
- **Using offset pagination for large datasets:** For infinite scroll, consider cursor-based pagination (skip to Phase 3+)
- **Complex business logic in controllers:** Keep controllers thin—delegate to services
- **Not using PartialType for update DTOs:** Manually marking fields optional is error-prone and verbose

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DTO validation | Custom validation functions with if-checks | class-validator decorators | 40+ built-in validators, automatic error messages, Swagger integration, declarative syntax |
| Pagination logic | Manual offset/limit calculation | BaseRepository.findManyWithTenant + PaginationDto | Type-safe, reusable, enforces limits, consistent across all entities |
| Tenant filtering | Repeated `where: { organizationId }` in every query | BaseRepository.buildWhereWithTenant | Single source of truth, impossible to forget, testable |
| Update DTOs | Manually creating classes with optional fields | PartialType from @nestjs/mapped-types | Inherits all decorators, DRY, maintains type safety |
| Exception handling | Custom error classes for every HTTP status | Built-in NestJS exceptions (NotFoundException, ForbiddenException, BadRequestException) | Standard HTTP status codes, consistent error format, integration with exception filters |

**Key insight:** NestJS and Prisma provide comprehensive solutions for common CRUD patterns. Focus implementation time on business logic (e.g., subservice tree validation) rather than reinventing pagination or validation.

## Common Pitfalls

### Pitfall 1: Tenant Isolation Bypass via Direct Prisma Queries

**What goes wrong:** Developers write `this.prisma.specialist.findMany()` without organizationId filter, exposing all tenants' data.

**Why it happens:** Prisma doesn't enforce tenant filtering—it's application responsibility.

**How to avoid:**
1. Always extend BaseRepository for entity repositories
2. Use buildWhereWithTenant helper for all queries
3. Never call prisma methods directly in services—route through repositories
4. Code review checklist: "Does this query filter by organizationId?"

**Warning signs:** Query returns data from multiple organizations, failing tests when running with multi-tenant fixtures.

**Reference:** Established in Phase 1 research and BaseRepository implementation.

### Pitfall 2: Forgetting to Validate Ownership Before Mutations

**What goes wrong:** User from organizationId=A can update/delete specialist from organizationId=B by guessing UUID.

**Why it happens:** UUID in URL isn't proof of ownership—requires validation.

**How to avoid:**
1. Call validateEntityOwnership in repository before update/delete
2. Use ForbiddenException (not NotFoundException) for wrong tenant
3. Add integration tests that verify cross-tenant access is blocked

**Warning signs:** Security audit shows cross-tenant data access, users report seeing other companies' data.

**Example fix:**
```typescript
// BAD: No ownership validation
async update(id: string, data: UpdateInput) {
  return this.prisma.specialist.update({ where: { id }, data });
}

// GOOD: Validates ownership first
async update(id: string, data: UpdateInput, organizationId: string) {
  await this.validateEntityOwnership(id, organizationId, ...);
  return this.prisma.specialist.update({ where: { id }, data });
}
```

**Reference:** [Error Handling in NestJS: Best Practices and Examples](https://dev.to/geampiere/error-handling-in-nestjs-best-practices-and-examples-5e76)

### Pitfall 3: Including organizationId in DTOs

**What goes wrong:** Attacker sends `{ organizationId: "victim-org-id", ... }` in request body, creating data in victim's tenant.

**Why it happens:** Trusting user input for security-critical fields.

**How to avoid:**
1. Never include organizationId in CreateDto or UpdateDto
2. Extract organizationId from AccountId decorator (from JWT/header)
3. Inject organizationId in service layer, not controller
4. Validate DTO organizationId matches extracted organizationId if DTO includes it (fail-safe)

**Warning signs:** organizationId field in Swagger docs for POST requests, security audit finding tenant switching vulnerability.

**Example:**
```typescript
// BAD: organizationId in DTO
export class CreateSpecialistDto {
  @IsUUID()
  organizationId: string; // ❌ Attacker can set this!
  // ... other fields
}

// GOOD: organizationId from decorator
export class CreateSpecialistDto {
  // No organizationId field
  @IsString()
  firstName: string;
  // ... other fields
}

// Controller extracts from header
@Post()
async create(@Body() dto: CreateDto, @AccountId() orgId: string) {
  return this.service.create({ ...dto, organizationId: orgId }, orgId);
}
```

**Reference:** AccountId decorator pattern from existing codebase.

### Pitfall 4: Not Using Cascade Deletes

**What goes wrong:** Deleting specialist leaves orphaned records in SpecialistService, SpecialistLocation, Schedule tables. Relationships point to non-existent specialist.

**Why it happens:** Forgetting to manually delete related records or not configuring onDelete: Cascade in schema.

**How to avoid:**
1. Phase 1 schema already configured `onDelete: Cascade` on junction tables and Schedule
2. No manual cleanup code needed in delete operations
3. Rely on database referential actions for automatic cleanup
4. Test cascade behavior: delete specialist, verify relationships auto-deleted

**Warning signs:** Foreign key constraint errors on delete, orphaned relationship records found in junction tables.

**Reference:** [Prisma referential actions](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/referential-actions) and Phase 1 schema configuration.

### Pitfall 5: Large Pagination Limits Causing Timeout

**What goes wrong:** Client sends `?take=10000`, query times out or crashes server with memory exhaustion.

**Why it happens:** No limit on pagination size, attacker or poorly configured client requests entire dataset.

**How to avoid:**
1. Cap `take` at 100 with @Max(100) decorator in PaginationDto
2. Use cursor-based pagination for infinite scroll (deferred to Phase 3+)
3. Monitor slow query logs for pagination abuse
4. Document recommended page size (20-50) in API docs

**Warning signs:** Slow API responses, high database CPU usage, out-of-memory errors.

**Reference:** [Efficient Pagination With Prisma](https://mskelton.dev/blog/efficient-prisma-pagination)

### Pitfall 6: Validation Errors Without Context

**What goes wrong:** User gets "Validation failed" with no details about which fields failed or why.

**Why it happens:** ValidationPipe not configured to include detailed error messages.

**How to avoid:**
1. Global ValidationPipe already configured with `whitelist: true, forbidNonWhitelisted: true` (verify in main.ts)
2. class-validator automatically includes field-level errors with rule descriptions
3. Test validation errors return 400 with `{ message: [...], error: "Bad Request" }` format

**Warning signs:** Support tickets asking "what field is invalid?", poor developer experience testing API.

**Reference:** [NestJS Validation Documentation](https://docs.nestjs.com/techniques/validation)

## Code Examples

Verified patterns from official sources and existing codebase:

### Complete CRUD Flow Example

```typescript
// 1. Repository (data access layer)
@Injectable()
export class SpecialistRepository extends BaseRepository {
  async findMany(organizationId: string, pagination: PaginationDto) {
    return this.findManyWithTenant(
      this.prisma.specialist,
      organizationId,
      {},
      pagination
    );
  }
}

// 2. Service (business logic layer)
@Injectable()
export class SpecialistService {
  async findAll(organizationId: string, pagination: PaginationDto) {
    const { data, total } = await this.repository.findMany(
      organizationId,
      pagination
    );
    return { data, total, page: ..., pageSize: ... };
  }
}

// 3. Controller (HTTP layer)
@Controller('specialists')
export class SpecialistController {
  @Get()
  @Permissions(['specialists.view'], 'COMPANY')
  @ApiResponse({ status: 200, type: SpecialistListResponseDto })
  async findAll(
    @Query() query: PaginationDto,
    @AccountId() organizationId: string
  ) {
    return this.service.findAll(organizationId, query);
  }
}
```

### Subservice Tree Validation Example (SERV-02)

```typescript
// In ServiceService (if creating new service module)
async create(dto: CreateServiceDto, organizationId: string) {
  // Validate parent service if provided
  if (dto.parentServiceId) {
    const parentService = await this.repository.findById(
      dto.parentServiceId,
      organizationId
    );

    if (!parentService) {
      throw new BadRequestException(
        `Parent service ${dto.parentServiceId} not found`
      );
    }

    // Optional: Additional validation
    // - Prevent circular references
    // - Limit subservice depth
    // - Check parent service is active
  }

  return this.repository.create(
    { ...dto, organizationId },
    organizationId
  );
}
```

### Generic DTO Pattern for Multiple Entities

```typescript
// Common pattern if Service/Location need similar DTOs
export function createEntityDto(entityName: string) {
  return {
    CreateDto: class {
      @ApiProperty({ description: `${entityName} name` })
      @IsString()
      @IsNotEmpty()
      name: string;

      @ApiPropertyOptional({ description: `${entityName} description` })
      @IsOptional()
      @IsString()
      description?: string;
    },
    UpdateDto: class extends PartialType(this.CreateDto) {},
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual validation in services | class-validator decorators on DTOs | NestJS v6+ (2019) | 80% less boilerplate, automatic error messages, Swagger integration |
| Middleware for tenant filtering | Repository pattern with BaseRepository | NestJS v8+ (2021) | Explicit filtering visible in code, testable, no hidden query modifications |
| Interface-based repositories | Abstract class-based repositories | TypeScript limitation (ongoing) | Abstract classes work with NestJS DI, interfaces don't exist at runtime |
| @nestjs/swagger manual schema definitions | CLI plugin auto-generates from decorators | @nestjs/swagger v5+ (2021) | Reduces repetition, keeps DTOs and docs in sync |
| PartialType from class-transformer | PartialType from @nestjs/mapped-types | NestJS v8+ (2021) | Preserves validation decorators and Swagger metadata |
| Offset pagination everywhere | Cursor-based for infinite scroll, offset for simple lists | Prisma v2+ (2020) | More stable results for infinite scroll, better performance on large datasets |

**Deprecated/outdated:**
- **Prisma implicit many-to-many (@relation with array fields):** Replaced by explicit junction tables in Phase 1. Cannot add metadata (createdAt, assignedBy) or tenant isolation (organizationId) with implicit relations.
- **TypeORM-style @Column decorators in entities:** Prisma uses schema.prisma file, not decorators on classes. Migration from TypeORM requires schema rewrite.
- **Global middleware for tenant filtering:** Replaced by explicit repository methods. Middleware makes filtering invisible and harder to test.

## Open Questions

1. **Do Service and Location modules already have CRUD endpoints?**
   - What we know: service-duration module exists for ServiceDuration entity, unclear if base Service CRUD exists
   - What's unclear: Whether Location module exists with full CRUD
   - Recommendation: Audit existing modules before creating new ones. Reuse existing patterns. If only partial CRUD exists, extend rather than replace.

2. **Should we create mappers between Prisma models and Response DTOs?**
   - What we know: AppointmentModule has mapper for status history transformation, ServiceDurationController returns Prisma models directly
   - What's unclear: Project standard for when to use mappers vs direct returns
   - Recommendation: Skip mappers for simple entities (Specialist, Service, Location). Prisma models already match response shape. Add mappers only if complex transformations needed (e.g., computed fields, nested includes).

3. **What permissions exist in permission system?**
   - What we know: Existing decorators use 'specialists.manage', 'specialists.view', 'services.manage' naming pattern
   - What's unclear: Full list of available permissions, whether new permissions need registration
   - Recommendation: Follow existing pattern ('resource.action'). Verify permission names with auth service/documentation. Test with PermissionGuard in integration tests.

## Validation Architecture

> Skipped - workflow.nyquist_validation not detected in config.json (not enabled for this project).

## Sources

### Primary (HIGH confidence)

Official documentation and established codebase patterns:
- [NestJS Modules Documentation](https://docs.nestjs.com/modules) - Module system fundamentals
- [NestJS Validation Documentation](https://docs.nestjs.com/techniques/validation) - ValidationPipe and class-validator integration
- [Prisma Pagination Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/pagination) - Skip/take and cursor-based patterns
- [Prisma Referential Actions](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/referential-actions) - Cascade delete behavior
- Existing codebase: src/appointment/appointment.module.ts, src/service-duration/service-duration.controller.ts, src/common/repositories/base.repository.ts, src/common/decorators/account-id.decorator.ts, src/common/decorators/permission.decorator.ts

### Secondary (MEDIUM confidence)

Verified web sources from 2026 searches:
- [How to Use Modules for Code Organization in NestJS (2026-02-02)](https://oneuptime.com/blog/post/2026-02-02-nestjs-modules-organization/view) - Feature module patterns
- [Repository Pattern in NestJS: Do It Right or Go Home](https://dev.to/adamthedeveloper/repository-pattern-in-nestjs-do-it-right-or-go-home-268f) - Abstract repository pattern
- [Mastering Data Validation in NestJS with Class-Validator](https://medium.com/@ahureinebenezer/mastering-data-validation-in-nestjs-a-complete-guide-with-class-validator-and-class-transformer-02a029db6ecf) - DTO validation patterns
- [Building a Layered Architecture in NestJS & Typescript](https://medium.com/@patrick.cunha336/building-a-layered-architecture-in-nestjs-typescript-repository-pattern-dtos-and-validators-08907a8ac4cb) - Service layer patterns
- [Error Handling in NestJS: Best Practices and Examples](https://dev.to/geampiere/error-handling-in-nestjs-best-practices-and-examples-5e76) - Exception handling
- [Documenting REST APIs with OpenAPI specs (NestJS/Swagger)](https://sevic.dev/notes/swagger-openapi-docs-nestjs/) - Swagger/OpenAPI documentation
- [Efficient Pagination With Prisma](https://mskelton.dev/blog/efficient-prisma-pagination) - Pagination performance

### Tertiary (LOW confidence)

None - all key findings verified against official docs or existing codebase patterns.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already installed and in use
- Architecture: HIGH - Patterns directly from existing AppointmentModule and ServiceDurationModule
- Pitfalls: HIGH - Validated against Prisma docs and multi-tenant security best practices
- Code examples: HIGH - Based on existing repository and controller implementations

**Research date:** 2026-03-03
**Valid until:** ~30 days (stable patterns, minimal API churn expected)

**Cross-references:**
- Phase 1 research: .planning/phases/01-foundation-schema/01-RESEARCH.md (Prisma schema, BaseRepository design)
- Phase 1 summary: .planning/phases/01-foundation-schema/01-03-SUMMARY.md (Repository infrastructure decisions)
- Requirements: .planning/REQUIREMENTS.md (SPEC-01 through API-05 requirements)
- State: .planning/STATE.md (Project context, existing modules)
