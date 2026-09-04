import type { LocationOptionsResponse } from '@luraba/contracts/reference-data';
import { listCountries, listTimezones } from '@/shared/data/location-data';

export function getLocationOptions(): LocationOptionsResponse {
  return {
    countries: [...listCountries()],
    timezones: [...listTimezones()],
  };
}
