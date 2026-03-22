import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Point } from './point.entity';
import { CreatePointDto } from './point.dto';

@Injectable()
export class PointService {
  constructor(
    @InjectRepository(Point)
    private pointRepository: Repository<Point>,
  ) {}

  async getPoint(): Promise<any> {
    const points = await this.pointRepository.find();

    // Simulate CPU-intensive work: calculate bonus multiplier for each point
    const enrichedPoints = points.map((point) => ({
      ...point,
      bonusMultiplier: this.calculateBonusMultiplier(point.amount),
      riskScore: this.computeRiskScore(point.userId, point.amount),
    }));

    return enrichedPoints;
  }

  /**
   * Simulate CPU-intensive bonus calculation
   * using repeated hashing — visible in flame graph
   */
  private calculateBonusMultiplier(amount: number): number {
    let hash = amount;
    for (let i = 0; i < 500_000; i++) {
      hash = (hash * 31 + i) | 0;
      hash = hash ^ (hash >>> 16);
    }
    return Math.round((1.0 + Math.abs(hash % 100) / 100.0) * 100) / 100;
  }

  /**
   * Simulate CPU-intensive risk scoring
   * using trigonometric computation — visible in flame graph
   */
  private computeRiskScore(userId: number, amount: number): number {
    let score = 0.0;
    for (let i = 0; i < 200_000; i++) {
      score += Math.sin(i * 0.001 + userId) * Math.cos(i * 0.002 + amount);
      score = Math.abs(score) % 1000.0;
    }
    return Math.round(score * 100) / 100;
  }

  async deductPoint(point: CreatePointDto): Promise<Point> {
    return await this.pointRepository.save(point);
  }
}
