import type { HouseholdContext } from "@/config/permissions";
import { ValidationError } from "@/shared/errors";
import { getUpload } from "./uploads.repository";

/** A picture field must point at an image upload of this household (attach it first, then set it). */
export async function assertHouseholdImageUpload(
  context: HouseholdContext,
  uploadId: string,
  field: string,
): Promise<void> {
  const upload = await getUpload(uploadId);
  if (
    upload?.scope !== "household" ||
    upload.householdId !== context.householdId ||
    upload.kind !== "image"
  ) {
    throw new ValidationError(`${field} must be an image uploaded to this household`);
  }
}
