import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/finance/page-header"
import { Typography } from "@/components/ui/typography"

const tags = ["shared", "business", "family", "travel", "subscription", "credit-card"]

export default function TagsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Tags" />

      <Card>
        <CardHeader>
          <CardTitle>Tag library</CardTitle>
          <Typography variant="body-muted">
            Shared labels are presented through the same reusable typography variants.
          </Typography>
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
