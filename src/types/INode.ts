export interface INode {
    parent?: string
    type: string
    x: number
    y: number
    bounds: Bounds
}

export interface Bounds {
    width: number
    height: number
}