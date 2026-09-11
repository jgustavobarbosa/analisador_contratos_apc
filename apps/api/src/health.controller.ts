import { Controller, Get } from '@nestjs/common';
import { Public } from './modules/identity/auth/auth.decorators';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok' };
  }
}
