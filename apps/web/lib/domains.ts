export const INSTITUTION_DOMAIN_ERROR = "Enter a valid institution domain, such as example.com.";

export function isValidInstitutionDomain(value: string) {
  if (!value.trim()) return true;

  try {
    const normalized = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`;
    const hostname = new URL(normalized).hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/\.$/, "");

    return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(hostname);
  } catch {
    return false;
  }
}
