"use client";

import { useState } from "react";

type GalleryImage = {
  id: string | number;
  image_url: string;
  display_order: number;
};

type ListingGalleryProps = {
  title: string;
  images: GalleryImage[];
};

export default function ListingGallery({ title, images }: ListingGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const activeImage = images[currentImageIndex]?.image_url ?? "";

  if (images.length === 0) {
    return (
      <div className="relative mb-6 h-[300px] overflow-hidden rounded-2xl border border-[#dce3ee] bg-[#e5e7eb] md:h-[420px]" />
    );
  }

  return (
    <div className="mb-8">
      <div className="relative h-[300px] cursor-pointer overflow-hidden rounded-2xl border border-[#dce3ee] bg-white md:h-[420px]" onClick={() => setShowFullscreen(true)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={activeImage} alt={title} className="h-full w-full object-cover" />
        {images.length > 1 ? (
          <>
            <button
              onClick={(event) => {
                event.stopPropagation();
                setCurrentImageIndex((currentImageIndex - 1 + images.length) % images.length);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg transition hover:scale-110"
            >
              ‹
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                setCurrentImageIndex((currentImageIndex + 1) % images.length);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg transition hover:scale-110"
            >
              ›
            </button>
            <div className="absolute bottom-4 right-4 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
              {currentImageIndex + 1} / {images.length}
            </div>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="mt-4 grid grid-cols-5 gap-2">
          {images.map((image, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={String(image.id)}
              src={image.image_url}
              alt={`Bild ${index + 1}`}
              onClick={() => setCurrentImageIndex(index)}
              className={`h-20 cursor-pointer rounded-lg object-cover transition ${
                currentImageIndex === index ? "ring-2 ring-[#0d9488]" : "opacity-70 hover:opacity-100"
              }`}
            />
          ))}
        </div>
      ) : null}

      {showFullscreen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black" onClick={() => setShowFullscreen(false)}>
          <button className="absolute right-4 top-4 text-4xl text-white" onClick={() => setShowFullscreen(false)}>
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={activeImage} alt={title} className="max-h-screen max-w-screen object-contain" onClick={(e) => e.stopPropagation()} />
          {images.length > 1 ? (
            <>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setCurrentImageIndex((currentImageIndex - 1 + images.length) % images.length);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-6xl text-white"
              >
                ‹
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setCurrentImageIndex((currentImageIndex + 1) % images.length);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-6xl text-white"
              >
                ›
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
