import { BaseScene } from "./base_scene";
import { event_mgr, Event_Name } from "../event/event_mgr";
import { AudioPlayer } from "../audio/audioplayer";
import { DragonBoneFactory } from "../effect/dragonbone_factory";
import { ParticleFactory } from "../effect/particle_factory";
import { pop_mgr } from "./pop_mgr";
import { loader_mgr } from "../loader/loader_mgr";
import { Toast } from "./toast";
import { pool_mgr } from "../pool/pool_mgr";
import { LoadingQueue } from "../loader/loading_queue";

export class SceneMgr
{
    private static _inst:SceneMgr
    private _loadingSceneName:string;
    private _currSceneName:string;
    private _currScene:BaseScene;

    private constructor()
    {
        cc.director.on(cc.Director.EVENT_BEFORE_SCENE_LAUNCH, this.onSceneWillLaunch, this);
    }

    static getInst():SceneMgr
    {
        if(!this._inst) {
            this._inst = new SceneMgr();
        }
        return this._inst;
    }

    get currScene()
    {
        return this._currSceneName;
    }

    preloadScene(sceneName:string)
    {
        cc.director.preloadScene(sceneName);
    }

    loadScene(sceneName:string, ...params)
    {
        //reload current scene
        if(this._currSceneName == sceneName) {
            if(this._currScene && cc.isValid(this._currScene.node)) {
                this.closeAllView();
                this._currScene.__beforeDestroy__();
                this._currScene.__onStarted__(...params);
                event_mgr.get_inst().fire(Event_Name.SCENE_CHANGED, sceneName);
            }
            return;
        }

        if(this._loadingSceneName) {
            return;
        }
        this._loadingSceneName = sceneName;
        cc.director.loadScene(sceneName, (_, scene:cc.Scene) => {
            this._loadingSceneName = null;
            if(!cc.isValid(scene)) {
                cc.log(`SceneMgr, loadScene scene = null`);
                return;
            }
            //destroy old scene
            const oldDestroy = scene.destroy;
            scene.destroy = () => {
                this.onSceneWillDestroy();
                return oldDestroy.call(scene);
            };

            //make sure each scene has a child named "Canvas"
            const baseScene = scene.getChildByName("Canvas").getComponent(BaseScene);
            if(baseScene && cc.isValid(baseScene.node)) {
                this._currScene = baseScene;
                this._currSceneName = sceneName;
                baseScene.setName(sceneName);
                baseScene.__onStarted__(...params);
                event_mgr.get_inst().fire(Event_Name.SCENE_CHANGED, sceneName);
            }
        });
    }

    private closeAllView()
    {
        //旧场景destroy前关闭所有已打开的界面
        pop_mgr.get_inst().clear();
        pool_mgr.get_inst().clear();
    }

    private onSceneWillDestroy()
    {
        if(this._currScene && cc.isValid(this._currScene.node)) {
            this.closeAllView();
            this._currScene.__beforeDestroy__();
            this._currScene = null;
            this._currSceneName = null;
        }
    }

    private onSceneWillLaunch(newScene:cc.Scene)
    {
        //收集新场景依赖的资源
        const excludeMap = {};
        const newSceneAssets = newScene.dependAssets;
        if(newSceneAssets) {
            newSceneAssets.forEach(a => {
                excludeMap[a] = true;
                // cc.log(`newSceneAssets, asset=${a}`);
            });
        }

        //收集持久节点依赖的资源
        const toast = newScene.getChildByName("toast");
        if(toast) {
            cc.log("toast in current scene");
            const deps = cc.loader.getDependsRecursively(Toast.resPath);
            deps.forEach(d => {
                excludeMap[d] = true;
                // cc.log("prefabs/misc/toast deps=" + d);
            });
        }

        //激活新场景前释放旧场景资源
        Toast.clear();
        AudioPlayer.getInst().clear_cache();
        DragonBoneFactory.getInst().releaseAll();
        ParticleFactory.getInst().releaseAll();
        LoadingQueue.getInst().clear();
        loader_mgr.get_inst().releaseAll(excludeMap);
    }
}

export const SCENE_NAME = {
    launch:"hotupdate",
    main:"newmain",
    battle:"battle",
}