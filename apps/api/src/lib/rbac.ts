import type { Role } from '@prisma/client';

/**
 * RBAC permission matrix (PRD §4).
 * Keep this the single source of truth for "who can do what".
 */
export type Permission =
  | 'users:manage' // invite, change role/status
  | 'users:view_directory'
  | 'activity_log:view'
  | 'video:upload'
  | 'video:manage' // edit/delete any video
  | 'music:upload'
  | 'music:manage'
  | 'news:write' // create/edit/publish/archive
  | 'event:write' // create/edit/delete events
  | 'event:rsvp'
  | 'files:upload'
  | 'files:manage' // create folders, delete any file
  | 'content:view';

const MATRIX: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    'users:manage',
    'users:view_directory',
    'activity_log:view',
    'video:upload',
    'video:manage',
    'music:upload',
    'music:manage',
    'news:write',
    'event:write',
    'event:rsvp',
    'files:upload',
    'files:manage',
    'content:view',
  ],
  CONTENT_ADMIN: [
    'users:view_directory',
    'video:upload',
    'video:manage',
    'music:upload',
    'music:manage',
    'news:write',
    'event:rsvp',
    'files:upload',
    'files:manage',
    'content:view',
  ],
  EVENT_COORDINATOR: [
    'users:view_directory',
    'event:write',
    'event:rsvp',
    'files:upload',
    'files:manage',
    'content:view',
  ],
  MEMBER: ['users:view_directory', 'video:upload', 'music:upload', 'event:rsvp', 'files:upload', 'content:view'],
  GUEST: ['content:view'],
};

export const can = (role: Role, permission: Permission): boolean =>
  MATRIX[role]?.includes(permission) ?? false;
