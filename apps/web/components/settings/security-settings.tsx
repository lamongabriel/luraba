"use client";

import { useState } from "react";
import { SectionCard } from "@/components/section/section-card";
import { Button } from "@/components/ui/button";
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
      <SectionCard
        title="Password"
        description="Use a strong password you do not reuse elsewhere."
        contentClassName="space-y-4"
      >
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
      </SectionCard>
      <SectionCard title="Sessions" description="Sign out any other devices using your account.">
        <Button variant="outline" isLoading={sessions.isPending} onClick={() => sessions.mutate()}>
          Sign out other sessions
        </Button>
      </SectionCard>
    </div>
  );
}
