# Project Research Summary

**Project:** Booking Appointment Service - Flexible Many-to-Many Relationships
**Domain:** Multi-tenant booking system with specialist-service-location relationships
**Researched:** 2026-03-03
**Confidence:** HIGH

## Executive Summary

This project requires implementing flexible many-to-many relationships between specialists, services, and locations in a multi-tenant booking system. Industry research shows that modern booking platforms (Acuity, Square Appointments, Vagaro) standardize on explicit junction tables with metadata for audit trails and tenant isolation. The critical architectural decision is using **explicit junction tables with companyId fields** rather than Prisma's implicit many-to-many, which cannot support multi-tenant scoping or relationship metadata.

The recommended technical approach is NestJS with Prisma ORM using explicit junction tables (SpecialistService, SpecialistLocation, ServiceLocation), repository pattern for data access, and manual companyId filtering in all queries. This provides full control over relationships, supports metadata (createdAt, assignedBy, isActive), and maintains tenant isolation without over-engineering. Performance optimization through composite indexes on [companyId, foreignKey1, foreignKey2] delivers 150× speedup vs single-column indexes. The join query strategy (relationLoadStrategy: 'join') prevents N+1 query explosions common in relationship-heavy systems.

The primary risks are cross-tenant data leaks through missing companyId validation in junction tables, ORM leak vulnerabilities via nested query filter injection, and N+1 performance degradation. Mitigation requires defense-in-depth: companyId on all junction tables with compound unique constraints, whitelist-based filter validation rejecting raw user input, and join strategies with composite indexes. Starting with explicit relationships from day one avoids catastrophic implicit-to-explicit migrations that cause production data loss.

## Key Findings

### Recommended Stack

Prisma with explicit junction tables is the industry standard for multi-tenant relationship management. The pattern established in existing codebase (repository pattern with manual tenant filtering) aligns perfectly with research findings. No new dependencies required.

**Core technologies:**
- **Explicit Junction Tables** (Prisma 5.x+): Full control over many-to-many relationships with metadata (createdAt, assignedBy, isActive) and companyId for tenant isolation. Required over implicit relations.
- **Composite Indexes** (PostgreSQL 14+): @@index([companyId, specialistId, serviceId]) delivers 150× performance vs single-column indexes for tenant-scoped queries. Mandatory for production scale.
- **Repository Pattern** (NestJS): Already established in codebase (AppointmentRepository). Centralizes tenant filtering, prevents code duplication, enables testability.
- **Manual Tenant Filtering** (Prisma Client): Explicit WHERE companyId injection in repositories. Simpler and more transparent than Row Level Security or Prisma middleware for single-service architecture.
- **relationLoadStrategy: 'join'** (Prisma 5.9.0+): Database-level JOINs prevent N+1 query problems. Critical for list views with nested relationships.

**Critical version requirements:**
- Prisma 5.9.0+ for relationLoadStrategy (requires previewFeatures = ["relationJoins"])
- PostgreSQL 14+ for composite index optimization
- No new dependencies needed beyond existing stack

### Expected Features

Research across 40+ booking platforms identifies clear feature tiers for multi-location specialist booking systems.

**Must have (table stakes):**
- Multi-tenant company isolation with strict data separation (every query scoped by companyId)
- Basic CRUD for specialist-service, specialist-location, service-location relationships
- Query patterns: specialists by location, services by specialist, services by location
- Individual availability management per specialist-location pair (weekly recurring schedules)
- Conflict detection preventing double-booking (87% fewer scheduling conflicts with automation)
- Explicit assignment operations (no implicit "auto-assign all services to all specialists")

**Should have (competitive advantages):**
- Bulk assignment operations (assign multiple services to specialist in single transaction)
- Schedule templates and recurring patterns (copy weekly schedules)
- Buffer time configuration between appointments (prevents specialist burnout)
- Featured/top specialists flag (isTopMaster) for premium specialist promotion
- Client-requested specialist option vs auto-assignment (high user demand)

**Defer to v2+ (over-engineering for MVP):**
- Skills-based auto-assignment routing (requires skill taxonomy, complex matching algorithm)
- Cross-location resource sharing with travel time (only relevant for mobile specialists)
- Dynamic availability rules engine (most businesses follow simple weekly patterns)
- Real-time availability sync via WebSockets (30-second cache TTL sufficient for booking scenarios)

**Anti-features to avoid:**
- Fully dynamic specialist-owned services (creates fragmentation, duplicate services, SEO issues)
- Automatic implicit bindings (violates flexibility requirement, cleanup harder than explicit assignment)
- Single global schedule per specialist (work hours differ by location)
- Cascading relationship deletions across tenant boundaries (data loss risk)

### Architecture Approach

The standard architecture for many-to-many relationships in multi-tenant NestJS follows a layered pattern: Controller → Service → Repository → PrismaService → Database. Junction tables are first-class Prisma models, not hidden implicit relations. Multi-tenant isolation uses shared database with row-level filtering via companyId on every table.

**Major components:**
1. **Entity Modules** (specialist/, service/, location/) — Domain-specific CRUD operations. Each module contains controller (HTTP), service (business logic), repository (data access), DTOs, and mappers.
2. **Relationships Module** — Centralized junction table management. Exports SpecialistServiceRepository, SpecialistLocationRepository, ServiceLocationRepository. Prevents duplication, provides single source of truth for relationship operations.
3. **Query Services Module (optional)** — Complex read queries spanning multiple entities. Optimizes N+1 problems with relationLoadStrategy: 'join'. Useful for dashboard/overview endpoints like "services at location with specialist counts."
4. **Prisma Service** — Global tenant-aware database client with optional middleware for automatic companyId injection. Manages connection pooling, transaction coordination.
5. **Guards and Decorators** — Extract companyId from JWT claims, store in request context (CLS), enforce tenant isolation at HTTP layer before reaching business logic.

**Key architectural patterns:**
- **Explicit Junction Tables with Metadata:** Every many-to-many uses dedicated model with companyId, createdAt, createdBy, isActive fields. Enables audit trail and soft deletes.
- **Repository Query Builder:** buildWhereClause() methods centralize complex filtering logic, automatically inject companyId, prevent SQL injection and cross-tenant leaks.
- **Relationship Query Service:** Dedicated service for multi-entity joins prevents N+1 queries. Example: getServicesAtLocation() executes single query with nested includes instead of N separate queries.

**Build order dependencies:**
Phase 1 (Prisma Service + Guards) → Phase 2 (Entity Modules) → Phase 3 (Junction Tables + Relationship Repositories) → Phase 4 (Query Services). Cannot build relationships before entities exist. Cannot build queries before relationships exist.

### Critical Pitfalls

1. **Missing companyId in Junction Tables Leading to Cross-Tenant Data Leaks (CRITICAL)** — Developers create junction tables without companyId field, allowing relationships across tenant boundaries. Prevention: ALWAYS include companyId with compound unique constraints @@unique([specialistId, serviceId, companyId]). Validate entity ownership before creating relationships. Add indexes on [companyId, foreignKey]. Recovery cost: HIGH (requires data audit, manual cleanup). Address in Phase 1 (Data Model Design).

2. **ORM Leak Vulnerabilities via Nested Query Filter Injection (CRITICAL)** — Attackers exploit Prisma's flexible nested query syntax to bypass tenant filters. Passing raw user input to where clauses allows crafted filters like { specialists: { some: { services: { some: { id: targetId } } } } } to access other tenants' data. Prevention: NEVER pass raw user input to Prisma where clauses. Whitelist allowed filters. Enforce companyId on ALL nested queries and includes. Use Prisma middleware for automatic tenant filter injection. Recovery cost: HIGH (security incident, requires audit and patch). Address in Phase 1 (API Design) and Phase 2 (Security Hardening).

3. **N+1 Query Explosions with Junction Table Traversals (HIGH)** — Fetching 50 specialists with services and locations creates 150+ database queries (1 for specialists + 50 for specialist-service junctions + 50 for specialist-location junctions + additional for entity details). Response times degrade from milliseconds to seconds. Prevention: Use relationLoadStrategy: 'join' for critical queries. Separate list views (minimal data) from detail views (full includes). Implement data loaders for batch fetching. Add query performance monitoring. Recovery cost: LOW (code change only, no data migration). Address in Phase 2 (Performance Optimization).

4. **Implicit to Explicit Many-to-Many Migration Data Loss (CRITICAL)** — Teams start with implicit relations, then need metadata. Prisma drops old _SpecialistToService table and creates new SpecialistService table, losing all relationships. Prevention: Start with explicit junction tables from day one. If migrating, use 3-step process: create new table alongside old, custom migration script to copy data, verify counts, remove old table. Test on production dump before deploying. Recovery cost: VERY HIGH (requires backup restore). Address in Phase 1 (Data Model Design).

5. **Missing Cascade Delete Configuration Causing Orphaned Junction Records (HIGH)** — Deleting specialist leaves SpecialistService records pointing to non-existent entities. Accumulates database bloat, breaks referential integrity, causes query errors. Prevention: Set onDelete: Cascade on all junction table foreign keys. For soft deletes, explicitly clean up junction records in transaction. Implement scheduled orphan detection jobs. Recovery cost: MEDIUM (database cleanup script). Address in Phase 1 (Data Model Design) and Phase 3 (Data Integrity).

6. **Concurrent Unique Constraint Violations (MEDIUM)** — Two simultaneous requests to create same relationship cause race condition. One succeeds, other returns 500 error. Prevention: Use Prisma upsert (idempotent). Handle P2002 errors gracefully (return success for existing relationship). Implement frontend request deduplication. Use Serializable transaction isolation for bulk operations with retry logic. Recovery cost: LOW (code change). Address in Phase 2 (Concurrent Access Handling).

## Implications for Roadmap

Based on research, the project naturally divides into 5 phases following architectural dependencies.

### Phase 1: Foundation & Data Model Design
**Rationale:** Multi-tenant infrastructure must be correct from the start. Junction tables cannot be retrofitted with companyId without migration risk. All security features depend on proper tenant isolation foundation.

**Delivers:**
- Prisma schema with explicit junction tables (SpecialistService, SpecialistLocation, ServiceLocation)
- Composite indexes on [companyId, foreignKey1, foreignKey2]
- Guards and decorators extracting companyId from JWT
- PrismaService with optional tenant middleware

**Addresses features:**
- Multi-tenant company isolation (table stakes)
- Data model foundation for all relationship operations

**Avoids pitfalls:**
- Pitfall 1: Missing companyId in junction tables
- Pitfall 4: Implicit to explicit migration data loss
- Pitfall 5: Missing cascade delete configuration

**Needs research:** No — stack decisions made, standard Prisma patterns apply. SKIP research-phase.

### Phase 2: Core Entity CRUD
**Rationale:** Junction tables require foreign keys to exist. Must create Specialist, Service, Location entities before relationships. Each entity follows existing repository pattern from AppointmentRepository.

**Delivers:**
- Specialist module (CRUD with companyId filtering)
- Service module (CRUD with hierarchical subservices)
- Location module (CRUD)
- Repository layer for each entity
- DTOs and validation

**Uses stack elements:**
- Repository pattern (already established in codebase)
- Manual tenant filtering in repositories
- select over include for performance

**Addresses features:**
- Basic CRUD for specialists (with avatar, isTopMaster flag)
- Basic CRUD for services
- Basic CRUD for locations

**Avoids pitfalls:**
- Cross-tenant entity access (validates companyId on all queries)

**Needs research:** No — standard CRUD patterns, well-documented. SKIP research-phase.

### Phase 3: Relationship Management
**Rationale:** Now that entities exist, implement junction table operations. This is the core flexibility requirement from PROJECT.md. Centralize relationship logic in dedicated module to prevent duplication across entity modules.

**Delivers:**
- Relationships module with junction repositories
- SpecialistService assignment/removal operations
- SpecialistLocation assignment/removal operations
- ServiceLocation assignment/removal operations
- Ownership validation (verify entities belong to same company before linking)
- Bulk assignment operations with transaction safety

**Implements architecture components:**
- Junction table repositories
- Relationship services with transaction coordination

**Addresses features:**
- Basic assignment operations (table stakes)
- Unassign/reassign operations (table stakes)
- Bulk assignment operations (competitive advantage)

**Avoids pitfalls:**
- Pitfall 1: Cross-tenant relationships (validates companyId consistency)
- Pitfall 6: Concurrent unique constraints (uses upsert, handles P2002)
- Missing cascade behavior (already configured in Phase 1 schema)

**Needs research:** No — explicit junction patterns well-documented in STACK.md and ARCHITECTURE.md. SKIP research-phase.

### Phase 4: Complex Queries & Performance Optimization
**Rationale:** Relationship operations work, now optimize read paths. Customer-facing queries like "services at location" need optimization to prevent N+1 problems. This phase implements relationLoadStrategy: 'join' and composite index usage.

**Delivers:**
- Query services module (LocationServicesQueryService, SpecialistsByLocationQueryService)
- relationLoadStrategy: 'join' on critical list queries
- Specialists by location endpoint (with service counts)
- Services by location endpoint (with specialist details)
- Services by specialist endpoint
- Query performance monitoring and logging

**Implements architecture components:**
- Relationship Query Service pattern
- Optimized JOIN queries vs N+1 queries

**Addresses features:**
- View specialists at location (table stakes)
- View services by specialist (table stakes)
- View services at location (most critical for customer-facing booking flow)
- Basic search/filtering (table stakes)

**Avoids pitfalls:**
- Pitfall 3: N+1 query explosions (uses join strategy, composite indexes)

**Needs research:** No — performance patterns documented in STACK.md, Prisma official docs comprehensive. SKIP research-phase.

### Phase 5: Scheduling & Availability (Future Phase)
**Rationale:** Schedules depend on specialist-location relationships existing. Weekly recurring patterns are table stakes but defer to separate phase for scope management. Schedule model uses JSON arrays vs separate ScheduleInterval table (simpler, covers 95% of use cases).

**Delivers:**
- Schedule module with per specialist-location schedules
- Weekly recurring availability patterns
- Day-off and exception handling
- Basic conflict detection (check existing bookings before confirming)

**Addresses features:**
- Individual availability management (table stakes)
- Conflict detection (table stakes, 87% fewer overlaps with automation)
- Schedule templates (competitive advantage, can be v1.x)

**Avoids pitfalls:**
- Double-booking via validation
- Single global schedule anti-pattern (uses per-location schedules)

**Needs research:** YES — Schedule model implementation (JSON vs table), conflict detection algorithms, buffer time calculation patterns. RUN research-phase during planning.

### Phase Ordering Rationale

- **Foundation before entities:** Multi-tenant infrastructure must be correct from start. Retrofitting companyId is extremely difficult and risky.
- **Entities before relationships:** Junction tables have foreign key constraints requiring entities to exist first. Cannot link non-existent specialists to services.
- **Relationships before queries:** Complex read queries need junction table data to traverse. Cannot query "services at location" without ServiceLocation records.
- **Queries before scheduling:** Availability queries build on relationship query patterns. Schedule conflict detection needs to check existing specialist-location assignments.
- **Scheduling deferred:** Not a dependency for relationship flexibility. Can be separate phase or even separate project once core relationships work.

### Research Flags

**Phases with standard patterns (skip research-phase):**
- **Phase 1:** Well-documented Prisma patterns, STACK.md comprehensive
- **Phase 2:** Standard CRUD, repository pattern already established in codebase
- **Phase 3:** Explicit junction patterns documented in STACK.md and ARCHITECTURE.md
- **Phase 4:** Performance optimization patterns in official Prisma docs

**Phases needing deeper research:**
- **Phase 5 (Scheduling):** Schedule data model (JSON array vs ScheduleInterval table), conflict detection algorithms, recurring pattern implementation, buffer time calculation. Run /gsd:research-phase when starting Phase 5 planning.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Verified with official Prisma documentation, existing codebase already uses recommended patterns (repository, manual filtering), no new dependencies required |
| Features | **HIGH** | Research spans 40+ industry sources including Acuity, Square, Vagaro, Bookly. Table stakes features validated across all major platforms. Competitive advantages identified from user pain points in community discussions. |
| Architecture | **HIGH** | Standard NestJS + Prisma patterns, proven multi-tenant strategies documented in multiple sources. Explicit junction table approach matches existing AppointmentRepository pattern. No architectural unknowns. |
| Pitfalls | **HIGH** | Critical pitfalls documented from real production incidents (ORM Leak attacks, implicit-to-explicit migration data loss, N+1 explosions). Prevention strategies verified in official Prisma docs and security research. |

**Overall confidence:** HIGH

### Gaps to Address

Research was comprehensive for relationship management and multi-tenant patterns. Minor gaps to handle during implementation:

- **Schedule model specifics:** JSON array structure vs separate ScheduleInterval table. Research shows JSON covers 95% of use cases (weekly recurring patterns with exceptions), but needs validation against PROJECT.md requirements. Address with /gsd:research-phase in Phase 5.
- **Top master ordering:** PROJECT.md mentions isTopMaster flag for featured specialists. Research confirms this is common (Boulevard, Vagaro have priority specialists). Implementation is straightforward (boolean flag + ORDER BY in queries). No additional research needed.
- **Bulk operation transaction strategy:** Research confirms transaction pattern with rollback, but specific error handling for partial failures needs design during Phase 3 implementation. Use Prisma $transaction with Promise.all for parallel inserts.
- **Caching strategy:** Research mentions Redis for frequently accessed relationships but no specific TTL recommendations. Defer caching to post-MVP optimization based on actual query patterns. Monitor with Prisma query logging first.

## Sources

### Primary Sources (HIGH Confidence)

**Stack Research:**
- [Prisma: Many-to-Many Relations](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/many-to-many-relations) — Explicit vs implicit junction tables
- [Prisma: Working with Many-to-Many Relations](https://www.prisma.io/docs/orm/more/help-and-troubleshooting/working-with-many-to-many-relations) — Troubleshooting guide
- [Prisma: relationLoadStrategy](https://www.prisma.io/blog/prisma-orm-now-lets-you-choose-the-best-join-strategy-preview) — Join vs query strategy
- [Prisma: Indexes Documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/indexes) — Composite index patterns
- [Prisma: Client Extensions](https://www.prisma.io/blog/client-extensions-preview-8t3w27xkrxxn) — Middleware for tenant filtering
- [Prisma: NestJS Integration](https://www.prisma.io/docs/guides/frameworks/nestjs) — Official NestJS guide

**Feature Research:**
- [WaitWell Appointment Management](https://waitwellsoftware.com/solutions/appointment-management/) — Booking system features
- [Square Appointments](https://squareup.com/us/en/appointments) — Free booking platform analysis
- [Acuity Scheduling Learn](https://acuityscheduling.com/learn/) — Industry best practices
- [Capterra: Appointment Scheduling Software 2026](https://www.capterra.com/appointment-scheduling-software/) — Platform comparison
- [Pabau: Multi-Location Scheduling Software](https://pabau.com/blog/multi-location-scheduling-software/) — Multi-location patterns
- [Acuity: Avoid Double-Booking](https://acuityscheduling.com/learn/avoid-double-booking-appointments) — Conflict detection

**Architecture Research:**
- [Wanago: NestJS #33 PostgreSQL Relationships with Prisma](https://wanago.io/2021/04/05/api-nestjs-33-postgresql-relationships-prisma/) — Relationship patterns
- [Prisma GitHub: Many-to-Many with Additional Fields (#2429)](https://github.com/prisma/prisma/discussions/2429) — Junction table metadata
- [LogRocket: Configure Indexes in Prisma](https://blog.logrocket.com/how-configure-indexes-prisma/) — Index strategies
- [Prisma: Improving Query Performance with Indexes](https://www.prisma.io/blog/improving-query-performance-using-indexes-1-zuLNZwBkuL) — Performance optimization

**Pitfalls Research:**
- [elttam: ORM Leaking More Than You Joined For](https://www.elttam.com/blog/leaking-more-than-you-joined-for/) — ORM leak attacks
- [elttam: plORMbing Your Prisma ORM](https://www.elttam.com/blog/plorming-your-primsa-orm/) — Time-based attacks
- [Prisma: Implicit to Explicit Conversion](https://www.prisma.io/docs/orm/more/help-and-troubleshooting/implicit-to-explicit-conversion) — Migration guide
- [Prisma: Cascade Deletes Configuration](https://www.prisma.io/docs/guides/database/advanced-database-tasks/cascading-deletes/mysql) — Referential actions
- [Prisma: Transactions Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) — Isolation levels

### Secondary Sources (MEDIUM Confidence)

**Multi-Tenant Patterns:**
- [DEV: Multi-Tenant with NestJS and Prisma](https://dev.to/murilogervasio/how-to-make-multi-tenant-applications-with-nestjs-and-a-prisma-proxy-to-automatically-filter-tenant-queries--4kl2) — Middleware patterns
- [Medium: PostgreSQL RLS with Prisma](https://medium.com/@francolabuschagne90/securing-multi-tenant-applications-using-row-level-security-in-postgresql-with-prisma-orm-4237f4d4bd35) — Row-level security
- [ZenStack: Multi-Tenancy with Prisma](https://zenstack.dev/blog/multi-tenant) — Implementation approaches
- [WorkOS: Tenant Isolation](https://workos.com/blog/tenant-isolation-in-multi-tenant-systems) — Security patterns

**Performance & Optimization:**
- [StackInsight: Missing Index Empirical Study](https://stackinsight.dev/blog/missing-index-empirical-study) — 150× speedup data
- [Furkanbaytekin: N+1 Query Problem with Prisma](https://www.furkanbaytekin.dev/blogs/software/n1-query-problem-fixing-it-with-sql-and-prisma-orm) — N+1 solutions
- [Jottup: Optimize Queries with Include & Select](https://jottup.com/nodejs/optimize-queries-with-prisma-using-include-select-effectively) — select vs include

**Booking Industry Analysis:**
- [ZipDo: Multi-Location Scheduling Software 2026](https://zipdo.co/best/multi-location-scheduling-software/) — Platform comparison
- [The Salon Business: Best Salon Software 2026](https://thesalonbusiness.com/best-salon-software/) — Vertical analysis
- [Koalendar: Calendly vs Acuity](https://koalendar.com/blog/calendly-vs-acuity) — Feature comparison
- [Pabau: Best Practices for Scheduling](https://pabau.com/blog/patient-scheduling-and-appointment-management/) — Industry standards

---
*Research completed: 2026-03-03*
*Ready for roadmap: yes*
