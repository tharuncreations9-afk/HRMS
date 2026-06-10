"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

const SIZES = {
  sm: 40,
  md: 48,
  lg: 56,
  xl: 72,
};

function LogoIcon({ size = "md", className }) {
  const px = SIZES[size] || SIZES.md;
  return (
    <Image
      src={BRAND.logoSrc}
      alt={BRAND.logoAlt}
      width={px}
      height={px}
      className={cn(
        "shrink-0 rounded-full object-contain",
        className
      )}
      style={{ width: px, height: px }}
      priority
    />
  );
}

export function BrandMark({
  variant = "inline",
  size = "md",
  subtitle,
  onDark = false,
  className,
  titleClassName,
}) {
  const tagline = subtitle ?? BRAND.tagline;

  if (variant === "icon") {
    return <LogoIcon size={size} className={className} />;
  }

  if (variant === "hero-mobile") {
    return (
      <div className={cn("flex flex-col items-center text-center", className)}>
        <div className="relative h-28 w-28 shrink-0 sm:h-32 sm:w-32">
          <Image
            src={BRAND.logoSrc}
            alt={BRAND.logoAlt}
            width={128}
            height={128}
            className="h-full w-full rounded-full object-contain"
            priority
          />
        </div>
        <Image
          src={BRAND.textLogoSrc}
          alt={BRAND.logoAlt}
          width={220}
          height={140}
          className="mt-4 h-14 w-auto object-contain sm:h-16"
          priority
        />
        {tagline && (
          <p
            className={cn(
              "mt-2 text-xs sm:text-sm",
              onDark ? "text-white/70" : "text-muted-foreground"
            )}
          >
            {tagline}
          </p>
        )}
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        <div className="relative h-32 w-32 shrink-0">
          <div
            className="pointer-events-none absolute inset-0 rounded-full bg-white/[0.12] backdrop-blur-md ring-1 ring-inset ring-white/20"
            aria-hidden
          />
          <Image
            src={BRAND.logoSrc}
            alt={BRAND.logoAlt}
            width={128}
            height={128}
            className="relative z-10 h-full w-full rounded-full object-contain"
            priority
          />
        </div>
        <div className="shrink-0">
          <Image
            src={BRAND.textLogoSrc}
            alt={BRAND.logoAlt}
            width={220}
            height={140}
            className="h-[5.25rem] w-auto object-contain"
            priority
          />
          <p className="mt-2 text-sm text-white/60">{tagline}</p>
        </div>
      </div>
    );
  }

  if (variant === "print") {
    return (
      <div className={cn("flex flex-col items-center gap-2", className)}>
        <LogoIcon size="lg" />
        <p className="text-lg font-bold">{BRAND.legalName}</p>
      </div>
    );
  }

  const isLight = variant === "light";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoIcon size={size} />
      <div className="min-w-0">
        <h1
          className={cn(
            "font-bold tracking-tight",
            variant === "auth" ? "text-xl" : "text-sm",
            isLight ? "text-white" : "text-foreground",
            titleClassName
          )}
        >
          {BRAND.displayName} {BRAND.productName}
        </h1>
        <p
          className={cn(
            "truncate",
            variant === "auth" ? "text-xs" : "text-[10px]",
            isLight ? "text-white/50" : "text-muted-foreground"
          )}
        >
          {tagline}
        </p>
      </div>
    </div>
  );
}
