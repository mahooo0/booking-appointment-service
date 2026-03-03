import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Base repository with automatic tenant filtering.
 * All entity repositories should extend this class.
 */
export abstract class BaseRepository {
  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Injects tenant field into where clause to enforce tenant isolation (TENANT-01)
   * @param where - Existing where clause
   * @param tenantId - Tenant identifier from AccountId decorator
   * @returns Where clause with tenant field added
   * @throws Error if tenantId is missing (fail-safe)
   */
  protected buildWhereWithTenant<T extends Record<string, any>>(
    where: T,
    tenantId: string
  ): T & { organizationId: string } {
    if (!tenantId) {
      throw new Error('organizationId is required for tenant-scoped queries');
    }

    return {
      ...where,
      organizationId: tenantId, // Use actual field name from Plan 01
    };
  }

  /**
   * Validates that entity belongs to specified tenant (TENANT-02)
   * @param entityId - Entity UUID to validate
   * @param tenantId - Expected tenant ID
   * @param findFn - Function to fetch entity (returns { organizationId: string } | null)
   * @throws Error if entity not found
   * @throws ForbiddenException if entity belongs to different tenant
   */
  protected async validateEntityOwnership(
    entityId: string,
    tenantId: string,
    findFn: (id: string) => Promise<{ organizationId: string } | null>
  ): Promise<void> {
    const entity = await findFn(entityId);

    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    if (entity.organizationId !== tenantId) {
      throw new ForbiddenException(
        `Access denied: Entity ${entityId} does not belong to tenant ${tenantId}`
      );
    }
  }

  /**
   * Builds paginated query result with tenant filtering
   * @param tenantId - Tenant identifier
   * @param where - Additional where filters
   * @param pagination - Skip/take for pagination
   * @returns Promise of { data: T[], total: number }
   */
  protected async findManyWithTenant<T>(
    model: any, // Prisma model delegate (e.g., this.prisma.specialist)
    tenantId: string,
    where: Record<string, any> = {},
    pagination: { skip?: number; take?: number } = {}
  ): Promise<{ data: T[]; total: number }> {
    const baseWhere = this.buildWhereWithTenant(where, tenantId);

    const [data, total] = await this.prisma.$transaction([
      model.findMany({
        where: baseWhere,
        skip: pagination.skip,
        take: pagination.take,
      }),
      model.count({ where: baseWhere }),
    ]);

    return { data, total };
  }
}
