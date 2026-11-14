import Image from "next/image";

const PHOTOS = [
  { match: /f-?150/i, src: "/cars/f150.webp", w: 1400, h: 642 },
  { match: /silverado/i, src: "/cars/silverado.webp", w: 1365, h: 551 },
  { match: /rav4/i, src: "/cars/rav4.webp", w: 1400, h: 696 },
];

export const photoFor = (model: string) => PHOTOS.find((p) => p.match.test(model));

/** Background-removed car photo with a soft contact shadow under the tires. */
export function CarPhoto({ model, alt, priority, sizes }: { model: string; alt: string; priority?: boolean; sizes: string }) {
  const p = photoFor(model);
  if (!p) return null;
  return (
    <div className="relative">
      <div aria-hidden className="absolute inset-x-[6%] bottom-[1%] h-[9%] rounded-[50%] bg-ink/25 blur-md" />
      <Image src={p.src} alt={alt} width={p.w} height={p.h} priority={priority} sizes={sizes} className="relative h-auto w-full" />
    </div>
  );
}
