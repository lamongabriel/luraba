import { healthEndpoints } from '@luraba/contracts/health';
import type { NextFunction, Request, Response } from 'express';
import * as healthService from './health.service';

export async function get(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const report = await healthService.getHealth();
    const response = healthEndpoints.get.response?.parse(report);
    res.status(report.status === 'error' ? 503 : 200).json(response);
  } catch (error) {
    next(error);
  }
}
