"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CountrySelectControl } from "@/components/display";
import { ErrorState } from "@/components/error-state";
import { SectionCard, SectionFields } from "@/components/section/section-card";
import { AvatarField } from "@/components/settings/avatar-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/masked-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { useUpdateUserProfileMutation } from "@/mutations/auth/use-update-user-profile-mutation";
import { useUpdateProfileMutation } from "@/mutations/settings/use-settings-mutations";
import { authQueryKeys } from "@/queries/auth/use-auth-providers-query";
import { useCurrentUserQuery } from "@/queries/auth/use-current-user-query";

export function ProfileSettings() {
  const user = useCurrentUserQuery();
  const client = useQueryClient();
  const nameMutation = useUpdateProfileMutation();
  const profileMutation = useUpdateUserProfileMutation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [birthDate, setBirthDate] = useState("");
  useEffect(() => {
    if (user.data) {
      setName(user.data.user.name);
      setPhone(user.data.user.phoneNumber ?? "");
      setCountry(user.data.user.countryCode ?? "");
      setBirthDate(user.data.user.dateOfBirth ?? "");
    }
  }, [user.data]);
  const saving = nameMutation.isPending || profileMutation.isPending;
  async function save(currentName: string, image: string | null) {
    try {
      if (name !== currentName) await nameMutation.mutateAsync({ name, image });
      await profileMutation.mutateAsync({
        phoneNumber: phone.replace(/[\s().-]/gu, "") || null,
        countryCode: country || null,
        dateOfBirth: birthDate || null,
      });
      await client.invalidateQueries({ queryKey: authQueryKeys.session });
      toast.success("Profile saved");
    } catch {
      // The mutations already toasted the failure.
    }
  }
  const currentImage = user.data?.user.image ?? null;
  if (user.isLoading) return <Skeleton className="h-72" />;
  if (user.isError || !user.data)
    return (
      <ErrorState
        title="Couldn't load your profile"
        description={user.error?.message}
        onRetry={() => user.refetch()}
      />
    );
  return (
    <>
      <SectionCard
        title="Identity"
        description="Your photo, name and email shown across the workspace."
      >
        <AvatarField userId={user.data.user.id} name={user.data.user.name} image={currentImage}>
          <div className="min-w-0">
            <Typography as="h2" variant="section-title" className="truncate">
              {user.data.user.name}
            </Typography>
            <Typography variant="small-muted" className="mt-1 truncate">
              {user.data.user.email}
            </Typography>
          </div>
        </AvatarField>
      </SectionCard>
      <SectionCard
        title="Details"
        description="Used to personalize Luraba, send SMS alerts and apply the right regional rules."
        footer={
          <Button isLoading={saving} onClick={() => void save(user.data.user.name, currentImage)}>
            Save profile
          </Button>
        }
      >
        <SectionFields columns={2}>
          <div className="space-y-2">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" value={user.data.user.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-phone">Phone number</Label>
            <Input
              id="profile-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+15551234567"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <p className="text-[0.7rem] text-muted-foreground">
              International format, starting with +. Used for SMS notifications.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-country">Country</Label>
            <CountrySelectControl id="profile-country" value={country} onChange={setCountry} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-birth-date">Date of birth</Label>
            <DateInput
              id="profile-birth-date"
              value={birthDate}
              onValueChange={setBirthDate}
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>
        </SectionFields>
      </SectionCard>
    </>
  );
}
