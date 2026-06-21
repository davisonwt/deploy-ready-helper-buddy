export interface ShareArtifactInput {
  mediaUrl: string;
  mediaType: "image" | "video";
  caption: string;
  filename?: string;
}

export type ShareResult = "shared" | "downloaded" | "cancelled";

/**
 * Hand a generated asset + caption to the device's native share sheet via
 * Web Share API. Desktop browsers without file-share support get a
 * download + clipboard-copy fallback so the sower can paste into IG / WA / TikTok.
 */
export async function shareArtifact(
  input: ShareArtifactInput
): Promise<ShareResult> {
  const { mediaUrl, mediaType, caption } = input;
  if (!mediaUrl) throw new Error("Nothing to share.");

  const ext = mediaType === "image" ? "jpg" : "mp4";
  const filename = input.filename ?? `sow2grow-${Date.now()}.${ext}`;

  // 1. Fetch as blob/file
  let file: File | null = null;
  try {
    const res = await fetch(mediaUrl, { mode: "cors" });
    if (res.ok) {
      const blob = await res.blob();
      file = new File([blob], filename, {
        type: blob.type || (mediaType === "image" ? "image/jpeg" : "video/mp4"),
      });
    }
  } catch {
    // CORS or network — fall through to fallback
  }

  // 2. Try native share with file
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (file && nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], text: caption });
      return "shared";
    } catch (e: any) {
      if (e?.name === "AbortError") return "cancelled";
      // fall through to desktop fallback
    }
  }

  // 3. Try text-only share (mobile fallback if file share unavailable)
  if (!file && nav.share) {
    try {
      await nav.share({ text: caption, url: mediaUrl });
      return "shared";
    } catch (e: any) {
      if (e?.name === "AbortError") return "cancelled";
    }
  }

  // 4. Desktop fallback — download file + copy caption
  let downloaded = false;
  if (file) {
    try {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      downloaded = true;
    } catch {
      // ignore
    }
  }
  if (!downloaded) {
    // last-ditch: open the media URL so user can right-click save
    window.open(mediaUrl, "_blank", "noopener");
  }

  if (caption && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      // ignore — toast will still tell user it downloaded
    }
  }

  return "downloaded";
}
