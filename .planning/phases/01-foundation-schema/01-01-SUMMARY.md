---
phase: 01-foundation-schema
plan: 01
subsystem: database
tags: [prisma, postgresql, schema, multi-tenant]

# Dependency graph
requires:
  - phase: 00-research
    provides: Identified organizationId naming pattern from existing codebase
provides:
  - Service, Location, Specialist, and Schedule Prisma models with multi-tenant isolation
  - Database migration creating four core entity tables
  - Prisma Client types for all new models
  - Foundation for junction table relationships in Plan 02
affects: [01-02-junction-tables, 02-core-entities, 03-relationships-querying]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Multi-tenant isolation via organizationId field on all models"
    - "JSON column for flexible schedule intervals (1-5 time slots per day)"
    - "Cascade deletes on foreign keys for automatic cleanup"
    - "Composite unique constraint for preventing duplicate specialist-location-day schedules"

key-files:
  created:
    - prisma/schema.prisma (Service, Location, Specialist, Schedule models)
    - prisma/migrations/20260303110453_add_core_models/migration.sql
  modified:
    - prisma/schema.prisma (added relation from ServiceDuration to Service)

key-decisions:
  - "Used organizationId (not companyId) to match existing Appointment/ServiceDuration models"
  - "Schedule intervals stored as JSON array instead of separate ScheduleInterval table (simpler, covers 95% use cases)"
  - "Applied onDelete: Cascade to Schedule foreign keys for automatic cleanup when specialist/location deleted"

patterns-established:
  - "Tenant field first in all indexes (e.g., [organizationId, email])"
  - "All models use organizationId for multi-tenant isolation"
  - "UUID primary keys with @default(uuid())"
  - "Timestamps (createdAt, updatedAt) on all models"
  - "@@map directives for table names (snake_case plural)"

requirements-completed: [SCHEMA-01, SCHEMA-02]

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 01 Plan 01: Core Entity Schema Summary

**Service, Location, Specialist, and Schedule models established with organizationId tenant isolation and cascade delete relationships**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-03T11:03:02Z
- **Completed:** 2026-03-03T11:05:27Z
- **Tasks:** 3
- **Files modified:** 2 (schema.prisma, migration.sql created)

## Accomplishments
- Added Service and Location base models with tenant isolation
- Added Specialist model with profile fields (avatar, name, email, phone, description, isTopMaster)
- Added Schedule model with specialist-location-day composite unique constraint
- Applied migration creating four database tables with proper indexes and foreign keys
- Established JSON pattern for schedule intervals (flexible 1-5 time slots per day)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Service and Location Models** - `5a904e9` (feat)
2. **Task 2: Add Specialist and Schedule Models** - `9cfe54b` (feat)
3. **Task 3: Generate and Apply Migration** - `b9a544e` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added Service, Location, Specialist, Schedule models with organizationId tenant field
- `prisma/migrations/20260303110453_add_core_models/migration.sql` - Database migration creating services, locations, specialists, schedules tables
- `prisma/__generated__/index.d.ts` - Regenerated Prisma Client with new types (gitignored)

## Decisions Made

**1. Tenant field naming: organizationId vs companyId**
- Used `organizationId` to match existing Appointment and ServiceDuration models
- Avoids breaking changes to existing schema
- Aligns with AccountId decorator that extracts from x-account-id header
- REQUIREMENTS.md uses `companyId` terminology but this is documentation only

**2. Schedule intervals: JSON vs separate table**
- Chose JSON array for intervals instead of ScheduleInterval junction table
- Research (01-RESEARCH.md Pattern 4) shows this covers 95% of use cases
- Simpler queries, atomic updates, less join complexity
- Pattern: `[{startTime: "HH:MM", endTime: "HH:MM"}, ...]`

**3. Foreign key cascade behavior**
- Applied `onDelete: Cascade` to Schedule relations with Specialist and Location
- When specialist/location deleted, schedules auto-delete (no orphaned data)
- Research confirms this is safe and prevents manual cleanup logic

**4. Removed junction table relation placeholders**
- Initial implementation included SpecialistService, ServiceLocation, SpecialistLocation relations
- Removed to avoid validation errors (these models created in Plan 02)
- Relations will be added back when junction tables exist

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed forward references to junction tables**
- **Found during:** Task 1 (Service and Location model creation)
- **Issue:** Plan specified relation placeholders for SpecialistService, ServiceLocation, SpecialistLocation but these models don't exist yet, causing Prisma validation errors
- **Fix:** Removed forward relation placeholders from Service and Location models. These will be added in Plan 02 when junction tables are created.
- **Files modified:** prisma/schema.prisma
- **Verification:** `npx prisma format` and `npx prisma validate` both succeeded
- **Committed in:** 5a904e9 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to unblock schema validation. Junction relations will be added in Plan 02 as originally intended. No functional impact.

## Issues Encountered
None - migration applied cleanly to development database.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Four core entity models established with tenant isolation
- Database tables created with proper indexes
- Prisma Client regenerated with Service, Location, Specialist, Schedule types
- Ready for Plan 02: Junction table creation (SpecialistService, SpecialistLocation, ServiceLocation)
- ServiceDuration already has foreign key to Service with cascade delete

## Self-Check

Verifying created files and commits exist:

**Files:**
- ✓ FOUND: prisma/schema.prisma
- ✓ FOUND: prisma/migrations/20260303110453_add_core_models/migration.sql

**Commits:**
- ✓ FOUND: 5a904e9 (Task 1: Add Service and Location Models)
- ✓ FOUND: 9cfe54b (Task 2: Add Specialist and Schedule Models)
- ✓ FOUND: b9a544e (Task 3: Generate and Apply Migration)

**Result:** PASSED - All files and commits verified
