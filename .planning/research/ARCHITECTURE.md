# Architecture Research: Many-to-Many Relationships in Multi-Tenant NestJS

**Domain:** Flexible many-to-many relationship management in booking systems
**Researched:** 2026-03-03
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Controller Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Specialist   │  │ Service      │  │ Location     │           │
│  │ Controller   │  │ Controller   │  │ Controller   │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                    │
├─────────┴─────────────────┴─────────────────┴────────────────────┤
│                      Service Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Specialist   │  │ Service      │  │ Location     │           │
│  │ Service      │  │ Service      │  │ Service      │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                    │
│         └─────────────────┼─────────────────┘                    │
│                           │                                      │
│  ┌────────────────────────┴──────────────────────────────┐      │
│  │         Relationship Query Service (Optional)         │      │
│  │  - Specialists by Location                            │      │
│  │  - Services by Specialist                             │      │
│  │  - Services by Location                               │      │
│  │  - Schedules grouped by Specialist + Location         │      │
│  └───────────────────────┬───────────────────────────────┘      │
│                          │                                       │
├──────────────────────────┴───────────────────────────────────────┤
│                   Repository Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Specialist   │  │ Service      │  │ Location     │           │
│  │ Repository   │  │ Repository   │  │ Repository   │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                    │
│         │    ┌────────────┴────────────┐    │                    │
│         │    │ Relationship            │    │                    │
│         └────┤ Repositories:           ├────┘                    │
│              │ - SpecialistServices    │                         │
│              │ - SpecialistLocations   │                         │
│              │ - ServiceLocations      │                         │
│              └────────────┬────────────┘                         │
│                           │                                      │
├───────────────────────────┴──────────────────────────────────────┤
│                     Prisma Service                                │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  - Tenant Context Injection (via CLS)                     │   │
│  │  - Automatic companyId filtering                          │   │
│  │  - Transaction management                                 │   │
│  └───────────────────────────────────────────────────────────┘   │
├───────────────────────────────────────────────────────────────────┤
│                      Database Layer                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │Specialist│  │ Service  │  │ Location │  │ Schedule │         │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │SpecialistService│  │SpecialistLoc.   │  │ServiceLocation  │  │
│  │   (junction)    │  │   (junction)    │  │   (junction)    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Controller** | HTTP request handling, validation orchestration, auth guards | NestJS @Controller with route decorators, DTO validation via class-validator |
| **Service** | Business logic, relationship orchestration, transaction coordination | Injectable class with complex query logic, calls repositories |
| **Repository** | Data access abstraction, Prisma query builder, multi-tenant filtering | Injectable class wrapping PrismaService, builds WHERE clauses |
| **Junction Repository** | Manages explicit many-to-many relationships, handles relationship metadata | Specialized repository for junction tables with composite key queries |
| **Relationship Query Service** | Cross-entity queries (optional but recommended for complex joins) | Aggregates data from multiple repositories, optimizes N+1 problems |
| **Prisma Service** | Database client management, tenant context injection, connection pooling | Extended Prisma client with middleware for automatic tenant filtering |

## Recommended Project Structure

```
src/
├── specialist/
│   ├── specialist.module.ts          # Module registration
│   ├── specialist.controller.ts      # REST endpoints
│   ├── specialist.service.ts         # Business logic
│   ├── repositories/
│   │   └── specialist.repository.ts  # Data access
│   ├── dto/
│   │   ├── create-specialist.dto.ts
│   │   ├── update-specialist.dto.ts
│   │   └── specialist-response.dto.ts
│   └── mappers/
│       └── specialist.mapper.ts      # Entity → DTO transformation
│
├── service/                           # Booking services (not NestJS services)
│   ├── service.module.ts
│   ├── service.controller.ts
│   ├── service.service.ts
│   ├── repositories/
│   │   └── service.repository.ts
│   └── dto/
│       └── ...
│
├── location/                          # Company locations/points
│   ├── location.module.ts
│   ├── location.controller.ts
│   ├── location.service.ts
│   ├── repositories/
│   │   └── location.repository.ts
│   └── dto/
│       └── ...
│
├── schedule/                          # Specialist schedules per location
│   ├── schedule.module.ts
│   ├── schedule.controller.ts
│   ├── schedule.service.ts
│   ├── repositories/
│   │   └── schedule.repository.ts
│   └── dto/
│       └── ...
│
├── relationships/                     # Junction table management
│   ├── relationships.module.ts       # Exports relationship services
│   ├── services/
│   │   ├── specialist-service-relation.service.ts
│   │   ├── specialist-location-relation.service.ts
│   │   └── service-location-relation.service.ts
│   ├── repositories/
│   │   ├── specialist-service.repository.ts
│   │   ├── specialist-location.repository.ts
│   │   └── service-location.repository.ts
│   └── dto/
│       ├── assign-service.dto.ts
│       ├── assign-location.dto.ts
│       └── relationship-query.dto.ts
│
├── queries/                           # Complex cross-entity queries (optional)
│   ├── queries.module.ts
│   ├── services/
│   │   ├── specialist-availability-query.service.ts
│   │   ├── location-services-query.service.ts
│   │   └── schedule-overview-query.service.ts
│   └── dto/
│       └── ...
│
├── prisma/
│   ├── prisma.module.ts              # Global Prisma module
│   ├── prisma.service.ts             # Extended client with tenant middleware
│   └── middleware/
│       └── tenant-filter.middleware.ts
│
└── common/
    ├── decorators/
    │   ├── user-id.decorator.ts      # Extract userId from request
    │   └── company-id.decorator.ts   # Extract companyId from request
    └── guards/
        └── tenant.guard.ts           # Enforce tenant isolation
```

### Structure Rationale

- **Entity Modules (specialist/, service/, location/):** Each domain entity has its own module following NestJS module organization. Controllers handle HTTP, services contain business logic, repositories isolate data access.
- **Relationships Module:** Centralized management of junction tables. This prevents duplication and provides a single source of truth for relationship operations. Export services for use by entity modules.
- **Queries Module (Optional):** For complex read queries spanning multiple entities. Useful for avoiding N+1 queries and optimizing JOIN operations. Keep this separate from write-heavy entity modules.
- **Prisma Module:** Global module providing tenant-aware database client. Middleware automatically injects companyId filters.

## Architectural Patterns

### Pattern 1: Explicit Junction Tables with Metadata

**What:** Use explicit many-to-many relations (junction tables as first-class Prisma models) instead of implicit relations when you need metadata or multi-tenant scoping.

**When to use:**
- Need to store additional fields on relationships (createdAt, createdBy, isActive)
- Multi-tenant architecture requiring companyId on junction tables
- Complex filtering on relationships themselves

**Trade-offs:**
- **Pros:** Full control over junction table, supports metadata, better for auditing
- **Cons:** More verbose Prisma queries, requires explicit repository management

**Example:**
```prisma
// Explicit junction table with company scoping
model SpecialistService {
  id           String    @id @default(uuid())
  specialistId String
  serviceId    String
  companyId    String    // Multi-tenant isolation
  createdAt    DateTime  @default(now())
  createdBy    String?
  isActive     Boolean   @default(true)

  specialist   Specialist @relation(fields: [specialistId], references: [id], onDelete: Cascade)
  service      Service    @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@unique([specialistId, serviceId, companyId])
  @@index([companyId])
  @@index([specialistId, companyId])
  @@index([serviceId, companyId])
  @@map("specialist_services")
}

model Specialist {
  id              String              @id @default(uuid())
  companyId       String
  firstName       String
  lastName        String
  email           String?
  phone           String?
  avatar          String?
  description     String?
  isTopMaster     Boolean             @default(false)
  isActive        Boolean             @default(true)
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  services        SpecialistService[]
  locations       SpecialistLocation[]
  schedules       Schedule[]

  @@index([companyId])
  @@map("specialists")
}

model Service {
  id              String              @id @default(uuid())
  companyId       String
  name            String
  description     String?
  parentServiceId String?             // Hierarchical subservices
  isActive        Boolean             @default(true)
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  parentService   Service?            @relation("ServiceHierarchy", fields: [parentServiceId], references: [id])
  subservices     Service[]           @relation("ServiceHierarchy")
  specialists     SpecialistService[]
  locations       ServiceLocation[]

  @@index([companyId])
  @@index([parentServiceId])
  @@map("services")
}
```

**Query Pattern:**
```typescript
// Repository method for assigning service to specialist
async assignServiceToSpecialist(
  specialistId: string,
  serviceId: string,
  companyId: string,
  createdBy: string,
): Promise<SpecialistService> {
  return this.prisma.specialistService.create({
    data: {
      specialistId,
      serviceId,
      companyId,
      createdBy,
    },
    include: {
      specialist: true,
      service: true,
    },
  });
}

// Query all services for a specialist (multi-tenant safe)
async findServicesBySpecialist(
  specialistId: string,
  companyId: string,
): Promise<Service[]> {
  const relations = await this.prisma.specialistService.findMany({
    where: {
      specialistId,
      companyId,
      isActive: true,
    },
    include: {
      service: true,
    },
  });

  return relations.map(rel => rel.service);
}
```

### Pattern 2: Repository Query Builder for Multi-Tenant Filtering

**What:** Encapsulate Prisma where clause construction in repository methods, automatically injecting companyId from request context.

**When to use:**
- All queries in multi-tenant systems
- Complex filtering with optional parameters
- Want to prevent accidental cross-tenant data leaks

**Trade-offs:**
- **Pros:** Centralized tenant safety, DRY query logic, easier testing
- **Cons:** Adds abstraction layer, can hide Prisma's full query capabilities

**Example:**
```typescript
@Injectable()
export class SpecialistRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Query builder for complex filters
  buildWhereClause(params: {
    companyId: string;           // Required for tenant isolation
    locationId?: string;
    serviceId?: string;
    isTopMaster?: boolean;
    search?: string;
    isActive?: boolean;
  }): Prisma.SpecialistWhereInput {
    const where: Prisma.SpecialistWhereInput = {
      companyId: params.companyId,  // Always filter by tenant
    };

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params.isTopMaster !== undefined) {
      where.isTopMaster = params.isTopMaster;
    }

    // Filter by location through junction table
    if (params.locationId) {
      where.locations = {
        some: {
          locationId: params.locationId,
          companyId: params.companyId,
          isActive: true,
        },
      };
    }

    // Filter by service through junction table
    if (params.serviceId) {
      where.services = {
        some: {
          serviceId: params.serviceId,
          companyId: params.companyId,
          isActive: true,
        },
      };
    }

    // Search by name
    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async findMany(params: {
    where?: Prisma.SpecialistWhereInput;
    skip?: number;
    take?: number;
    include?: Prisma.SpecialistInclude;
  }) {
    const { where, skip, take, include } = params;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.specialist.findMany({
        where,
        skip,
        take,
        include: include || {
          services: { include: { service: true } },
          locations: { include: { location: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.specialist.count({ where }),
    ]);

    return { data, total };
  }
}
```

### Pattern 3: Relationship Query Service for Complex Joins

**What:** Dedicated service for queries spanning multiple entities and junction tables, preventing N+1 queries.

**When to use:**
- Complex read operations joining 3+ tables
- Dashboard/overview queries
- Reports requiring aggregations across relationships
- Avoiding N+1 query problems

**Trade-offs:**
- **Pros:** Optimized queries, clear separation of complex read logic, easier to test
- **Cons:** Another layer of abstraction, potential for duplication

**Example:**
```typescript
@Injectable()
export class LocationServicesQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all services available at a location with specialist counts
   * Optimized single query using Prisma's relation filters
   */
  async getServicesAtLocation(
    locationId: string,
    companyId: string,
  ): Promise<ServiceWithSpecialistsDto[]> {
    // Find services connected to this location
    const serviceLocations = await this.prisma.serviceLocation.findMany({
      where: {
        locationId,
        companyId,
        isActive: true,
      },
      include: {
        service: {
          include: {
            specialists: {
              where: {
                companyId,
                isActive: true,
                specialist: {
                  locations: {
                    some: {
                      locationId,
                      companyId,
                      isActive: true,
                    },
                  },
                },
              },
              include: {
                specialist: true,
              },
            },
          },
        },
      },
    });

    return serviceLocations.map(sl => ({
      serviceId: sl.service.id,
      serviceName: sl.service.name,
      serviceDescription: sl.service.description,
      specialistCount: sl.service.specialists.length,
      specialists: sl.service.specialists.map(ss => ({
        id: ss.specialist.id,
        firstName: ss.specialist.firstName,
        lastName: ss.specialist.lastName,
        avatar: ss.specialist.avatar,
        isTopMaster: ss.specialist.isTopMaster,
      })),
    }));
  }

  /**
   * Get specialists working at a location grouped by service
   */
  async getSpecialistsByServiceAtLocation(
    locationId: string,
    companyId: string,
  ): Promise<ServiceWithSpecialistsGroupDto[]> {
    const specialists = await this.prisma.specialist.findMany({
      where: {
        companyId,
        isActive: true,
        locations: {
          some: {
            locationId,
            companyId,
            isActive: true,
          },
        },
      },
      include: {
        services: {
          where: {
            companyId,
            isActive: true,
            service: {
              locations: {
                some: {
                  locationId,
                  companyId,
                  isActive: true,
                },
              },
            },
          },
          include: {
            service: true,
          },
        },
      },
    });

    // Group by service
    const serviceMap = new Map<string, any>();

    specialists.forEach(specialist => {
      specialist.services.forEach(ss => {
        const service = ss.service;
        if (!serviceMap.has(service.id)) {
          serviceMap.set(service.id, {
            serviceId: service.id,
            serviceName: service.name,
            specialists: [],
          });
        }

        serviceMap.get(service.id).specialists.push({
          id: specialist.id,
          firstName: specialist.firstName,
          lastName: specialist.lastName,
          avatar: specialist.avatar,
          isTopMaster: specialist.isTopMaster,
        });
      });
    });

    return Array.from(serviceMap.values());
  }
}
```

### Pattern 4: Tenant Context Injection via Middleware

**What:** Use Prisma client extensions and CLS (Continuation Local Storage) to automatically inject tenant filters on all queries.

**When to use:**
- All multi-tenant applications
- Want to prevent developer errors with missing companyId filters
- Centralized tenant safety enforcement

**Trade-offs:**
- **Pros:** Impossible to forget tenant filtering, consistent across codebase, single point of configuration
- **Cons:** Magic behavior that's not obvious from code, can complicate debugging, requires careful testing

**Example:**
```typescript
// prisma/middleware/tenant-filter.middleware.ts
import { Prisma, PrismaClient } from '@prisma/client';

export function createTenantFilteredClient(
  baseClient: PrismaClient,
  tenantId: string,
): PrismaClient {
  return baseClient.$extends({
    query: {
      // Apply to all models that have companyId
      $allModels: {
        async findMany({ model, operation, args, query }) {
          args.where = {
            ...args.where,
            companyId: tenantId,
          };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = {
            ...args.where,
            companyId: tenantId,
          };
          return query(args);
        },
        async findUnique({ args, query }) {
          args.where = {
            ...args.where,
            companyId: tenantId,
          };
          return query(args);
        },
        async create({ args, query }) {
          args.data = {
            ...args.data,
            companyId: tenantId,
          };
          return query(args);
        },
        async createMany({ args, query }) {
          if (Array.isArray(args.data)) {
            args.data = args.data.map(item => ({
              ...item,
              companyId: tenantId,
            }));
          }
          return query(args);
        },
        async update({ args, query }) {
          args.where = {
            ...args.where,
            companyId: tenantId,
          };
          return query(args);
        },
        async updateMany({ args, query }) {
          args.where = {
            ...args.where,
            companyId: tenantId,
          };
          return query(args);
        },
        async delete({ args, query }) {
          args.where = {
            ...args.where,
            companyId: tenantId,
          };
          return query(args);
        },
        async deleteMany({ args, query }) {
          args.where = {
            ...args.where,
            companyId: tenantId,
          };
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
}

// prisma/prisma.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { createTenantFilteredClient } from './middleware/tenant-filter.middleware';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(private readonly cls: ClsService) {
    super();
  }

  // Get tenant-filtered instance
  get instance(): PrismaClient {
    const tenantId = this.cls.get('companyId');
    if (!tenantId) {
      throw new Error('Tenant context not set');
    }
    return createTenantFilteredClient(this, tenantId);
  }

  // Use base client for admin operations or when tenant filter not needed
  get base(): PrismaClient {
    return this;
  }
}
```

**Usage in Repository:**
```typescript
@Injectable()
export class SpecialistRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: FindManyParams) {
    // Automatically filters by companyId from CLS context
    return this.prisma.instance.specialist.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
    });
  }
}
```

## Data Flow

### Request Flow for Relationship Creation

```
[POST /specialists/:id/services]
    ↓
[SpecialistController.assignService()] → Extract companyId from guard/decorator
    ↓
[SpecialistService.assignService()] → Business validation
    ↓ (validates specialist exists)
    ↓ (validates service exists and belongs to company)
    ↓ (checks for existing relationship)
    ↓
[SpecialistServiceRepository.create()] → Build Prisma query with companyId
    ↓
[PrismaService (tenant-filtered)] → Inject companyId via middleware
    ↓
[PostgreSQL] → INSERT into specialist_services with composite unique constraint
    ↓
[Response] ← Return SpecialistServiceDto
```

### Query Flow for Complex Relationship Reads

```
[GET /locations/:id/services]
    ↓
[LocationController.getServices()] → Extract companyId, locationId
    ↓
[LocationServicesQueryService.getServicesAtLocation()] → Orchestrate complex query
    ↓ (Single query with nested includes)
    ↓
[PrismaService] → Execute with:
    ↓            - ServiceLocation filter (locationId, companyId)
    ↓            - Include Service
    ↓            - Include SpecialistService (with location filter)
    ↓            - Include Specialist
    ↓
[PostgreSQL] → Optimized JOIN query with indexes
    ↓ (Uses indexes on companyId, locationId, serviceId)
    ↓
[In-memory mapping] ← Transform flat results to grouped DTO
    ↓
[Response] ← Return ServiceWithSpecialistsDto[]
```

### State Management for Relationships

```
[Entity Creation]
    ↓
[Entity exists independently] ← No automatic relationships
    ↓
[Explicit relationship creation via junction endpoint]
    ↓
[SpecialistService record created] ← Stores companyId, metadata
    ↓
[Query with include] → Fetches related entities through junction
    ↓
[Response includes nested relationships] ← Clean API response
```

### Key Data Flows

1. **Create Entity Flow:** POST /specialists → Create specialist with companyId → Return specialist (no services/locations yet) → Requires explicit relationship creation
2. **Assign Relationship Flow:** POST /specialists/:id/services → Validate both entities exist → Check duplicate → Insert junction record with companyId → Return relationship confirmation
3. **Query by Relationship Flow:** GET /locations/:id/services → Query ServiceLocation junction → Include nested Service and Specialist → Filter by isActive → Map to DTO → Return grouped results
4. **Bulk Assignment Flow:** POST /specialists/:id/services/bulk → Validate all services exist → Use transaction → Create multiple junction records → Rollback on any failure → Return all created relationships

## Multi-Tenant Isolation Strategy

### Approach: Shared Database, Shared Schema with Row-Level Filtering

All tables include a `companyId` column. Every query filters by `companyId` to ensure tenant isolation.

### Implementation Layers

**1. Database Schema Level:**
- Every table has `companyId` column (indexed)
- Junction tables have composite unique constraints including `companyId`
- Example: `@@unique([specialistId, serviceId, companyId])` prevents duplicate relationships within a company but allows same relationship across companies

**2. Prisma Middleware Level:**
- Automatic `companyId` injection on all queries via client extension
- Prevents accidental cross-tenant data leaks
- Single source of truth for tenant filtering logic

**3. Request Context Level:**
- Extract `companyId` from JWT token or request header
- Store in CLS (nestjs-cls) for request-scoped access
- Available throughout request lifecycle without explicit passing

**4. Repository Level:**
- All repository methods accept or retrieve `companyId`
- Query builders always include `companyId` in WHERE clauses
- Double-layer safety: middleware + explicit filtering

### Index Strategy for Multi-Tenant Performance

**Core Entity Indexes:**
```prisma
model Specialist {
  @@index([companyId])
  @@index([companyId, isActive])
  @@index([companyId, isTopMaster])
}

model Service {
  @@index([companyId])
  @@index([companyId, parentServiceId])  // For subservice queries
}

model Location {
  @@index([companyId])
}
```

**Junction Table Indexes:**
```prisma
model SpecialistService {
  @@unique([specialistId, serviceId, companyId])
  @@index([companyId])
  @@index([specialistId, companyId])
  @@index([serviceId, companyId])
}

model SpecialistLocation {
  @@unique([specialistId, locationId, companyId])
  @@index([companyId])
  @@index([specialistId, companyId])
  @@index([locationId, companyId])
}

model ServiceLocation {
  @@unique([serviceId, locationId, companyId])
  @@index([companyId])
  @@index([serviceId, companyId])
  @@index([locationId, companyId])
}
```

**Schedule Composite Index:**
```prisma
model Schedule {
  @@unique([specialistId, locationId, dayOfWeek, companyId])
  @@index([companyId])
  @@index([specialistId, companyId])
  @@index([locationId, companyId])
  @@index([companyId, dayOfWeek])  // For week view queries
}
```

### Safety Checks

**Guard Level:**
```typescript
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly cls: ClsService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const companyId = this.extractCompanyId(request); // From JWT or header

    if (!companyId) {
      throw new UnauthorizedException('Company context required');
    }

    this.cls.set('companyId', companyId);
    return true;
  }
}
```

**Service Level:**
```typescript
async assignServiceToSpecialist(
  specialistId: string,
  serviceId: string,
  companyId: string,
) {
  // Verify specialist belongs to company
  const specialist = await this.specialistRepository.findOne({
    where: { id: specialistId, companyId },
  });
  if (!specialist) {
    throw new NotFoundException('Specialist not found');
  }

  // Verify service belongs to company
  const service = await this.serviceRepository.findOne({
    where: { id: serviceId, companyId },
  });
  if (!service) {
    throw new NotFoundException('Service not found');
  }

  // Create relationship with companyId
  return this.relationshipRepository.create({
    specialistId,
    serviceId,
    companyId,
  });
}
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-10k users | Single database, shared schema works well. Use connection pooling (Prisma default). Ensure indexes on companyId + foreign keys. |
| 10k-100k users | Add read replicas for query-heavy operations. Consider caching frequent relationship queries (Redis). Optimize N+1 queries with Prisma's include strategy. Monitor slow queries with pg_stat_statements. |
| 100k-1M users | Consider database partitioning by companyId for large tenants. Implement query result caching layer. Move complex aggregations to background jobs. Use database-level read replicas with Prisma's replica extension. |
| 1M+ users | Evaluate separate databases per large tenant (hybrid multi-tenancy). Implement CQRS pattern (separate read/write models). Consider materialized views for dashboard queries. Move relationship queries to dedicated read service. |

### Scaling Priorities

1. **First bottleneck:** Junction table queries with multiple includes. **Fix:** Add composite indexes on `[companyId, foreignKey1, foreignKey2]`. Use Prisma's query batching for N+1 problems. Cache frequently accessed relationship mappings.

2. **Second bottleneck:** Complex nested queries for dashboards (e.g., location → services → specialists → schedules). **Fix:** Create materialized views or denormalized read models. Use background jobs to pre-compute aggregations. Implement query result caching with TTL.

3. **Third bottleneck:** Write contention on junction tables during bulk operations. **Fix:** Use Prisma transactions with proper isolation levels. Implement optimistic locking. Consider queue-based bulk updates with eventual consistency.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Implicit Many-to-Many for Multi-Tenant Systems

**What people do:** Use Prisma's implicit many-to-many relations (`@relation` without junction model) in multi-tenant systems.

**Why it's wrong:**
- Cannot add `companyId` to the implicit junction table
- Impossible to ensure tenant isolation at junction level
- No way to add metadata (createdAt, isActive, createdBy)
- Risk of cross-tenant data corruption

**Do this instead:** Always use explicit junction tables with `companyId` field and composite unique constraints.

```prisma
// ❌ Bad: Implicit relation (no tenant safety)
model Specialist {
  services Service[]
}

model Service {
  specialists Specialist[]
}

// ✅ Good: Explicit junction with companyId
model SpecialistService {
  specialistId String
  serviceId    String
  companyId    String

  specialist   Specialist @relation(...)
  service      Service    @relation(...)

  @@unique([specialistId, serviceId, companyId])
  @@index([companyId])
}
```

### Anti-Pattern 2: Missing Composite Indexes on Junction Tables

**What people do:** Create junction tables without proper composite indexes, only indexing individual foreign keys.

**Why it's wrong:**
- Queries filtering by `companyId + specialistId` become slow
- Junction table scans instead of index seeks
- Performance degrades linearly with data size

**Do this instead:** Create composite indexes covering query patterns.

```prisma
// ❌ Bad: Only single-column indexes
model SpecialistService {
  @@index([specialistId])
  @@index([serviceId])
  @@index([companyId])
}

// ✅ Good: Composite indexes for actual query patterns
model SpecialistService {
  @@unique([specialistId, serviceId, companyId])
  @@index([companyId])                          // Tenant isolation queries
  @@index([specialistId, companyId])            // "Services for specialist" queries
  @@index([serviceId, companyId])               // "Specialists for service" queries
}
```

### Anti-Pattern 3: Service-Level Relationship Management Without Repository Layer

**What people do:** Put Prisma queries directly in service classes for relationship operations, bypassing repository abstraction.

**Why it's wrong:**
- Duplicated query logic across services
- Harder to test (tightly coupled to Prisma)
- Difficult to ensure consistent tenant filtering
- Violates single responsibility principle

**Do this instead:** Create dedicated relationship repositories with reusable query methods.

```typescript
// ❌ Bad: Prisma queries in service
@Injectable()
export class SpecialistService {
  async assignService(specialistId: string, serviceId: string, companyId: string) {
    return this.prisma.specialistService.create({
      data: { specialistId, serviceId, companyId },
      include: { specialist: true, service: true },
    });
  }
}

// ✅ Good: Repository abstraction
@Injectable()
export class SpecialistServiceRepository {
  buildWhereClause(params: FindRelationsParams): Prisma.SpecialistServiceWhereInput {
    // Centralized query building with tenant safety
  }

  async create(data: CreateRelationData): Promise<SpecialistService> {
    // Reusable creation logic
  }

  async findBySpecialist(specialistId: string, companyId: string): Promise<Service[]> {
    // Optimized relationship query
  }
}

@Injectable()
export class SpecialistService {
  constructor(private readonly relationRepo: SpecialistServiceRepository) {}

  async assignService(specialistId: string, serviceId: string, companyId: string) {
    return this.relationRepo.create({ specialistId, serviceId, companyId });
  }
}
```

### Anti-Pattern 4: N+1 Queries in Relationship Fetches

**What people do:** Query specialists, then loop through each to fetch their services individually.

**Why it's wrong:**
- Executes N+1 database queries (1 for specialists + N for each specialist's services)
- Kills performance with large datasets
- Unnecessary database roundtrips

**Do this instead:** Use Prisma's `include` or dedicated query service with single optimized query.

```typescript
// ❌ Bad: N+1 queries
async getSpecialistsWithServices(companyId: string) {
  const specialists = await this.prisma.specialist.findMany({
    where: { companyId },
  });

  for (const specialist of specialists) {
    specialist.services = await this.prisma.specialistService.findMany({
      where: { specialistId: specialist.id, companyId },
      include: { service: true },
    });
  }

  return specialists;
}

// ✅ Good: Single query with include
async getSpecialistsWithServices(companyId: string) {
  return this.prisma.specialist.findMany({
    where: { companyId },
    include: {
      services: {
        where: { isActive: true },
        include: { service: true },
      },
    },
  });
}
```

### Anti-Pattern 5: Missing Cascade Delete Configuration

**What people do:** Create relationships without defining what happens when parent entities are deleted.

**Why it's wrong:**
- Orphaned junction table records accumulate
- Foreign key constraint violations on delete
- Inconsistent data state

**Do this instead:** Explicitly define cascade behavior on junction table relations.

```prisma
// ❌ Bad: No cascade behavior defined
model SpecialistService {
  specialist Specialist @relation(fields: [specialistId], references: [id])
  service    Service    @relation(fields: [serviceId], references: [id])
}

// ✅ Good: Explicit cascade deletes
model SpecialistService {
  specialist Specialist @relation(fields: [specialistId], references: [id], onDelete: Cascade)
  service    Service    @relation(fields: [serviceId], references: [id], onDelete: Cascade)
}

// Or use soft deletes if you need audit trail
model SpecialistService {
  isActive   Boolean   @default(true)
  deletedAt  DateTime?

  specialist Specialist @relation(fields: [specialistId], references: [id], onDelete: Restrict)
  service    Service    @relation(fields: [serviceId], references: [id], onDelete: Restrict)
}
```

## Build Order Dependencies

Based on the architecture, here's the recommended build sequence:

### Phase 1: Foundation (No Dependencies)
1. **Prisma Service with Tenant Middleware** — Core infrastructure for all data access
2. **Common Guards and Decorators** — Extract companyId, userId from requests

### Phase 2: Core Entities (Depends on Phase 1)
3. **Specialist Module** — CRUD for specialists (no relationships yet)
4. **Service Module** — CRUD for services (including hierarchical subservices)
5. **Location Module** — CRUD for locations

### Phase 3: Relationships (Depends on Phase 2)
6. **Junction Tables in Schema** — Define SpecialistService, SpecialistLocation, ServiceLocation models
7. **Relationship Repositories** — Data access for junction tables
8. **Relationship Services** — Business logic for assigning/removing relationships

### Phase 4: Complex Queries (Depends on Phase 3)
9. **Query Services** — Cross-entity queries (specialists by location, services by specialist, etc.)
10. **Schedule Module** — Time-based scheduling with specialist + location composite keys

### Phase 5: Integration (Depends on Phase 4)
11. **Integration Endpoints** — Combined operations (create specialist + assign services in transaction)
12. **Bulk Operations** — Batch assignment APIs with proper transaction handling

### Dependency Notes

- **Cannot build relationships before entities:** Junction tables require foreign keys to Specialist, Service, and Location tables.
- **Cannot build queries before relationships:** Complex query services need junction table data to exist.
- **Cannot build schedules before relationships:** Schedules reference specialist-location pairs, requiring those relationships to exist.
- **Integration endpoints are optional:** Build only if you need transactional multi-step operations. Otherwise, client can orchestrate individual API calls.

### Critical Path

The minimum viable path for basic many-to-many functionality:
1. Prisma Service → 2. Specialist Module → 3. Service Module → 4. Junction Tables → 5. Relationship Repositories → 6. Basic Query Endpoints

Everything else (Location, Schedule, Query Services, Bulk Operations) can be built incrementally.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Auth Service** | JWT token validation via Guard | Extract companyId from JWT claims, validate signature |
| **User Service** | HTTP/gRPC for user profile enrichment | Fetch user details when displaying specialist info |
| **Notification Service** | Event-based via RabbitMQ | Publish relationship change events for notifications |
| **Storage Service** | HTTP for avatar/image uploads | Store specialist avatars, service images |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Specialist ↔ Service (via Relationships Module)** | Service injection, repository calls | Specialist module imports RelationshipsModule for junction queries |
| **Location ↔ Service (via Relationships Module)** | Service injection, repository calls | Location module imports RelationshipsModule for location-service assignments |
| **Queries Module ↔ All Entity Modules** | Repository injection (read-only) | Query services inject entity repositories for complex joins |
| **Schedule ↔ Specialist + Location** | Foreign key references, validation in service layer | Schedule validates specialist-location relationship exists before creation |

### Event Publishing

Publish domain events for relationship changes:
```typescript
interface SpecialistServiceAssignedEvent {
  specialistId: string;
  serviceId: string;
  companyId: string;
  assignedBy: string;
  assignedAt: Date;
}

interface SpecialistLocationAssignedEvent {
  specialistId: string;
  locationId: string;
  companyId: string;
  assignedBy: string;
  assignedAt: Date;
}
```

Consumers can react to these events for notifications, analytics, or audit logging.

## Sources

**Official Documentation:**
- [Prisma Many-to-Many Relations](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/many-to-many-relations)
- [Prisma Indexes](https://www.prisma.io/docs/orm/prisma-schema/data-model/indexes)
- [NestJS Prisma Recipe](https://docs.nestjs.com/recipes/prisma)

**Best Practices Articles:**
- [API with NestJS #33: Managing PostgreSQL Relationships with Prisma](https://wanago.io/2021/04/05/api-nestjs-33-postgresql-relationships-prisma/)
- [Multi-Tenant Applications with NestJS and Prisma](https://dev.to/murilogervasio/how-to-make-multi-tenant-applications-with-nestjs-and-a-prisma-proxy-to-automatically-filter-tenant-queries--4kl2)
- [Repository Pattern in NestJS](https://medium.com/@mitchella0100/implementing-the-repository-pattern-in-nestjs-and-why-we-should-e32861df5457)

**Community Discussions:**
- [Properly Handling Many-to-Many Relations with Additional Fields (Prisma GitHub #2429)](https://github.com/prisma/prisma/discussions/2429)
- [How to Configure Indexes in Prisma (LogRocket Blog)](https://blog.logrocket.com/how-configure-indexes-prisma/)
- [Improving Query Performance with Database Indexes (Prisma Blog)](https://www.prisma.io/blog/improving-query-performance-using-indexes-2-MyoiJNMFTsfq)

---
*Architecture research for: Many-to-many relationship systems in multi-tenant NestJS/Prisma applications*
*Researched: 2026-03-03*
*Confidence: HIGH — Based on official Prisma documentation, established NestJS patterns, and verified multi-tenant strategies*
