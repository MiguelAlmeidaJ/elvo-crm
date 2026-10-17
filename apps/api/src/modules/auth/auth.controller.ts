import { Body, Controller, Get, Headers, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { SessionGuard } from './session.guard';

class LoginDto {
  @IsEmail() email!: string;
  @IsString() @IsNotEmpty() password!: string;
}
class SetupDto {
  @IsString() @IsNotEmpty() key!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(12) password!: string;
  @IsString() @IsNotEmpty() organization!: string;
}
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('bootstrap') bootstrap(@Body() dto: SetupDto) { return this.auth.bootstrap(dto); }
  @Post('login') @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto.email, dto.password);
    res.setHeader('Set-Cookie', this.auth.sessionCookie(result.identity));
    return result.user;
  }
  @Post('logout') @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Set-Cookie', this.auth.clearCookie());
    return { ok: true };
  }
  @Get('me') @UseGuards(SessionGuard)
  me(@Headers('cookie') cookie?: string) { return this.auth.me(this.auth.readCookie(cookie)); }
}
