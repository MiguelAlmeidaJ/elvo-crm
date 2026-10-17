import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './modules/health/health.controller';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { SessionGuard } from './modules/auth/session.guard';
import { ContactsController } from './modules/contacts/contacts.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule],
  controllers: [HealthController, AuthController, ContactsController],
  providers: [AuthService, SessionGuard],
})
export class AppModule {}
