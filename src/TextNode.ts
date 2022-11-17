import { ITextNode } from "./types/ITextNode";

const font = "30px Segoe UI"
const cornerRadius = 5;
const padding = 20;

export const drawITextNode = (ctx: CanvasRenderingContext2D, node: ITextNode, isSelected: boolean): void => {
    ctx.beginPath()
    ctx.fillStyle = "rgb(91 33 182)"

    //@ts-ignore
    ctx.roundRect(
        node.x - padding,
        node.y + padding,
        node.bounds.width + padding * 2,
        node.bounds.height - padding * 2,
        cornerRadius
    )
    ctx.fill()

    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgb(76 29 149)"
    if (isSelected) ctx.stroke()

    ctx.font = font
    ctx.fillStyle = "#fff"
    ctx.fillText(node.text, node.x, node.y)
} 

export const calculateBounds = (ctx: CanvasRenderingContext2D, node: ITextNode): ITextNode => {
    ctx.font = font
    var bounds = ctx.measureText(node.text);
    node.bounds.height = -bounds.actualBoundingBoxAscent + -bounds.actualBoundingBoxDescent;
    node.bounds.width = bounds.width;
    return node
}

export const editText = (ctx: CanvasRenderingContext2D, node: ITextNode, text: string): ITextNode => {
    node.text = text
    return calculateBounds(ctx, node)
}

export const intersectsBounds = (node: ITextNode, x: number, y: number): boolean => {
    return (
        x > node.x - padding && // Left 
        y < node.y + padding && // Bottom
        x < node.x + node.bounds.width + padding && // Right
        y > node.y + node.bounds.height - padding // Top
    )
}