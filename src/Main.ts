import { createFileHandle, openFileHandle } from "./FileSystem";
import "./style.css"
import { calculateBounds, drawITextNode, editText, intersectsBounds } from "./TextNode";
import { ITextNode } from "./types/ITextNode";

const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const textInput = document.querySelector<HTMLInputElement>("#text-input")!;
const toast = document.querySelector<HTMLDivElement>("#toast-container")!;
const toastMessage = document.querySelector<HTMLParagraphElement>("#toast-message")!;
const noFileOpen = document.querySelector<HTMLDivElement>("#no-open-file")!;

const saveFileButton = document.querySelector("#save-button")!;
const newFileButton = document.querySelector("#new-button")!;
const openFileButton = document.querySelector("#open-button")!;

const ctx = canvas.getContext("2d")!;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var camX = canvas.width / 2;
var camY = canvas.height / 2;
var scale = 1;

var nodes: any = {}

function drawCanvas(): void {
    window.requestAnimationFrame(drawCanvas);

    // Move and scale the camera
    ctx.resetTransform()
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(camX, camY)
    ctx.scale(scale, scale)

    const keys = Object.keys(nodes)

    // Draw the lines before the nodes:
    // Ensures nodes are always drawn above the lines

    // Draw Lines
    keys.forEach((nodeKey) => {
        if (nodes[nodeKey].parent == undefined) return

        const self = nodes[nodeKey]
        const parent = nodes[nodes[nodeKey].parent]
        
        ctx.beginPath()
        ctx.moveTo(self.x + self.bounds.width / 2, self.y + self.bounds.height / 2)
        ctx.lineTo(parent.x + parent.bounds.width / 2, parent.y + parent.bounds.height / 2)
        ctx.stroke()
    })

    // Draw Nodes
    keys.forEach((nodeKey) => {
        drawITextNode(ctx, nodes[nodeKey])
    })
}

//#region Mouse Controls
var mouseX = 0;
var mouseY = 0;
var mouseDown: boolean = false;

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
})

canvas.addEventListener("mousedown", (e) => {
    mouseX = e.clientX
    mouseY = e.clientY
    mouseDown = true;
})

canvas.addEventListener("mouseup", () => {
    mouseDown = false;
})

canvas.addEventListener("mousemove", (e) => {
    if (!mouseDown) return;

    if (hasNodeSelected) {
        nodes[selectedNodeId].x += e.clientX - mouseX
        nodes[selectedNodeId].y += e.clientY - mouseY
    }

    else {
        camX += e.clientX - mouseX
        camY += e.clientY - mouseY
    }

    mouseX = e.clientX
    mouseY = e.clientY
})

canvas.addEventListener("wheel", (e) => {
    scale *= 1 + (-e.deltaY / 1000);
    if (scale > 1) scale = 1;
})
//#endregion

var hasNodeSelected = false;
var selectedNodeId = ""

canvas.addEventListener("mousedown", (e) => {
    const keys = Object.keys(nodes)
    const x = (e.clientX - camX)
    const y = (e.clientY - camY)

    selectedNodeId = ""
    hasNodeSelected = false
    textInput.hidden = true

    // Iterate through each node and see if it intersects the mouse
    for (var i = 0; i < keys.length; i++) {
        if (intersectsBounds(nodes[keys[i]], x, y)) {
            hasNodeSelected = true
            selectedNodeId = keys[i]
            break
        }
    }

    if (!hasNodeSelected) return

    var node = nodes[selectedNodeId]

    textInput.value = node.text
    textInput.hidden = false

    // Hide text input with Enter Key
    textInput.onkeyup = (e: KeyboardEvent) => {
        editText(ctx, node, textInput.value)

        if (e.key == "Enter") {
            textInput.hidden = true
            hasNodeSelected = false
        }
    }

    textInput.focus()
})

//#region File Actions
var currentFileHandle: FileSystemFileHandle | undefined = undefined;
var toastTimer: number | undefined = undefined;

const showToast = (message: string) => {
    toastMessage.innerText = message
    toast.hidden = false;

    clearTimeout(toastTimer)

    toastTimer = setTimeout(() => {
        toast.hidden = true
    }, 5000)
}

const saveFile = async (hideToast = false) => { 
    if (currentFileHandle == undefined) return;

    //@ts-ignore
    const writeable = await currentFileHandle.createWritable()
    await writeable.write(JSON.stringify(nodes))
    await writeable.close()

    if (!hideToast) showToast("Saved Successfully!")
}

const newFile = async () => {
    var newHandle = await createFileHandle()
    if (newHandle == undefined) return;
    if (currentFileHandle != undefined && !confirm("File is already open")) return;

    console.log(currentFileHandle)
    if (currentFileHandle == undefined) {
        noFileOpen.hidden = true;
    }

    currentFileHandle = newHandle
    nodes = {}

    nodes[crypto.randomUUID()] = calculateBounds(ctx, {
        type: "text",
        text: "New Mindmap",
        x: 0,
        y: 0,
        bounds: {
            height: 0,
            width: 0
        }
    })

    hasNodeSelected = false
    selectedNodeId = ""
    textInput.hidden = true

    await saveFile(true)
}

const openFile = async () => {
    var newHandle = await openFileHandle()
    if (newHandle == undefined) return;

    if (currentFileHandle == undefined) {
        noFileOpen.hidden = true;
    }

    if (currentFileHandle != undefined && !confirm("File is already open")) return;

    try {
        currentFileHandle = newHandle
        var file = await currentFileHandle.getFile()
        var fileText = await file.text()
        nodes = JSON.parse(fileText)
    }

    catch (err: any) {
        alert(err)
        console.warn(err)
    }
}

const exportPng = async () => {
    console.warn("Export as PNG not implemented")
}

saveFileButton.addEventListener("click", () => {saveFile(false)})
newFileButton.addEventListener("click", newFile)
openFileButton.addEventListener("click", openFile)

document.addEventListener("keydown", async (e) => {
    // Make sure to prevent default **before** awaiting for actions

    if (e.ctrlKey && e.key == "s") {
        e.preventDefault()
        await saveFile()
    }
    else if (e.altKey && e.key == "n") {
        e.preventDefault()
        await newFile()
    }
    else if (e.ctrlKey && e.key == "o") {
        e.preventDefault()
        await openFile()
    }
    else if (e.ctrlKey && e.key == "e") {
        e.preventDefault()
        await exportPng()
    }
})
//#endregion

drawCanvas()