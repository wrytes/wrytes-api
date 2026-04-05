import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

export class UpsertProfileDto {
  firstName?: string;
  lastName?: string;
  businessName?: string;
  dateOfBirth?: Date;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

@Injectable()
export class UserProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, dto: UpsertProfileDto) {
    const data = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    ) as Partial<UpsertProfileDto>;

    return this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, firstName: '', lastName: '', ...data },
      update: { ...data, updatedAt: new Date() },
    });
  }

  async get(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async findOrNull(userId: string) {
    return this.prisma.userProfile.findUnique({ where: { userId } });
  }

  async verify(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found for this user');
    return this.prisma.userProfile.update({
      where: { userId },
      data: { isVerified: true, verifiedAt: new Date() },
    });
  }

  async unverify(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found for this user');
    return this.prisma.userProfile.update({
      where: { userId },
      data: { isVerified: false, verifiedAt: null },
    });
  }
}
