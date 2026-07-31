import { z } from 'zod';

export const urlEnvSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z
    .string()
    .min(1)
    .refine((value) => URL.canParse(value), 'Invalid URL'),
);

export const optionalStringEnvSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? undefined : trimmedValue;
}, z.string().min(1).optional());

type SecretEnvSchemaOptions = {
  key: string;
  minLength?: number;
  minLengthMessage?: string;
  pattern?: RegExp;
  patternMessage?: string;
};

export function secretEnvSchema(options: SecretEnvSchemaOptions) {
  let schema = z.string();

  if (options.minLength !== undefined) {
    schema = schema.min(
      options.minLength,
      options.minLengthMessage ??
        `${options.key} must be at least ${options.minLength} characters.`,
    );
  }

  if (options.pattern) {
    schema = schema.regex(
      options.pattern,
      options.patternMessage ?? `${options.key} is not in the expected format.`,
    );
  }

  return schema.refine(
    (value) => value.trim().length === value.length,
    `${options.key} must not have leading or trailing whitespace.`,
  );
}

export function hexSecretEnvSchema(key: string, length: number) {
  return secretEnvSchema({
    key,
    pattern: new RegExp(`^[0-9a-fA-F]{${length}}$`),
    patternMessage: `${key} must be a ${length}-character hex string`,
  });
}

function parseBooleanEnvValue(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue.length === 0) {
    return undefined;
  }

  if (['1', 'true', 'yes', 'on'].includes(normalizedValue)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalizedValue)) {
    return false;
  }

  return value;
}

export const booleanEnvSchema = z.preprocess(parseBooleanEnvValue, z.boolean());

export const optionalBooleanEnvSchema = z.preprocess(parseBooleanEnvValue, z.boolean().optional());

type OptionalCredentialPairPrefix = string;

type OptionalCredentialPairShape<TPrefix extends OptionalCredentialPairPrefix> = Record<
  `${TPrefix}_CLIENT_ID` | `${TPrefix}_CLIENT_SECRET`,
  typeof optionalStringEnvSchema
>;

type OptionalCredentialPairDefinition<TPrefix extends OptionalCredentialPairPrefix = string> = {
  prefix: TPrefix;
  providerName: string;
};

export function optionalCredentialPairEnvShape<const TPrefix extends OptionalCredentialPairPrefix>(
  prefix: TPrefix,
): OptionalCredentialPairShape<TPrefix> {
  return {
    [`${prefix}_CLIENT_ID`]: optionalStringEnvSchema,
    [`${prefix}_CLIENT_SECRET`]: optionalStringEnvSchema,
  } as OptionalCredentialPairShape<TPrefix>;
}

export function validateOptionalCredentialPairs(
  data: Record<string, unknown>,
  ctx: z.RefinementCtx,
  definitions: readonly OptionalCredentialPairDefinition[],
) {
  for (const definition of definitions) {
    const clientIdKey = `${definition.prefix}_CLIENT_ID`;
    const clientSecretKey = `${definition.prefix}_CLIENT_SECRET`;
    const clientId = typeof data[clientIdKey] === 'string' ? data[clientIdKey] : undefined;
    const clientSecret =
      typeof data[clientSecretKey] === 'string' ? data[clientSecretKey] : undefined;
    const hasClientId = Boolean(clientId);
    const hasClientSecret = Boolean(clientSecret);

    if (hasClientId === hasClientSecret) {
      continue;
    }

    ctx.addIssue({
      code: 'custom',
      path: [hasClientId ? clientSecretKey : clientIdKey],
      message: `${clientIdKey} and ${clientSecretKey} must both be set to enable ${definition.providerName} auth.`,
    });
  }
}

export function getOptionalCredentialPair(
  data: Record<string, unknown>,
  prefix: OptionalCredentialPairPrefix,
) {
  const clientIdKey = `${prefix}_CLIENT_ID`;
  const clientSecretKey = `${prefix}_CLIENT_SECRET`;
  const clientId = typeof data[clientIdKey] === 'string' ? data[clientIdKey] : undefined;
  const clientSecret =
    typeof data[clientSecretKey] === 'string' ? data[clientSecretKey] : undefined;

  return {
    clientId,
    clientSecret,
    enabled: Boolean(clientId && clientSecret),
  } as const;
}
