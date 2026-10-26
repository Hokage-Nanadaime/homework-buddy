/** Hand a file to the viewer. Inside the artifact this uses the `downloads` capability; elsewhere a normal download link. */
export type SaveOutcome = { ok: true; message: string } | { ok: false; message: string };

interface Downloads {
  save(req: { filename: string; data: Blob | string }): Promise<{ status: string }>;
}

async function viewerDownloads(): Promise<Downloads | null> {
  try {
    const claude = (globalThis as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
    if (!claude?.use) return null;
    return ((await claude.use('downloads')) as Downloads | null) ?? null;
  } catch {
    return null;
  }
}

export async function saveFile(filename: string, data: Blob | string): Promise<SaveOutcome> {
  const dl = await viewerDownloads();
  if (dl) {
    try {
      await dl.save({ filename, data });
      return { ok: true, message: `Saved ${filename}.` };
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'declined') return { ok: false, message: 'Not saved. You chose not to save the file.' };
      return { ok: false, message: 'The file could not be saved here. Try again, or open the app in a full browser tab.' };
    }
  }
  try {
    const blob = typeof data === 'string' ? new Blob([data], { type: 'text/plain' }) : data;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return { ok: true, message: `Downloaded ${filename}.` };
  } catch {
    return { ok: false, message: 'The file could not be saved.' };
  }
}
