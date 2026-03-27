import type { ApiSuccessHttp } from "@/interfaces/http/api-responses";

export interface CategoryHttp {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  type: "expense" | "income";
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryHttpParams {
  name: string;
  parentId?: string;
  type: "expense" | "income";
}

export type ListCategoriesHttpResponse = ApiSuccessHttp<CategoryHttp[]>;
export type CreateCategoryHttpResponse = ApiSuccessHttp<CategoryHttp>;
