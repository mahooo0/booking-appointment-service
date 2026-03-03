# Stack Research: Flexible Many-to-Many Relationships in NestJS with Prisma

**Project:** Booking Appointment Service - Flexible Relationships
**Researched:** 2026-03-03
**Confidence:** HIGH

## Executive Summary

Standard 2026 approach for flexible many-to-many relationships in NestJS with Prisma involves **explicit junction tables** with composite indexes, repository pattern for data access, and multi-tenant filtering via Prisma Client Extensions or manual WHERE clause injection. Implicit many-to-many is only suitable when no relationship metadata is needed.

For multi-tenant booking systems requiring specialists-services-locations flexibility:
- Use explicit junction tables for full control and metadata storage
- Apply composite indexes on [companyId, foreignKey1, foreignKey2]
- Implement repository pattern (already established in codebase)
- Use Prisma's relationLoadStrategy='join' for optimal query performance
- Apply manual companyId filtering in all queries (simpler than Row Level Security for single-service architecture)

## Recommended Stack

### Core Relationship Pattern

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Explicit Many-to-Many** | Prisma 5.x+ | Junction tables with metadata | Required for relationship timestamps, user attribution, and future extensibility. Provides full control over relationship lifecycle. |
| **Composite Indexes** | PostgreSQL 14+ | Multi-column indexes on junction tables | 150× faster than single-column indexes for tenant-scoped queries. Use @@index([companyId, foreignKey1, foreignKey2]) pattern. |
| **Repository Pattern** | NestJS Standard | Data access layer abstraction | Already established in codebase. Centralizes query logic, tenant filtering, and transaction handling. |
| **Manual Tenant Filtering** | Prisma Client | WHERE clause injection in repositories | Simpler than Row Level Security for single-service architecture. No transaction overhead. Explicit control. |

### Query Optimization Features

| Feature | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **relationLoadStrategy** | Prisma 5.9.0+ | Choose join vs query strategy | Use 'join' (default) for complex filtered queries. Use 'query' for scenarios with N+1 issues or limited DB resources. Requires previewFeatures = ["relationJoins"]. |
| **select over include** | Prisma 5.x+ | Fetch only required fields | Default to select for performance. Reduces payload size and memory usage. Use include only when all fields needed. |
| **@@unique constraints** | Prisma Core | Prevent duplicate relationships | Apply @@unique([companyId, entityId1, entityId2]) on all junction tables to prevent duplicate assignments. |

### Multi-Tenant Safety Pattern

| Pattern | Approach | Confidence | Rationale |
|---------|----------|------------|-----------|
| **Manual Filtering** | Inject companyId in all WHERE clauses | **HIGH** | Direct, explicit, no magic. Already proven in existing repositories. Zero performance overhead. |
| **Prisma Client Extensions** | Middleware with automatic filtering | MEDIUM | Cleaner but adds complexity. Preview feature requires careful testing. Transaction overhead per query. |
| **PostgreSQL RLS** | Database-level row security | MEDIUM | Strongest isolation but requires DB expertise, policy management, and adds query latency. Overkill for single-service architecture. |

**Recommendation:** Stick with **manual filtering** pattern already established in codebase. Extend existing repositories with companyId-aware junction table queries.

## Detailed Analysis

### 1. Explicit vs Implicit Many-to-Many

#### Explicit Junction Tables (RECOMMENDED)

**Use when:**
- Relationship needs metadata (assignedAt, assignedBy, priority, status)
- Multi-tenant scoping required (companyId must be on junction table)
- Need audit trail or soft deletes on relationships
- Future extensibility is likely

**Schema Pattern:**
```prisma
model SpecialistService {
  id           String    @id @default(uuid())
  companyId    String
  specialistId String
  serviceId    String
  assignedAt   DateTime  @default(now())
  assignedBy   String?
  isActive     Boolean   @default(true)

  specialist   Specialist @relation(fields: [specialistId], references: [id], onDelete: Cascade)
  service      Service    @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@unique([companyId, specialistId, serviceId])
  @@index([companyId, specialistId])
  @@index([companyId, serviceId])
  @@map("specialist_services")
}
```

**Query Pattern:**
```typescript
// Find services for specialist
const services = await prisma.service.findMany({
  where: {
    companyId,
    specialistServices: {
      some: {
        specialistId,
        companyId, // Redundant but enforces tenant isolation
        isActive: true,
      },
    },
  },
  relationLoadStrategy: 'join', // Optimal for filtered queries
});
```

**Performance Characteristics:**
- Composite index lookup: O(log n) on [companyId, specialistId]
- Prevents N+1 queries with proper include/select
- 150× faster with proper indexing vs unindexed foreign keys

**Confidence:** HIGH (verified from [Prisma official docs](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/many-to-many-relations) and [LogRocket indexing guide](https://blog.logrocket.com/how-configure-indexes-prisma/))

#### Implicit Many-to-Many (NOT RECOMMENDED)

**Why avoid:**
- Cannot store companyId on relation table (Prisma manages it internally)
- No relationship metadata support
- Less flexible for future requirements
- Not suitable for multi-tenant isolation at relationship level

**Only use when:**
- Simple tag-like associations with no metadata
- Single-tenant systems
- No audit requirements

**Confidence:** HIGH (verified from [Prisma many-to-many troubleshooting](https://www.prisma.io/docs/orm/more/help-and-troubleshooting/working-with-many-to-many-relations))

### 2. Multi-Tenant Isolation Patterns

#### Pattern A: Manual WHERE Clause Filtering (RECOMMENDED)

**Implementation:**
```typescript
// In repository
async findServicesBySpecialist(companyId: string, specialistId: string) {
  return this.prisma.service.findMany({
    where: {
      companyId, // Always filter by tenant
      specialistServices: {
        some: {
          specialistId,
          companyId, // Also on junction table
          isActive: true,
        },
      },
    },
  });
}
```

**Advantages:**
- Explicit and traceable
- No magic or hidden behavior
- Zero performance overhead
- Easy to audit in code reviews
- Already proven in existing AppointmentRepository

**Disadvantages:**
- Manual enforcement required
- Potential for developer error (forgetting companyId)
- More verbose

**Mitigation:** Use TypeScript helper types and repository base classes to enforce companyId parameter.

**Confidence:** HIGH (existing pattern in codebase, proven in production)

#### Pattern B: Prisma Client Extensions with Middleware (OPTIONAL)

**Implementation:**
```typescript
// Create tenant-scoped client
const prismaForCompany = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ operation, model, args, query }) {
        if (['findMany', 'findFirst', 'update', 'delete'].includes(operation)) {
          args.where = { ...args.where, companyId: currentCompanyId };
        }
        if (['create', 'update'].includes(operation)) {
          args.data = { ...args.data, companyId: currentCompanyId };
        }
        return query(args);
      },
    },
  },
});
```

**Advantages:**
- Automatic filtering - can't forget companyId
- Cleaner service code
- Centralized tenant logic

**Disadvantages:**
- Still in preview (as of Prisma 5.x)
- Requires careful testing with transactions
- Context management complexity (AsyncLocalStorage needed)
- Adds abstraction layer that can obscure query intent

**When to consider:** If codebase grows significantly and manual filtering becomes error-prone.

**Confidence:** MEDIUM (verified from [Prisma Client Extensions blog](https://www.prisma.io/blog/client-extensions-preview-8t3w27xkrxxn), but marked as preview feature)

#### Pattern C: PostgreSQL Row Level Security (NOT RECOMMENDED)

**Why avoid:**
- Requires PostgreSQL expertise for policy management
- Adds query latency (set_config per transaction)
- Complex debugging when policies misbehave
- Overkill for single-service architecture
- Migrations become more complex

**When to consider:** Multi-database tenant isolation (database-per-tenant) or extreme security requirements.

**Confidence:** MEDIUM (verified from web search results on [PostgreSQL RLS with Prisma](https://medium.com/@francolabuschagne90/securing-multi-tenant-applications-using-row-level-security-in-postgresql-with-prisma-orm-4237f4d4bd35))

### 3. Query Optimization Patterns

#### Composite Index Strategy

**Critical indexes for junction tables:**
```prisma
model SpecialistService {
  // ... fields ...

  @@unique([companyId, specialistId, serviceId]) // Prevents duplicates
  @@index([companyId, specialistId])             // Query: services by specialist
  @@index([companyId, serviceId])                // Query: specialists by service
  @@index([companyId, specialistId, serviceId])  // Optional: if querying specific relationship
  @@map("specialist_services")
}
```

**Index design rules:**
1. **Always companyId first** - tenant isolation is primary filter
2. **Equality fields before range fields** - PostgreSQL B-tree optimization
3. **Match query patterns** - index should align with WHERE clause order
4. **Avoid over-indexing** - each index adds write overhead

**Performance impact:**
- Composite index: O(log n) lookup
- Single index: O(n) scan on second field
- No index: O(n) full table scan
- **Result:** 150× speedup for filtered queries

**Confidence:** HIGH (verified from [StackInsight empirical study](https://stackinsight.dev/blog/missing-index-empirical-study) and [Prisma indexing blog](https://www.prisma.io/blog/improving-query-performance-using-indexes-1-zuLNZwBkuL))

#### relationLoadStrategy (Prisma 5.9.0+)

**Enable in schema:**
```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["relationJoins"]
}
```

**Usage:**
```typescript
// Default: database-level JOIN (optimal for most cases)
const specialists = await prisma.specialist.findMany({
  where: { companyId },
  include: {
    specialistServices: {
      include: { service: true },
    },
  },
  relationLoadStrategy: 'join', // Explicit (though it's default)
});

// Alternative: application-level joins (for N+1 edge cases)
const specialists = await prisma.specialist.findMany({
  where: { companyId },
  include: { specialistServices: true },
  relationLoadStrategy: 'query', // Multiple SELECT queries
});
```

**When to use 'join' (default):**
- Complex WHERE filters on related tables
- Pagination with OFFSET/LIMIT
- Database has sufficient resources
- Need consistent transaction view

**When to use 'query':**
- N+1 query issues not resolved by joins
- Large result sets with deep nesting
- Database connection pool is constrained
- Application servers can handle merge logic

**Confidence:** HIGH (verified from [Prisma relationLoadStrategy blog](https://www.prisma.io/blog/prisma-orm-now-lets-you-choose-the-best-join-strategy-preview))

#### select vs include Performance

**Rule:** Default to `select`, use `include` only when all fields needed.

```typescript
// Optimal: fetch only needed fields
const specialists = await prisma.specialist.findMany({
  where: { companyId },
  select: {
    id: true,
    firstName: true,
    lastName: true,
    specialistServices: {
      select: {
        service: {
          select: { id: true, name: true },
        },
      },
    },
  },
});

// Avoid: over-fetching with include
const specialists = await prisma.specialist.findMany({
  where: { companyId },
  include: { specialistServices: { include: { service: true } } },
});
```

**Benefits:**
- Reduced memory usage
- Smaller payload size
- Faster serialization
- Lower network bandwidth

**Confidence:** HIGH (verified from [Jottup optimization guide](https://jottup.com/nodejs/optimize-queries-with-prisma-using-include-select-effectively))

### 4. Repository Pattern Integration

**Existing pattern in codebase:**
```typescript
@Injectable()
export class AppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: { where?: Prisma.AppointmentWhereInput; ... }) {
    // Pattern: inject where clauses, handle pagination, include relations
  }
}
```

**Extend for junction tables:**
```typescript
@Injectable()
export class SpecialistServiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async assignServiceToSpecialist(
    companyId: string,
    specialistId: string,
    serviceId: string,
    assignedBy: string,
  ) {
    return this.prisma.specialistService.create({
      data: {
        companyId,
        specialistId,
        serviceId,
        assignedBy,
      },
    });
  }

  async findServicesBySpecialist(companyId: string, specialistId: string) {
    return this.prisma.service.findMany({
      where: {
        companyId,
        specialistServices: {
          some: {
            specialistId,
            companyId,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        // ... other fields
      },
    });
  }

  async findSpecialistsByService(companyId: string, serviceId: string) {
    return this.prisma.specialist.findMany({
      where: {
        companyId,
        specialistServices: {
          some: {
            serviceId,
            companyId,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        isTopMaster: true,
      },
    });
  }

  async removeServiceFromSpecialist(
    companyId: string,
    specialistId: string,
    serviceId: string,
  ) {
    // Soft delete pattern
    return this.prisma.specialistService.updateMany({
      where: {
        companyId,
        specialistId,
        serviceId,
      },
      data: {
        isActive: false,
      },
    });
  }
}
```

**Pattern benefits:**
- Consistent with existing codebase
- Centralizes multi-tenant filtering
- Enables transaction coordination
- Simplifies testing (mock repository)

**Confidence:** HIGH (pattern already proven in existing AppointmentRepository)

## Installation

```bash
# Core (already installed)
# No new dependencies required - using existing Prisma 5.x

# If using relationLoadStrategy (optional):
# Update prisma/schema.prisma:
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["relationJoins"]
  output   = "./__generated__"
}

# Then regenerate client
npx prisma generate
```

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Implicit Many-to-Many** | Cannot store companyId on relation table, no metadata support, inflexible | Explicit junction tables with full control |
| **CASCADE on foreign keys to user data** | Can accidentally delete data across tenant boundaries | Manual cascade with companyId checks or soft deletes |
| **@@id([field1, field2]) without companyId** | Creates unique constraint without tenant scoping | @@unique([companyId, field1, field2]) |
| **Single-column indexes on junction tables** | 150× slower for tenant-filtered queries | Composite indexes starting with companyId |
| **Generic repository base class** | Prisma's generated types are model-specific, generics lose type safety | Model-specific repositories with shared helper functions |
| **Row Level Security (for now)** | Overengineered for single-service architecture, adds complexity and latency | Manual WHERE clause filtering in repositories |

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Explicit junction tables | Implicit many-to-many | Never for this project (multi-tenant metadata required) |
| Manual WHERE filtering | Prisma Client Extensions | If codebase grows large and manual filtering becomes error-prone |
| Manual WHERE filtering | PostgreSQL RLS | If migrating to database-per-tenant or extreme security compliance required |
| Repository pattern | Direct PrismaClient in services | Never for this project (pattern already established) |
| relationLoadStrategy: 'join' | relationLoadStrategy: 'query' | If profiling reveals N+1 issues or DB connection constraints |

## Migration Strategy

**For existing implicit many-to-many (if any):**
1. Create explicit junction table model in schema
2. Add @@unique([companyId, entity1Id, entity2Id]) constraint
3. Add composite indexes per query patterns
4. Write data migration script to populate junction table
5. Update repositories to query via junction table
6. Test thoroughly with companyId isolation
7. Remove implicit relation from schema
8. Deploy with backward-compatible API

## Version Compatibility

| Package | Current Version | Compatibility Notes |
|---------|----------------|---------------------|
| Prisma | 5.x+ | relationLoadStrategy requires 5.9.0+, previewFeatures flag required |
| PostgreSQL | 14+ | Composite indexes fully supported, RLS available if needed later |
| NestJS | 10.x+ | No specific requirements, works with standard DI pattern |
| @prisma/client | 5.x+ | Generated client must match schema version |

## Stack Patterns by Use Case

**If query patterns show N+1 issues:**
- Enable relationLoadStrategy: 'query' for specific queries
- Profile with Prisma query logs to identify problematic patterns
- Consider batch loading with DataLoader pattern

**If relationship metadata needs expansion:**
- Add fields to junction table (priority, notes, customConfig JSON)
- Update indexes if new fields become query filters
- Version API to maintain backward compatibility

**If tenant count exceeds 10,000:**
- Consider partitioning junction tables by companyId
- Monitor index size and query performance
- Evaluate database-per-tenant architecture

**If strict audit trail required:**
- Add createdAt, updatedAt, deletedAt to all junction tables
- Implement soft delete pattern (isActive flag)
- Store changedBy userId on all mutations

## Open Questions for Phase-Specific Research

- **Schedule model:** JSON array vs separate ScheduleInterval table? (JSON simpler but less queryable)
- **Top master ordering:** Should junction table have priority/order field for featured specialists?
- **Bulk operations:** Transaction pattern for bulk specialist assignment/removal?
- **Caching strategy:** Redis for frequently accessed specialist-service lookups?

## Sources

### HIGH Confidence (Official Documentation)
- [Many-to-many relations | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/many-to-many-relations)
- [Working with many-to-many relations | Prisma Documentation](https://www.prisma.io/docs/orm/more/help-and-troubleshooting/working-with-many-to-many-relations)
- [Prisma ORM Now Lets You Choose the Best Join Strategy](https://www.prisma.io/blog/prisma-orm-now-lets-you-choose-the-best-join-strategy-preview)
- [Indexes | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/indexes)
- [Prisma Client Extensions Preview](https://www.prisma.io/blog/client-extensions-preview-8t3w27xkrxxn)
- [How to use Prisma ORM with NestJS | Prisma Documentation](https://www.prisma.io/docs/guides/frameworks/nestjs)

### MEDIUM Confidence (Community Best Practices, Verified)
- [How to configure indexes in Prisma - LogRocket Blog](https://blog.logrocket.com/how-configure-indexes-prisma/)
- [The Missing Index Crisis - StackInsight Empirical Study](https://stackinsight.dev/blog/missing-index-empirical-study)
- [Optimize Queries with Prisma: Using Include & Select - Jottup](https://jottup.com/nodejs/optimize-queries-with-prisma-using-include-select-effectively)
- [Building REST API with NestJS and Prisma: Relational Data](https://www.prisma.io/blog/nestjs-prisma-relational-data-7D056s1kOabc)
- [Improving query performance with database indexes using Prisma](https://www.prisma.io/blog/improving-query-performance-using-indexes-1-zuLNZwBkuL)

### MEDIUM Confidence (Multi-Tenant Patterns)
- [Multi-tenant applications with NestJS and Prisma - DEV Community](https://dev.to/murilogervasio/how-to-make-multi-tenant-applications-with-nestjs-and-a-prisma-proxy-to-automatically-filter-tenant-queries--4kl2)
- [Securing Multi-Tenant Applications Using RLS in PostgreSQL with Prisma](https://medium.com/@francolabuschagne90/securing-multi-tenant-applications-using-row-level-security-in-postgresql-with-prisma-orm-4237f4d4bd35)
- [Repository pattern with Prisma Discussion](https://github.com/prisma/prisma/discussions/10584)

---
*Stack research for: Booking Appointment Service - Flexible Many-to-Many Relationships*
*Researched: 2026-03-03*
*Confidence: HIGH - Verified with official Prisma docs, existing codebase patterns, and community best practices*
