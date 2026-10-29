import type { BankProfile } from "../types.js";
import { interProfile } from "./inter.js";
import { nubankProfile } from "./nubank.js";

/** Add a bank by adding a profile here; adapters look it up by id or by the OFX institution. */
export const bankProfiles: readonly BankProfile[] = [nubankProfile, interProfile];

export function findProfileByOfx(institution: {
  org?: string;
  fid?: string;
  bankId?: string;
}): BankProfile | undefined {
  return bankProfiles.find((profile) => profile.matchesOfx(institution));
}
