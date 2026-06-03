import { defineCollection, defineContentConfig } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    en: defineCollection({
      type: 'page',
      source: {
        include: 'en/**',
        exclude: ['**/.template/**'],
      },
    }),
    es_mx: defineCollection({
      type: 'page',
      source: {
        include: 'es_mx/**',
        exclude: ['**/.template/**'],
      },
    }),
  },
})
