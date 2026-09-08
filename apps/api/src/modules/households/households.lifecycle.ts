import * as householdsService from "./households.service";

export async function provisionHouseholdForUser(user: {
  id: string;
  email: string;
}): Promise<string | null> {
  return householdsService.provisionDefaultHouseholdForUser(user.id, user.email);
}
