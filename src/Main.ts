import { createFileHandle, openFileHandle } from "./FileSystem";
import "./style.css"
import { calculateBounds, drawITextNode, editText, intersectsBounds } from "./TextNode";

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
        ctx.lineWidth = 3;
        ctx.strokeStyle = "black"
        ctx.moveTo(self.x + self.bounds.width / 2, self.y + self.bounds.height / 2)
        ctx.lineTo(parent.x + parent.bounds.width / 2, parent.y + parent.bounds.height / 2)
        ctx.stroke()
    })

    // Draw Nodes
    keys.forEach((nodeKey) => {
        drawITextNode(ctx, nodes[nodeKey], nodeKey == selectedNodeId)
    })

    ctx.strokeStyle = "black"
    ctx.beginPath()
    ctx.arc(mouseX, mouseY, 100, 0, 0)
    ctx.stroke()
}

//#region Mouse Controls
var mouseX = 0;
var mouseY = 0;
var mouseDown: boolean = false;
var clientX = 0;
var clientY = 0;

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
})

canvas.addEventListener("mousedown", (e) => {
    scaleClientXY(e)
    mouseDown = true;
})

canvas.addEventListener("mouseup", () => {
    mouseDown = false;
})

canvas.addEventListener("mousemove", (e) => {
    const [iX, iY] = [mouseX, mouseY]
    const {x, y} = scaleClientXY(e);

    var deltaX = x - iX;
    var deltaY = y - iY;
    
    if (hasNodeSelected && mouseDown) {
        nodes[selectedNodeId].x += deltaX
        nodes[selectedNodeId].y += deltaY
    }

    else if (mouseDown) {
        camX += e.clientX - clientX
        camY += e.clientY - clientY
    }

    clientX = e.clientX
    clientY = e.clientY
})

canvas.addEventListener("wheel", (e) => {
    scale *= 1 + (-e.deltaY / 1000);
    if (scale > 1) scale = 1;
})
//#endregion

var hasNodeSelected = false;
var selectedNodeId = ""

const scaleClientXY = (e: MouseEvent) => {
    // Get the click position
    var clickX = e.clientX;
    var clickY = e.clientY;

    // Get the canvas bounding rect
    var rect = canvas.getBoundingClientRect();

    // Calculate the click position relative to the top-left corner of the canvas
    var canvasX = clickX - rect.left;
    var canvasY = clickY - rect.top;

    // Invert the translation transformation
    var invertedCamX = -camX;
    var invertedCamY = -camY;

    // Invert the scaling transformation
    var invertedScale = 1 / scale;

    // Apply the inverse transformations to the click position
    var x = (canvasX + invertedCamX) * invertedScale;
    var y = (canvasY + invertedCamY) * invertedScale;

    mouseX = x
    mouseY = y

    return {x, y}
}

canvas.addEventListener("mousedown", () => {
    const keys = Object.keys(nodes)

    if (hasNodeSelected && intersectsBounds(nodes[selectedNodeId], mouseX, mouseY)) return

    selectedNodeId = ""
    hasNodeSelected = false
    textInput.hidden = true

    // Iterate through each node and see if it intersects the mouse
    for (var i = 0; i < keys.length; i++) {
        if (intersectsBounds(nodes[keys[i]], mouseX, mouseY)) {
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
        if (!hasNodeSelected) return
        editText(ctx, nodes[selectedNodeId], textInput.value)

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
    else if (e.ctrlKey && e.key == ".") {
        e.preventDefault()
        createNode();
    }
})
//#endregion

const createNode = () => {
    const uuid = crypto.randomUUID()

    nodes[uuid] = calculateBounds(ctx, {
        type: "text",
        text: "",
        x: mouseX,
        y: mouseY,
        bounds: {
            height: 0,
            width: 0
        }
    })

    if (hasNodeSelected) {
        nodes[uuid].parent = selectedNodeId
    }

    selectedNodeId = uuid
    textInput.value = nodes[uuid].text
    textInput.hidden = false
    hasNodeSelected = true
}

drawCanvas()