import {handler, gen_handler} from "../utils"

export class loader_mgr
{
    private static inst:loader_mgr;
    private constructor(){};

    static get_inst():loader_mgr
    {
        if(!loader_mgr.inst)
        {
            loader_mgr.inst = new loader_mgr();
        }
        return loader_mgr.inst;
    }

    /**从resources目录加载rawasset，rawaaset是指cc.Texture2D, cc.AudioClip, cc.ParticleAsset*/
    loadRawAsset(url:string, cb:handler)
    {
        let res:any = cc.loader.getRes(url);
        if(res)
        {
            cb.exec(res);
            return;
        }
        cc.loader.loadRes(url, (err:any, res:any):void=>{
            if(err)
            {
                cc.warn("loadRawAsset error", url);
                return;
            }
            cb.exec(res); 
        });
    }

    /**从resources目录加载asset，asset是指cc.SpriteFrame, cc.AnimationClip, cc.Prefab*/
    loadAsset(url:string, cb:handler, asset_type:typeof cc.Asset):void
    {
        let res:any = cc.loader.getRes(url, asset_type);
        if(res)
        {
            cb.exec(res);
            return;
        }
        cc.loader.loadRes(url, asset_type, (err:any, res:any):void=>{
            if(err)
            {
                cc.warn("loadAsset error", url);
                return;
            }
            cb.exec(res); 
        });
    }

    /**从resources目录加载asset/rawasset列表，省略资源后缀*/
    loadResArray(urls:string[], cb:handler):void
    {
        let loaded_res:any = {};
        let unloaded_urls:string[] = [];
        urls.forEach((url:string):void=>{
            let res:any = cc.loader.getRes(url);
            if(res)
            {
                loaded_res[url] = res;
            }
            else
            {
                unloaded_urls.push(url);
            }
        });
        if(unloaded_urls.length == 0)
        {
            cb.exec(loaded_res);
            return;
        }
        cc.loader.loadResArray(unloaded_urls, (err:any, res_arr:any[]):void=>{
            if(err)
            {
                cc.warn("loadResArray error", unloaded_urls);
                return;
            }
            unloaded_urls.forEach((url:string):void=>{
                loaded_res[url] = cc.loader.getRes(url);
            });
            cb.exec(loaded_res);
        });
    }

    /**从resources目录加载prefab(省略资源后缀)，加载成功后生成prefab实例*/
    loadPrefabObj(url:string, cb:handler)
    {
        let res:any = cc.loader.getRes(url, cc.Prefab);
        if(res)
        {
            let node:cc.Node = cc.instantiate(res);
            cb.exec(node);
            return;
        }
        //err is typeof Error, err.message
        cc.loader.loadRes(url, cc.Prefab, (err:any, res:any):void=>{
            if(err)
            {
                cc.warn("loadPrefabObj error", url);
                return;
            }
            let node:cc.Node = cc.instantiate(res);
            cb.exec(node);
        });
    }

    /**从resources目录加载prefab列表(省略资源后缀)，加载成功后生成prefab实例*/
    loadPrefabObjArray(urls:string[], cb:handler):void
    {
        let loaded_obj:any = {};
        let unloaded_urls:string[] = [];
        urls.forEach((url:string):void=>{
            let res:any = cc.loader.getRes(url, cc.Prefab);
            if(res)
            {
                loaded_obj[url] = cc.instantiate(res);
            }
            else
            {
                unloaded_urls.push(url);
            }
        });
        if(unloaded_urls.length == 0)
        {
            cb.exec(loaded_obj);
            return;
        }
        cc.loader.loadResArray(unloaded_urls, cc.Prefab, (err:any, res_arr:any[]):void=>{
            if(err)
            {
                cc.warn("loadPrefabObjArray error", unloaded_urls);
                return;
            }
            unloaded_urls.forEach((url:string):void=>{
                loaded_obj[url] = cc.instantiate(cc.loader.getRes(url, cc.Prefab));
            });
            cb.exec(loaded_obj);
        });
    }

    loadPrefabDir(dir_path:string, cb:handler):void
    {
        let map:any = {};
        cc.loader.loadResDir(dir_path, cc.Prefab, (err:any, res_arr:any[], urls:string[]):void=>{
            if(err)
            {
                cc.warn("loadPrefabObjDir error", dir_path);
                return;
            }
            urls.forEach((url) => {
                map[url] = cc.loader.getRes(url, cc.Prefab);
            });
            cb.exec(map);
        });
    }

    loadPrefabObjDir(dir_path:string, cb:handler):void
    {
        let map:any = {};
        cc.loader.loadResDir(dir_path, cc.Prefab, (err:any, res_arr:any[], urls:string[]):void=>{
            if(err)
            {
                cc.warn("loadPrefabObjDir error", dir_path);
                return;
            }
            urls.forEach((url) => {
                map[url] = cc.instantiate(cc.loader.getRes(url, cc.Prefab));
            });
            cb.exec(map);
        });
    }

    release(urlOrAssetOrNode:any):void
    {
        if(urlOrAssetOrNode instanceof cc.Node)
        {
            //释放节点,从场景上移除
            urlOrAssetOrNode.destroy();
        }
        else
        {
            //释放缓存引用和资源内容
            cc.loader.release(urlOrAssetOrNode);
        }
    }
}