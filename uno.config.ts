import extractorMdc from '@unocss/extractor-mdc'
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWebFonts,
  presetWind3,
  transformerDirectives,
} from 'unocss'

export default defineConfig({
  shortcuts: {
    'border-base': 'border-gray-200 dark:border-bgr-800',
    'bg-active': 'dark:bg-bgr-700 bg-bgr-100',
    'bg-faded': 'bg-bgr/5',
    'bg-base': 'bg-white dark:bg-bgr-dark',
    'text-faded': 'text-gray6:100 dark:text-gray3:80',

    'bg-code': 'bg-gray/5',

    'bg-inline-code': 'bg-gray-100 dark:bg-gray-800/75',
    'border-inline-code': 'border-gray-200 dark:border-bgr-700',

    'z-embedded-docs': 'z-100',
    'z-embedded-docs-raised': 'z-101',
    'z-splitter': 'z-102',
    'z-embedded-docs-close': 'z-103',
    'z-index-command-palette': 'z-200',
  },
  theme: {
    colors: {
      foreground: {
        DEFAULT: 'oklch(40% 0.05 249)',

        dark: {
          DEFAULT: '#f5f5f5', // whitesmoke
        },
      },

      bgr: {
        DEFAULT: 'oklch(0.9702 0 0)',
        50: 'oklch(0.99 0.0002 36)',
        100: 'oklch(0.93 0.0 0)',
        200: 'oklch(0.82 0.0022 36)',
        300: 'oklch(0.72 0.0038 36)',
        400: 'oklch(0.62 0.0045 36)',
        500: 'oklch(0.52 0.0054 36)',
        600: 'oklch(0.42 0.0065 36)',
        700: 'oklch(0.32 0.0075 36)',
        800: 'oklch(0.23 0.0085 36)',
        900: 'oklch(0.17 0.0093 36)',
        dark: 'oklch(0.15 0.01 110)',

        translucent: {
          DEFAULT: 'oklch(0.9702 0 0 / 80%)',
          dark: 'oklch(0.15 0.01 110 / 80%)',
        },
      },

      primary: {
        DEFAULT: 'oklch(77% 0.14 70)',
        50: 'oklch(0.98 0.03 70)',
        100: 'oklch(0.95 0.05 70)',
        200: 'oklch(0.91 0.07 70)',
        300: 'oklch(0.86 0.09 70)',
        400: 'oklch(0.81 0.11 70)',
        500: 'oklch(0.77 0.14 70)',
        600: 'oklch(0.67 0.14 70)',
        700: 'oklch(0.57 0.14 70)',
        800: 'oklch(0.47 0.14 70)',
        900: 'oklch(0.37 0.14 70)',
        950: 'oklch(0.27 0.14 70)',

        dark: {
          DEFAULT: 'oklch(0.5962 0.2423 358.92)',
          50: 'oklch(1 0.15 358.92)',
          100: 'oklch(0.97 0.2423 358.92)',
          200: 'oklch(0.88 0.2423 358.92)',
          300: 'oklch(0.78 0.2423 358.92)',
          400: 'oklch(0.69 0.2423 358.92)',
          500: 'oklch(0.5962 0.2423 358.92)',
          600: 'oklch(0.44 0.2423 358.92)',
          700: 'oklch(0.34 0.2423 358.92)',
          800: 'oklch(0.26 0.2423 358.92)',
          900: 'oklch(0.18 0.2423 358.92)',
          950: 'oklch(0.12 0.2423 358.92)',
        },
      },

      // tailwind blue
      info: {
        DEFAULT: 'oklch(62.3% 0.214 259.815)',
        50: 'oklch(97% 0.014 254.604)',
        100: 'oklch(97% 0.014 254.604)',
        200: 'oklch(97% 0.014 254.604)',
        250: 'oklch(80.9% 0.105 251.813 / 50%)',
        300: 'oklch(80.9% 0.105 251.813)',
        400: 'oklch(70.7% 0.165 254.624)',
        500: 'oklch(62.3% 0.214 259.815)',
        600: 'oklch(54.6% 0.245 262.881)',
        700: 'oklch(48.8% 0.243 264.376)',
        800: 'oklch(42.4% 0.199 265.638)',
        900: 'oklch(37.9% 0.146 265.522)',
        950: 'oklch(28.2% 0.091 267.935)',
        // dark: 'oklch(0.1368 0.091 267.935)',
        dark: 'oklch(6% 0.091 267.935)',
      },
      // tailwind emerald
      positive: {
        DEFAULT: 'oklch(69.6% 0.17 162.48)',
        50: 'oklch(97.9% 0.021 166.113)',
        100: 'oklch(95% 0.052 163.051)',
        200: 'oklch(90.5% 0.093 164.15)',
        300: 'oklch(84.5% 0.143 164.978)',
        400: 'oklch(76.5% 0.177 163.223)',
        500: 'oklch(69.6% 0.17 162.48)',
        600: 'oklch(59.6% 0.145 163.225)',
        700: 'oklch(50.8% 0.118 165.612)',
        800: 'oklch(43.2% 0.095 166.913)',
        900: 'oklch(37.8% 0.077 168.94)',
        950: 'oklch(26.2% 0.051 172.552)',
      },
      // tailwind amber
      warning: {
        DEFAULT: 'oklch(76.9% 0.188 70.08)',
        50: 'oklch(98.7% 0.022 95.277)',
        100: 'oklch(96.2% 0.059 95.617)',
        200: 'oklch(92.4% 0.12 95.746)',
        300: 'oklch(87.9% 0.169 91.605)',
        400: 'oklch(82.8% 0.189 84.429)',
        500: 'oklch(76.9% 0.188 70.08)',
        600: 'oklch(66.6% 0.179 58.318)',
        700: 'oklch(55.5% 0.163 48.998)',
        800: 'oklch(47.3% 0.137 46.201)',
        900: 'oklch(41.4% 0.112 45.904)',
        950: 'oklch(27.9% 0.077 45.635)',
        dark: 'oklch(10% 0.077 45.635)',
      },
      // tailwind red
      negative: {
        DEFAULT: 'oklch(63.7% 0.237 25.331)',
        50: 'oklch(97.1% 0.013 17.38)',
        100: 'oklch(93.6% 0.032 17.717)',
        200: 'oklch(88.5% 0.062 18.334)',
        300: 'oklch(80.8% 0.114 19.571)',
        400: 'oklch(70.4% 0.191 22.216)',
        500: 'oklch(63.7% 0.237 25.331)',
        600: 'oklch(57.7% 0.245 27.325)',
        700: 'oklch(50.5% 0.213 27.518)',
        800: 'oklch(44.4% 0.177 26.899)',
        900: 'oklch(39.6% 0.141 25.723)',
        950: 'oklch(25.8% 0.092 26.042)',
      },
      // tailwind indigo
      tip: {
        DEFAULT: 'oklch(58.5% 0.233 277.117)',
        50: 'oklch(96.2% 0.018 272.314)',
        100: 'oklch(93% 0.034 272.788)',
        200: 'oklch(87% 0.065 274.039)',
        300: 'oklch(78.5% 0.115 274.713)',
        400: 'oklch(67.3% 0.182 276.935)',
        500: 'oklch(58.5% 0.233 277.117)',
        600: 'oklch(51.1% 0.262 276.966)',
        700: 'oklch(45.7% 0.24 277.023)',
        800: 'oklch(39.8% 0.195 277.366)',
        900: 'oklch(35.9% 0.144 278.697)',
        950: 'oklch(10% 0.09 281.288)',
        dark: 'oklch(1% 0.09 281.288)',
      },
    },
  },
  presets: [
    presetWind3(),
    presetIcons({
      collections: {
        carbon: () =>
          import('@iconify-json/carbon/icons.json').then(i => i.default),
        mynaui: () =>
          import('@iconify-json/mynaui/icons.json').then(i => i.default),
      },
    }),
    presetAttributify(),
    presetWebFonts({
      provider: 'bunny',
      fonts: {
        sans: {
          name: 'Work Sans',
          weights: [400, 500, 600, 700],
        },
        mono: {
          name: 'Space Mono',
          weights: [200, 400, 500, 600, 700],
        },
        code: {
          name: 'Ubuntu Mono',
          weights: [400, 700],
        },

        // sans: 'Work Sans:400,500,600,700',
        // mono: 'Space Mono:400,500,600,700',
      },
    }),
    presetTypography(),
  ],
  extractors: [
    extractorMdc(),
  ],
  content: {
    filesystem: [
      './content/**/*.md',
    ],
  },
  transformers: [
    transformerDirectives(),
  ],
})
