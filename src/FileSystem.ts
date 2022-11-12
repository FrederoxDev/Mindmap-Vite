const acceptedFiles = {
    types: [
        {
            description: "Mindmap file",
            accept: {
                "text/mindmap": [".mm"]
            }
        }
    ]
}

export const openFileHandle = async () => {
    try {
        //@ts-ignore
        const [ handle ] = await window.showOpenFilePicker(acceptedFiles)
        return handle
    }

    catch (err: any) {
        if (err.stack == "Error: The user aborted a request.") {
            console.log("User cancelled opening a file")
        }

        else {
            console.warn(err.stack)
        }

        return undefined
    }
}

export const createFileHandle = async () => {
    try {
        //@ts-ignore
        const [ handle ] = await window.showSaveFilePicker(acceptedFiles)
        return handle
    }

    catch (err: any) {
        if (err.stack == "Error: The user aborted a request.") {
            console.log("User cancelled creating a file")
        }

        else {
            console.warn(err.stack)
        }

        return undefined
    }
}