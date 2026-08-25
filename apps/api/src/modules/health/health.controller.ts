import type { NextFunction, Request, Response } from 'express';
import * as healthService from './health.service';

export async function get(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const report = await healthService.getHealth();
    res.status(report.status === 'error' ? 503 : 200).json(report);
  } catch (error) {
    next(error);
  }
}
