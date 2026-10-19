import { Body, Controller, Get, Headers, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';
type CookieResponse = { setHeader(name: string, value: string): void };
import { AuthService } from './auth.service';
import { SessionGuard } from './session.guard';
import type { AuthenticatedRequest } from './auth.types';

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
class SwitchOrganizationDto { @IsUUID() organizationId!: string; }
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('bootstrap') bootstrap(@Body() dto: SetupDto) { return this.auth.bootstrap(dto); }
  @Post('login') @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: CookieResponse) {
    const result = await this.auth.login(dto.email, dto.password);
    res.setHeader('Set-Cookie', this.auth.sessionCookie(result.identity));
    return result.user;
  }
  @Post('logout') @HttpCode(200)
  logout(@Res({ passthrough: true }) res: CookieResponse) {
    res.setHeader('Set-Cookie', this.auth.clearCookie());
    return { ok: true };
  }
  @Get('me') @UseGuards(SessionGuard)
  me(@Headers('cookie') cookie?: string) { return this.auth.me(this.auth.readCookie(cookie)); }
  @Post('switch-organization') @HttpCode(200) @UseGuards(SessionGuard)
  async switchOrganization(@Req() request: AuthenticatedRequest, @Body() dto: SwitchOrganizationDto, @Res({ passthrough: true }) response: CookieResponse) {
    const identity = await this.auth.switchOrganization(request.identity, dto.organizationId);
    response.setHeader('Set-Cookie', this.auth.sessionCookie(identity));
    return this.auth.me(identity);
  }
}
