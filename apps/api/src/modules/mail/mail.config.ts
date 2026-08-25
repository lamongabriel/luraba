export type MailConfig = {
  provider?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  password?: string;
  fromName?: string;
  fromEmail?: string;
  replyEmail?: string;
  tlsCiphers?: string;
};

export type ConfiguredMailConfig = Required<
  Pick<
    MailConfig,
    'provider' | 'host' | 'port' | 'secure' | 'username' | 'password' | 'fromName' | 'fromEmail'
  >
> &
  Pick<MailConfig, 'replyEmail' | 'tlsCiphers'>;

export function isMailConfigured(config: MailConfig): config is ConfiguredMailConfig {
  return (
    config.provider !== undefined &&
    config.host !== undefined &&
    config.port !== undefined &&
    config.secure !== undefined &&
    config.username !== undefined &&
    config.password !== undefined &&
    config.fromName !== undefined &&
    config.fromEmail !== undefined
  );
}
