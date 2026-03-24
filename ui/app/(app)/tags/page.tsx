import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const tags = ["shared", "business", "family", "travel", "subscription", "credit-card"]

export default function TagsPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="font-heading text-3xl">Tags</h1>
        <p className="text-sm text-muted-foreground">Flexible labels for cross-cutting transaction context.</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Tag library</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
