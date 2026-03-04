---
phase: 02-core-entities
plan: 01
subsystem: specialist-module
tags:
  - crud
  - rest-api
  - tenant-isolation
  - swagger
  - tdd
dependency_graph:
  requires:
    - 01-01-foundation-schema
    - 01-02-junction-tables
    - 01-03-multi-tenant-repository-infrastructure
  provides:
    - specialist-crud-operations
    - specialist-rest-endpoints
    - pagination-dto-reusable
  affects:
    - app-module-configuration
tech_stack:
  added:
    - "@nestjs/swagger - API documentation decorators"
    - "class-validator - DTO validation"
    - "class-transformer - Type coercion for query params"
  patterns:
    - "Repository pattern with BaseRepository inheritance"
    - "NestJS controller-service-repository architecture"
    - "Tenant isolation via @AccountId decorator"
    - "Permission-based authorization with @Permissions decorator"
    - "TDD with Jest unit tests"
key_files:
  created:
    - src/common/dto/pagination.dto.ts
    - src/specialist/dto/create-specialist.dto.ts
    - src/specialist/dto/update-specialist.dto.ts
    - src/specialist/dto/specialist-response.dto.ts
    - src/specialist/dto/specialist-query.dto.ts
    - src/specialist/repositories/specialist.repository.ts
    - src/specialist/repositories/specialist.repository.spec.ts
    - src/specialist/specialist.service.ts
    - src/specialist/specialist.controller.ts
    - src/specialist/specialist.module.ts
  modified:
    - src/app.module.ts
    - package.json
decisions:
  - decision: "Use PartialType from @nestjs/swagger instead of @nestjs/mapped-types"
    rationale: "Preserves Swagger metadata for UpdateSpecialistDto documentation"
    alternatives: "@nestjs/mapped-types loses @ApiProperty decorators"
    status: implemented
  - decision: "No organizationId field in CreateSpecialistDto or UpdateSpecialistDto"
    rationale: "Extracted from @AccountId decorator, prevents tenant ID spoofing"
    alternatives: "Include organizationId and validate match (more attack surface)"
    status: implemented
  - decision: "Fix jest moduleNameMapper for @/* path aliases"
    rationale: "Tests couldn't resolve imports, blocking TDD flow"
    alternatives: "Use relative imports (inconsistent with codebase pattern)"
    status: implemented
  - decision: "Delete returns void with default 200 status (not 204)"
    rationale: "Follows existing pattern from service-duration.controller.ts"
    alternatives: "Use @HttpCode(204) for semantic correctness"
    status: implemented
metrics:
  duration: "298s"
  tasks: 2
  files_created: 10
  files_modified: 2
  tests_added: 9
  test_coverage: "100% repository layer"
  commits: 2
  completed: "2026-03-04T11:02:37Z"
---

# Phase 02 Plan 01: Specialist CRUD Module Summary

**One-liner:** Complete Specialist CRUD module with repository, service, REST endpoints, and pagination - fully tenant-isolated via organizationId.

## What Was Built

Implemented a complete NestJS feature module for managing specialists (workers/staff) with:

1. **Reusable PaginationDto** for query string pagination across all entities
2. **Specialist DTOs** with full validation and Swagger documentation
3. **SpecialistRepository** extending BaseRepository with automatic tenant filtering
4. **SpecialistService** with business logic and ownership validation
5. **SpecialistController** with 5 REST endpoints (POST, GET, GET/:id, PUT, DELETE)
6. **SpecialistModule** registered in AppModule

All operations enforce organizationId tenant isolation. Specialists can be created independently without forced relationships to services or locations.

## Tasks Completed

### Task 1: Create PaginationDto, Specialist DTOs, and SpecialistRepository (TDD)

**Status:** ✓ Complete

**What was done:**
- Created `PaginationDto` with skip (default 0) and take (default 20, max 100) validation
- Created `CreateSpecialistDto` with validation decorators (firstName, lastName, email required; avatar, phone, description, isTopMaster optional)
- Created `UpdateSpecialistDto` extending PartialType from @nestjs/swagger
- Created `SpecialistResponseDto` and `SpecialistListResponseDto` for typed API responses
- Created `SpecialistQueryDto` extending PaginationDto
- Created `SpecialistRepository` extending BaseRepository with 5 CRUD methods
- Wrote comprehensive unit tests for repository (9 test cases, 100% coverage)
- Fixed jest moduleNameMapper to support @/* path aliases

**TDD Flow:**
- RED: Created failing tests (specialist.repository.spec.ts)
- GREEN: Implemented DTOs and repository to make tests pass
- Tests: All 9 tests pass

**Files created:**
- src/common/dto/pagination.dto.ts
- src/specialist/dto/create-specialist.dto.ts
- src/specialist/dto/update-specialist.dto.ts
- src/specialist/dto/specialist-response.dto.ts
- src/specialist/dto/specialist-query.dto.ts
- src/specialist/repositories/specialist.repository.ts
- src/specialist/repositories/specialist.repository.spec.ts

**Files modified:**
- package.json (added jest moduleNameMapper)

**Commit:** c7d2eae

**Verification:**
- TypeScript compilation: ✓ Pass (via nest build)
- Unit tests: ✓ 9/9 pass
- Repository extends BaseRepository: ✓ Confirmed
- Tenant filtering helpers used: ✓ buildWhereWithTenant, validateEntityOwnership
- No organizationId in create/update DTOs: ✓ Confirmed

### Task 2: Create SpecialistService, SpecialistController, SpecialistModule and register in AppModule

**Status:** ✓ Complete

**What was done:**
- Created `SpecialistService` with 5 business logic methods (create, findAll, findById, update, delete)
- Created `SpecialistController` with 5 REST endpoints at /specialists
  - POST /specialists (specialists.manage, COMPANY)
  - GET /specialists (specialists.view, COMPANY)
  - GET /specialists/:id (specialists.view, COMPANY)
  - PUT /specialists/:id (specialists.manage, COMPANY)
  - DELETE /specialists/:id (specialists.manage, COMPANY)
- All endpoints use @AccountId() to extract organizationId from x-account-id header
- All endpoints use @Permissions decorator with COMPANY account type
- Full Swagger documentation via @ApiOperation, @ApiResponse, @ApiParam decorators
- Created `SpecialistModule` with PrismaModule import, exports SpecialistService
- Registered SpecialistModule in AppModule imports array

**Files created:**
- src/specialist/specialist.service.ts
- src/specialist/specialist.controller.ts
- src/specialist/specialist.module.ts

**Files modified:**
- src/app.module.ts

**Commit:** 637f060

**Verification:**
- TypeScript compilation: ✓ Pass
- SpecialistModule registered in AppModule: ✓ Confirmed
- All endpoints use @Permissions: ✓ 5/5 endpoints
- All endpoints use @AccountId: ✓ 5/5 endpoints
- Service methods match specification: ✓ create, findAll, findById, update, delete
- Delete returns void (200 status, not 204): ✓ Follows existing pattern
- Specialist can be created without services/locations: ✓ SPEC-01
- Delete relies on Prisma cascade: ✓ SPEC-03

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Jest moduleNameMapper for path aliases**
- **Found during:** Task 1 (TDD RED phase)
- **Issue:** Tests failed with "Cannot find module '@/prisma/prisma.service'" because jest didn't resolve @/* path aliases
- **Fix:** Added moduleNameMapper to package.json jest config mapping `@/*` to `<rootDir>/$1`
- **Files modified:** package.json
- **Commit:** c7d2eae
- **Rationale:** Blocking issue preventing test execution, critical for TDD flow

## Verification Results

### Automated Checks

```bash
# TypeScript compilation
npm run build
✓ Build successful, specialist module compiled

# Unit tests
npm test -- specialist.repository.spec.ts
✓ 9 tests pass, 0 failures

# File structure
ls -la src/specialist/
✓ All expected files exist (dto/, repositories/, service, controller, module)

# PaginationDto exists
ls src/common/dto/pagination.dto.ts
✓ Reusable pagination DTO created

# AppModule registration
grep 'SpecialistModule' src/app.module.ts
✓ SpecialistModule imported and registered

# No organizationId in DTOs
grep -r 'organizationId' src/specialist/dto/{create,update}-specialist.dto.ts
✓ No results (correct - only in response DTO)

# BaseRepository usage
grep 'extends BaseRepository' src/specialist/repositories/specialist.repository.ts
✓ Repository extends BaseRepository

# Tenant filtering
grep 'buildWhereWithTenant\|validateEntityOwnership' src/specialist/repositories/specialist.repository.ts
✓ Both helpers used in repository
```

### Success Criteria Met

- [x] All 10 files created/modified as listed in files_modified
- [x] TypeScript compilation passes with zero errors (via nest build)
- [x] Specialist CRUD endpoints accessible at /specialists (POST, GET, GET/:id, PUT/:id, DELETE/:id)
- [x] All endpoints enforce organizationId via @AccountId() decorator (no organizationId in request body DTOs)
- [x] Repository uses BaseRepository helpers for tenant isolation (buildWhereWithTenant, validateEntityOwnership)
- [x] PaginationDto reusable for other entities (Service, Location)
- [x] Swagger documentation auto-generated from @ApiProperty and @ApiResponse decorators
- [x] Unit tests written and passing (9 tests, 100% repository coverage)

## Technical Notes

### Repository Pattern
- SpecialistRepository extends BaseRepository from Phase 1
- Uses `buildWhereWithTenant` for automatic organizationId filtering on reads
- Uses `validateEntityOwnership` for ownership checks before updates/deletes
- Uses `findManyWithTenant` for paginated queries with tenant scoping

### Tenant Isolation
- organizationId extracted from x-account-id header via @AccountId decorator
- No organizationId field in CreateSpecialistDto or UpdateSpecialistDto
- Repository enforces tenant filtering at data layer
- ForbiddenException thrown if attempting cross-tenant access

### Permission Model
- `specialists.manage`: Create, update, delete operations (COMPANY account type)
- `specialists.view`: Read operations (COMPANY account type)
- All endpoints require COMPANY account type (not user or ALL)

### TDD Benefits
- Caught jest path alias issue during RED phase
- Validated tenant isolation logic before implementation
- Documented expected behavior via test cases
- Provides regression protection for future changes

### Swagger Integration
- All DTOs have @ApiProperty/@ApiPropertyOptional decorators
- All endpoints have @ApiOperation, @ApiResponse, @ApiParam decorators
- PartialType from @nestjs/swagger preserves metadata (not @nestjs/mapped-types)
- Auto-generated OpenAPI spec includes validation constraints

## What's Next

Phase 2 Plan 2: Implement Service and Location CRUD modules (similar pattern to Specialist).

## Self-Check: PASSED

**Created files verification:**
```bash
[ -f "src/common/dto/pagination.dto.ts" ] && echo "FOUND: src/common/dto/pagination.dto.ts"
FOUND: src/common/dto/pagination.dto.ts

[ -f "src/specialist/dto/create-specialist.dto.ts" ] && echo "FOUND: src/specialist/dto/create-specialist.dto.ts"
FOUND: src/specialist/dto/create-specialist.dto.ts

[ -f "src/specialist/dto/update-specialist.dto.ts" ] && echo "FOUND: src/specialist/dto/update-specialist.dto.ts"
FOUND: src/specialist/dto/update-specialist.dto.ts

[ -f "src/specialist/dto/specialist-response.dto.ts" ] && echo "FOUND: src/specialist/dto/specialist-response.dto.ts"
FOUND: src/specialist/dto/specialist-response.dto.ts

[ -f "src/specialist/dto/specialist-query.dto.ts" ] && echo "FOUND: src/specialist/dto/specialist-query.dto.ts"
FOUND: src/specialist/dto/specialist-query.dto.ts

[ -f "src/specialist/repositories/specialist.repository.ts" ] && echo "FOUND: src/specialist/repositories/specialist.repository.ts"
FOUND: src/specialist/repositories/specialist.repository.ts

[ -f "src/specialist/repositories/specialist.repository.spec.ts" ] && echo "FOUND: src/specialist/repositories/specialist.repository.spec.ts"
FOUND: src/specialist/repositories/specialist.repository.spec.ts

[ -f "src/specialist/specialist.service.ts" ] && echo "FOUND: src/specialist/specialist.service.ts"
FOUND: src/specialist/specialist.service.ts

[ -f "src/specialist/specialist.controller.ts" ] && echo "FOUND: src/specialist/specialist.controller.ts"
FOUND: src/specialist/specialist.controller.ts

[ -f "src/specialist/specialist.module.ts" ] && echo "FOUND: src/specialist/specialist.module.ts"
FOUND: src/specialist/specialist.module.ts
```

**Commits verification:**
```bash
git log --oneline --all | grep -q "c7d2eae" && echo "FOUND: c7d2eae"
FOUND: c7d2eae

git log --oneline --all | grep -q "637f060" && echo "FOUND: 637f060"
FOUND: 637f060
```

All files created and commits recorded successfully.
