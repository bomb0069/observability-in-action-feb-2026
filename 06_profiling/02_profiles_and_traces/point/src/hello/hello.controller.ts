import { Controller, Get } from '@nestjs/common';
import { HelloService } from './hello.service';

@Controller('v1/hello')
export class HelloController {
  constructor(private readonly helloService: HelloService) {}

  @Get()
  getHello(): string {
    return this.helloService.getHello();
  }
}