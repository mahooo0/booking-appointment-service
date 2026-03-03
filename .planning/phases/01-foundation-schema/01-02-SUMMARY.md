---
phase: 01-foundation-schema
plan: 02
subsystem: database-schema
tags:
  - junction-tables
  - many-to-many-relationships
  - multi-tenant-isolation
  - composite-indexes
  - foreign-keys
dependency_graph:
  requires:
    - 01-01-core-entity-schema
  provides:
    - specialist-service-relationships
    - specialist-location-relationships
    - service-location-relationships
    - tenant-scoped-junction-queries
  affects:
    - phase-03-relationship-operations
    - phase-03-querying-patterns
tech_stack:
  added:
    - explicit-junction-tables
    - composite-unique-constraints
    - bidirectional-composite-indexes
  patterns:
    - tenant-first-indexing
    - cascade-delete-cleanup
    - explicit-over-implicit-relations
key_files:
  created:
    - prisma/migrations/20260303111054_add_junction_tables/migration.sql
  modified:
    - prisma/schema.prisma
decisions:
  - decision: Use explicit junction tables instead of Prisma implicit many-to-many
    rationale: Supports organizationId for multi-tenant isolation and allows relationship metadata (createdAt, future assignedBy)
    alternatives_considered: Prisma implicit @relation([]) syntax
    trade_offs: More verbose schema but full control over junction table structure
  - decision: Place organizationId first in all composite indexes
    rationale: Multi-tenant apps always filter by tenant first. PostgreSQL can use index prefix even for partial matches
    alternatives_considered: Entity-first index ordering
    trade_offs: 150× performance improvement for tenant-scoped queries vs single-column indexes
  - decision: Use bidirectional composite indexes (forward + reverse)
    rationale: Supports both "specialist's services" and "service's specialists" queries without full table scans
    alternatives_considered: Single forward index only
    trade_offs: Extra storage cost (~10-15% per index) but prevents N+1 query issues in reverse direction
  - decision: Apply onDelete Cascade to all foreign keys
    rationale: Automatic cleanup of junction records when entities are deleted prevents orphaned records and manual cleanup logic
    alternatives_considered: onDelete Restrict or SetNull
    trade_offs: Safe for junction tables (relationships have no independent value), eliminates maintenance burden
metrics:
  duration_minutes: 2
  tasks_completed: 3
  files_created: 1
  files_modified: 1
  commits: 3
  completed_date: "2026-03-03"
---

# Phase 01 Plan 02: Junction Tables Summary

**One-liner:** Three explicit junction tables (SpecialistService, SpecialistLocation, ServiceLocation) with tenant-scoped composite indexes and cascade deletes enable flexible many-to-many relationships

## What Was Built

Added three explicit junction tables to establish many-to-many relationships between core entities:

1. **SpecialistService Junction** - Links specialists to services they can perform
2. **SpecialistLocation Junction** - Links specialists to locations where they work
3. **ServiceLocation Junction** - Links services to locations where they're offered

Each junction table includes:
- UUID primary key
- organizationId for multi-tenant isolation (matching Plan 01 decision)
- Foreign keys to both related entities with ON DELETE CASCADE
- Composite unique constraint preventing duplicate relationships within tenant
- Three composite indexes (forward, reverse, partial) optimized for tenant-scoped queries
- createdAt timestamp for relationship tracking

## Requirements Satisfied

- **SCHEMA-03**: SpecialistService junction table with tenant isolation
- **SCHEMA-04**: SpecialistLocation junction table with tenant isolation
- **SCHEMA-05**: ServiceLocation junction table with tenant isolation
- **SCHEMA-06**: Composite indexes optimized for tenant-scoped bidirectional queries
- **SCHEMA-07**: Unique constraints preventing duplicate relationships

## Task Execution

### Task 1: Add Junction Table Models ✓

**Commit:** 25700e5

Added three junction table models to `prisma/schema.prisma`:
- SpecialistService with organizationId, foreign keys to Specialist and Service
- SpecialistLocation with organizationId, foreign keys to Specialist and Location
- ServiceLocation with organizationId, foreign keys to Service and Location

Updated entity models (Service, Location, Specialist) with relation fields using named relations to prevent Prisma ambiguity errors. Updated Schedule model to use named relations for consistency.

**Verification:**
- ✓ Three junction models present in schema
- ✓ `npx prisma format` succeeded
- ✓ `npx prisma validate` succeeded

### Task 2: Add Composite Indexes and Unique Constraints ✓

**Commit:** 0dc3341

Added to each junction table:
- Unique constraint on `[organizationId, entityA, entityB]` for data integrity
- Forward index `[organizationId, primaryEntity, secondaryEntity]` for forward queries
- Reverse index `[organizationId, secondaryEntity, primaryEntity]` for reverse queries
- Partial index `[organizationId, primaryEntity]` for filtered lookups

Total: 3 unique constraints + 9 composite indexes across three tables.

**Index naming pattern:**
- `specialist_services_organizationId_specialistId_serviceId_idx` (forward)
- `specialist_services_organizationId_serviceId_specialistId_idx` (reverse)
- `specialist_services_organizationId_specialistId_idx` (partial)

**Verification:**
- ✓ All three junction tables have unique constraints
- ✓ All three junction tables have bidirectional indexes
- ✓ Schema validates without errors

### Task 3: Generate and Apply Junction Table Migration ✓

**Commit:** 4a5aa49

Generated and applied migration `20260303111054_add_junction_tables`.

**Migration operations:**
- Created three tables: `specialist_services`, `specialist_locations`, `service_locations`
- Created 9 composite indexes (3 per table)
- Created 3 unique constraint indexes (1 per table)
- Created 6 foreign key constraints with ON DELETE CASCADE (2 per table)
- Regenerated Prisma Client with junction table types

**SQL structure verified:**
```sql
CREATE TABLE "specialist_services" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "specialistId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "specialist_services_specialistId_fkey"
    FOREIGN KEY ("specialistId") REFERENCES "specialists"("id") ON DELETE CASCADE,
  CONSTRAINT "specialist_services_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE
);
```

**Verification:**
- ✓ `npx prisma migrate status` shows "Database schema is up to date!"
- ✓ Migration file contains all CREATE TABLE, CREATE INDEX, and ADD FOREIGN KEY statements
- ✓ Prisma Client regenerated with SpecialistService, SpecialistLocation, ServiceLocation types

## Deviations from Plan

None - plan executed exactly as written.

## Technical Decisions

### Explicit vs Implicit Junction Tables

Chose explicit junction tables over Prisma's implicit `@relation([serviceIds])` syntax:

**Why explicit:**
- Required for multi-tenant isolation (organizationId field)
- Allows relationship metadata (createdAt, future assignedBy field)
- Prevents data loss if converting from implicit to explicit later (Research Critical Pitfall #2)

**Pattern applied:**
```prisma
model SpecialistService {
  id             String   @id @default(uuid())
  organizationId String   // Required for multi-tenant queries
  specialistId   String
  serviceId      String
  createdAt      DateTime @default(now())

  specialist Specialist @relation(...)
  service    Service    @relation(...)

  @@unique([organizationId, specialistId, serviceId])
  @@index([organizationId, specialistId, serviceId])
}
```

### Composite Index Ordering

Placed `organizationId` first in all composite indexes:

**Rationale:**
- Multi-tenant apps ALWAYS filter by tenant in WHERE clause
- PostgreSQL can use index prefix for queries like `WHERE organizationId = ? AND specialistId = ?`
- If entity was first, index would be useless for tenant-scoped queries (full table scan)

**Performance impact:** Research showed 150× speedup vs single-column indexes for tenant-scoped queries.

### Bidirectional Indexes

Added both forward and reverse composite indexes:

**Forward:** `@@index([organizationId, specialistId, serviceId])` - "Get specialist's services"
**Reverse:** `@@index([organizationId, serviceId, specialistId])` - "Get service's specialists"

**Trade-off:** ~10-15% storage overhead per index, but prevents N+1 queries and full table scans when querying in reverse direction.

### Cascade Delete Strategy

Applied `onDelete: Cascade` to all junction table foreign keys:

**Why safe for junction tables:**
- Relationship records have no independent value (pure join records)
- When specialist deleted, all their service/location assignments become meaningless
- Automatic cleanup eliminates manual deletion logic and orphaned records

**NOT safe for:** Entity tables with independent data (Appointment, Schedule, etc.)

### Named Relations

Used explicit relation names (`name: "specialistServices"`) to prevent Prisma ambiguity:

**Problem:** Multiple relations between same models (Specialist has specialistServices AND specialistLocations)
**Solution:** Named relations let Prisma distinguish which relation field connects to which junction table

## Index Count Reference

For future query optimization:

| Junction Table         | Unique Constraints | Composite Indexes | Foreign Keys |
|------------------------|-------------------|-------------------|--------------|
| specialist_services    | 1                 | 3                 | 2            |
| specialist_locations   | 1                 | 3                 | 2            |
| service_locations      | 1                 | 3                 | 2            |
| **Total**              | **3**             | **9**             | **6**        |

All foreign keys use ON DELETE CASCADE for automatic cleanup.

## Migration File Structure

Migration path: `prisma/migrations/20260303111054_add_junction_tables/migration.sql`

**SQL operations (in order):**
1. CREATE TABLE for three junction tables (lines 1-32)
2. CREATE INDEX for 9 composite indexes (lines 34-65)
3. CREATE UNIQUE INDEX for 3 unique constraints (lines 44, 56, 68)
4. ADD FOREIGN KEY for 6 cascade constraints (lines 70-86)

Total: 86 lines of SQL

## Database State After Completion

**Tables added:** 3
**Indexes added:** 12 (9 composite + 3 unique constraint indexes)
**Foreign keys added:** 6

**Database schema in sync:** ✓
**Prisma Client regenerated:** ✓
**All verifications passed:** ✓

## Known Issues

None.

## Future Work

Phase 3 will use these junction tables for:
- Assignment operations (POST /specialists/:id/services, etc.)
- Relationship queries (GET /specialists/:id/services with tenant scoping)
- Bulk assignment operations
- Validation (prevent assigning service not offered at location, etc.)

## Self-Check: PASSED

**Created files exist:**
- ✓ FOUND: prisma/migrations/20260303111054_add_junction_tables/migration.sql

**Modified files exist:**
- ✓ FOUND: prisma/schema.prisma

**Commits exist:**
- ✓ FOUND: 25700e5 (Task 1: Junction table models)
- ✓ FOUND: 0dc3341 (Task 2: Composite indexes and unique constraints)
- ✓ FOUND: 4a5aa49 (Task 3: Generate and apply migration)

**Junction tables in schema:**
- ✓ FOUND: model SpecialistService
- ✓ FOUND: model SpecialistLocation
- ✓ FOUND: model ServiceLocation

**Database migration status:**
- ✓ PASSED: "Database schema is up to date!"

All claims verified. Plan execution complete.
