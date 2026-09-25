import { Controller, Get } from '@nestjs/common';
import { DemoService } from './demo.service';

@Controller('demo')
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Get()
  getAll() {
    return this.demoService.testAll();
  }

  @Get('utils')
  getUtils() {
    return this.demoService.testUtils();
  }

  @Get('types')
  getTypes() {
    return this.demoService.testTypes();
  }

  @Get('db')
  getDb() {
    return this.demoService.testDb();
  }
}
