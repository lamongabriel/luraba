"use client";

import { motion } from "framer-motion";

import { NetWorthChart } from "@/components/finance/net-worth-chart";
import { netWorthHistory } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <div>
      <NetWorthChart data={netWorthHistory} />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.45, ease: "easeOut" }}
        className="h-100 w-full bg-chart-2/8"
      />
    </div>
  );
}
