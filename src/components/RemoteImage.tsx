/* eslint-disable @next/next/no-img-element */
"use client";

import Image from "next/image";

type RemoteImageProps = {
  src?: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
};

const isRemoteUrl = (value: string) => /^https?:\/\//i.test(value);

export default function RemoteImage({ src, alt, width, height, className }: RemoteImageProps) {
  if (!src) {
    return null;
  }

  if (isRemoteUrl(src)) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        className={className}
        referrerPolicy="no-referrer"
      />
    );
  }

  const resolvedWidth = width ?? 24;
  const resolvedHeight = height ?? resolvedWidth;

  return <Image src={src} alt={alt} width={resolvedWidth} height={resolvedHeight} className={className} />;
}
