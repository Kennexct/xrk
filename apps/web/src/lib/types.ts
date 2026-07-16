export type Role = 'SUPER_ADMIN' | 'CONTENT_ADMIN' | 'EVENT_COORDINATOR' | 'MEMBER' | 'GUEST';

export interface User {
  id: string;
  name: string;
  email: string;
  nim: string | null;
  division: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  status: 'ACTIVE' | 'INACTIVE';
  lastSeenAt: string | null;
  isOnline?: boolean;
}

export type VideoCategory = 'DOKUMENTASI_ACARA' | 'BEHIND_THE_SCENE' | 'KARYA_ANGGOTA' | 'LAINNYA';

export interface Video {
  id: string;
  title: string;
  description: string | null;
  category: VideoCategory;
  provider: 'CLOUDFLARE_STREAM' | 'YOUTUBE' | 'MOCK';
  hlsUrl: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  durationSec: number | null;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  viewCount: number;
  createdAt: string;
  uploader?: { id: string; name: string; division: string | null };
}

export interface Music {
  id: string;
  title: string;
  artist: string;
  division: string | null;
  album: string | null;
  fileUrl: string;
  coverUrl: string | null;
  durationSec: number | null;
  playCount: number;
  releasedAt: string | null;
  createdAt: string;
  uploader?: { id: string; name: string };
}

export type NewsCategory = 'PENGUMUMAN' | 'KEGIATAN_TERKINI' | 'KEGIATAN_MENDATANG';
export type NewsStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

export interface News {
  id: string;
  title: string;
  slug: string;
  content: string;
  coverImageUrl: string | null;
  category: NewsCategory;
  tags: string[];
  status: NewsStatus;
  publishAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  author?: { id: string; name: string; avatarUrl: string | null };
}

export type RsvpStatus = 'GOING' | 'MAYBE' | 'NOT_GOING';
export type EventStatus = 'UPCOMING' | 'ONGOING' | 'DONE';

export interface SytEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  picName: string | null;
  startTime: string;
  endTime: string;
  attachmentUrls: string[];
  status: EventStatus;
  myRsvp: RsvpStatus | null;
  goingCount?: number;
  creator?: { id: string; name: string };
  rsvps?: { userId: string; status: RsvpStatus; user: { id: string; name: string; avatarUrl: string | null; division: string | null } }[];
  folders?: { id: string; name: string; _count: { files: number } }[];
}

export interface Folder {
  id: string;
  name: string;
  division: string | null;
  createdAt: string;
  event?: { id: string; title: string } | null;
  _count?: { files: number };
  files?: FolderFile[];
}

export interface FolderFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  sizeBytes: number;
  createdAt: string;
  uploader?: { id: string; name: string };
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  actionType: string;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string; avatarUrl: string | null } | null;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  invitedBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  inviteUrl: string | null;
  createdAt: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  CONTENT_ADMIN: 'Content Admin',
  EVENT_COORDINATOR: 'Event Coordinator',
  MEMBER: 'Member',
  GUEST: 'Guest/Alumni',
};

export const VIDEO_CATEGORY_LABELS: Record<VideoCategory, string> = {
  DOKUMENTASI_ACARA: 'Dokumentasi Acara',
  BEHIND_THE_SCENE: 'Behind The Scene',
  KARYA_ANGGOTA: 'Karya Anggota',
  LAINNYA: 'Lainnya',
};

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  PENGUMUMAN: 'Pengumuman',
  KEGIATAN_TERKINI: 'Kegiatan Terkini',
  KEGIATAN_MENDATANG: 'Kegiatan Mendatang',
};
