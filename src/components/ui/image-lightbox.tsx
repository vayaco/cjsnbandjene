"use client";

import React, { useEffect } from "react";
import { X, ZoomIn } from "lucide-react";

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  description?: string;
}

export function ImageLightbox({
  isOpen,
  onClose,
  imageUrl,
  title,
  description,
}: ImageLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close full-screen image"
        className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Content wrapper */}
      <div
        className="relative max-w-5xl w-full max-h-[85vh] flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={title || "Venue image"}
          className="max-h-[75vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl border border-white/10"
        />

        {(title || description) && (
          <div className="mt-4 text-center text-white px-4">
            {title && <h3 className="font-semibold text-base sm:text-lg">{title}</h3>}
            {description && (
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 max-w-lg mx-auto">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
