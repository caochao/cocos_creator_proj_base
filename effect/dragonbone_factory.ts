import { loader_mgr } from "../loader/loader_mgr";
import { gen_handler } from "../util";

type DB_EVENT_HANDLER = (event:dragonBones.EventObject, state:dragonBones.AnimationState) => void;
const EVENT_DB_ASSET_LOADED = "EVENT_DB_ASSET_LOADED";
const BasePathForSke = (path:string) => {
    return `dragonbones/${path}_ske`;
};
const BasePathForTex = (path:string) => {
    return `dragonbones/${path}_tex`;
};

export class DragonBoneFactory
{
    private static _inst:DragonBoneFactory;
    private _loadingMap:Map<string, dragonBones.ArmatureDisplay[]>
    private _eventMap:Map<string, cc.EventTarget>;
    private _stateMap:Map<string, dragonBones.AnimationState>;
    private _compPool:dragonBones.ArmatureDisplay[];
    private _refMap:Map<string, number>;
    private _resMap:Map<string, string>;

    private constructor()
    {
        this._compPool = [];
        this._loadingMap = new Map();
        this._eventMap = new Map();
        this._stateMap = new Map();
        this._resMap = new Map();
        this._refMap = new Map();
    }

    static getInst()
    {
        if(!this._inst)
        {
            this._inst = new DragonBoneFactory();
        }
        return this._inst;
    }

    buildDB(params:ArmatureDisplayParams)
    {
        let comp = this._compPool.pop();
        let node:cc.Node;
        if(comp)
        {
           node = comp.node; 
        }
        else
        {
            node = new cc.Node();
            comp = node.addComponent(dragonBones.ArmatureDisplay);
            //save reference count for auto release
            const path = params.path;
            this._resMap.set(comp.uuid, path);
            const refCnt = (this._refMap.get(path) || 0) + 1;
            this._refMap.set(path, refCnt);
            cc.log(`DragonBoneFactory, increaseRef, path=${path}, ref=${refCnt}`);
        }
        if(params.parent)
        {
            node.parent = params.parent;
            node.x = params.x || 0;
            node.y = params.y || 0;
        }
        node.active = params.active != null ? params.active : true;

        // cc.log("buildArmatureDisplay", node.getContentSize(), node.getPosition(), node.getAnchorPoint());
        const path = params.path;
        const skePath = BasePathForSke(path);
        const texPath = BasePathForTex(path);
        const dragonBonesAsset = cc.loader.getRes(skePath, dragonBones.DragonBonesAsset);
        const dragonBonesAtlasAsset = cc.loader.getRes(texPath, dragonBones.DragonBonesAtlasAsset);
        const texture2D = cc.loader.getRes(texPath, cc.Texture2D);
        if(dragonBonesAsset && dragonBonesAtlasAsset && texture2D)
        {
            this.attachAsset(comp, params, dragonBonesAsset, dragonBonesAtlasAsset, texture2D);
        }
        else
        {
            const assets:DBAsset[] = [
                {path:skePath, alias:"dragonBonesAsset", type:dragonBones.DragonBonesAsset},
                {path:texPath, alias:"dragonBonesAtlasAsset", type:dragonBones.DragonBonesAtlasAsset},
                {path:texPath, alias:"texture2D", type:cc.Texture2D},
            ];
            this.loadAsset(comp, params, assets);
        }
        return comp;
    }

    private loadAsset(comp:dragonBones.ArmatureDisplay, params:ArmatureDisplayParams, assets:DBAsset[])
    {
        const path = params.path;
    
        //同一路径龙骨资源只加载一次
        let loadings = this._loadingMap.get(path);
        if(!loadings)
        {
            loadings = [];
            this._loadingMap.set(path, loadings);
        }
        loadings.push(comp)
        if(loadings.length > 1)
        {
            return;
        }

        // cc.log(`DragonBoneFactory, loadAsset, path=${path}`);
        loader_mgr.get_inst().loadResArray(assets.map(a => a.path), gen_handler(res => {
            const dragonBonesAsset = res[assets[0].alias];
            const dragonBonesAtlasAsset = res[assets[1].alias];
            const texture2D = res[assets[2].alias];

            const lds = this._loadingMap.get(path);
            if(lds) {
                lds.forEach(p => {
                    if(!p || !cc.isValid(p.node)) {
                        return;
                    }
                    if(dragonBonesAsset && dragonBonesAtlasAsset && texture2D) {
                        this.attachAsset(p, params, dragonBonesAsset, dragonBonesAtlasAsset, texture2D);
                        p.node.emit(EVENT_DB_ASSET_LOADED);
                    }
                });
                lds.length = 0;
                this._loadingMap.delete(path);
            }
        }), assets.map(a => a.type), assets.map(a => a.alias));
    }

    private attachAsset(comp:dragonBones.ArmatureDisplay, params:ArmatureDisplayParams, dragonBonesAsset:dragonBones.DragonBonesAsset, dragonBonesAtlasAsset:dragonBones.DragonBonesAtlasAsset, texture2D:cc.Texture2D)
    {
        comp.dragonAsset = dragonBonesAsset;
        dragonBonesAtlasAsset.texture = texture2D;
        comp.dragonAtlasAsset = dragonBonesAtlasAsset;
        
        comp.armatureName = params.armatureName;
        comp.addEventListener(dragonBones.EventObject.COMPLETE, event => {
            // cc.log("dragonbone complete event", event, comp.uuid);
            const state = this._stateMap.get(comp.uuid);
            if(params.onComplete) {
                params.onComplete(event, state);
            } 
            else {
                this.invokeDBEvent(comp, dragonBones.EventObject.COMPLETE, event, state);
            }
        });
        comp.addEventListener(dragonBones.EventObject.START, event => {
            // cc.log("dragonbone start event", event, comp.uuid);
            const state = this._stateMap.get(comp.uuid);
            if(params.onStart) {
                params.onStart(event, state);
            } 
            else {
                this.invokeDBEvent(comp, dragonBones.EventObject.START, event, state);
            }
        });
    }

    private decreaseRef(comp:dragonBones.ArmatureDisplay)
    {
        const path = this._resMap.get(comp.uuid);
        if(path)
        {
            this._resMap.delete(comp.uuid);
            const refCnt = (this._refMap.get(path) || 0) - 1;
            this._refMap.set(path, refCnt);
            cc.log(`DragonBoneFactory, decreaseRef, path=${path}, ref=${refCnt}`);
            if(refCnt == 0) 
            {
                this._refMap.delete(path);
                this.releaseAsset(path);
            }
        }
    }

    releaseDB(comp:dragonBones.ArmatureDisplay, recycle = false)
    {
        const uuid = comp.uuid;
        this._stateMap.delete(uuid);
        comp.node.off(EVENT_DB_ASSET_LOADED);
        comp.removeEventListener(dragonBones.EventObject.COMPLETE);
        this.removeDBEvent(comp, dragonBones.EventObject.COMPLETE);
        comp.removeEventListener(dragonBones.EventObject.START);
        this.removeDBEvent(comp, dragonBones.EventObject.START);
        comp.stopAnimation("");
        comp.dragonAtlasAsset = null;
        comp.dragonAsset = null;
        comp.armatureName = null;
        comp.animationName = null;
        const node = comp.node;
        if(recycle)
        {
            node.removeFromParent();
            this._compPool.push(comp);
        }
        else
        {
            this.decreaseRef(comp);
            node.destroy();
        }
    }

    playDB(comp:dragonBones.ArmatureDisplay, animationName:string, playTimes:number = 1, armatureName?:string)
    {
        const node = comp.node;
        if(!node)
        {
            cc.warn(`db has no associated node, animationName=${animationName}`);
            return;
        }
        if(!node.activeInHierarchy)
        {
            cc.warn(`db associated node is inactive, animationName=${animationName}`);
            return;
        }
        if(!comp.dragonAsset)
        {
            // cc.log(`DragonBoneFactory, playDB async, animationName=${animationName}`);
            //ArmatureDisplay资源加载完成后才能监听事件，所以这里必须要用node监听
            comp.node.on(EVENT_DB_ASSET_LOADED, () => {
                if(armatureName)
                {
                    comp.armatureName = armatureName;
                }
                const state = comp.playAnimation(animationName, playTimes);
                this._stateMap.set(comp.uuid, state);
                // cc.log(`DragonBoneFactory, onAssetLoaded, playDB, animationName=${animationName}`);
            });
            // cc.log("dragonbone play before loaded");
            return;
        }
        if(armatureName)
        {
            comp.armatureName = armatureName;
        }
        const state = comp.playAnimation(animationName, playTimes);
        this._stateMap.set(comp.uuid, state);
        // cc.log(`DragonBoneFactory, playDB, animationName=${animationName}`);
    }

    addStartEvent(comp:dragonBones.ArmatureDisplay, handler:DB_EVENT_HANDLER, target?:any)
    {
        this.addDBEvent(comp, dragonBones.EventObject.START, handler, target);
    }

    onceStartEvent(comp:dragonBones.ArmatureDisplay, handler:DB_EVENT_HANDLER, target?:any)
    {
        this.onceDBEvent(comp, dragonBones.EventObject.START, handler, target);
    }

    removeStartEvent(comp:dragonBones.ArmatureDisplay, handler?:DB_EVENT_HANDLER, target?:any)
    {
        this.removeDBEvent(comp, dragonBones.EventObject.START, handler, target);
    }

    addCompleteEvent(comp:dragonBones.ArmatureDisplay, handler:DB_EVENT_HANDLER, target?:any)
    {
        this.addDBEvent(comp, dragonBones.EventObject.COMPLETE, handler, target);
    }

    onceCompleteEvent(comp:dragonBones.ArmatureDisplay, handler:DB_EVENT_HANDLER, target?:any)
    {
        this.onceDBEvent(comp, dragonBones.EventObject.COMPLETE, handler, target);
    }

    removeCompleteEvent(comp:dragonBones.ArmatureDisplay, handler?:DB_EVENT_HANDLER, target?:any)
    {
        this.removeDBEvent(comp, dragonBones.EventObject.COMPLETE, handler, target);
    }

    //ArmatureDisplay资源加载完成前无法监听事件，用此方法可代替
    addDBEvent(comp:dragonBones.ArmatureDisplay, eventType:string, handler:DB_EVENT_HANDLER, target?:any)
    {
        const key = comp.uuid + "_" + eventType;
        let eventTarget = this._eventMap.get(key);
        if(!eventTarget) 
        {
            eventTarget = new cc.EventTarget();
            this._eventMap.set(key, eventTarget);
        }
        return eventTarget.on(eventType, handler, target);
    }

    onceDBEvent(comp:dragonBones.ArmatureDisplay, eventType:string, handler:DB_EVENT_HANDLER, target?:any)
    {
        const key = comp.uuid + "_" + eventType;
        let eventTarget = this._eventMap.get(key);
        if(!eventTarget) 
        {
            eventTarget = new cc.EventTarget();
            this._eventMap.set(key, eventTarget);
        }
        return eventTarget.once(eventType, handler, target);
    }

    removeDBEvent(comp:dragonBones.ArmatureDisplay, eventType:string, handler?:DB_EVENT_HANDLER, target?:any)
    {
        const key = comp.uuid + "_" + eventType;
        const eventTarget = this._eventMap.get(key);
        if(!eventTarget) 
        {
            return;
        }
        this._eventMap.delete(key);
        eventTarget.off(eventType, handler, target);
    }

    private invokeDBEvent(comp:dragonBones.ArmatureDisplay, eventType:string, ...params)
    {
        const key = comp.uuid + "_" + eventType;
        const eventTarget = this._eventMap.get(key);
        if(!eventTarget) 
        {
            return;
        }
        eventTarget.emit(eventType, ...params);
    }

    releaseAsset(path:string)
    {
        const skePath = BasePathForSke(path);
        const texPath = BasePathForTex(path);
        cc.loader.releaseRes(skePath, dragonBones.DragonBonesAsset);
        cc.loader.releaseRes(texPath, dragonBones.DragonBonesAtlasAsset);
        cc.loader.releaseRes(texPath, cc.Texture2D);
        cc.log(`DragonBoneFactory, releaseAsset, path=${skePath}`);
    }

    releaseAll()
    {
        this._loadingMap.clear();
        this._eventMap.clear();
        this._stateMap.clear();
        this._compPool.forEach(comp => {
            this.decreaseRef(comp);
            comp.destroy();
        });
        this._compPool.length = 0;
    }
}

interface ArmatureDisplayParams
{
    path:string;            //龙骨导出文件路径
    armatureName:string;    //骨架名称
    onComplete?:DB_EVENT_HANDLER;
    onStart?:DB_EVENT_HANDLER;
    parent?:cc.Node;
    x?:number;
    y?:number;
    active?:boolean;
}

interface DBAsset
{
    path:string;
    alias:string;
    type:typeof cc.Asset;
}