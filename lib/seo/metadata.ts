import type { Metadata } from "next";

import { siteConfig } from "@/lib/config/site";

const defaultOgImage = "/opengraph-image";

function withBrand(title: string) {
  return title === siteConfig.productName ? title : `${title} | ${siteConfig.productName}`;
}

function cleanDescription(description: string) {
  return description.replace(/\s+/g, " ").trim().slice(0, 158);
}

export function buildPageMetadata({
  title,
  description,
  path,
  image = defaultOgImage,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const brandedTitle = withBrand(title);
  const cleanedDescription = cleanDescription(description);

  return {
    title,
    description: cleanedDescription,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: brandedTitle,
      description: cleanedDescription,
      url: path,
      siteName: siteConfig.productName,
      type: "website",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${siteConfig.productName} marketplace preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: brandedTitle,
      description: cleanedDescription,
      images: [image],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : undefined,
  };
}

export function buildNoIndexMetadata(title: string, description: string): Metadata {
  return buildPageMetadata({
    title,
    description,
    path: "/",
    noIndex: true,
  });
}
