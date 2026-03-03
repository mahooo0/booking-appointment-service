# Booking Appointment Service - Flexible Relationships

## What This Is

A NestJS microservice for managing booking appointments with flexible many-to-many relationships between Specialists (workers), Services (with subservices), Locations (company points), and Schedules. Part of the 4FRENDS-BACK microservices architecture supporting multi-tenant company-based isolation.

## Core Value

All relationships must be optional and many-to-many. No rigid chains. All entities must be able to exist independently and be connected flexibly without automatic implicit bindings.

## Requirements

### Validated

- ✓ Service model with hierarchical structure (parentServiceId for subservices) — existing
- ✓ Location model exists — existing
- ✓ Multi-tenant company isolation via companyId — existing

### Active

- [ ] Create Service without assigning Specialist or Location
- [ ] Create Specialist without assigning Services or Locations
- [ ] Assign Service to Specialist
- [ ] Assign Service to Location
- [ ] Assign Specialist to Location
- [ ] Assign Service to Specialist in a specific Location
- [ ] Get all Services available at a Location
- [ ] Get all Specialists working at a Location
- [ ] Get all Services provided by Specialist
- [ ] Get schedule per Location grouped by Specialist
- [ ] Specialist model with full profile (avatar, firstName, lastName, email, phone, description, isTopMaster)
- [ ] Schedule model supporting multiple intervals per day with day-off capability
- [ ] Many-to-many relationship: Specialists ↔ Services
- [ ] Many-to-many relationship: Specialists ↔ Locations
- [ ] Many-to-many relationship: Services ↔ Locations
- [ ] Efficient queries with proper indexes (companyId, specialistId, locationId, serviceId)
- [ ] DTO validation following existing patterns
- [ ] REST endpoints following repository/service/controller pattern
- [ ] Schedule management: single day update, bulk update, recurring weekly logic

### Out of Scope

- Rigid foreign key chains that enforce automatic bindings — breaks flexibility requirement
- Automatic location/specialist assignment on service creation — must be explicit
- Single-location specialists — must support multiple locations
- Single-service specialists — must support multiple services
- Frontend implementation — backend only

## Context

**Technical Environment:**
- NestJS microservice architecture
- Prisma ORM for database management
- PostgreSQL database
- Multi-tenant with strict company-based isolation
- Existing patterns: Module structure, DTO validation with class-validator, Guards, Repository/Service/Controller layers

**Current State:**
- Service model exists with subservice tree (parentServiceId)
- Location (Point) model exists
- Need to extend with flexible relationship support
- Need to add Specialist and Schedule models

**Known Requirements:**
- All relationships must be company-scoped for tenant isolation
- No circular dependencies in relationships
- Support for complex queries (specialists by location, services by specialist, etc.)
- Schedule intervals stored as JSON array with time ranges
- isTopMaster flag for featured specialists

## Constraints

- **Multi-tenant Safety**: Strict company isolation on all queries and mutations — all entities scoped by companyId
- **Tech Stack**: NestJS + Prisma + PostgreSQL — must follow existing patterns
- **Backward Compatibility**: Existing subservice tree must remain compatible — cannot break parentServiceId logic
- **Architecture Pattern**: Repository/Service/Controller separation — maintain existing module structure
- **No Implicit Bindings**: All relationships must be explicitly controlled — no automatic cascades or defaults

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Junction tables for many-to-many relationships | Explicit relationship control with company scoping, supports additional metadata | — Pending |
| Schedule as independent entity with specialist+location keys | Allows flexible scheduling per specialist per location | — Pending |
| JSON array for schedule intervals | Prisma JSON type supports multiple time ranges per day without additional tables | — Pending |

---
*Last updated: 2026-03-03 after initialization*
