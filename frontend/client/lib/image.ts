// Resizes/crops an image file to a square JPEG data URI before it's
// uploaded as an avatar. Done client-side so we never send a multi-MB
// photo straight from someone's phone to the backend (which stores
// avatars as a data URI in Postgres — see UpdateAvatar in
// backend/internal/api/profile.go).
export function fileToAvatarDataURL(
  file: File,
  size = 256,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That doesn't look like a valid image."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported in this browser."));
          return;
        }

        // Center-crop to a square, then scale down to `size`x`size`.
        const srcSize = Math.min(img.width, img.height);
        const srcX = (img.width - srcSize) / 2;
        const srcY = (img.height - srcSize) / 2;
        ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, size, size);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Resizes an image file down to a max dimension (preserving aspect
// ratio) and returns it as a JPEG data URI, without cropping to a
// square. Used for Pulse post image attachments — unlike the avatar
// helper above, a post image's shape is part of the content, so it
// shouldn't get force-cropped.
export function fileToImageDataURL(
  file: File,
  maxDimension = 1280,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That doesn't look like a valid image."));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported in this browser."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
