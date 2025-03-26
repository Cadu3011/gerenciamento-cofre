import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class AuthService {
  @Inject()
  private readonly prisma: PrismaService;

  @Inject()
  private readonly jtwService: JwtService;

  async signin(
    params: Prisma.UserCreateInput,
  ): Promise<{ access_token: String; role: string }> {
    const user = await this.prisma.user.findFirst({
      where: { login: params.login },
    });
    if (!user) throw new NotFoundException('user not found');
    const passwordMatch = await bcrypt.compare(params.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');
    const payload = { sub: user.id, roles: user.role, filialId: user.filialId };
    return {
      access_token: await this.jtwService.signAsync(payload),
      role: user.role,
    };
  }
}
