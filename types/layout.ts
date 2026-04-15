export type CodePanelId = 'editor' | 'preview' | 'console' | 'terminal'
export type SplitDirection = 'horizontal' | 'vertical'

export interface LayoutLeaf {
  type: 'panel'
  id: CodePanelId
}

export interface LayoutSplit {
  type: 'split'
  id: string
  direction: SplitDirection
  children: LayoutNode[]
}

export type LayoutNode = LayoutLeaf | LayoutSplit
