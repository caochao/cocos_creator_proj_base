import { loader_mgr } from "../loader/loader_mgr";
import { gen_handler } from "../util";

const EVENT_PARTICLE_ASSET_LOADED = "EVENT_PARTICLE_ASSET_LOADED";
const BasePathForParticle = (path:string) => {
    return `particles/${path}`;
};

export class ParticleFactory {
    private static _inst:ParticleFactory;
    private _compPool:cc.ParticleSystem[];
    private _loadingMap:Map<string, cc.ParticleSystem[]>;
    private _refMap:Map<string, number>;
    private _resMap:Map<string, string>;

    private constructor() {
        this._compPool = [];
        this._loadingMap = new Map();
        this._resMap = new Map();
        this._refMap = new Map();
    }

    static getInst() {
        if(!this._inst) {
            this._inst = new ParticleFactory();
        }
        return this._inst;
    }

    buildParticle(params:ParticleParams) {
        let comp = this._compPool.pop();
        let node:cc.Node;
        if(comp) {
            node = comp.node;
        } 
        else {
            node = new cc.Node();
            comp = node.addComponent(cc.ParticleSystem);
            //save reference count for auto release
            const path = params.path;
            this._resMap.set(comp.uuid, path);
            const refCnt = (this._refMap.get(path) || 0) + 1;
            this._refMap.set(path, refCnt);
            cc.log(`ParticleFactory, increaseRef, path=${path}, ref=${refCnt}`);
        }

        comp.playOnLoad = false;
        comp.autoRemoveOnFinish = false;

        if(params.parent) {
            node.parent = params.parent;
            node.x = params.x || 0;
            node.y = params.y || 0;
        }

        const path = params.path;
        const basePath = BasePathForParticle(path);
        const particleAsset:cc.ParticleAsset = cc.loader.getRes(basePath, cc.ParticleAsset);
        const spriteFrame:cc.SpriteFrame = cc.loader.getRes(basePath, cc.SpriteFrame);
        if(particleAsset && spriteFrame) {
            this.attachAsset(comp, particleAsset, spriteFrame);
        } 
        else {
            const assets:ParticleAsset[] = [
                {path:basePath, alias:"particleAsset", type:cc.ParticleAsset},
                {path:basePath, alias:"spriteFrame", type:cc.SpriteFrame},
            ];
            this.loadAsset(comp, path, assets);
        }
        return comp;
    }

    private loadAsset(comp:cc.ParticleSystem, path:string, assets:ParticleAsset[]) {
        //同一路径资源只加载一次
        let loadings = this._loadingMap.get(path);
        if(!loadings) {
            loadings = [];
            this._loadingMap.set(path, loadings);
        }
        loadings.push(comp);
        if(loadings.length > 1) {
            return;
        }

        cc.log(`ParticleFactory, loadAsset, path=${assets[0].path}`);
        loader_mgr.get_inst().loadResArray(assets.map(a => a.path), gen_handler(res => {
            const particleAsset:cc.ParticleAsset = res[assets[0].alias];
            const spriteFrame:cc.SpriteFrame = res[assets[1].alias];
            
            const lds = this._loadingMap.get(path);
            if(lds) {
                lds.forEach(p => {
                    if(!p || !cc.isValid(p.node)) {
                        return;
                    }
                    if(particleAsset && spriteFrame) {
                        this.attachAsset(p, particleAsset, spriteFrame);
                        p.node.emit(EVENT_PARTICLE_ASSET_LOADED);
                    }
                });
                lds.length = 0;
                this._loadingMap.delete(path);
            }
        }), assets.map(a => a.type), assets.map(a => a.alias));
    }

    private attachAsset(comp:cc.ParticleSystem, particleAsset:cc.ParticleAsset, spriteFrame:cc.SpriteFrame) {
        comp.file = particleAsset;
        comp.spriteFrame = spriteFrame;
    }

    play(comp:cc.ParticleSystem) {
        const node = comp.node;
        if(!node) {
            cc.warn(`cc.ParticleSystem has no associated node`);
            return;
        }
        if(!node.activeInHierarchy) {
            cc.warn(`cc.ParticleSystem associated node is inactive`);
            return;
        }
        if(!comp.file) {
            cc.log(`ParticleSystem, play async`);
            comp.node.on(EVENT_PARTICLE_ASSET_LOADED, () => {
                comp.resetSystem();
                cc.log(`ParticleSystem, onAssetLoaded play`);
            });
            return;
        }
        comp.resetSystem();
        cc.log(`ParticleSystem, play`);
    }

    private decreaseRef(comp:cc.ParticleSystem)
    {
        const path = this._resMap.get(comp.uuid);
        if(path)
        {
            this._resMap.delete(comp.uuid);
            const refCnt = (this._refMap.get(path) || 0) - 1;
            this._refMap.set(path, refCnt);
            cc.log(`ParticleFactory, decreaseRef, path=${path}, ref=${refCnt}`);
            if(refCnt == 0) 
            {
                this._refMap.delete(path);
                this.releaseAsset(path);
            }
        }
    }

    releaseParticle(comp:cc.ParticleSystem, recycle = false) {
        comp.node.off(EVENT_PARTICLE_ASSET_LOADED);
        comp.stopSystem();
        comp.file = null;
        comp.spriteFrame = null;
        const node = comp.node;
        if(recycle) {
            node.removeFromParent();
            this._compPool.push(comp);
        } 
        else {
            this.decreaseRef(comp);
            node.destroy();
        }
    }

    releaseAsset(path:string) {
        const basePath = BasePathForParticle(path);
        cc.loader.releaseRes(basePath, cc.ParticleAsset);
        cc.loader.releaseRes(basePath, cc.SpriteFrame);
        cc.log(`ParticleFactory, releaseAsset, path=${basePath}`);
    }

    releaseAll() {
        this._loadingMap.clear();
        this._compPool.forEach(comp => {
            this.decreaseRef(comp);
            comp.destroy();
        });
        this._compPool.length = 0;
    }
}

interface ParticleParams {
    path:string;    //plist文件路径
    parent?:cc.Node;
    x?:number;
    y?:number;
}

interface ParticleAsset {
    path:string;
    alias:string;
    type:typeof cc.Asset;
}