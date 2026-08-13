import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PulseMedia } from "@/lib/pulse-api";

// One tile: the media rendered at its own aspect ratio (object-contain)
// sitting on top of a blurred, cropped copy of itself filling the tile
// — the same trick Reddit/Twitter use so a portrait photo doesn't get
// cropped to fit a landscape card, and a landscape photo doesn't leave
// the card mostly empty either.
function MediaTile({
  item,
  className,
  onClick,
}: {
  item: PulseMedia;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[8px] border border-gq-border bg-black",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {/* Blurred backdrop — scaled up so the blur's soft edges never
          show, cropped to fill the tile regardless of the real image's
          aspect ratio. */}
      {item.type === "image" ? (
        <img
          src={item.url}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-60"
        />
      ) : (
        <video
          src={item.url}
          aria-hidden
          muted
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-60"
        />
      )}

      {/* Foreground — full media at its original ratio, never cropped. */}
      {item.type === "image" ? (
        <img
          src={item.url}
          alt=""
          className="relative z-10 h-full w-full object-contain"
        />
      ) : (
        <video
          src={item.url}
          controls
          className="relative z-10 h-full w-full object-contain"
        />
      )}
    </div>
  );
}

// Full-screen viewer for stepping through a multi-image post without
// leaving the page — opened by clicking any tile in the grid.
function Lightbox({
  items,
  index,
  onIndexChange,
  onClose,
}: {
  items: PulseMedia[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const item = items[index];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white"
        title="Close"
      >
        <X size={22} />
      </button>

      {items.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index - 1 + items.length) % items.length);
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
          title="Previous"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      <div
        className="max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {item.type === "image" ? (
          <img
            src={item.url}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
        ) : (
          <video
            src={item.url}
            controls
            autoPlay
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
        )}
      </div>

      {items.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index + 1) % items.length);
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
          title="Next"
        >
          <ChevronRight size={28} />
        </button>
      )}

      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[12px] text-white/70">
          {index + 1} / {items.length}
        </div>
      )}
    </div>
  );
}

export default function PulseMediaGallery({ media }: { media: PulseMedia[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (media.length === 0) return null;

  if (media.length === 1) {
    return (
      <>
        <MediaTile
          item={media[0]}
          className="max-h-[480px] w-full"
          onClick={() => setLightboxIndex(0)}
        />
        {lightboxIndex !== null && (
          <Lightbox
            items={media}
            index={lightboxIndex}
            onIndexChange={setLightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </>
    );
  }

  if (media.length === 2) {
    return (
      <>
        <div className="grid grid-cols-2 gap-1 h-[260px]">
          {media.map((m, i) => (
            <MediaTile
              key={i}
              item={m}
              className="h-full"
              onClick={() => setLightboxIndex(i)}
            />
          ))}
        </div>
        {lightboxIndex !== null && (
          <Lightbox
            items={media}
            index={lightboxIndex}
            onIndexChange={setLightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </>
    );
  }

  if (media.length === 3) {
    return (
      <>
        <div className="grid grid-cols-2 gap-1 h-[300px]">
          <MediaTile
            item={media[0]}
            className="row-span-2 h-full"
            onClick={() => setLightboxIndex(0)}
          />
          <MediaTile item={media[1]} onClick={() => setLightboxIndex(1)} />
          <MediaTile item={media[2]} onClick={() => setLightboxIndex(2)} />
        </div>
        {lightboxIndex !== null && (
          <Lightbox
            items={media}
            index={lightboxIndex}
            onIndexChange={setLightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </>
    );
  }

  // 4+ — a 2x2 grid, with a "+N" overlay on the last visible tile for
  // anything beyond the first four.
  const visible = media.slice(0, 4);
  const extra = media.length - 4;
  return (
    <>
      <div className="grid grid-cols-2 grid-rows-2 gap-1 h-[300px]">
        {visible.map((m, i) => (
          <div key={i} className="relative h-full">
            <MediaTile item={m} className="h-full" onClick={() => setLightboxIndex(i)} />
            {i === 3 && extra > 0 && (
              <div
                onClick={() => setLightboxIndex(3)}
                className="absolute inset-0 z-20 flex items-center justify-center rounded-[8px] bg-black/60 text-[20px] font-semibold text-white cursor-pointer"
              >
                +{extra}
              </div>
            )}
          </div>
        ))}
      </div>
      {lightboxIndex !== null && (
        <Lightbox
          items={media}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
