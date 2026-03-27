"use client";

import { useQuery } from "@tanstack/react-query";
import { listCategories } from "@/services/categories.service";

export const useCategoriesQuery = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
  });
};
