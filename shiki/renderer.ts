/**
 * modules/twoslash/renderer.ts
 *
 * A drop-in replacement for rendererFloatingVue that has zero dependency on
 * floating-vue. It delegates all the heavy lifting (markdown rendering, JSDoc,
 * error lines, completion lists, highlights, cut directives, @log/@warn/@error
 * custom tags…) to rendererRich via its `hast` override API, and replaces only
 * the wrapping elements that floating-vue normally provides.
 *
 * The generated HTML structure per hover token is:
 *
 *   <span class="twoslash-hover" data-twoslash-id="ts-N">
 *     <!-- the token children (already Shiki-highlighted) -->
 *     <span class="twoslash-popup" aria-hidden="true">
 *       <!-- rendererRich's popup element, verbatim -->
 *     </span>
 *   </span>
 *
 * CSS positions .twoslash-popup absolutely and shows it on parent hover.
 * A lightweight composable (useTwoslashTooltips) in ProsePre repositions it
 * with @floating-ui/dom (which you already depend on) so it never clips.
 *
 * Feature parity with rendererFloatingVue:
 *   ✅ ^? type queries (hover)           ✅ ^? shown-by-default (persisted)
 *   ✅ JSDoc prose (markdown rendered)   ✅ @param / @see / @deprecated tags
 *   ✅ Error lines below code            ✅ Error hover (errorRendering:'hover')
 *   ✅ ^| completion lists + icons       ✅ ^^^ highlighted ranges
 *   ✅ @log / @warn / @error custom tags ✅ ---cut--- / @filename visibility
 *   ✅ Syntax-highlighted type strings
 */

import type { RendererRichOptions, TwoslashRenderer } from '@shikijs/twoslash'
import type { Element, ElementContent, Properties, Text } from 'hast'
import type { ShikiTransformerContextCommon } from 'shiki'
import { defaultHoverInfoProcessor, rendererRich } from '@shikijs/twoslash'
import { toHtml } from 'hast-util-to-html'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { defaultHandlers, toHast } from 'mdast-util-to-hast'

export { defaultHoverInfoProcessor }

// ─── tiny JSDoc link pattern (same as rendererFloatingVue) ───────────────────
const RE_JSDOC_LINK = /\{@link ([^}]*)\}/g
const RE_PARAM_NAME = /^([\w$-]+)/

// ─── hast helpers ────────────────────────────────────────────────────────────
function el(
  tag: string,
  props: Properties,
  children: ElementContent[],
): Element {
  return { type: 'element', tagName: tag, properties: props, children }
}

// ─── uid — stable per-build IDs ──────────────────────────────────────────────
let _counter = 0
function uid(): string {
  return `ts-${++_counter}`
}

// ─── compose: token + popup → [wrapper] ──────────────────────────────────────
// Stores popup content in data-content so the client can render it via
// TooltipTrigger + TooltipContent components.
function compose({ token, popup }: { token: Element | Text, popup: Element }): Element[] {
  const id = uid()

  const popupHtml = toHtml(popup)

  // Ensure empty error tokens still get their underline class
  const tokenEl: Element = token.type === 'text'
    ? el('span', {}, [token])
    : token

  if (
    tokenEl.type === 'element'
    && (tokenEl.children?.length ?? 0) < 1
  ) {
    const cls = String(tokenEl.properties?.class ?? '')
    tokenEl.properties = {
      ...tokenEl.properties,
      class: `${cls} twoslash-error-empty`.trim(),
    }
  }

  return [
    el(
      'span',
      {
        'class': 'twoslash-hover',
        'data-twoslash-id': id,
        'data-content': popupHtml,
      },
      [tokenEl],
    ),
  ]
}

// Same compose but marks the popup as "persisted" (^? query lines stay visible)
function composePersisted(parts: { token: Element | Text, popup: Element }): Element[] {
  const nodes = compose(parts)
  if (nodes[0]?.type === 'element') {
    const cls = String(nodes[0].properties?.class ?? '')
    nodes[0].properties.class = `${cls} twoslash-query-persisted`.trim()
  }
  return nodes
}

// ─── markdown rendering (mirrors rendererFloatingVue exactly) ─────────────────
function renderMarkdown(
  this: ShikiTransformerContextCommon,
  md: string,
): ElementContent[] {
  const mdast = fromMarkdown(
    md.replace(RE_JSDOC_LINK, '$1'),
    { mdastExtensions: [gfmFromMarkdown()] },
  )

  return ((toHast(mdast, {
    handlers: {
      code: (state, node) => {
        const lang = node.lang || ''
        if (lang) {
          return el('code', {}, (
            this.codeToHast(node.value, {
              ...this.options,
              transformers: [],
              lang,
              structure: node.value.trim().includes('\n') ? 'classic' : 'inline',
            })
          ).children as ElementContent[])
        }
        return defaultHandlers.code(state, node)
      },
    },
  }) as Element).children)
}

function renderMarkdownInline(
  this: ShikiTransformerContextCommon,
  md: string,
  context?: string,
): ElementContent[] {
  if (context === 'tag:param')
    md = md.replace(RE_PARAM_NAME, '`$1` ')
  const children = renderMarkdown.call(this, md)
  const first = children[0]
  if (
    first
    && first.type === 'element'
    && (first as Element).tagName === 'p'
  ) {
    return (first as Element).children
  }
  return children
}

// ─── The exported renderer ────────────────────────────────────────────────────
export interface AmoxtliRendererOptions extends RendererRichOptions {
  // All RendererRichOptions pass through:
  //   jsdoc, completionIcons, customTagIcons, processHoverInfo,
  //   processHoverDocs, errorRendering ('line' | 'hover'), classExtra, lang
}

export function rendererAmoxtli(options: AmoxtliRendererOptions = {}): TwoslashRenderer {
  return rendererRich({
    // ── Pass through all caller options ────────────────────────────────────
    ...options,

    // ── Wire in our markdown renderer (same logic as rendererFloatingVue) ──
    renderMarkdown,
    renderMarkdownInline,

    // ── hast overrides: swap <v-menu> → <span class="twoslash-hover"> ──────
    hast: {
      // Normal hover token (mouse-over to reveal)
      hoverToken: {
        tagName: 'span',
        properties: { class: 'twoslash-hover-token' },
      },
      hoverCompose: compose,

      // ^? query token (rendered persisted / always visible)
      queryToken: {
        tagName: 'span',
        properties: { class: 'twoslash-hover-token twoslash-query-persisted' },
      },
      queryCompose: composePersisted,

      // Error token when errorRendering:'hover'
      errorToken: {
        tagName: 'span',
        properties: { class: 'twoslash-error twoslash-error-hover' },
      },
      errorCompose: compose,

      // The popup container itself — rendererRich builds this, we style it
      popupDocs: {
        class: 'twoslash-popup-docs',
      },
      popupDocsTags: {
        class: 'twoslash-popup-docs twoslash-popup-docs-tags',
      },
      popupError: {
        class: 'twoslash-popup-error',
      },

      // Completion list (^|) — popup is always shown
      completionCompose({ popup, cursor }) {
        const id = uid()
        const popupHtml = toHtml(popup)
        return [
          el('span', { 'class': 'twoslash-hover twoslash-completion-trigger', 'data-twoslash-id': id, 'data-content': popupHtml }, [
            cursor,
          ]),
        ]
      },

      // Merge any caller-supplied hast overrides on top
      ...options.hast,
    },
  })
}
