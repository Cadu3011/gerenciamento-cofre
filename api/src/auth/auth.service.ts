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
import { authTrier } from './authTrier/loginTrier';

@Injectable()
export class AuthService {
  @Inject()
  private readonly prisma: PrismaService;

  @Inject()
  private readonly jtwService: JwtService;

  private tokenTrier: string | null = null;

  async signin(params: Prisma.UserCreateInput): Promise<any> {
    const user = await this.prisma.user.findFirst({
      where: { login: params.login },
      include: {
        filial: {
          select: { idCofreTrier: true },
        },
      },
    });

    if (!user) throw new NotFoundException('user not found');
    const passwordMatch = await bcrypt.compare(params.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');
    if (user.role === 'OPERADOR') {
      this.tokenTrier = await authTrier({
        login: String(params.login),
        password: params.password,
      });
      const payload = {
        sub: user.id,
        roles: user.role,
        filialId: user.filialId,
        cofreIdTrier: user.filial.idCofreTrier,
        tokenTrier: this.tokenTrier,
      };
      return await this.jtwService.signAsync(payload);
    }
    const payload = {
      sub: user.id,
      roles: user.role,
      filialId: user.filialId,
    };
    return await this.jtwService.signAsync(payload);
  }
}
