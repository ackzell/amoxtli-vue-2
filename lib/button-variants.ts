import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

/**
 * Single source of truth for button styling. Kept in `lib/` (not next to
 * `components/ui/Button/Button.vue`) because Nuxt treats every file in
 * `components/` as an auto-import candidate, and an `index.ts` there collides
 * with the component name.
 *
 * The classes live in a `.ts` file, so `uno.config.ts` must include `lib`'s
 * TypeScript files in its content pipeline or they would never be generated.
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg:not([class*=\'size-\'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-primary focus-visible:ring-primary/50 focus-visible:ring-[3px] dark:focus-visible:border-primary-dark dark:focus-visible:ring-primary-dark/50 aria-invalid:border-negative aria-invalid:ring-negative/20 dark:aria-invalid:ring-negative/40',
  {
    variants: {
      variant: {
        'default':
          'bg-primary text-white shadow-xs hover:bg-primary-600 active:bg-primary-700 dark:bg-primary-dark-500 dark:hover:bg-primary-dark-400 dark:active:bg-primary-dark-600',
        'challenge':
          'bg-challenge text-white shadow-xs hover:bg-challenge-600 active:bg-challenge-700 dark:hover:bg-challenge dark:hover:brightness-125 dark:active:brightness-95',
        'destructive':
          'bg-negative text-white shadow-xs hover:bg-negative-600 active:bg-negative-700 dark:bg-negative-600 dark:hover:bg-negative-500 dark:active:bg-negative-400',
        'destructive-outline':
          'border border-negative/40 text-negative-700 shadow-xs hover:bg-negative/10 active:bg-negative/15 dark:border-negative-400/50 dark:text-negative-300 dark:hover:bg-negative-400/10 dark:active:bg-negative-400/20',
        'outline':
          'border border-bgr-500/30 bg-transparent shadow-xs hover:bg-active dark:border-bgr-600',
        'secondary':
          'bg-bgr-100 text-bgr-700 shadow-xs hover:bg-bgr-200 dark:bg-bgr-800 dark:text-bgr-200 dark:hover:text-primary',
        'surface':
          'border border-bgr-500/30 bg-base text-bgr-700 shadow-xs hover:bg-active dark:border-bgr-600 dark:text-bgr-200',
        'ghost':
          'hover:bg-active hover:text-foreground',
        'link':
          'text-primary underline-offset-4 hover:underline dark:text-primary-dark-300',
      },
      size: {
        'default': 'h-9 px-4 py-2',
        'sm': 'h-8 px-3',
        'lg': 'h-10 px-6',
        'icon': 'size-9',
        'icon-sm': 'size-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>

/**
 * Fixed styling for the toolbar icon buttons (the `IconButton` default when no
 * `variant` is passed). Deliberately NOT a `buttonVariants` variant: it keeps
 * pointer events when disabled (so the tooltip still shows), uses
 * scale-on-hover instead of the press-scale solid buttons use, and brightens
 * the icon via the foreground tokens rather than an accent tint.
 */
export const toolbarButtonClass = 'cursor-pointer hover:text-foreground dark:hover:text-foreground-dark hover:scale-120 transition duration-200 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:scale-100 active:scale-95'
