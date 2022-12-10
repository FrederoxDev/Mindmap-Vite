export interface INode {
    parent?: string
    type: string
    x: number
    y: number
    bounds: Bounds
    color: string,
    depth: number
}

export interface Bounds {
    width: number
    height: number
}