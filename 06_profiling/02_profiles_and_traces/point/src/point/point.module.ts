import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointService } from './point.service';
import { PointController } from './point.controller';
import { PointServiceV2 } from './point-v2.service';
import { PointControllerV2 } from './point-v2.controller';
import { Point } from './point.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Point])],
  providers: [PointService, PointServiceV2],
  controllers: [PointController, PointControllerV2],
})
export class PointModule {}
