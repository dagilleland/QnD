import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: () =>
        z.object({
          // Not `layout` — on `.mdx` files that key is reserved by
          // @astrojs/mdx as an import path for a layout component, and a
          // plain string there fails the build with a confusing
          // "failed to resolve import" error instead of a schema error.
          pageLayout: z.enum(['full-width']).optional(),
        }),
    }),
  }),
};