import type { ThemeRegistrationRaw } from 'shiki/core'
import baseTheme from 'shiki/themes/snazzy-light.mjs'

const baseSettings = (baseTheme as any).settings ?? (baseTheme as any).tokenColors ?? []

const customLightTheme: ThemeRegistrationRaw = {
  name: 'amoxtli-light',
  settings: [
    ...baseSettings,
    {
      settings: {
        foreground: '#1f2937',
        background: '#f8fafc',
      },
    },
    {
      scope: ['keyword', 'storage', 'keyword.operator'],
      settings: {
        foreground: '#7c3aed',
      },
    },
    {
      scope: ['string', 'string.quoted', 'string.template'],
      settings: {
        foreground: '#0f766e',
      },
    },
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: {
        foreground: '#64748b',
        fontStyle: 'italic',
      },
    },
    {
      scope: ['entity.name.function', 'support.function'],
      settings: {
        foreground: '#2563eb',
      },
    },
  ],
  colors: {
    ...(baseTheme as any).colors,
    'editor.background': '#f8fafc',
    'editor.foreground': '#1f2937',
    'editor.lineHighlightBackground': '#eef2ff',
    'editor.selectionBackground': '#c7d2fe88',
  },
}

export default customLightTheme
