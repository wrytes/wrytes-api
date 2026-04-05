import { Injectable, NotFoundException } from '@nestjs/common';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../core/database/prisma.service';

export class UpsertProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;
}

@Injectable()
export class UserProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, dto: UpsertProfileDto) {
    const { dateOfBirth, ...rest } = dto;
    const data = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined),
    ) as Partial<Omit<UpsertProfileDto, 'dateOfBirth'>>;

    if (dateOfBirth !== undefined) {
      (data as any).dateOfBirth = new Date(dateOfBirth);
    }

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
