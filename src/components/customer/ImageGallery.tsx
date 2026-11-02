import React, { useState } from 'react';
import type { ProductImage } from '../../types/database.types';

interface ImageGalleryProps {
  images?: ProductImage[];
  fallbackUrl?: string;
  productName: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images = [],
  fallbackUrl = 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=800&q=80',
  productName,
}) => {
  const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order);
  const activeList = sortedImages.length > 0 ? sortedImages.map((img) => img.image_url) : [fallbackUrl];

  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div className="flex flex-col-reverse md:flex-row gap-4">
      {/* Thumbnails (horizontal on mobile, vertical column on desktop if > 1 image) */}
      {activeList.length > 1 && (
        <div className="flex md:flex-col gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {activeList.map((url, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`relative flex-shrink-0 w-16 h-20 md:w-20 md:h-24 rounded-xl overflow-hidden border-2 transition-all ${
                selectedIndex === idx
                  ? 'border-indigo-600 ring-2 ring-indigo-600/30 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={url}
                alt={`${productName} thumbnail ${idx + 1}`}
                className="w-full h-full object-cover object-center"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main Preview */}
      <div className="flex-1 relative aspect-[4/5] rounded-3xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-sm">
        <img
          src={activeList[selectedIndex] || fallbackUrl}
          alt={productName}
          className="w-full h-full object-cover object-center transition-all duration-300"
        />
        {activeList.length > 1 && (
          <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold rounded-full">
            {selectedIndex + 1} / {activeList.length}
          </div>
        )}
      </div>
    </div>
  );
};
