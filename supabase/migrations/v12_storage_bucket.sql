-- ─────────────────────────────────────────────────────────────────────────────
--  V12 — storage bucket for uploaded images (agency logos + hotel photos)
--  /api/upload writes to the "hotel-images" bucket with the service key, but the
--  bucket was never created, so every upload failed with "Bucket not found".
--  Public read (images are shown on public offer pages); writes only through
--  the server route. Safe to run more than once.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hotel-images',
  'hotel-images',
  true,
  5242880,                                            -- 5 MB, same as the API limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Check: should return one row with public = true
SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'hotel-images';
