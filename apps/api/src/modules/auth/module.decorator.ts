import { SetMetadata } from '@nestjs/common';
import type { ModuleKey } from '@prisma/client';

export const MODULE_KEY = 'elvo_module';
export const RequireModule = (module: ModuleKey) => SetMetadata(MODULE_KEY, module);
