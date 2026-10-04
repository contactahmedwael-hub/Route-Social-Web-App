/**
 * The PUT /users/upload-photo response shape isn't confirmed yet. This
 * tries every common shape so a mismatch doesn't silently fail to update
 * the UI. If you confirm the real shape, this is the only place that
 * needs to change.
 */
export function extractPhotoUrl(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;

  const nested = data.data as Record<string, unknown> | undefined;
  const nestedUser = (data.user ?? nested?.user) as Record<string, unknown> | undefined;

  const url =
    (data.photo as string | undefined) ||
    (data.photoUrl as string | undefined) ||
    (data.image as string | undefined) ||
    (data.url as string | undefined) ||
    (nested?.photo as string | undefined) ||
    (nested?.image as string | undefined) ||
    (nestedUser?.profilePhoto as string | undefined) ||
    (nestedUser?.photo as string | undefined) ||
    (nestedUser?.avatar as string | undefined) ||
    (nestedUser?.image as string | undefined) ||
    null;

  return url;
}

/**
 * Same idea for PUT /users/upload-cover: the response shape isn't confirmed,
 * so this looks for the cover URL under the likely names, at the top level, in
 * `data`, and in a nested `user`.
 */
export function extractCoverUrl(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;

  const nested = data.data as Record<string, unknown> | undefined;
  const nestedUser = (data.user ?? nested?.user) as Record<string, unknown> | undefined;
  const keys = ["cover", "coverPhoto", "coverImage", "coverUrl", "coverPicture", "banner"];

  for (const source of [data, nested, nestedUser]) {
    if (!source || typeof source !== "object") continue;
    for (const key of keys) {
      const value = source[key];
      if (typeof value === "string" && value) return value;
    }
  }
  return (
    (data.url as string | undefined) ||
    (nested?.url as string | undefined) ||
    (data.image as string | undefined) ||
    (nested?.image as string | undefined) ||
    null
  );
}