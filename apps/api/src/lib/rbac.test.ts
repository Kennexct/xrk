import { describe, expect, it } from 'vitest';
import { can } from './rbac';

describe('RBAC matrix (PRD §4)', () => {
  it('super admin can do everything', () => {
    expect(can('SUPER_ADMIN', 'users:manage')).toBe(true);
    expect(can('SUPER_ADMIN', 'activity_log:view')).toBe(true);
    expect(can('SUPER_ADMIN', 'video:manage')).toBe(true);
  });

  it('content admin manages content but not users or activity log', () => {
    expect(can('CONTENT_ADMIN', 'video:upload')).toBe(true);
    expect(can('CONTENT_ADMIN', 'news:write')).toBe(true);
    expect(can('CONTENT_ADMIN', 'users:manage')).toBe(false);
    expect(can('CONTENT_ADMIN', 'activity_log:view')).toBe(false);
    expect(can('CONTENT_ADMIN', 'event:write')).toBe(false);
  });

  it('event coordinator manages events only', () => {
    expect(can('EVENT_COORDINATOR', 'event:write')).toBe(true);
    expect(can('EVENT_COORDINATOR', 'news:write')).toBe(false);
    expect(can('EVENT_COORDINATOR', 'video:manage')).toBe(false);
  });

  it('member can view, upload own work, and RSVP', () => {
    expect(can('MEMBER', 'content:view')).toBe(true);
    expect(can('MEMBER', 'video:upload')).toBe(true);
    expect(can('MEMBER', 'event:rsvp')).toBe(true);
    expect(can('MEMBER', 'news:write')).toBe(false);
    expect(can('MEMBER', 'files:manage')).toBe(false);
  });

  it('guest is read-only', () => {
    expect(can('GUEST', 'content:view')).toBe(true);
    expect(can('GUEST', 'video:upload')).toBe(false);
    expect(can('GUEST', 'event:rsvp')).toBe(false);
    expect(can('GUEST', 'files:upload')).toBe(false);
  });
});
