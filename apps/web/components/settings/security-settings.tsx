"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useChangePasswordMutation,
  useRevokeOtherSessionsMutation,
} from "@/mutations/settings/use-settings-mutations";

export function SecuritySettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const password = useChangePasswordMutation();
  const sessions = useRevokeOtherSessionsMutation();
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <p className="text-xs text-muted-foreground">
            Use a strong password you do not reuse elsewhere.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button
              isLoading={password.isPending}
              onClick={() =>
                password.mutate({
                  currentPassword,
                  newPassword,
                  revokeOtherSessions: false,
                })
              }
            >
              Change password
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <p className="text-xs text-muted-foreground">
            Sign out any other devices using your account.
          </p>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            isLoading={sessions.isPending}
            onClick={() => sessions.mutate()}
          >
            Sign out other sessions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
