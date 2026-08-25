"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { ErrorState } from "@/components/error-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useUpdateProfileMutation } from "@/mutations/settings/use-settings-mutations"
import { authQueryKeys } from "@/queries/auth/use-auth-providers-query"
import { useCurrentUserQuery } from "@/queries/auth/use-current-user-query"

export function ProfileSettings() {
  const user = useCurrentUserQuery()
  const client = useQueryClient()
  const mutation = useUpdateProfileMutation({
    onSuccess: () =>
      client.invalidateQueries({ queryKey: authQueryKeys.session }),
  })
  const [name, setName] = useState("")
  const [image, setImage] = useState("")
  useEffect(() => {
    if (user.data) {
      setName(user.data.user.name)
      setImage(
        "image" in user.data.user && typeof user.data.user.image === "string"
          ? user.data.user.image
          : "",
      )
    }
  }, [user.data])
  if (user.isLoading) return <Skeleton className="h-72" />
  if (user.isError || !user.data)
    return (
      <ErrorState
        title="Couldn't load your profile"
        description={user.error?.message}
        onRetry={() => user.refetch()}
      />
    )
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <p className="text-xs text-muted-foreground">
          Your name and avatar are shown across the workspace.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="profile-name">Name</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-image">Avatar URL</Label>
          <Input
            id="profile-image"
            type="url"
            value={image}
            onChange={(event) => setImage(event.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" value={user.data.user.email} disabled />
        </div>
        <div className="flex justify-end">
          <Button
            isLoading={mutation.isPending}
            onClick={() => mutation.mutate({ name, image: image || null })}
          >
            Save profile
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
