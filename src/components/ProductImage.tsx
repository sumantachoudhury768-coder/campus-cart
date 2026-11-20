import React, { useState } from 'react';
import { Package } from 'lucide-react';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectClass?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className = '',
  aspectClass = 'aspect-[4/3]',
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`${aspectClass} w-full bg-gradient-to-br from-violet-50 to-slate-100 flex flex-col items-center justify-center p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Package className="w-8 h-8 text-violet-400 mb-2" aria-hidden="true" />
        <span className="text-xs font-medium text-slate-600 line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <div className={`${aspectClass} w-full overflow-hidden bg-slate-100 ${className}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
};
