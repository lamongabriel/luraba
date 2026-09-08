import type { db } from "@/db";

export type TxClient = Parameters<Parameters<typeof db.transaction>[0]>[0];
