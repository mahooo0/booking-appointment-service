# Repository Pattern - Multi-Tenant Best Practices

## Overview

All entity repositories MUST extend `BaseRepository` to ensure automatic tenant filtering. This prevents cross-tenant data leaks and provides consistent query patterns.

## Usage Pattern

### 1. Extend BaseRepository

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { BaseRepository } from '@/common/repositories/base.repository';

@Injectable()
export class SpecialistRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
}
```

### 2. Use buildWhereWithTenant for Queries

```typescript
async findById(id: string, tenantId: string) {
  const where = this.buildWhereWithTenant({ id }, tenantId);
  return this.prisma.specialist.findFirst({ where });
}

async findMany(tenantId: string, filters: { isTopMaster?: boolean }) {
  const where = this.buildWhereWithTenant(filters, tenantId);
  return this.prisma.specialist.findMany({ where });
}
```

### 3. Always Pass tenantId from Controller

Controller extracts tenantId using AccountId decorator:

```typescript
import { AccountId } from '@/common/decorators/account-id.decorator';

@Controller('specialists')
export class SpecialistController {
  constructor(private readonly repository: SpecialistRepository) {}

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @AccountId() tenantId: string // Extracts from x-account-id header
  ) {
    return this.repository.findById(id, tenantId);
  }
}
```

### 4. Validate Entity Ownership Before Updates/Deletes

```typescript
async update(id: string, tenantId: string, data: UpdateSpecialistDto) {
  // Validate entity belongs to tenant BEFORE update
  await this.validateEntityOwnership(
    id,
    tenantId,
    (entityId) => this.prisma.specialist.findUnique({
      where: { id: entityId },
      select: { organizationId: true }
    })
  );

  // Now safe to update
  return this.prisma.specialist.update({
    where: { id },
    data
  });
}
```

## Multi-Tenant Safety Checklist

- [ ] Repository extends BaseRepository
- [ ] All queries use buildWhereWithTenant helper
- [ ] tenantId extracted from AccountId decorator in controller
- [ ] Update/delete operations validate ownership first
- [ ] No raw Prisma queries bypass tenant filtering
- [ ] Tests cover cross-tenant access scenarios

## Anti-Patterns (DO NOT DO)

❌ **Direct Prisma queries without tenant filtering:**
```typescript
// WRONG: No tenant filtering
return this.prisma.specialist.findMany();
```

❌ **Hardcoded tenant IDs:**
```typescript
// WRONG: Should come from AccountId decorator
const tenantId = 'company-123';
```

❌ **Skipping ownership validation:**
```typescript
// WRONG: No validation before delete
async delete(id: string) {
  return this.prisma.specialist.delete({ where: { id } });
}
```

## Phase 3 Relationship Validation

For relationship operations (assign service to specialist), use validation helpers:

```typescript
import { validateSameTenantEntities } from '@/common/helpers/validation.helper';

async assignServiceToSpecialist(
  specialistId: string,
  serviceId: string,
  tenantId: string
) {
  // CRITICAL: Validate both entities belong to same tenant
  await validateSameTenantEntities(this.prisma, tenantId, [
    { type: 'specialist', id: specialistId },
    { type: 'service', id: serviceId }
  ]);

  // Now safe to create relationship
  return this.prisma.specialistService.upsert({
    where: {
      organizationId_specialistId_serviceId: {
        organizationId: tenantId,
        specialistId,
        serviceId
      }
    },
    update: {},
    create: { organizationId: tenantId, specialistId, serviceId }
  });
}
```

See `src/common/helpers/validation.helper.ts` for details.

## Testing

All repositories should include tests for:
1. Cross-tenant isolation (user A cannot access user B's data)
2. Ownership validation (update/delete fails if wrong tenant)
3. Relationship validation (cannot link entities across tenants)

Example test structure:
```typescript
describe('SpecialistRepository', () => {
  it('should not return specialists from other tenants', async () => {
    // Create specialist in tenant A
    const specialistA = await repository.create({
      organizationId: 'tenant-a',
      firstName: 'John',
      // ...
    });

    // Query from tenant B should return nothing
    const result = await repository.findById(specialistA.id, 'tenant-b');
    expect(result).toBeNull();
  });
});
```
