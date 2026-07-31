import { describe, expect, it } from 'vitest';
import { renderHouseholdInvitation } from '../mail.templates';

describe('household invitation mail template', () => {
  it('renders reusable HTML and plain text invitation content', () => {
    const rendered = renderHouseholdInvitation({
      householdName: 'Family Budget',
      inviterName: 'Jane',
      inviteUrl: 'https://luraba.example.com/invites/abc',
    });

    expect(rendered.subject).toBe("You're invited to join Family Budget on Luraba");
    expect(rendered.html).toContain('Jane invited you to join Family Budget');
    expect(rendered.html).toContain('Accept invitation');
    expect(rendered.html).toContain('https://luraba.example.com/invites/abc');
    expect(rendered.text).toContain('Jane invited you to join Family Budget');
    expect(rendered.text).toContain('https://luraba.example.com/invites/abc');
  });

  it('escapes interpolated HTML values', () => {
    const rendered = renderHouseholdInvitation({
      householdName: '<script>alert("household")</script>',
      inviterName: '<b>Jane</b>',
      inviteUrl: 'https://luraba.example.com/invites/abc?one=1&two=2',
    });

    expect(rendered.html).not.toContain('<script>');
    expect(rendered.html).not.toContain('<b>Jane</b>');
    expect(rendered.html).toContain('&lt;script&gt;');
    expect(rendered.html).toContain('&lt;b&gt;Jane&lt;/b&gt;');
    expect(rendered.html).toContain('one=1&amp;two=2');
  });

  it('rejects invalid invitation URLs', () => {
    expect(() =>
      renderHouseholdInvitation({
        householdName: 'Family Budget',
        inviteUrl: 'not-a-url',
      }),
    ).toThrow();
  });
});
