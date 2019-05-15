export class FileUtils
{
    private static _inst:FileUtils;

    private constructor()
    {
    }

    static getInst()
    {
        if(!this._inst)
        {
            this._inst = new FileUtils();
        }
        return this._inst;
    }

    getWritablePath()
    {
        return jsb.fileUtils.getWritablePath();
    }

    createDirectory(dirPath:string):boolean
    {
        return jsb.fileUtils.createDirectory(dirPath);
    }

    isDirectoryExist(dirPath:string):boolean
    {
        return jsb.fileUtils.isDirectoryExist(dirPath);
    }

    removeDirectory(dirPath:string):boolean
    {
        return jsb.fileUtils.removeDirectory(dirPath);
    }

    removeFile(filePath:string):boolean
    {
        return jsb.fileUtils.removeFile(filePath);
    }

    isFileExist(filename:string):boolean
    {
        return jsb.fileUtils.isFileExist(filename);
    }

    getSearchPaths():string[]
    {
        return jsb.fileUtils.getSearchPaths();
    }

    setSearchPaths(searchPaths:string[])
    {
        return jsb.fileUtils.setSearchPaths(searchPaths);
    }

    addSearchPath(path:string, front = false)
    {
        const prevSearchPaths = this.getSearchPaths();
        if(prevSearchPaths.indexOf(path) != -1) {
            return;
        }
        return jsb.fileUtils.addSearchPath(path, front);
    }

    getDataFromFile(filename:string)
    {
        return jsb.fileUtils.getDataFromFile(filename);
    }

    getStringFromFile(filename:string):string
    {
        return jsb.fileUtils.getStringFromFile(filename);
    }

    getJsonFromFile(filename:string)
    {
        const str = this.getStringFromFile(filename);
        if(str)
        {
            return JSON.parse(str);
        }
        return null;
    }

    writeStringToFile(dataStr:string, fullPath:string):boolean
    {
        return jsb.fileUtils.writeStringToFile(dataStr, fullPath);
    }

    writeJsonToFile(data:object, fullPath:string)
    {
        const str = JSON.stringify(data);
        return this.writeStringToFile(str, fullPath);
    }

    unzipFileToDirAsync(zipFileName:string, destPath:string)
    {
        return jsb.fileUtils.unzipFileToDirAsync(zipFileName, destPath);
    }
}