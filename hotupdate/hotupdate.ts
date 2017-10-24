import * as format from "../3rd/sprintfjs/format"
import * as consts from "../consts"

const {ccclass, property} = cc._decorator;
@ccclass
export class Loading extends cc.Component {
    @property(cc.RawAsset)
    manifest_url: cc.RawAsset;

    @property(cc.Node)
    update_ui: cc.Node;

    @property(cc.Label)
    txt_info: cc.Label;

    @property(cc.Label)
    txt_progress: cc.Label;

    @property(cc.ProgressBar)
    progressbar: cc.ProgressBar;

    @property(cc.Button)
    btn_update: cc.Button;

    @property(cc.Button)
    btn_retry: cc.Button;

    private _am:jsb.AssetsManager;
    private _updateListener:jsb.EventListenerAssetsManager;
    private _checkListener:jsb.EventListenerAssetsManager;
    private _updating:boolean;
    private _canRetry:boolean;
    private _storagePath:string;

    onLoad() 
    {
        // Hot update is only available in Native build
        if (!cc.sys.isNative) 
        {
            return;
        }
        this._storagePath = ((jsb.fileUtils ? jsb.fileUtils.getWritablePath() : '/') + 'mtx-remote-asset');
        cc.log('Storage path for remote asset : ' + this._storagePath);

        this._am = new jsb.AssetsManager(this.manifest_url, this._storagePath, version_comp_func);
        this._am.retain();

        // Setup the verification callback, but we don't have md5 check function yet, so only print some message
        // Return true if the verification passed, otherwise return false
        this._am.setVerifyCallback(verify_func);
        cc.info('Hot update is ready, please check or directly update.');

        if (cc.sys.os === cc.sys.OS_ANDROID) 
        {
            // Some Android device may slow down the download process when concurrent tasks is too much.
            // The value may not be accurate, please do more test and find what's most suitable for your game.
            this._am.setMaxConcurrentTask(2);
            cc.info("Max concurrent tasks count have been limited to 2");
        }

        //检查更新, 正式版本启用
        this.checkUpdate();
    }

    onDestroy()
    {
        if (this._updateListener) 
        {
            cc.eventManager.removeListener(this._updateListener);
            this._updateListener = null;
        }
        if (this._checkListener) 
        {
            cc.eventManager.removeListener(this._checkListener);
            this._checkListener = null;
        }
        if(this._am)
        {
            this._am.release();
            this._am = null;
        }
    }

    private checkCb(event:jsb.EventAssetsManager) 
    {
        cc.log("checkCb", event.getEventCode());
        let failed:boolean = false;
        switch (event.getEventCode())
        {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                cc.info("No local manifest file found, hot update skipped.");
                failed = true;
                break;
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                cc.info("Fail to download manifest file, hot update skipped.");
                failed = true;
                break;
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                cc.info("Already up to date with the latest remote version.");
                failed = true;
                break;
            case jsb.EventAssetsManager.NEW_VERSION_FOUND:
                cc.info('New version found, please try to update.');
                this.update_ui.active = true;
                this.btn_update.node.active = true;
                this.btn_retry.node.active = false;
                this.progressbar.progress = 0;

                cc.eventManager.removeListener(this._checkListener);
                this._checkListener = null;
                this._updating = false;
                break;
            default:
                return;
        }
        if(failed)
        {
            cc.info("do not need hotupdate");
        }
    }

    private updateCb(event:jsb.EventAssetsManager) 
    {
        cc.info("updateCb", event.getEventCode())
        let needRestart:boolean = false;
        let failed:boolean = false;
        switch (event.getEventCode())
        {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                cc.info('No local manifest file found, hot update skipped.');
                failed = true;
                break;
            case jsb.EventAssetsManager.UPDATE_PROGRESSION:
                let downloadedMb:number = Math.ceil(event.getDownloadedBytes() / 1014 / 1024);
                let totalMb:number = Math.ceil(event.getTotalBytes() / 1024 / 1024);
                this.progressbar.progress = event.getPercent();
                this.txt_progress.string = format.sprintf("第%d/%d个文件，进度%d/%dMB", event.getDownloadedFiles(), event.getTotalFiles(), downloadedMb, totalMb);
                break;
            case jsb.EventAssetsManager.ASSET_UPDATED:
                cc.info("ASSET_UPDATED=>", event.getAssetId())
                break;
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                cc.info('Fail to download manifest file, hot update skipped.');
                failed = true;
                break;
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                cc.info('Already up to date with the latest remote version.');
                failed = true;
                break;
            case jsb.EventAssetsManager.UPDATE_FINISHED:
                cc.info('Update finished. ' + event.getMessage());
                needRestart = true;
                break;
            case jsb.EventAssetsManager.UPDATE_FAILED:
                this.txt_info.string = 'Update failed. ' + event.getMessage();
                this.btn_retry.node.active = true;
                this._updating = false;
                this._canRetry = true;
                break;
            case jsb.EventAssetsManager.ERROR_UPDATING:
                cc.info("Asset update error:", event.getAssetId(), event.getMessage());
                break;
            case jsb.EventAssetsManager.ERROR_DECOMPRESS:
                cc.info("ERROR_DECOMPRESS", event.getMessage());
                break;
            default:
                break;
        }

        if(failed) 
        {
            this._updating = false;
        }

        //更新成功重启游戏
        if(needRestart) 
        {
            cc.eventManager.removeListener(this._updateListener);
            this._updateListener = null;

            // Prepend the manifest's search path
            let searchPaths = jsb.fileUtils.getSearchPaths();
            let newPaths = this._am.getLocalManifest().getSearchPaths();
            Array.prototype.unshift(searchPaths, newPaths);

            // This value will be retrieved and appended to the default search path during game startup,
            // please refer to samples/js-tests/main.js for detailed usage.
            // !!! Re-add the search paths in main.js is very important, otherwise, new scripts won't take effect.
            cc.sys.localStorage.setItem('HotUpdateSearchPaths', JSON.stringify(searchPaths));
            jsb.fileUtils.setSearchPaths(searchPaths);

            cc.audioEngine.stopAll();
            cc.game.restart();
        }
    }
    
    private retry()
    {
        if (this._updating || !this._canRetry) 
        {
            return;
        }
        this.btn_retry.node.active = false;
        this._canRetry = false;
        this.txt_info.string = 'Retry failed Assets...';
        this._am.downloadFailedAssets();
    }

    private hotUpdate() 
    {
        if(this._updating)
        {
            return;
        }
        this._updateListener = new jsb.EventListenerAssetsManager(this._am, this.updateCb.bind(this));
        cc.eventManager.addListener(this._updateListener, 1);
        this._am.update();
        this.btn_update.node.active = false;
        this._updating = true;
    }

    private checkUpdate() 
    {
        if (!this._am.getLocalManifest() || !this._am.getLocalManifest().isLoaded()) 
        {
            cc.info('Failed to load local manifest...');
            return;
        }
        this._checkListener = new jsb.EventListenerAssetsManager(this._am, this.checkCb.bind(this));
        cc.eventManager.addListener(this._checkListener, 1);
        this._am.checkUpdate();
        this._updating = true;
    }
}

function verify_func(path, asset) 
{
    // When asset is compressed, we don't need to check its md5, because zip file have been deleted.
    let compressed:boolean = asset.compressed;
    // Retrieve the correct md5 value.
    let expectedMD5:string = asset.md5;
    // asset.path is relative path and path is absolute.
    let relativePath:string = asset.path;
    // The size of asset file, but this value could be absent.
    let size:number = asset.size;
    if (compressed) 
    {
        return true;
    }
    else 
    {
        return true;
    }
}

// Setup your own version compare handler, versionA and B is versions in string
// if the return value greater than 0, versionA is greater than B,
// if the return value equals 0, versionA equals to B,
// if the return value smaller than 0, versionA is smaller than B.
function version_comp_func(versionA:string, versionB:string) 
{
    cc.info("JS Custom Version Compare: version A is " + versionA + ', version B is ' + versionB);
    let vA:string[] = versionA.split('.');
    let vB:string[] = versionB.split('.');
    for (let i:number = 0, len:number = vA.length; i < len; ++i) 
    {
        let a:number = parseInt(vA[i]);
        let b:number = parseInt(vB[i] || "0");
        if (a === b) 
        {
            continue;
        }
        else 
        {
            return a - b;
        }
    }
    if (vB.length > vA.length) 
    {
        return -1;
    }
    else 
    {
        return 0;
    }
};