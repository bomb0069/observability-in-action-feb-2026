import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Point } from './point.entity';
import { trace } from '@opentelemetry/api';

/**
 * V2 — same logic as V1 but with manual OTel spans
 * to demonstrate the difference between:
 *   - V1: zero-code (auto) instrumentation — CPU methods invisible in trace
 *   - V2: code instrumentation with tracer.startActiveSpan — CPU methods visible as spans
 */
@Injectable()
export class PointServiceV2 {
  private tracer = trace.getTracer('point-service');

  constructor(
    @InjectRepository(Point)
    private pointRepository: Repository<Point>,
  ) {}

  async getPoint(): Promise<any> {
    const points = await this.pointRepository.find();

    const enrichedPoints = points.map((point) => ({
      ...point,
      bonusMultiplier: this.calculateBonusMultiplier(point.amount),
      riskScore: this.computeRiskScore(point.userId, point.amount),
    }));

    return enrichedPoints;
  }

  /**
   * Custom span wrapping CPU-intensive bonus calculation
   * — visible in trace as "PointServiceV2.calculateBonusMultiplier"
   */
  private calculateBonusMultiplier(amount: number): number {
    return this.tracer.startActiveSpan(
      'PointServiceV2.calculateBonusMultiplier',
      (span) => {
        span.setAttribute('amount', amount);
        let hash = amount;
        for (let i = 0; i < 500_000; i++) {
          hash = (hash * 31 + i) | 0;
          hash = hash ^ (hash >>> 16);
        }
        const result =
          Math.round((1.0 + Math.abs(hash % 100) / 100.0) * 100) / 100;
        span.end();
        return result;
      },
    );
  }

  /**
   * Custom span wrapping CPU-intensive risk scoring
   * — visible in trace as "PointServiceV2.computeRiskScore"
   */
  private computeRiskScore(userId: number, amount: number): number {
    return this.tracer.startActiveSpan(
      'PointServiceV2.computeRiskScore',
      (span) => {
        span.setAttribute('userId', userId);
        span.setAttribute('amount', amount);
        let score = 0.0;
        for (let i = 0; i < 200_000; i++) {
          score +=
            Math.sin(i * 0.001 + userId) * Math.cos(i * 0.002 + amount);
          score = Math.abs(score) % 1000.0;
        }
        const result = Math.round(score * 100) / 100;
        span.end();
        return result;
      },
    );
  }
}
