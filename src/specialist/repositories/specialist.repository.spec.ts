import { Test, TestingModule } from '@nestjs/testing';
import { SpecialistRepository } from './specialist.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

describe('SpecialistRepository', () => {
  let repository: SpecialistRepository;
  let prismaService: PrismaService;

  const mockPrismaService = {
    specialist: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpecialistRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<SpecialistRepository>(SpecialistRepository);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a specialist with organizationId', async () => {
      const createData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        organizationId: 'org-123',
      };

      const expectedResult = { id: 'spec-1', ...createData };
      mockPrismaService.specialist.create.mockResolvedValue(expectedResult);

      const result = await repository.create(createData, 'org-123');

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.specialist.create).toHaveBeenCalledWith({
        data: createData,
      });
    });
  });

  describe('findById', () => {
    it('should find specialist by id with tenant filtering', async () => {
      const specialist = {
        id: 'spec-1',
        organizationId: 'org-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      mockPrismaService.specialist.findFirst.mockResolvedValue(specialist);

      const result = await repository.findById('spec-1', 'org-123');

      expect(result).toEqual(specialist);
      expect(mockPrismaService.specialist.findFirst).toHaveBeenCalledWith({
        where: { id: 'spec-1', organizationId: 'org-123' },
      });
    });

    it('should return null if specialist not found', async () => {
      mockPrismaService.specialist.findFirst.mockResolvedValue(null);

      const result = await repository.findById('spec-999', 'org-123');

      expect(result).toBeNull();
    });
  });

  describe('findMany', () => {
    it('should find all specialists with tenant filtering and pagination', async () => {
      const specialists = [
        {
          id: 'spec-1',
          organizationId: 'org-123',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
        {
          id: 'spec-2',
          organizationId: 'org-123',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        },
      ];

      mockPrismaService.$transaction.mockResolvedValue([specialists, 2]);

      const result = await repository.findMany('org-123', { skip: 0, take: 20 });

      expect(result).toEqual({ data: specialists, total: 2 });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update specialist after ownership validation', async () => {
      const updateData = { firstName: 'Jane' };
      const existingSpecialist = {
        id: 'spec-1',
        organizationId: 'org-123',
      };
      const updatedSpecialist = {
        ...existingSpecialist,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      mockPrismaService.specialist.findUnique.mockResolvedValue(existingSpecialist);
      mockPrismaService.specialist.update.mockResolvedValue(updatedSpecialist);

      const result = await repository.update('spec-1', updateData, 'org-123');

      expect(result).toEqual(updatedSpecialist);
      expect(mockPrismaService.specialist.findUnique).toHaveBeenCalledWith({
        where: { id: 'spec-1' },
        select: { organizationId: true },
      });
      expect(mockPrismaService.specialist.update).toHaveBeenCalledWith({
        where: { id: 'spec-1' },
        data: updateData,
      });
    });

    it('should throw ForbiddenException if specialist belongs to different tenant', async () => {
      const updateData = { firstName: 'Jane' };
      const existingSpecialist = {
        organizationId: 'org-456',
      };

      mockPrismaService.specialist.findUnique.mockResolvedValue(existingSpecialist);

      await expect(
        repository.update('spec-1', updateData, 'org-123')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw error if specialist not found', async () => {
      mockPrismaService.specialist.findUnique.mockResolvedValue(null);

      await expect(
        repository.update('spec-999', { firstName: 'Jane' }, 'org-123')
      ).rejects.toThrow('Entity spec-999 not found');
    });
  });

  describe('delete', () => {
    it('should delete specialist after ownership validation', async () => {
      const existingSpecialist = {
        id: 'spec-1',
        organizationId: 'org-123',
      };

      mockPrismaService.specialist.findUnique.mockResolvedValue(existingSpecialist);
      mockPrismaService.specialist.delete.mockResolvedValue(existingSpecialist);

      await repository.delete('spec-1', 'org-123');

      expect(mockPrismaService.specialist.findUnique).toHaveBeenCalledWith({
        where: { id: 'spec-1' },
        select: { organizationId: true },
      });
      expect(mockPrismaService.specialist.delete).toHaveBeenCalledWith({
        where: { id: 'spec-1' },
      });
    });

    it('should throw ForbiddenException if specialist belongs to different tenant', async () => {
      const existingSpecialist = {
        organizationId: 'org-456',
      };

      mockPrismaService.specialist.findUnique.mockResolvedValue(existingSpecialist);

      await expect(repository.delete('spec-1', 'org-123')).rejects.toThrow(
        ForbiddenException
      );
    });
  });
});
