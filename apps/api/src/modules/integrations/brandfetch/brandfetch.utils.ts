import { BRANDFETCH_CDN_URL, BRANDFETCH_VALIDATION_DOMAIN } from '@/config/integrations';
import { DependencyUnavailableError, ValidationError } from '@/shared/errors';
import { INSTITUTION_DOMAIN_ERROR, normalizeDomain } from '@/shared/validation/domain';

export function normalizeBrandDomain(value: string): string {
  const domain = normalizeDomain(value);

  if (!domain) throw new ValidationError(INSTITUTION_DOMAIN_ERROR);

  return domain;
}

export function buildBrandfetchLogoUrl(domain: string, clientId: string): string {
  const normalizedDomain = normalizeBrandDomain(domain);
  return `${BRANDFETCH_CDN_URL}/${normalizedDomain}/icon.png?c=${encodeURIComponent(clientId)}`;
}

export async function validateBrandfetchClientId(clientId: string): Promise<void> {
  const response = await fetch(buildBrandfetchLogoUrl(BRANDFETCH_VALIDATION_DOMAIN, clientId), {
    method: 'GET',
  }).catch((error) => {
    throw new DependencyUnavailableError(
      error instanceof Error ? error.message : 'Brandfetch is currently unavailable',
    );
  });

  if (response.ok) {
    return;
  }

  if (response.status === 401 || response.status === 403) {
    throw new ValidationError('Brandfetch client ID is invalid');
  }

  throw new DependencyUnavailableError('Brandfetch is currently unavailable');
}
