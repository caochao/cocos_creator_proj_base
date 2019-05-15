//同个文件只会下载一次
//并发下载数量限制
//失败重试机制
export class Downloader
{
    private static _inst:Downloader;
    private _jsbDownloaderPool:any[];
    private _maxDownloadingCnt:number;
    private _downloadingCnt:number;
    private _downloadQueue:DownloadItem[];                    //等待下载列表
    private _downloadedMap:Map<string, DownloadTask>;       //已下载资源列表，url -> DownloadTask
    private _downloadingMap:Map<string, DownloadItem[]>;   //下载同一个url的item列表

    private constructor()
    {
        if(!CC_JSB)
        {
            cc.warn('Downloader is a NATIVE ONLY feature.');
        }
        this._maxDownloadingCnt = 2;
        this._downloadingCnt = 0;
    }

    static getInst()
    {
        if(!this._inst)
        {
            this._inst = new Downloader();
        }
        return this._inst;
    }

    downloadFile(item:DownloadItem)
    {
        const requestURL = item.requestURL;

        //之前下载过
        const task = this._downloadedMap ? this._downloadedMap.get(requestURL) : null;
        if(task && item.onFileTaskSuccess)
        {
            item.onFileTaskSuccess(task);
            this.downloadQueueItem();
            return;
        }

        //大于最大并发数量，需要等待当前item下载完成
        if(this._downloadingCnt >= this._maxDownloadingCnt)
        {
            this._downloadQueue = this._downloadQueue || [];
            this._downloadQueue.push(item);
            return;
        }
        
        //同一url只下载一次
        this._downloadingMap = this._downloadingMap || new Map();
        let downloadingItems = this._downloadingMap.get(requestURL);
        if(!downloadingItems)
        {
            downloadingItems = [];
            this._downloadingMap.set(requestURL, downloadingItems);
        }
        downloadingItems.push(item);
        if(downloadingItems.length > 1)
        {
            return;
        }
        
        //创建下载任务
        let jsbDownloader = this.popJsbDownloader();
        jsbDownloader.setOnTaskProgress(this.onTaskProgress.bind(this, requestURL));
        jsbDownloader.setOnFileTaskSuccess(this.onFileTaskSuccess.bind(this, requestURL, jsbDownloader));
        jsbDownloader.setOnTaskError(this.onTaskError.bind(this, requestURL, jsbDownloader));
        jsbDownloader.createDownloadFileTask(requestURL, item.storagePath);
        this._downloadingCnt++;
        cc.log(`Downloader, downloadFile, url=${requestURL}, downloadingCnt=${this._downloadingCnt}`);
    }

    purge()
    {
        if(this._jsbDownloaderPool)
        {
            this._jsbDownloaderPool.length = 0;
        }
    }

    private downloadQueueItem()
    {
        if(!this._downloadQueue || this._downloadQueue.length < 1)
        {
            cc.log(`Downloader, no queue or all queue item had been downloaded`);
            return;
        }
        const item = this._downloadQueue.pop();
        this.downloadFile(item);
    }

    private onTaskProgress(requestURL:string, task:DownloadTask, bytesReceived:number, totalBytesReceived:number, totalBytesExpected:number)
    {
        if(this._downloadingMap)
        {
            const downloadingItems = this._downloadingMap.get(requestURL);
            downloadingItems.forEach(item => {
                if(item.onTaskProgress) {
                    item.onTaskProgress(task, bytesReceived, totalBytesReceived, totalBytesExpected);
                }
            });
        }
    }

    private onFileTaskSuccess(requestURL:string, jsbDownloader, task:DownloadTask)
    {
        //保存下载后的地址
        this._downloadedMap = this._downloadedMap || new Map();
        this._downloadedMap.set(requestURL, task);

        //通知downloadItem下载完成
        if(this._downloadingMap)
        {
            const downloadingItems = this._downloadingMap.get(requestURL);
            downloadingItems.forEach(item => {
                if(item.onFileTaskSuccess) {
                    item.onFileTaskSuccess(task);
                }
            });
            downloadingItems.length = 0;
            this._downloadingMap.delete(requestURL);
        }
        
        this.pushJsbDownloader(jsbDownloader);
        this._downloadingCnt--;
        cc.log(`Downloader, onFileTaskSuccess, url=${requestURL}, downloadingCnt=${this._downloadingCnt}`);
        this.downloadQueueItem();
    }

    private onTaskError(requestURL:string, jsbDownloader, task:DownloadTask, errCode:number, errCodeInternal:number, errStr:string)
    {
        if(this._downloadingMap)
        {
            const downloadingItems = this._downloadingMap.get(requestURL);
            downloadingItems.forEach(item => {
                if(item.onTaskError) {
                    item.onTaskError(task, errCode, errStr);
                }
            });
            downloadingItems.length = 0;
            this._downloadingMap.delete(requestURL);
        }
        
        this.pushJsbDownloader(jsbDownloader);
        this._downloadingCnt--;
        cc.log(`Downloader, onTaskError, url=${requestURL}, downloadingCnt=${this._downloadingCnt}`);
        this.downloadQueueItem();
    }

    private popJsbDownloader()
    {
        let jsbDownloader = null;
        if(this._jsbDownloaderPool)
        {
            jsbDownloader = this._jsbDownloaderPool.pop();
        }
        if(!jsbDownloader)
        {
            jsbDownloader = new jsb.Downloader();
        }
        return jsbDownloader;
    }

    private pushJsbDownloader(jsbDownloader)
    {
        jsbDownloader.setOnTaskProgress(null);
        jsbDownloader.setOnFileTaskSuccess(null);
        jsbDownloader.setOnTaskError(null);
        this._jsbDownloaderPool = this._jsbDownloaderPool || [];
        this._jsbDownloaderPool.push(jsbDownloader);
    }
}

interface DownloadItem
{
    requestURL:string;
    storagePath:string;
    onTaskProgress?:(task:DownloadTask, bytesReceived:number, totalBytesReceived:number, totalBytesExpected:number) => void;
    onTaskError?:(task:DownloadTask, errCode:number, errStr:string) => void;
    onFileTaskSuccess?:(task:DownloadTask) => void;
}

export interface DownloadTask
{
    requestURL:string;
    storagePath:string;
}