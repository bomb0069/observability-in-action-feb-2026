import { Controller, Get } from '@nestjs/common';
import { PointServiceV2 } from './point-v2.service';

@Controller('v2/point')
export class PointControllerV2 {
  constructor(private readonly pointService: PointServiceV2) {}

  @Get()
  getPoint() {
    console.log('get point v2');
    return this.pointService.getPoint();
  }
}
