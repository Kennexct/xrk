import { describe, expect, it } from 'vitest';
import { presignUpload } from './service';
import { HttpError } from '../../lib/errors';

describe('presignUpload validation (master.md §6 — validate type/size before issuing URL)', () => {
  it('rejects disallowed content types', async () => {
    await expect(
      presignUpload({ kind: 'document', fileName: 'x.exe', contentType: 'application/x-msdownload', sizeBytes: 100 }),
    ).rejects.toThrow(HttpError);
  });

  it('rejects files over the 25MB activity-folder limit', async () => {
    await expect(
      presignUpload({ kind: 'document', fileName: 'big.pdf', contentType: 'application/pdf', sizeBytes: 26 * 1024 * 1024 }),
    ).rejects.toThrow(/25MB/);
  });

  it('issues a short-lived URL for a valid document', async () => {
    const result = await presignUpload({
      kind: 'document',
      fileName: 'notulen rapat.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1024,
    });
    expect(result.uploadUrl).toBeTruthy();
    expect(result.expiresInSec).toBe(15 * 60);
    expect(result.key).toMatch(/^document\//);
    expect(result.key).not.toContain(' '); // sanitized
  });

  it('allows audio for music uploads but not for documents', async () => {
    const ok = await presignUpload({ kind: 'music', fileName: 'lagu.mp3', contentType: 'audio/mpeg', sizeBytes: 1024 });
    expect(ok.key).toMatch(/^music\//);
    await expect(
      presignUpload({ kind: 'document', fileName: 'lagu.mp3', contentType: 'audio/mpeg', sizeBytes: 1024 }),
    ).rejects.toThrow(HttpError);
  });
});
