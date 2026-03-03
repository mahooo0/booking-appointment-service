import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Entity types supported by validation
 */
export type EntityType = 'specialist' | 'service' | 'location';

/**
 * Entity reference for validation
 */
export interface EntityReference {
  type: EntityType;
  id: string;
}

/**
 * Validates that all entities belong to same tenant before creating relationships (TENANT-04)
 *
 * Prevents cross-tenant data leaks by verifying entity ownership.
 * Critical for Phase 3 relationship operations (assign service to specialist, etc.)
 *
 * @param prisma - PrismaService instance
 * @param tenantId - Expected tenant ID (from AccountId decorator)
 * @param entities - Array of entity references to validate
 * @throws ForbiddenException if any entity not found or belongs to different tenant
 *
 * @example
 * // Before creating SpecialistService relationship:
 * await validateSameTenantEntities(prisma, tenantId, [
 *   { type: 'specialist', id: specialistId },
 *   { type: 'service', id: serviceId }
 * ]);
 *
 * // Now safe to create relationship - both entities confirmed in same tenant
 */
export async function validateSameTenantEntities(
  prisma: PrismaService,
  tenantId: string,
  entities: EntityReference[]
): Promise<void> {
  if (!tenantId) {
    throw new Error('organizationId is required for tenant validation');
  }

  const checks = entities.map(async (entity) => {
    let record: { organizationId: string } | null = null;

    // Fetch entity based on type
    switch (entity.type) {
      case 'specialist':
        record = await prisma.specialist.findUnique({
          where: { id: entity.id },
          select: { organizationId: true },
        });
        break;
      case 'service':
        record = await prisma.service.findUnique({
          where: { id: entity.id },
          select: { organizationId: true },
        });
        break;
      case 'location':
        record = await prisma.location.findUnique({
          where: { id: entity.id },
          select: { organizationId: true },
        });
        break;
    }

    // Entity not found
    if (!record) {
      throw new ForbiddenException(
        `${entity.type} with id ${entity.id} not found`
      );
    }

    // Entity belongs to different tenant (CRITICAL: prevents cross-tenant leaks)
    if (record.organizationId !== tenantId) {
      throw new ForbiddenException(
        `Access denied: ${entity.type} ${entity.id} does not belong to tenant ${tenantId}`
      );
    }
  });

  // Run all checks in parallel
  await Promise.all(checks);
}

/**
 * Validates single entity ownership
 * @param prisma - PrismaService instance
 * @param tenantId - Expected tenant ID
 * @param entityType - Entity type to validate
 * @param entityId - Entity ID to validate
 * @throws ForbiddenException if entity not found or wrong tenant
 */
export async function validateEntityOwnership(
  prisma: PrismaService,
  tenantId: string,
  entityType: EntityType,
  entityId: string
): Promise<void> {
  await validateSameTenantEntities(prisma, tenantId, [
    { type: entityType, id: entityId }
  ]);
}
