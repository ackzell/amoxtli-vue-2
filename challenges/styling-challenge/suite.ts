import { check, checks, expect } from 'harness'
import App from '../src/App.vue'

/**
 * Narrow typing for the Vue Test Utils wrapper members this suite needs.
 * The runtime returns full VTU wrappers (see `challenges/__shared__/harness.d.ts`),
 * but the authoring surface stays dependency-free.
 */
interface Wrapper {
  attributes: (name: string) => string | undefined
  classes: () => string[]
  text: () => string
  exists: () => boolean
  element: HTMLElement
  find: (selector: string) => Wrapper
  findAll: (selector: string) => Wrapper[]
  trigger: (event: string) => Promise<void>
}

type MountFn = (component: unknown) => unknown

/** The colors the starter ships with — the suite asserts against this exact data. */
const COLORS = [
  { name: 'Coral', hex: '#ff6b6b' },
  { name: 'Amber', hex: '#ffa94d' },
  { name: 'Lime', hex: '#69db7c' },
  { name: 'Sky', hex: '#4dabf7' },
  { name: 'Violet', hex: '#b197fc' },
]

/** How an unselected preview may report as "no background" across browsers. */
const EMPTY_BACKGROUNDS = ['', 'transparent', 'rgba(0, 0, 0, 0)']

/**
 * Browsers expose a bound background color in different shapes: Chrome
 * serializes `#ff6b6b` to `rgb(255,107,107)` (no spaces; some engines emit
 * space-separated channels), while test DOMs keep the hex literal.
 * Canonicalize everything to `rgb(r,g,b)` so assertions are environment-agnostic.
 */
function normalizeColor(value: string): string {
  const color = value.trim().toLowerCase()
  if (color.startsWith('#')) {
    const shorthand = color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color
    const n = Number.parseInt(shorthand.slice(1), 16)
    return `rgb(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255})`
  }
  const channels = color.match(/\d+/g)
  if (color.startsWith('rgb') && channels && channels.length >= 3)
    return `rgb(${channels[0]},${channels[1]},${channels[2]})`
  return color.replace(/\s+/g, '')
}

function mountApp(mount: MountFn): Wrapper {
  return mount(App) as Wrapper
}

function swatches(wrapper: Wrapper): Wrapper[] {
  return wrapper.findAll('[data-testid="swatch"]')
}

function swatch(wrapper: Wrapper, name: string): Wrapper | undefined {
  return swatches(wrapper).find(s => s.attributes('aria-label') === name)
}

function selectedSwatches(wrapper: Wrapper): Wrapper[] {
  return swatches(wrapper).filter(s => s.classes().includes('selected'))
}

function previewBackground(wrapper: Wrapper): string {
  return wrapper.find('[data-testid="preview"]').element.style.backgroundColor
}

function requireSwatch(wrapper: Wrapper, name: string): Wrapper {
  const found = swatch(wrapper, name)
  if (!found)
    throw new Error(`No swatch found with the accessible label "${name}"`)
  return found
}

export default checks([
  // ── Rendering ────────────────────────────────────────────────────────────
  check('renders-one-swatch-per-color', {
    run({ mount }) {
      const wrapper = mountApp(mount as unknown as MountFn)
      expect(swatches(wrapper).length).toBe(COLORS.length)
    },
  }),
  check('uses-v-for', {
    run({ source }) {
      expect(source('src/App.vue')).toMatch(/v-for=/)
    },
  }),
  check('swatches-have-accessible-labels', {
    run({ mount }) {
      const wrapper = mountApp(mount as unknown as MountFn)
      const labels = swatches(wrapper).map(s => s.attributes('aria-label'))
      expect(labels.sort()).toEqual([...COLORS.map(c => c.name)].sort())
    },
  }),
  check('applies-swatch-backgrounds', {
    run({ mount }) {
      const wrapper = mountApp(mount as unknown as MountFn)
      for (const { name, hex } of COLORS) {
        const el = requireSwatch(wrapper, name)
        expect(normalizeColor(el.element.style.backgroundColor)).toBe(normalizeColor(hex))
      }
    },
  }),
  check('shows-empty-preview-initially', {
    run({ mount }) {
      const wrapper = mountApp(mount as unknown as MountFn)
      expect(wrapper.find('[data-testid="preview"]').exists()).toBe(true)
      expect(EMPTY_BACKGROUNDS.map(normalizeColor)).toContain(normalizeColor(previewBackground(wrapper)))
    },
  }),

  // ── Interaction ──────────────────────────────────────────────────────────
  check('click-updates-preview', {
    async run({ mount }) {
      const wrapper = mountApp(mount as unknown as MountFn)
      const target = COLORS[3]!
      await requireSwatch(wrapper, target.name).trigger('click')
      expect(normalizeColor(previewBackground(wrapper))).toBe(normalizeColor(target.hex))
    },
  }),
  check('click-another-updates-preview', {
    async run({ mount }) {
      const wrapper = mountApp(mount as unknown as MountFn)
      await requireSwatch(wrapper, 'Coral').trigger('click')
      expect(normalizeColor(previewBackground(wrapper))).toBe(normalizeColor('#ff6b6b'))
      await requireSwatch(wrapper, 'Sky').trigger('click')
      expect(normalizeColor(previewBackground(wrapper))).toBe(normalizeColor('#4dabf7'))
    },
  }),
  check('shows-selected-name', {
    async run({ mount }) {
      const wrapper = mountApp(mount as unknown as MountFn)
      await requireSwatch(wrapper, 'Lime').trigger('click')
      expect(wrapper.find('[data-testid="selected-name"]').text()).toBe('Lime')
    },
  }),

  // ── Selected state ───────────────────────────────────────────────────────
  check('marks-selected-swatch', {
    async run({ mount }) {
      const wrapper = mountApp(mount as unknown as MountFn)
      await requireSwatch(wrapper, 'Amber').trigger('click')
      const marked = selectedSwatches(wrapper)
      expect(marked.length).toBe(1)
      expect(marked[0]!.attributes('aria-label')).toBe('Amber')
    },
  }),
  check('disables-selected-swatch', {
    async run({ mount }) {
      const wrapper = mountApp(mount as unknown as MountFn)
      await requireSwatch(wrapper, 'Violet').trigger('click')
      for (const { name } of COLORS) {
        const disabled = requireSwatch(wrapper, name).attributes('disabled')
        if (name === 'Violet')
          expect(disabled).toBeDefined()
        else
          expect(disabled).toBeUndefined()
      }
    },
  }),
  check('reenables-previous-swatch', {
    async run({ mount }) {
      const wrapper = mountApp(mount as unknown as MountFn)
      await requireSwatch(wrapper, 'Coral').trigger('click')
      await requireSwatch(wrapper, 'Lime').trigger('click')
      expect(requireSwatch(wrapper, 'Coral').attributes('disabled')).toBeUndefined()
      expect(requireSwatch(wrapper, 'Lime').attributes('disabled')).toBeDefined()
    },
  }),

  // ── Reset ────────────────────────────────────────────────────────────────
  check('reset-disabled-without-selection', {
    run({ mount }) {
      const wrapper = mountApp(mount as unknown as MountFn)
      const reset = wrapper.find('[data-testid="reset"]')
      expect(reset.exists()).toBe(true)
      expect(reset.attributes('disabled')).toBeDefined()
    },
  }),
  check('reset-clears-selection', {
    async run({ mount }) {
      const wrapper = mountApp(mount as unknown as MountFn)
      await requireSwatch(wrapper, 'Sky').trigger('click')
      await wrapper.find('[data-testid="reset"]').trigger('click')
      expect(EMPTY_BACKGROUNDS.map(normalizeColor)).toContain(normalizeColor(previewBackground(wrapper)))
      expect(selectedSwatches(wrapper).length).toBe(0)
      expect(wrapper.find('[data-testid="selected-name"]').text()).toBe('')
    },
  }),
  check('reset-enables-swatches', {
    async run({ mount }) {
      const wrapper = mountApp(mount as unknown as MountFn)
      await requireSwatch(wrapper, 'Amber').trigger('click')
      expect(wrapper.find('[data-testid="reset"]').attributes('disabled')).toBeUndefined()
      await wrapper.find('[data-testid="reset"]').trigger('click')
      for (const { name } of COLORS)
        expect(requireSwatch(wrapper, name).attributes('disabled')).toBeUndefined()
    },
  }),
])
