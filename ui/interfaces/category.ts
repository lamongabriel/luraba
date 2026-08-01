export type CategoryType = "expense" | "income"

export interface Category {
  id: string
  name: string
  type: CategoryType
  parentId: string | null
  color: string | null
  icon: string | null
  createdAt: string
  updatedAt: string
}
