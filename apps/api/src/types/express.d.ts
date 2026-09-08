import "express";
import type { HouseholdContext } from "@/config/permissions";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
      household?: HouseholdContext;
    }
  }
}
