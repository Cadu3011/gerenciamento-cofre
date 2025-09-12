import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthService } from './auth.service';
import { authTrier } from './authTrier/loginTrier';

@Controller('auth')
export class AuthController {
  @Inject()
  private readonly authService: AuthService;

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  async signin(
    @Body()
    body: Prisma.UserCreateInput,
  ) {
    const tokenTrier = await authTrier({
      login: String(body.login),
      password: body.password,
    });
    this.authService.setTokenTrier(tokenTrier);
    return {
      access_token: await this.authService.signin(body),
      tokenTrier: await authTrier({
        login: String(body.login),
        password: body.password,
      }),
    };
  }
}
