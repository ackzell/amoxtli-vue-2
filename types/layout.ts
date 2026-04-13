export type CodePanelId = 'editor' | 'output' | 'terminal'
export type SplitDirection = 'horizontal' | 'vertical'

export interface LayoutLeaf {
  type: 'panel'
  id: CodePanelId
}

export interface LayoutSplit {
  type: 'split'
  direction: SplitDirection
  children: LayoutNode[]
}

export type LayoutNode = LayoutLeaf | LayoutSplit
