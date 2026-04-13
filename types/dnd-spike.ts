export type SpikePanelId = 'editor' | 'preview' | 'console' | 'terminal'
export type DropZone = 'left' | 'right' | 'top' | 'bottom'

export interface SpikePanelNode {
  type: 'panel'
  id: SpikePanelId
}

export interface SpikeSplitNode {
  type: 'split'
  id: string
  direction: 'horizontal' | 'vertical'
  children: SpikeLayoutNode[]
}

export type SpikeLayoutNode = SpikePanelNode | SpikeSplitNode
