# Requirements: Booking Appointment Service - Flexible Relationships Refactor

**Defined:** 2026-03-03
**Core Value:** Flexible, optional many-to-many relationships without rigid chains

## v1 Requirements

### Database Schema

- [ ] **SCHEMA-01**: Create Specialist table with profile fields (id, companyId, avatar, firstName, lastName, email, phone, description, isTopMaster, timestamps)
- [ ] **SCHEMA-02**: Create Schedule table with specialist+location keys (id, companyId, specialistId, locationId, dayOfWeek, intervals JSON, isDayOff, timestamps)
- [ ] **SCHEMA-03**: Create SpecialistService junction table with companyId scoping (id, companyId, specialistId, serviceId, createdAt)
- [ ] **SCHEMA-04**: Create SpecialistLocation junction table with companyId scoping (id, companyId, specialistId, locationId, createdAt)
- [ ] **SCHEMA-05**: Create ServiceLocation junction table with companyId scoping (id, companyId, serviceId, locationId, createdAt)
- [ ] **SCHEMA-06**: Add composite indexes on all junction tables: [companyId, foreignKey1, foreignKey2]
- [ ] **SCHEMA-07**: Add unique constraints: @@unique([companyId, entityA, entityB]) on all junction tables

### Specialist Management

- [ ] **SPEC-01**: Create specialist without assigning services or locations
- [ ] **SPEC-02**: Update specialist profile (avatar, name, email, phone, description, isTopMaster)
- [ ] **SPEC-03**: Delete specialist (with cascade handling for relationships)
- [ ] **SPEC-04**: List all specialists for company with pagination
- [ ] **SPEC-05**: Get specialist by ID with company scoping

### Service Management Extensions

- [ ] **SERV-01**: Create service without automatic location/specialist assignment (modify existing logic if needed)
- [ ] **SERV-02**: Verify subservice tree compatibility maintained (parentServiceId logic unchanged)

### Location Management Extensions

- [ ] **LOC-01**: Extend Location model to support specialist and service relationships (no breaking changes)

### Relationship Assignment

- [ ] **REL-01**: Assign service to specialist (create SpecialistService record)
- [ ] **REL-02**: Unassign service from specialist (delete SpecialistService record)
- [ ] **REL-03**: Assign specialist to location (create SpecialistLocation record)
- [ ] **REL-04**: Unassign specialist from location (delete SpecialistLocation record)
- [ ] **REL-05**: Assign service to location (create ServiceLocation record)
- [ ] **REL-06**: Unassign service from location (delete ServiceLocation record)
- [ ] **REL-07**: Assign service to specialist at specific location (validate both relationships exist)

### Querying

- [ ] **QUERY-01**: Get all services available at a location (via ServiceLocation + Service)
- [ ] **QUERY-02**: Get all specialists working at a location (via SpecialistLocation + Specialist)
- [ ] **QUERY-03**: Get all services provided by specialist (via SpecialistService + Service)
- [ ] **QUERY-04**: Get all specialists for a service (via SpecialistService + Specialist)
- [ ] **QUERY-05**: Get services available at location filtered by specialist (intersection query)
- [ ] **QUERY-06**: Get schedule for location grouped by specialist (Schedule + Specialist join)

### Schedule Management

- [ ] **SCHED-01**: Create schedule for specialist at location with multiple intervals per day
- [ ] **SCHED-02**: Update schedule for single weekday (dayOfWeek 0-6)
- [ ] **SCHED-03**: Bulk update schedule for multiple days
- [ ] **SCHED-04**: Mark day as day-off (isDayOff flag)
- [ ] **SCHED-05**: Get schedule by specialist and location
- [ ] **SCHED-06**: Apply recurring weekly logic (copy schedule pattern)

### Multi-Tenant Safety

- [ ] **TENANT-01**: All queries filter by companyId automatically (repository pattern)
- [ ] **TENANT-02**: All mutations validate companyId ownership before operating
- [ ] **TENANT-03**: Junction table records always include companyId
- [ ] **TENANT-04**: Prevent cross-tenant relationship creation (validation guards)

### API Layer

- [ ] **API-01**: Specialists module with CRUD endpoints following existing patterns
- [ ] **API-02**: Relationships module with assignment/unassignment endpoints
- [ ] **API-03**: Schedule module with CRUD and bulk update endpoints
- [ ] **API-04**: DTO validation for all inputs using class-validator
- [ ] **API-05**: Response DTOs for all queries with proper typing

## v2 Requirements

### Performance Optimization

- **PERF-01**: Implement caching for specialist-service lookups
- **PERF-02**: Add relationLoadStrategy: 'join' for list queries
- **PERF-03**: Optimize N+1 queries in relationship traversals

### Advanced Features

- **ADV-01**: Bulk assignment operations (assign multiple services to specialist at once)
- **ADV-02**: Schedule templates for quick setup
- **ADV-03**: Conflict detection for overlapping schedules
- **ADV-04**: Availability management with buffer times

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automatic service-to-location binding on creation | Violates flexibility requirement — all assignments must be explicit |
| Rigid foreign key chains | Must maintain optional relationships — no forced connections |
| Global schedules (not location-specific) | Specialists have different hours per location |
| Real-time schedule updates | 30-second cache refresh is sufficient for booking systems |
| Fully dynamic service configuration | Creates fragmentation and discovery issues |
| Cascade deletions without control | Need explicit handling for relationship cleanup |

## Traceability

Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TBD | TBD | Pending |

**Coverage:**
- v1 requirements: 44 total
- Mapped to phases: 0
- Unmapped: 44 ⚠️

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-03 after initial definition*
