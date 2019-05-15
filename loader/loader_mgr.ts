import {handler, gen_handler} from "../util"

export class loader_mgr
{
    private static inst:loader_mgr;
    private _loadedRes:Map<string, boolean>;
    private _loadedExternalUrls:Map<string, boolean>;

    private constructor()
    {
        this._loadedRes = new Map();
        this._loadedExternalUrls = new Map();
    }

    static get_inst():loader_mgr
    {
        if(!this.inst)
        {
            this.inst = new loader_mgr();
        }
        return this.inst;
    }

    setExternalSprite(sprite:cc.Sprite, url:string, reActive = false)
    {
        this.loadExternalAsset(url, gen_handler((tex:cc.Texture2D) => {
            if(!sprite || !cc.isValid(sprite.node))
            {
                cc.loader.release(url);
                return;
            }
            if(reActive)
            {
                sprite.node.active = true;
            }
            sprite.spriteFrame = new cc.SpriteFrame(tex);
        }));
    }

    setExternalSpriteFrame(sprite:cc.Sprite, frame:cc.SpriteFrame, url:string, reActive = false)
    {
        this.loadExternalAsset(url, gen_handler((tex:cc.Texture2D) => {
            if(!sprite || !cc.isValid(sprite.node))
            {
                cc.loader.release(url);
                return;
            }
            if(reActive)
            {
                sprite.node.active = true;
            }
            if(cc.isValid(frame))
            {
                frame.setTexture(tex);
                sprite.spriteFrame = frame;
            }
        }));
    }

    setSprite(sprite:cc.Sprite, url:string, reActive = false)
    {
        this.loadRes(url, gen_handler((tex:cc.Texture2D) => {
            if(!sprite || !cc.isValid(sprite.node))
            {
                cc.loader.release(url);
                return;
            }
            if(reActive)
            {
                sprite.node.active = true;
            }
            sprite.spriteFrame = new cc.SpriteFrame(tex);
        }));
    }

    setSpriteFrame(sprite:cc.Sprite, frame:cc.SpriteFrame, url:string, reActive = false)
    {
        this.loadRes(url, gen_handler((tex:cc.Texture2D) => {
            if(!sprite || !cc.isValid(sprite.node))
            {
                cc.loader.release(url);
                return;
            }
            if(reActive)
            {
                sprite.node.active = true;
            }
            if(cc.isValid(frame))
            {
                frame.setTexture(tex);
                sprite.spriteFrame = frame;
            }
        }));
    }

    setAtlasSprite(sprite:cc.Sprite, atlasUrl:string, spriteFrameName:string, reActive = false)
    {
        this.loadRes(atlasUrl, gen_handler((atlas:cc.SpriteAtlas) => {
            if(!sprite || !cc.isValid(sprite.node))
            {
                cc.loader.release(atlasUrl);
                return;
            }
            if(reActive)
            {
                sprite.node.active = true;
            }
            sprite.spriteFrame = atlas.getSpriteFrame(spriteFrameName);
        }), cc.SpriteAtlas);
    }

    /**从远程url下载资源 */
    loadExternalAsset(url:string, cb:handler, type?:string)
    {
        const res = cc.loader.getRes(url);
        if(cc.isValid(res))
        {
            // console.log("loadExternalAsset from cache");
            cb.exec(res);
            return;
        }
        cc.loader.load(type ? {url, type} : url, (err, res) => {
            if(err)
            {
                cc.warn("loadExternalAsset error", url);
                return;
            }
            if(cc.isValid(res)) {
                this.cacheExternalAsset(url);
                cb.exec(res);
            }
        });
    }

    /**从远程url下载资源列表 */
    loadExternalAssets(urls:string[], cb:handler, types?:string[])
    {
        let loaded_res = {};
        let unloaded_urls:string[] = [];
        urls.forEach(url => {
            let res = cc.loader.getRes(url);
            if(cc.isValid(res))
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

        const loadTasks = [];
        unloaded_urls.forEach((url, i) => {
            types ? loadTasks.push({url, type:types[i]}) : loadTasks.push(url);
        })
        cc.loader.load(loadTasks, (errs, ress) => {
            // cc.log("loadExternalAssets from remote url");
            if(errs)
            {
                cc.warn("loadExternalAssets error", errs);
                return;
            }
            let isValid = true;
            unloaded_urls.forEach(url => {
                const res = ress.getContent(url);
                if(!cc.isValid(res)) {
                    isValid = false;
                    return;
                }
                loaded_res[url] = res;
                this.cacheExternalAsset(url);
            });
            if(isValid) {
                cb.exec(loaded_res);
            }
        });
    }

    /**从resources目录加载asset*/
    loadRes(url:string, cb:handler, assetType?:typeof cc.Asset):void
    {
        let res = cc.loader.getRes(url, assetType);
        if(cc.isValid(res))
        {
            cb.exec(res);
            return;
        }
        cc.loader.loadRes(url, assetType, (err, res) => {
            if(err) 
            {
                cc.warn("loadAsset error", url);
                return;
            }
            if(cc.isValid(res)) {
                this.cacheAsset(res);
                cb.exec(res); 
            }
        });
    }

    /**从resources目录加载asset列表，省略资源后缀*/
    loadResArray(urls:string[], cb:handler, assetTypes?:typeof cc.Asset[], alias?:string[])
    {
        //加载同名资源时，需要手动给出不同的别名
        let loaded_res = {};
        let unloaded_urls:string[] = [];
        let unloaded_alias:string[];
        let unloaded_types:typeof cc.Asset[];

        if(alias)
        {
            unloaded_alias = [];
        }
        if(assetTypes)
        {
            unloaded_types = [];
        }
        urls.forEach((url, idx) => {
            const resType = assetTypes ? assetTypes[idx] : null;
            const resAlias = alias ? alias[idx] : null;
            const res = cc.loader.getRes(url, resType);
            if(cc.isValid(res))
            {
                loaded_res[resAlias || url] = res;
            }
            else
            {
                unloaded_urls.push(url);
                if(resType)
                {
                    unloaded_types.push(resType);
                }
                if(resAlias)
                {
                    unloaded_alias.push(resAlias);
                }
            }
        });
        if(unloaded_urls.length == 0)
        {
            cb.exec(loaded_res);
            return;
        }
        cc.loader.loadResArray(unloaded_urls, unloaded_types, err => {
            if(err)
            {
                cc.warn("loadResArray error", unloaded_urls);
                return;
            }
            let isValid = true;
            unloaded_urls.forEach((url, idx) => {
                const resType = unloaded_types ? unloaded_types[idx] : null;
                const resAlias = unloaded_alias ? unloaded_alias[idx] : null;
                const res = cc.loader.getRes(url, resType);
                if(!cc.isValid(res)) {
                    isValid = false;
                    return;
                }
                loaded_res[resAlias || url] = res;
                this.cacheAsset(res);
            });
            if(isValid) {
                cb.exec(loaded_res);
            }
        });
    }

    /**从resources目录加载prefab(省略资源后缀)，加载成功后生成prefab实例*/
    loadPrefabObj(url:string, cb:handler)
    {
        let res:cc.Prefab = cc.loader.getRes(url, cc.Prefab);
        if(cc.isValid(res))
        {
            let node:cc.Node = cc.instantiate(res);
            cb.exec(node);
            return;
        }
        //err is typeof Error, err.message
        cc.loader.loadRes(url, cc.Prefab, (err, res:cc.Prefab) => {
            if(err)
            {
                cc.warn("loadPrefabObj error", url);
                return;
            }
            if(cc.isValid(res)) {
                this.cacheAsset(res);
                let node:cc.Node = cc.instantiate(res);
                cb.exec(node);
            }
        });
    }

    /**从resources目录加载prefab列表(省略资源后缀)，加载成功后生成prefab实例*/
    loadPrefabObjArray(urls:string[], cb:handler)
    {
        let loaded_obj:any = {};
        let unloaded_urls:string[] = [];
        urls.forEach((url:string) => {
            const res:cc.Prefab = cc.loader.getRes(url, cc.Prefab);
            if(cc.isValid(res))
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
        cc.loader.loadResArray(unloaded_urls, cc.Prefab, err => {
            if(err)
            {
                cc.warn("loadPrefabObjArray error", unloaded_urls);
                return;
            }
            let isValid = true;
            unloaded_urls.forEach(url => {
                const res:cc.Prefab = cc.loader.getRes(url, cc.Prefab);
                if(!cc.isValid(res)) {
                    isValid = false;
                    return;
                }
                loaded_obj[url] = cc.instantiate(res);
                this.cacheAsset(res);
            });
            if(isValid) {
                cb.exec(loaded_obj);
            }
        });
    }

    loadPrefabDir(dir_path:string, cb:handler)
    {
        let map:any = {};
        cc.loader.loadResDir(dir_path, cc.Prefab, (err:any, res_arr:any[], urls:string[]) => {
            if(err)
            {
                cc.warn("loadPrefabObjDir error", dir_path);
                return;
            }
            let isValid = true;
            urls.forEach(url => {
                const res:cc.Prefab = cc.loader.getRes(url, cc.Prefab);
                if(!cc.isValid(res)) {
                    isValid = false;
                    return;
                }
                map[url] = res;
                this.cacheAsset(res);
            });
            if(isValid) {
                cb.exec(map);
            }
        });
    }

    loadPrefabObjDir(dir_path:string, cb:handler):void
    {
        let map:any = {};
        cc.loader.loadResDir(dir_path, cc.Prefab, (err:any, res_arr:any[], urls:string[]) => {
            if(err)
            {
                cc.warn("loadPrefabObjDir error", dir_path);
                return;
            }
            let isValid = true;
            urls.forEach(url => {
                const res:cc.Prefab = cc.loader.getRes(url, cc.Prefab);
                if(!cc.isValid(res)) {
                    isValid = false;
                    return;
                }
                map[url] = cc.instantiate(res);
                this.cacheAsset(res);
            });
            if(isValid) {
                cb.exec(map);
            }
        });
    }

    private cacheAsset(asset:cc.Asset)
    {
        if(cc.isValid(asset)) {
            const key:string = cc.loader._getReferenceKey(asset);
            if(key) {
                this._loadedRes.set(key, true);
            }
        }
    }

    private cacheExternalAsset(url:string)
    {
        this._loadedExternalUrls.set(url, true);
    }

    releaseAll(excludeMap = null)
    {
        const leftRes:Map<string, boolean> = new Map();
        this._loadedRes.forEach((_, res) => {
            const deps = cc.loader.getDependsRecursively(res);
            deps.forEach(d => {
                if(!d) {
                    return;
                }
                // cc.log(`loaderMgr release loadedRes, dep=${d}, exclude=${excludeMap ? excludeMap[d] : false}`);
                if(!excludeMap || !excludeMap[d]) {
                    cc.loader.release(d);
                }
                else {
                    leftRes.set(d, true);
                }
            });
        });
        this._loadedRes.clear();
        leftRes.forEach((_, d) => {
            this._loadedRes.set(d, true);
        });

        //释放外部资源
        this._loadedExternalUrls.forEach((_, url) => {
            // cc.log(`loaderMgr release loadedExternalRes, url=${url}`);
            cc.loader.release(url);
        });
        this._loadedExternalUrls.clear();

        cc.sys.garbageCollect();
        // this.dump();
    }

    dump()
    {
        cc.log(`---------------------loader_mgr dump begin--------------------------`);
        const cache = cc.loader._cache;
        let count = 0;
        for(let id in cache)
        {
            count++;
            cc.log(`id=${id}, value=${cache[id]}`);
        }
        cc.log(`---------------------loader_mgr dump end, totalCount=${count}--------------------------`);
    }
}