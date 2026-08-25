import { listCountries, listTimezones } from '@/shared/data/location-data';
import type { GetLocationOptionsResponse } from './reference-data.types';

export function getLocationOptions(): GetLocationOptionsResponse {
  return {
    countries: [...listCountries()],
    timezones: [...listTimezones()],
  };
}
