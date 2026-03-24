import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const categories = [
  "Food & Drink",
  "Travel",
  "Gaming & Hobbies",
  "Office & Computing",
  "Taxes",
  "Investment Contributions",
]

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="font-heading text-3xl">Categories</h1>
        <p className="text-sm text-muted-foreground">Keep your spending and income taxonomy organized.</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Category list</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div key={category} className="rounded-lg border p-3 text-sm">
              {category}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
