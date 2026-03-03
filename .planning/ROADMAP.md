# Roadmap: Booking Appointment Service - Flexible Relationships Refactor

**Project:** Booking Appointment Service
**Core Value:** Flexible, optional many-to-many relationships without rigid chains
**Total Phases:** 4
**Created:** 2026-03-03

## Phases

- [ ] **Phase 1: Foundation & Schema** - Database schema with junction tables and multi-tenant infrastructure
- [ ] **Phase 2: Core Entities** - Specialist, Service, and Location CRUD operations
- [ ] **Phase 3: Relationships & Querying** - Relationship assignment and complex queries
- [ ] **Phase 4: Scheduling** - Schedule management with specialist-location pairing

## Phase Details

### Phase 1: Foundation & Schema
**Goal**: Database schema and multi-tenant infrastructure are in place with all junction tables properly configured

**Depends on**: Nothing (foundation phase)

**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05, SCHEMA-06, SCHEMA-07, TENANT-01, TENANT-02, TENANT-03, TENANT-04

**Success Criteria** (what must be TRUE):
1. Specialist table exists with profile fields (avatar, firstName, lastName, email, phone, description, isTopMaster) and organizationId
2. Schedule table exists with specialist-location keys (specialistId, locationId, dayOfWeek, intervals JSON, isDayOff)
3. All three junction tables exist (SpecialistService, SpecialistLocation, ServiceLocation) with organizationId fields
4. Composite indexes are created on [organizationId, foreignKey1, foreignKey2] for all junction tables
5. All queries automatically filter by organizationId via repository pattern (no cross-tenant data leaks possible)

**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md - Core entity models (Service, Location, Specialist, Schedule)
- [ ] 01-02-PLAN.md - Junction tables with indexes and constraints
- [ ] 01-03-PLAN.md - Repository infrastructure and validation helpers

---

### Phase 2: Core Entities
**Goal**: Users can create and manage specialists, services, and locations independently without forced relationships

**Depends on**: Phase 1 (requires database schema)

**Requirements**: SPEC-01, SPEC-02, SPEC-03, SPEC-04, SPEC-05, SERV-01, SERV-02, LOC-01, API-01, API-04, API-05

**Success Criteria** (what must be TRUE):
1. User can create specialist with full profile (avatar, name, email, phone, description, isTopMaster) without assigning services or locations
2. User can update specialist profile fields and delete specialist (with proper relationship cascade handling)
3. User can list all specialists for their company with pagination and retrieve individual specialist details
4. User can create service without automatic location/specialist assignment (validates existing subservice tree compatibility)
5. All entity operations validate organizationId ownership and return properly typed DTOs

**Plans**: TBD

---

### Phase 3: Relationships & Querying
**Goal**: Users can flexibly assign and query relationships between specialists, services, and locations

**Depends on**: Phase 2 (requires entities to exist)

**Requirements**: REL-01, REL-02, REL-03, REL-04, REL-05, REL-06, REL-07, QUERY-01, QUERY-02, QUERY-03, QUERY-04, QUERY-05, QUERY-06, API-02

**Success Criteria** (what must be TRUE):
1. User can assign and unassign services to specialists, specialists to locations, and services to locations (all combinations)
2. User can assign service to specialist at specific location (validates both relationships exist)
3. User can query all services available at a location, all specialists working at a location, and all services provided by a specialist
4. User can perform intersection queries (services at location filtered by specialist availability)
5. All relationship operations validate that entities belong to the same company before creating links (no cross-tenant relationships)

**Plans**: TBD

---

### Phase 4: Scheduling
**Goal**: Users can manage specialist availability schedules per location with weekly recurring patterns

**Depends on**: Phase 3 (requires specialist-location relationships)

**Requirements**: SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05, SCHED-06, API-03

**Success Criteria** (what must be TRUE):
1. User can create schedule for specialist at specific location with multiple time intervals per day
2. User can update schedule for individual weekday or perform bulk updates across multiple days
3. User can mark days as day-off using isDayOff flag
4. User can retrieve schedule by specialist and location, grouped appropriately for display
5. User can apply recurring weekly patterns (copy schedule template across weeks)

**Plans**: TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Schema | 0/TBD | Not started | - |
| 2. Core Entities | 0/TBD | Not started | - |
| 3. Relationships & Querying | 0/TBD | Not started | - |
| 4. Scheduling | 0/TBD | Not started | - |

## Coverage Validation

**Total v1 requirements:** 44
**Mapped to phases:** 44
**Unmapped:** 0 ✓

### Requirement Distribution

- **Phase 1**: 11 requirements (SCHEMA-01 to SCHEMA-07, TENANT-01 to TENANT-04)
- **Phase 2**: 11 requirements (SPEC-01 to SPEC-05, SERV-01, SERV-02, LOC-01, API-01, API-04, API-05)
- **Phase 3**: 16 requirements (REL-01 to REL-07, QUERY-01 to QUERY-06, API-02)
- **Phase 4**: 7 requirements (SCHED-01 to SCHED-06, API-03)

All requirements have been mapped to exactly one phase.

## Dependencies

```
Phase 1 (Foundation)
    ↓
Phase 2 (Entities)
    ↓
Phase 3 (Relationships)
    ↓
Phase 4 (Scheduling)
```

Linear dependency chain reflects architectural constraints:
- Cannot create relationships without entities (Phase 2 → Phase 3)
- Cannot create schedules without specialist-location relationships (Phase 3 → Phase 4)
- Everything requires multi-tenant foundation (Phase 1 → all)

## Research Context

Research findings from `/Users/muhemmedibrahimov/work/4f/4FRENDS-BACK/booking-appointment-service/.planning/research/SUMMARY.md` informed phase structure:

- **Explicit junction tables** (Phase 1): Prevents implicit-to-explicit migration data loss (Critical Pitfall #4)
- **organizationId on all junction tables** (Phase 1): Prevents cross-tenant data leaks (Critical Pitfall #1)
- **Repository pattern** (Phase 2): Centralizes tenant filtering, already established in codebase
- **relationLoadStrategy: 'join'** (Phase 3): Prevents N+1 query explosions (Critical Pitfall #3)
- **Schedule as specialist-location entity** (Phase 4): Avoids single global schedule anti-pattern

## Next Steps

1. Review and approve this roadmap structure
2. Run `/gsd:plan-phase 1` to create detailed implementation plan for Foundation & Schema
3. Execute plans sequentially, completing all Phase 1 work before moving to Phase 2

---
*Roadmap created: 2026-03-03*
*Last updated: 2026-03-03*
