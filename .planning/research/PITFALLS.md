# Pitfalls Research

**Domain:** Many-to-many relationships in multi-tenant booking systems with Prisma
**Researched:** 2026-03-03
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Missing companyId in Junction Tables Leading to Cross-Tenant Data Leaks

**What goes wrong:**
Developers create junction tables (e.g., SpecialistService, SpecialistLocation, ServiceLocation) without including `companyId`, relying only on compound unique constraints like `@@unique([specialistId, serviceId])`. This allows relationships to exist across tenant boundaries, creating a critical security vulnerability where Tenant A's specialists can be linked to Tenant B's services.

**Why it happens:**
- Junction tables feel like "pure relationship metadata" without business context
- Developers focus on preventing duplicate relationships but forget tenant isolation
- Prisma's implicit many-to-many relationships don't expose this issue (they're not used in multi-tenant systems)
- Query examples rarely show multi-tenant patterns for junction tables

**How to avoid:**
1. **ALWAYS include companyId in junction tables** with compound unique constraints:
   ```prisma
   model SpecialistService {
     id           String   @id @default(uuid())
     specialistId String
     serviceId    String
     companyId    String   // CRITICAL: Must be included
     createdAt    DateTime @default(now())

     specialist Specialist @relation(fields: [specialistId], references: [id])
     service    Service    @relation(fields: [serviceId], references: [id])

     @@unique([specialistId, serviceId, companyId])  // Company scoped uniqueness
     @@index([companyId])
     @@index([specialistId, companyId])
     @@index([serviceId, companyId])
   }
   ```

2. **Validate companyId consistency** in service layer before creating junction records:
   ```typescript
   async linkSpecialistToService(specialistId: string, serviceId: string, companyId: string) {
     // Verify both entities belong to the same company
     const [specialist, service] = await Promise.all([
       this.prisma.specialist.findFirst({ where: { id: specialistId, companyId } }),
       this.prisma.service.findFirst({ where: { id: serviceId, companyId } }),
     ]);

     if (!specialist || !service) {
       throw new ForbiddenException('Cannot link entities across tenant boundaries');
     }

     return this.prisma.specialistService.create({
       data: { specialistId, serviceId, companyId },
     });
   }
   ```

3. **Apply defense-in-depth with database-level Row Level Security (RLS)** policies to enforce tenant isolation even if application code fails.

**Warning signs:**
- Junction table schema missing companyId field
- No validation logic checking entity ownership before creating relationships
- Integration tests don't verify cross-tenant relationship prevention
- Migration files show junction tables without tenant scoping

**Phase to address:**
Phase 1 (Data Model Design) - Must be correct from the start. Retrofitting tenant isolation is extremely difficult and risky.

---

### Pitfall 2: ORM Leak Vulnerabilities via Nested Query Filter Injection

**What goes wrong:**
Attackers exploit Prisma's flexible nested query syntax to bypass tenant filters and leak sensitive data through many-to-many relationships. By providing crafted `where` filters that traverse relationships (e.g., `{ specialists: { some: { services: { some: { id: targetId } } } } }`), attackers can access records from other tenants or leak fields that should be restricted. This is a documented vulnerability class called "ORM Leak" attacks.

**Why it happens:**
- Developers pass user input directly to Prisma `where` clauses without sanitization
- Nested `include` and `where` filters don't automatically inherit parent tenant filters
- Prisma gives users extensive control over generated SQL through relation queries
- Many-to-many relationships create circular paths that can loop back to bypass restrictions
- Time-based attacks can leak data even without direct field access

**How to avoid:**
1. **NEVER pass raw user input to Prisma where clauses**:
   ```typescript
   // BAD - Vulnerable to ORM Leak
   async findAll(@Query('filter') filter: any, @CurrentUser() user: User) {
     return this.prisma.specialist.findMany({
       where: filter, // DANGEROUS: User controls the query
     });
   }

   // GOOD - Whitelist allowed filters
   async findAll(@Query() dto: FindSpecialistsDto, @CurrentUser() user: User) {
     const allowedFilters = {
       locationId: dto.locationId,
       isTopMaster: dto.isTopMaster,
       // Only expose safe, non-relational filters
     };

     return this.prisma.specialist.findMany({
       where: {
         ...allowedFilters,
         companyId: user.companyId, // ALWAYS enforce tenant filter
       },
     });
   }
   ```

2. **Enforce tenant filters on ALL nested queries and includes**:
   ```typescript
   // When querying through relationships, scope every level
   const specialists = await this.prisma.specialist.findMany({
     where: { companyId: user.companyId },
     include: {
       specialistServices: {
         where: { companyId: user.companyId }, // Scope junction table
         include: {
           service: {
             where: { companyId: user.companyId }, // Scope related entity
           },
         },
       },
     },
   });
   ```

3. **Use Prisma middleware or Client Extensions to auto-inject tenant filters**:
   ```typescript
   const createTenantIsolationExtension = (companyId: string) =>
     Prisma.defineExtension((client) =>
       client.$extends({
         query: {
           $allModels: {
             async $allOperations({ args, query }) {
               // Inject companyId filter on all queries
               if (args.where) {
                 args.where = { ...args.where, companyId };
               } else {
                 args.where = { companyId };
               }
               return query(args);
             },
           },
         },
       })
     );
   ```

4. **Implement defense-in-depth with PostgreSQL RLS** to catch application-level filter bypasses at the database layer.

**Warning signs:**
- API endpoints accepting arbitrary JSON filter objects from clients
- DTOs using `@IsObject()` validation without strict schema validation
- Nested `include` queries without explicit companyId filters at each level
- Raw Prisma client exposed in services without tenant-scoped wrappers
- No automated security testing for cross-tenant data access

**Phase to address:**
Phase 1 (API Design) and Phase 2 (Security Hardening) - Critical from the start, with dedicated security review phase.

---

### Pitfall 3: N+1 Query Explosions with Junction Table Traversals

**What goes wrong:**
Fetching entities with their many-to-many relationships creates exponential query counts. For example, fetching 50 specialists with their services and locations: 1 query for specialists + 50 queries for specialist-service junctions + 50 queries for specialist-location junctions + additional queries for service and location details = 150+ database round trips. Response times degrade from milliseconds to seconds, especially with tenant filtering overhead.

**Why it happens:**
- Prisma's default query strategy uses separate queries for each relationship (query-based strategy)
- Junction tables add extra hops: `Specialist -> SpecialistService -> Service` instead of direct relationship
- Developers use `include` without understanding the query execution strategy
- Multi-tenant filters on junction tables prevent efficient query optimization
- Issue becomes apparent only under production load with realistic data volumes

**How to avoid:**
1. **Use the `join` relation load strategy** for critical queries (Prisma 5.0+):
   ```typescript
   const specialists = await this.prisma.specialist.findMany({
     where: { companyId: user.companyId, locationId },
     relationLoadStrategy: 'join', // Forces single SQL JOIN query
     include: {
       specialistServices: {
         include: { service: true },
       },
       specialistLocations: {
         include: { location: true },
       },
     },
   });
   ```

   **Important limitation**: Join strategy requires all filters to be on scalar fields with equality operators. Complex nested filters or relation filters fall back to query-based strategy.

2. **Optimize for list views vs. detail views**:
   ```typescript
   // List view - minimal data, optimized query
   async findAllSpecialists(companyId: string) {
     return this.prisma.specialist.findMany({
       where: { companyId },
       select: {
         id: true,
         firstName: true,
         lastName: true,
         isTopMaster: true,
         // Skip relationships for list performance
       },
     });
   }

   // Detail view - full data with join strategy
   async findSpecialistById(id: string, companyId: string) {
     return this.prisma.specialist.findUnique({
       where: { id, companyId },
       relationLoadStrategy: 'join',
       include: {
         specialistServices: { include: { service: true } },
         specialistLocations: { include: { location: true } },
       },
     });
   }
   ```

3. **Use data loaders for batch fetching** when join strategy isn't available:
   ```typescript
   // Fetch specialists
   const specialists = await this.prisma.specialist.findMany({
     where: { companyId, locationId },
   });
   const specialistIds = specialists.map(s => s.id);

   // Batch fetch junction records
   const specialistServices = await this.prisma.specialistService.findMany({
     where: { specialistId: { in: specialistIds }, companyId },
     include: { service: true },
   });

   // Map relationships in application code
   const specialistsWithServices = specialists.map(specialist => ({
     ...specialist,
     services: specialistServices
       .filter(ss => ss.specialistId === specialist.id)
       .map(ss => ss.service),
   }));
   ```

4. **Add query performance monitoring** with Prisma Optimize or custom logging:
   ```typescript
   const prisma = new PrismaClient({
     log: [
       { emit: 'event', level: 'query' },
     ],
   });

   prisma.$on('query', (e) => {
     if (e.duration > 100) { // Log slow queries
       console.warn(`Slow query detected: ${e.duration}ms`, e.query);
     }
   });
   ```

**Warning signs:**
- Response times increase linearly with result count
- Database connection pool exhaustion under load
- Prisma query logs show repeated similar queries with different IDs
- API endpoints timing out during load testing
- Datadog/monitoring showing > 100ms p95 latency for simple list endpoints

**Phase to address:**
Phase 2 (Performance Optimization) - After core functionality works, before production load testing. Can be deferred for MVP but must be addressed before scale.

---

### Pitfall 4: Implicit vs. Explicit Many-to-Many Migration Data Loss

**What goes wrong:**
Teams start with Prisma's implicit many-to-many relationships for simplicity, then need to add metadata to junction tables (e.g., `createdAt`, `displayOrder`, `isActive`) and attempt to migrate to explicit relationships. Without a custom migration script, Prisma drops the old implicit junction table and creates a new explicit one, **permanently losing all existing relationship data**. Production systems suddenly show specialists with no services, services with no locations, etc.

**Why it happens:**
- Prisma's automatic migration tool doesn't detect that implicit and explicit tables represent the same relationships
- The implicit junction table has a Prisma-generated name (e.g., `_SpecialistToService`) that doesn't match the new explicit model name (`SpecialistService`)
- Developers assume `prisma migrate dev` will handle data migration automatically
- Migration preview doesn't clearly warn about data loss for relationship tables
- Teams don't test migrations on production-like datasets before deployment

**How to avoid:**
1. **Start with explicit many-to-many relationships from day one** if there's any possibility of needing metadata:
   ```prisma
   // Start explicit, even if you don't need metadata yet
   model SpecialistService {
     id           String   @id @default(uuid())
     specialistId String
     serviceId    String
     companyId    String
     createdAt    DateTime @default(now()) // Future-proof for audit trail

     specialist Specialist @relation(fields: [specialistId], references: [id])
     service    Service    @relation(fields: [serviceId], references: [id])

     @@unique([specialistId, serviceId, companyId])
     @@index([companyId])
   }
   ```

2. **If migrating from implicit to explicit, use a 3-step migration process**:

   **Step 1**: Create new explicit model alongside existing implicit relationship:
   ```prisma
   model Specialist {
     id       String   @id
     // Keep old implicit relationship temporarily
     services Service[] @relation("SpecialistToService")
     // Add new explicit relationship
     specialistServices SpecialistService[]
   }

   model Service {
     id          String   @id
     specialists Specialist[] @relation("SpecialistToService")
     specialistServices SpecialistService[]
   }

   model SpecialistService {
     id           String   @id @default(uuid())
     specialistId String
     serviceId    String
     companyId    String
     createdAt    DateTime @default(now())

     specialist Specialist @relation(fields: [specialistId], references: [id])
     service    Service    @relation(fields: [serviceId], references: [id])

     @@unique([specialistId, serviceId, companyId])
   }
   ```

   Run `prisma migrate dev --create-only` to generate migration SQL.

   **Step 2**: Add custom data migration script in the migration file:
   ```sql
   -- Auto-generated by Prisma
   CREATE TABLE "SpecialistService" (
     "id" TEXT NOT NULL,
     "specialistId" TEXT NOT NULL,
     "serviceId" TEXT NOT NULL,
     "companyId" TEXT NOT NULL,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY ("id")
   );

   -- CUSTOM: Migrate data from implicit to explicit table
   INSERT INTO "SpecialistService" ("id", "specialistId", "serviceId", "companyId", "createdAt")
   SELECT
     gen_random_uuid(),
     "_SpecialistToService"."A" as "specialistId",
     "_SpecialistToService"."B" as "serviceId",
     s."companyId",
     NOW()
   FROM "_SpecialistToService"
   JOIN "Specialist" s ON s.id = "_SpecialistToService"."A";

   -- Verify data migrated correctly
   DO $$
   DECLARE
     old_count INTEGER;
     new_count INTEGER;
   BEGIN
     SELECT COUNT(*) INTO old_count FROM "_SpecialistToService";
     SELECT COUNT(*) INTO new_count FROM "SpecialistService";

     IF old_count != new_count THEN
       RAISE EXCEPTION 'Migration failed: row counts do not match (old: %, new: %)', old_count, new_count;
     END IF;
   END $$;
   ```

   **Step 3**: After verifying data migration, remove implicit relationship:
   ```prisma
   model Specialist {
     id                 String              @id
     specialistServices SpecialistService[]
     // Removed: services Service[] @relation("SpecialistToService")
   }

   model Service {
     id                 String              @id
     specialistServices SpecialistService[]
     // Removed: specialists Specialist[] @relation("SpecialistToService")
   }
   ```

   Run `prisma migrate dev` to drop the old `_SpecialistToService` table.

3. **Always test migrations on a production database dump** before deploying:
   ```bash
   # Restore production data to staging
   pg_dump production_db > prod_dump.sql
   psql staging_db < prod_dump.sql

   # Test migration on staging
   DATABASE_URL=staging_url prisma migrate deploy

   # Verify relationship counts match
   SELECT COUNT(*) FROM "_SpecialistToService";  -- Old count
   SELECT COUNT(*) FROM "SpecialistService";      -- New count (must match)
   ```

4. **Implement application-level verification** after migration:
   ```typescript
   async verifyMigration() {
     const specialists = await this.prisma.specialist.findMany({
       include: { specialistServices: true },
     });

     const specialistsWithoutServices = specialists.filter(
       s => s.specialistServices.length === 0
     );

     if (specialistsWithoutServices.length > 0) {
       throw new Error(
         `Migration verification failed: ${specialistsWithoutServices.length} specialists lost their services`
       );
     }
   }
   ```

**Warning signs:**
- Schema uses implicit many-to-many (no junction model defined, just arrays on both sides)
- Product requirements mention "we need to track when specialists were assigned" or "we need to order services by priority"
- Migration preview shows `DROP TABLE "_ModelAToModelB"`
- No custom migration scripts in `prisma/migrations/` directory
- No staging environment testing before production migrations

**Phase to address:**
Phase 1 (Data Model Design) - Choose explicit from the start. If migrating existing system, create a dedicated migration phase with extensive testing.

---

### Pitfall 5: Missing Cascade Delete Configuration Causing Orphaned Junction Records

**What goes wrong:**
When deleting a specialist, service, or location, the junction table records (SpecialistService, SpecialistLocation, ServiceLocation) remain in the database, pointing to non-existent entities. This creates "orphaned" records that accumulate over time, bloating the database, breaking referential integrity, and causing errors when queries try to include deleted relationships. Users may see "Specialist not found" errors when the junction record exists but the specialist was deleted.

**Why it happens:**
- Prisma's default referential action is `SetNull` or `Restrict`, not `Cascade`
- Developers forget to set `onDelete: Cascade` on junction table foreign keys
- Implicit many-to-many relationships handle this automatically (but explicit ones don't)
- Foreign key constraints may not be enforced if database was migrated from NoSQL or foreign keys were disabled
- Application-level soft deletes (isDeleted flag) create additional complexity for junction table cleanup

**How to avoid:**
1. **Always set `onDelete: Cascade` on junction table relationships**:
   ```prisma
   model SpecialistService {
     id           String   @id @default(uuid())
     specialistId String
     serviceId    String
     companyId    String

     specialist Specialist @relation(fields: [specialistId], references: [id], onDelete: Cascade)
     service    Service    @relation(fields: [serviceId], references: [id], onDelete: Cascade)

     @@unique([specialistId, serviceId, companyId])
   }

   model SpecialistLocation {
     id           String   @id @default(uuid())
     specialistId String
     locationId   String
     companyId    String

     specialist Specialist @relation(fields: [specialistId], references: [id], onDelete: Cascade)
     location   Location   @relation(fields: [locationId], references: [id], onDelete: Cascade)

     @@unique([specialistId, locationId, companyId])
   }
   ```

2. **For soft delete patterns, clean up junction tables explicitly**:
   ```typescript
   async softDeleteSpecialist(id: string, companyId: string) {
     return this.prisma.$transaction(async (tx) => {
       // Soft delete the specialist
       const specialist = await tx.specialist.update({
         where: { id, companyId },
         data: { isDeleted: true, deletedAt: new Date() },
       });

       // Hard delete junction records (they reference deleted entity)
       await tx.specialistService.deleteMany({
         where: { specialistId: id, companyId },
       });

       await tx.specialistLocation.deleteMany({
         where: { specialistId: id, companyId },
       });

       return specialist;
     });
   }
   ```

3. **Implement orphan detection and cleanup jobs**:
   ```typescript
   @Cron('0 2 * * *') // Run at 2 AM daily
   async cleanupOrphanedJunctionRecords() {
     // Find junction records pointing to deleted specialists
     const orphanedSpecialistServices = await this.prisma.specialistService.findMany({
       where: {
         specialist: { isDeleted: true },
       },
     });

     if (orphanedSpecialistServices.length > 0) {
       await this.prisma.specialistService.deleteMany({
         where: {
           id: { in: orphanedSpecialistServices.map(r => r.id) },
         },
       });

       this.logger.warn(
         `Cleaned up ${orphanedSpecialistServices.length} orphaned SpecialistService records`
       );
     }

     // Repeat for other junction tables...
   }
   ```

4. **Add database-level foreign key validation** (if using hard deletes):
   ```sql
   -- Verify no orphaned junction records exist
   SELECT 'SpecialistService', COUNT(*)
   FROM "SpecialistService" ss
   LEFT JOIN "Specialist" s ON ss."specialistId" = s.id
   WHERE s.id IS NULL

   UNION ALL

   SELECT 'SpecialistService', COUNT(*)
   FROM "SpecialistService" ss
   LEFT JOIN "Service" s ON ss."serviceId" = s.id
   WHERE s.id IS NULL;
   ```

5. **Test deletion scenarios in integration tests**:
   ```typescript
   it('should cascade delete specialist-service relationships when specialist is deleted', async () => {
     const specialist = await createTestSpecialist(companyId);
     const service = await createTestService(companyId);

     await linkSpecialistToService(specialist.id, service.id, companyId);

     const linkCountBefore = await prisma.specialistService.count({
       where: { specialistId: specialist.id },
     });
     expect(linkCountBefore).toBe(1);

     await prisma.specialist.delete({ where: { id: specialist.id } });

     const linkCountAfter = await prisma.specialistService.count({
       where: { specialistId: specialist.id },
     });
     expect(linkCountAfter).toBe(0); // Junction records should be gone
   });
   ```

**Warning signs:**
- Junction table schema missing `onDelete: Cascade` on foreign key relations
- Database query errors like "Foreign key constraint failed" when trying to include deleted relationships
- Growing junction table row counts that don't match business logic
- No soft delete cleanup logic in service layer
- Manual database queries show junction records with null foreign keys (if constraints aren't enforced)

**Phase to address:**
Phase 1 (Data Model Design) - Set cascade behavior correctly from the start. Phase 3 (Data Integrity) - Add cleanup jobs and orphan detection.

---

### Pitfall 6: Ignoring Compound Unique Constraint Violations in Concurrent Requests

**What goes wrong:**
Two API requests attempt to create the same specialist-service relationship simultaneously (e.g., admin clicks "Add Service" twice rapidly, or mobile app retries due to network issues). Without proper transaction isolation or idempotent handling, both requests pass the existence check, then race to insert into the junction table. One succeeds, the other fails with a `Unique constraint violation` error, returning 500 Internal Server Error to the user instead of gracefully handling the duplicate.

**Why it happens:**
- Developers use check-then-insert pattern without transaction isolation:
  ```typescript
  // BAD - Race condition
  const existing = await prisma.specialistService.findFirst({
    where: { specialistId, serviceId, companyId }
  });
  if (!existing) {
    await prisma.specialistService.create({ data: { ... } }); // Can fail with duplicate
  }
  ```
- Default transaction isolation level (`READ COMMITTED`) doesn't prevent concurrent inserts
- Prisma's `connectOrCreate` has race conditions with concurrent requests
- Error handling doesn't distinguish between validation errors and unique constraint violations
- Frontend doesn't implement request deduplication or optimistic UI updates

**How to avoid:**
1. **Use Prisma's `upsert` operation** (idempotent by design):
   ```typescript
   async linkSpecialistToService(specialistId: string, serviceId: string, companyId: string) {
     return this.prisma.specialistService.upsert({
       where: {
         specialistId_serviceId_companyId: { // Compound unique constraint name
           specialistId,
           serviceId,
           companyId,
         },
       },
       create: {
         specialistId,
         serviceId,
         companyId,
         createdAt: new Date(),
       },
       update: {}, // No-op if already exists
     });
   }
   ```

2. **Handle unique constraint violations gracefully**:
   ```typescript
   async linkSpecialistToService(specialistId: string, serviceId: string, companyId: string) {
     try {
       return await this.prisma.specialistService.create({
         data: { specialistId, serviceId, companyId },
       });
     } catch (error) {
       if (error.code === 'P2002') { // Prisma unique constraint error code
         // Not an error - relationship already exists
         return this.prisma.specialistService.findFirst({
           where: { specialistId, serviceId, companyId },
         });
       }
       throw error; // Re-throw other errors
     }
   }
   ```

3. **Use higher transaction isolation for critical operations**:
   ```typescript
   async bulkLinkSpecialistToServices(
     specialistId: string,
     serviceIds: string[],
     companyId: string
   ) {
     return this.prisma.$transaction(
       async (tx) => {
         const links = serviceIds.map(serviceId =>
           tx.specialistService.upsert({
             where: {
               specialistId_serviceId_companyId: { specialistId, serviceId, companyId },
             },
             create: { specialistId, serviceId, companyId },
             update: {},
           })
         );
         return Promise.all(links);
       },
       {
         isolationLevel: 'Serializable', // Prevent race conditions
         maxWait: 5000,
         timeout: 10000,
       }
     );
   }
   ```

   **Warning**: Serializable isolation can cause deadlocks under high concurrency. Implement retry logic:
   ```typescript
   async createWithRetry(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
     for (let attempt = 1; attempt <= maxRetries; attempt++) {
       try {
         return await operation();
       } catch (error) {
         if (error.code === 'P2034' && attempt < maxRetries) { // Deadlock/write conflict
           await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Exponential backoff
           continue;
         }
         throw error;
       }
     }
   }
   ```

4. **Implement frontend request deduplication**:
   ```typescript
   // Frontend - prevent double submissions
   const [isSubmitting, setIsSubmitting] = useState(false);

   const handleLinkService = async (serviceId: string) => {
     if (isSubmitting) return; // Prevent concurrent requests

     setIsSubmitting(true);
     try {
       await api.linkSpecialistToService(specialistId, serviceId);
     } finally {
       setIsSubmitting(false);
     }
   };
   ```

**Warning signs:**
- `P2002` errors (unique constraint violation) appearing in production logs
- Users reporting "Something went wrong" errors when adding relationships
- No retry logic for transaction deadlock errors (`P2034`)
- Junction table creation endpoints returning 500 instead of 200/201 for duplicates
- Load testing shows intermittent failures under concurrent requests
- Error monitoring shows spikes in database constraint violations

**Phase to address:**
Phase 2 (Concurrent Access Handling) - After core CRUD works, before production deployment. Critical for user-facing actions that can be triggered multiple times.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using implicit many-to-many relationships | Faster initial development, cleaner schema | Cannot add metadata (createdAt, displayOrder), difficult migration to explicit | Never for multi-tenant systems - always use explicit with companyId |
| Skipping indexes on junction table companyId | Slightly faster writes | Catastrophic query performance on tenant filtering, full table scans | Never - indexes are mandatory for multi-tenant junction tables |
| No validation that linked entities belong to same company | Less code, faster implementation | Critical security vulnerability - cross-tenant data corruption | Never - security requirement, not optional |
| Using raw Prisma client without tenant-scoped wrapper | Simpler dependency injection, less abstraction | Every query must manually add companyId filter, easy to forget | Only in single-tenant systems or admin contexts with explicit bypass |
| Application-level cascade delete instead of database-level | More control, ability to add business logic | Orphaned records if app crashes mid-delete, performance issues | Acceptable for soft deletes with cleanup jobs, not for hard deletes |
| Check-then-insert pattern without transactions | Easier to understand, works in 99% of cases | Race conditions on concurrent requests, unique constraint errors | Never for user-facing actions, acceptable for background jobs with retry logic |
| Denying all errors instead of handling P2002 gracefully | Simple error handling | Poor user experience on legitimate duplicates, retry storms | Never - idempotent operations are standard practice |
| Missing relationLoadStrategy: 'join' on list queries | Default behavior, no code needed | N+1 query problems, slow performance at scale | Only acceptable if result set guaranteed small (< 10 records) or relationships not needed |

---

## Integration Gotchas

Common mistakes when connecting to external services or other microservices.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Service lookup (services-service) | Not filtering by companyId when checking if serviceId exists | Always include companyId in cross-service validation: `GET /services/:id?companyId=X` |
| Location lookup (organization-service) | Assuming locationId alone is unique across system | Use composite validation with companyId: `GET /locations/:id?companyId=X` to prevent cross-tenant injection |
| User/Auth service | Trusting companyId from request header without validation | Validate companyId against authenticated user's tenant: if `user.companyId !== request.companyId` throw Forbidden |
| Event bus (NATS/Kafka) | Publishing junction table events without companyId | Always include companyId in event payload for subscriber filtering: `{ event: 'specialist.linked', specialistId, serviceId, companyId }` |
| Webhook notifications | Sending relationship data without tenant context | Include companyId in webhook signature and payload to prevent replay attacks across tenants |
| GraphQL Federation | Junction table resolvers not inheriting parent tenant context | Use @requires directive to enforce companyId propagation through nested queries |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all specialist services on list view | Works fine with test data (5 specialists, 3 services each) | Use pagination, defer relationship loading to detail view | > 50 specialists, > 1000 total relationships |
| Not using relationLoadStrategy: 'join' | Slow response times, database connection pool exhaustion | Always use `relationLoadStrategy: 'join'` for queries with includes | > 20 records with nested relationships |
| Fetching junction tables without limits | Fast during development, gradual slowdown | Add `take` limits, implement cursor pagination: `{ where: { companyId }, take: 50, skip: page * 50 }` | > 500 relationships per entity |
| No database indexes on junction table foreign keys | Dev database too small to notice | Ensure `@@index([specialistId, companyId])`, `@@index([serviceId, companyId])` exist | > 10k junction records per tenant |
| Querying through circular relationships | Recursive query explosion | Limit include depth, use separate queries for different relationship paths | Any circular traversal (Specialist → Service → Location → Specialist) |
| Using `findMany` instead of `count` for existence checks | Transfers unnecessary data, slow serialization | Use `prisma.specialistService.count({ where: { ... } })` for existence/count checks | > 100 records matching criteria |
| Not batching junction table creates | N sequential database writes, slow bulk operations | Use `createMany` with skipDuplicates: `prisma.specialistService.createMany({ data: [...], skipDuplicates: true })` | Bulk linking > 20 relationships |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Prisma where clause to client | **CRITICAL**: ORM Leak attack, cross-tenant data access via nested filters | Never accept raw filter objects from clients. Whitelist allowed filter fields, enforce companyId on all queries |
| Missing companyId in junction table compound unique constraints | **CRITICAL**: Cross-tenant relationship creation, data corruption | Always include companyId: `@@unique([specialistId, serviceId, companyId])` not `@@unique([specialistId, serviceId])` |
| Not validating entity ownership before linking | **HIGH**: Tenant A can link their specialist to Tenant B's service | Fetch and verify all entities belong to same companyId before creating junction record |
| Relying only on application-level tenant filters | **HIGH**: Developer mistakes bypass tenant isolation, data leaks | Implement PostgreSQL Row Level Security (RLS) as defense-in-depth, application filters as primary |
| Nested includes without explicit companyId filters | **HIGH**: Attacker crafts nested query to access other tenant's related data | Scope every include level: `include: { services: { where: { companyId } } }` |
| Using implicit many-to-many in multi-tenant system | **HIGH**: No way to enforce companyId on relationship | Always use explicit junction tables with companyId field in multi-tenant systems |
| Allowing client to specify relationship IDs without validation | **MEDIUM**: Mass assignment vulnerability, unauthorized relationship creation | Validate permissions for both source and target entities before creating relationship |
| Exposing junction table UUIDs in URLs | **LOW**: Information disclosure about relationship structure | Use composite natural keys in URLs: `/specialists/:specialistId/services/:serviceId` not `/specialist-services/:uuid` |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Junction table relationships:** Often missing companyId field — verify `@@unique([entityA, entityB, companyId])` exists, not just `@@unique([entityA, entityB])`
- [ ] **Cascade delete configuration:** Often missing onDelete: Cascade — verify all junction table foreign keys have `onDelete: Cascade` or explicit cleanup logic
- [ ] **Indexes on multi-tenant junction tables:** Often missing companyId indexes — verify `@@index([companyId])`, `@@index([specialistId, companyId])`, `@@index([serviceId, companyId])` exist
- [ ] **Cross-tenant relationship prevention:** Often missing ownership validation — verify service layer checks all entities belong to same companyId before linking
- [ ] **Nested query tenant filters:** Often missing companyId on includes — verify every `include:` has `where: { companyId }` or uses tenant-scoped client extension
- [ ] **Junction table ordering/sorting:** Often forgotten - implicit m2m doesn't support metadata — verify explicit junction table if ordering/priority needed
- [ ] **Unique constraint error handling:** Often returns 500 instead of idempotent response — verify P2002 errors are caught and handled gracefully
- [ ] **Performance testing with relationships:** Often tested without includes — verify load tests include realistic nested queries with junction table traversals
- [ ] **Migration testing on production data:** Often tested only on empty database — verify migration scripts tested on production dump with realistic relationship counts
- [ ] **Orphan detection monitoring:** Often no visibility into data integrity issues — verify scheduled job or query to detect junction records pointing to deleted entities

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Cross-tenant relationships in junction tables | **HIGH** - Data corruption, requires manual audit | 1. Identify corrupted records: `SELECT * FROM "SpecialistService" ss JOIN "Specialist" s ON ss."specialistId" = s.id WHERE ss."companyId" != s."companyId"` 2. Delete invalid relationships 3. Audit affected companies for data consistency 4. Add companyId validation to prevent recurrence |
| Missing companyId in junction table schema | **VERY HIGH** - Schema migration, potential downtime | 1. Add nullable companyId column 2. Backfill from parent entity: `UPDATE "SpecialistService" ss SET "companyId" = s."companyId" FROM "Specialist" s WHERE ss."specialistId" = s.id` 3. Make companyId required, add to unique constraint 4. Recreate indexes with companyId |
| Orphaned junction records from missing cascade | **MEDIUM** - Database cleanup, no functional impact | 1. Create cleanup script to find orphans 2. Soft delete or hard delete orphaned records 3. Add `onDelete: Cascade` to schema 4. Deploy new migration 5. Schedule periodic orphan detection job |
| N+1 query performance issues | **LOW** - Code change, no data migration | 1. Identify slow queries with Prisma query logging 2. Add `relationLoadStrategy: 'join'` to affected queries 3. Add missing indexes on junction tables 4. Deploy performance improvements |
| Implicit to explicit migration without data preservation | **CRITICAL** - Data loss, requires restore from backup | 1. Restore database from pre-migration backup 2. Create custom migration with data copy logic 3. Test migration on staging with production data 4. Verify relationship counts before/after 5. Deploy with rollback plan |
| ORM Leak vulnerability from exposed filters | **HIGH** - Security incident, requires patch and audit | 1. Immediate: Deploy filter whitelist to prevent further exploits 2. Audit access logs for suspicious nested queries 3. Verify no cross-tenant data was accessed 4. Add automated security tests for filter injection 5. Consider PostgreSQL RLS as additional defense layer |
| Race condition unique constraint failures | **LOW** - User experience issue, code change only | 1. Add P2002 error handling to return success for duplicates 2. Implement retry logic for P2034 deadlock errors 3. Add frontend request deduplication 4. Monitor error rates to verify fix |
| Missing indexes on multi-tenant junction tables | **MEDIUM** - Database performance degradation, downtime for large tables | 1. Create indexes concurrently to avoid locks: `CREATE INDEX CONCURRENTLY` 2. Monitor query performance improvement 3. Add automated performance regression testing |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Missing companyId in junction tables | Phase 1: Data Model Design | Review Prisma schema for all junction tables have companyId field and compound unique constraints include it |
| ORM Leak via nested query injection | Phase 1: API Design + Phase 2: Security Hardening | Security testing with crafted nested queries, automated tests for filter injection, code review for raw where clause usage |
| N+1 query performance issues | Phase 2: Performance Optimization | Load testing with realistic data volumes (100+ records), query logging shows < 10 queries per request, p95 latency < 100ms |
| Implicit to explicit migration data loss | Phase 1: Data Model Design (prevention) | Start with explicit relationships, document migration strategy if inherited implicit relationships |
| Missing cascade delete configuration | Phase 1: Data Model Design | Schema review for `onDelete: Cascade`, integration tests verify junction records deleted with parent entities |
| Concurrent unique constraint violations | Phase 2: Concurrent Access Handling | Load testing with concurrent requests, P2002 errors return 200/201 not 500, monitoring shows zero unique constraint errors in production |
| Missing tenant filter validation before linking | Phase 1: Business Logic + Phase 2: Security Hardening | Integration tests attempt cross-tenant linking and verify rejection, code review for ownership validation in all link operations |
| Missing indexes on junction tables | Phase 1: Data Model Design | Schema review for `@@index` directives, query execution plans show index usage not sequential scans |
| Orphaned junction records | Phase 3: Data Integrity | Scheduled cleanup job, monitoring dashboard for orphan detection, integration tests for cascade behavior |
| Cross-tenant relationship creation | Phase 1: Business Logic + Phase 2: Security Hardening | Integration tests for cross-tenant prevention, automated security scans, audit log review |

---

## Sources

**Multi-Tenant Isolation & Security:**
- [Multi-Tenancy Implementation Approaches With Prisma and ZenStack](https://zenstack.dev/blog/multi-tenant)
- [Securing Multi-Tenant Applications Using Row Level Security in PostgreSQL with Prisma ORM](https://medium.com/@francolabuschagne90/securing-multi-tenant-applications-using-row-level-security-in-postgresql-with-prisma-orm-4237f4d4bd35)
- [How to make Multi-tenant applications with NestJS and Prisma](https://dev.to/murilogervasio/how-to-make-multi-tenant-applications-with-nestjs-and-a-prisma-proxy-to-automatically-filter-tenant-queries--4kl2)
- [Prisma multi-tenant features? Discussion #2846](https://github.com/prisma/prisma/discussions/2846)

**ORM Leak Vulnerabilities:**
- [ORM Leaking More Than You Joined For - elttam](https://www.elttam.com/blog/leaking-more-than-you-joined-for/)
- [plORMbing your Prisma ORM with Time-based Attacks - elttam](https://www.elttam.com/blog/plorming-your-primsa-orm/)
- [ORM Leak - Payloads All The Things](https://swisskyrepo.github.io/PayloadsAllTheThings/ORM%20Leak/)

**Performance & N+1 Problems:**
- [N+1 Query Problem: Fixing It with SQL and Prisma ORM](https://www.furkanbaytekin.dev/blogs/software/n1-query-problem-fixing-it-with-sql-and-prisma-orm)
- [Prisma ORM Now Lets You Choose the Best Join Strategy](https://www.prisma.io/blog/prisma-orm-now-lets-you-choose-the-best-join-strategy-preview)
- [Query optimization using Prisma Optimize](https://www.prisma.io/docs/orm/prisma-client/queries/query-optimization-performance)
- [Prisma vs Raw SQL: I Measured Query Performance for 30 Days](https://medium.com/javarevisited/prisma-vs-raw-sql-i-measured-query-performance-for-30-days-b97c0ed5aa7d)

**Many-to-Many Relationships:**
- [Many-to-many relations | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/many-to-many-relations)
- [Provide similar `connect` behavior with explicit many-to-many tables - Issue #3266](https://github.com/prisma/prisma/issues/3266)
- [Support ordering query results by field from many-to-many relation - Issue #26748](https://github.com/prisma/prisma/issues/26748)

**Cascade Delete & Orphaned Records:**
- [Cascade onDelete with Explicit Many to Many relationship - Discussion #18137](https://github.com/prisma/prisma/discussions/18137)
- [Configure cascading deletes with Prisma and MySQL](https://www.prisma.io/docs/guides/database/advanced-database-tasks/cascading-deletes/mysql)
- [Special rules for referential actions in SQL Server and MongoDB](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/referential-actions)

**Migration & Data Loss:**
- [Converting Implicit many-to-many relation to Explicit - Prisma Docs](https://www.prisma.io/docs/orm/more/help-and-troubleshooting/implicit-to-explicit-conversion)
- [Add guide for converting implicit to explicit many-to-many - Issue #3325](https://github.com/prisma/docs/issues/3325)

**Transactions & Race Conditions:**
- [Transactions and batch queries | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [prisma.$transaction failing due to write conflict or deadlock - Issue #19559](https://github.com/prisma/prisma/issues/19559)
- [Concurrency Control in Node.js and Prisma: Managing Simultaneous Updates](https://medium.com/@mgoku0707/concurrency-control-in-node-js-and-prisma-managing-simultaneous-updates-56b9f17859e5)
- [Unique constraint failed during $transaction - Issue #9678](https://github.com/prisma/prisma/issues/9678)

**Compound Unique Constraints:**
- [Working with compound IDs and unique constraints | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-composite-ids-and-constraints)
- [Issue with Unique Constraint in Prisma Schema - Discussion #22815](https://github.com/prisma/prisma/discussions/22815)

---
*Pitfalls research for: Many-to-many relationships in multi-tenant booking systems with Prisma*
*Researched: 2026-03-03*
