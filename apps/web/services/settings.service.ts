"use client";

import { lurabaAuthApiClient } from "@/api/luraba-auth-api";

type AuthSettingsClient = {
  updateUser: (input: { name?: string; image?: string | null }) => Promise<unknown>;
  changePassword: (input: {
    currentPassword: string;
    newPassword: string;
    revokeOtherSessions?: boolean;
  }) => Promise<unknown>;
  revokeOtherSessions: () => Promise<unknown>;
};

const authSettingsClient = lurabaAuthApiClient as unknown as AuthSettingsClient;

export function updateProfile(input: { name: string; image?: string | null }) {
  return authSettingsClient.updateUser(input);
}

export function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
}) {
  return authSettingsClient.changePassword(input);
}

export function revokeOtherSessions() {
  return authSettingsClient.revokeOtherSessions();
}
