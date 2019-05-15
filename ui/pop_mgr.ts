import { pool_mgr } from "../pool/pool_mgr"
import { gen_handler } from "../util"
import { POP_UI_BASE } from "./pop_ui_base"
import { TweenUtil } from "../tween/tweenutil"
import { TweenFunc } from "../tween/tweenfunc"
import { event_mgr, Event_Name } from "../event/event_mgr";
import { LoadingQueue } from "../loader/loading_queue";

const panel_overlay_bg = "panel_overlay_bg";
const isDualInstanceView = (path:string) => {
    const config:UI_CONFIG = UI_CONFIG_MAP[path];
    return config && config.dualInstance;
}
const isModalView = (path:string) => {
    const config:UI_CONFIG = UI_CONFIG_MAP[path];
    return !config || config.needOverlayBg != false;
}
const isFullScreenView = (path:string) => {
    const config:UI_CONFIG = UI_CONFIG_MAP[path];
    return config && config.fullScreen;
}
const isDestroyAtOnce = (path:string) => {
    const config:UI_CONFIG = UI_CONFIG_MAP[path];
    return config && config.destroyAtOnce;
}
const getOverlayBgOpacity = (path:string) => {
    const config:UI_CONFIG = UI_CONFIG_MAP[path];
    if(!config || config.overlayBgOpacity == null) {
        return 175;
    }
    return config.overlayBgOpacity;
}

export class pop_mgr
{
    private static inst:pop_mgr;
    private view_map:Map<string, PopView[]>;
    private view_stack:PopView[];
    private overlayNode:cc.Node;

    private constructor()
    {
        this.view_map = new Map();
        this.view_stack = [];
        event_mgr.get_inst().add(Event_Name.UI_SHOW, this.onViewShow, this);
        event_mgr.get_inst().add(Event_Name.UI_HIDE, this.onViewHide, this);
    }

    static get_inst():pop_mgr
    {
        if(!this.inst) {
            this.inst = new pop_mgr();
        }
        return this.inst;
    }

    show(path:string, transition?:UI_TRANSITION, ...params)
    {
        let views = this.view_map.get(path);
        if(!isDualInstanceView(path) && views && views.length > 0) {
            return views[0];
        }
        if(!views) {
            views = [];
            this.view_map.set(path, views);
        }
        const view = new PopView(path);
        const scene = cc.director.getScene();
        if(cc.isValid(scene)) {
            const viewRoot = scene.getChildByName("Canvas");
            if(cc.isValid(viewRoot)) {
                view.setParent(viewRoot);
                view.setTransition(transition);
                view.setModal(isModalView(path));
                view.show(UI_CONFIG_MAP[path], ...params);
                views.push(view);
            }
        }
        return view;
    }

    /** deprecated */
    hide_bypath(path:string)
    {
        const views = this.view_map.get(path);
        if(!views || views.length <= 0 || isDualInstanceView(path)) {
            return;
        }
        const view = views.pop();
        view.hide();
    }

    has_views()
    {
        let ret = false;
        this.view_map.forEach(views => {
            if(views.length > 0) {
                ret = true;
            }
        });
        if(!ret) {
            ret = this.view_stack.length > 0;
        }
        return ret;
    }

    top_view()
    {
        if(this.view_stack.length > 0) {
            return this.view_stack[this.view_stack.length - 1];
        }
        return null;
    }

    clear()
    {
        this.view_map.forEach(views => {
            views.forEach(view => view.hide());
        });
        this.view_map.clear();
        this.view_stack.length = 0;
        if(cc.isValid(this.overlayNode)) {
            this.overlayNode.destroy();
            this.overlayNode = null;
        }
        cc.log(`PopMgr clear`);
    }

    private onViewShow(view:PopView)
    {
        cc.log(`PopMgr, onViewShow, view path=${view.getPath()}`);
        this._pushViewToStack(view);
        this._updateOverlay();
    }

    private onViewHide(view:PopView)
    {
        cc.log(`PopMgr, onViewHide, view path=${view.getPath()}`);
        this._removeViewFromMap(view);
        this._popViewFromStack(view);
        this._updateOverlay();
    }

    private _removeViewFromMap(view:PopView)
    {
        const path = view.getPath();
        const views = this.view_map.get(path);
        if(views) {
            const idx = views.indexOf(view);
            if(idx != -1) {
                views.splice(idx, 1);
            }
        }
    }

    private _pushViewToStack(view:PopView)
    {
        if(this.view_stack.indexOf(view) == -1) {
            this.view_stack.push(view);
        }
    }

    private _popViewFromStack(view:PopView)
    {
        const idx = this.view_stack.indexOf(view);
        if(idx != -1) {
            this.view_stack.splice(idx, 1);
        }
    }

    private _updateOverlay()
    {
        //找到最上层模态view
        const topModalView = this.getToppestModalView();
        if(!topModalView) {
            this._removeOverlay();
            return;
        }
        this._addOverlay(topModalView);
    }

    private _removeOverlay()
    {
        const overlayNode = this.overlayNode;
        if(cc.isValid(overlayNode) && overlayNode.parent) {
            overlayNode.removeFromParent(true);
            overlayNode.destroy();
            this.overlayNode = null;
            cc.log(`PopMgr, removeOverlay`);
        }
    }

    private _addOverlay(view:PopView)
    {
        cc.log(`PopMgr, _addOverlay, view=${view.getPath()}`);
        const viewRoot = view.getParent();
        if(!cc.isValid(viewRoot)) {
            cc.log(`PopMgr, _addOverlay, invalid viewRoot 1`);
            return;
        }
        const overlayNode = viewRoot.getChildByName(panel_overlay_bg);
        if(overlayNode) {
            this.overlayNode = overlayNode;
            this._addOverlayUnderView(overlayNode, view);
            // this._debugOverlay(viewRoot, overlayNode);
            return;
        }
        LoadingQueue.getInst().loadPrefabObj(UI_NAME.overlay_bg, gen_handler((overlayNode:cc.Node) => {
            if(!cc.isValid(viewRoot)) {
                cc.log(`PopMgr, _addOverlay, invalid viewRoot 2`);
                return;
            }
            if(view != this.getToppestModalView()) {
                // cc.log(`PopMgr, _addOverlay, ${view.getPath()} isn't toppest modal view`);
                return;
            }
            this.overlayNode = overlayNode;
            overlayNode.parent = viewRoot;
            overlayNode.name = panel_overlay_bg;
            this._addOverlayUnderView(overlayNode, view);
            // this._debugOverlay(viewRoot, overlayNode);
        }));
    }

    private _addOverlayUnderView(overlayNode:cc.Node, view:PopView)
    {
        cc.log(`PopMgr, _addOverlayUnderView, view=${view.getPath()}`);
        overlayNode.opacity = getOverlayBgOpacity(view.getPath());
        const viewZOrder = view.getNode().getSiblingIndex();
        if(overlayNode.getSiblingIndex() < viewZOrder) {
            overlayNode.setSiblingIndex(viewZOrder - 1);
        }
        else {
            overlayNode.setSiblingIndex(viewZOrder);
        }
    }

    private getToppestModalView()
    {
        const len = this.view_stack.length;
        if(len <= 0) {
            return null;
        }
        let modalView:PopView;
        for(let i = len - 1; i >= 0; i--) {
            const view = this.view_stack[i];
            const path = view.getPath();
            if(isModalView(path) && !isFullScreenView(path)) {
                modalView = view;
                break;
            }
        }
        return modalView;
    }

    private _debugOverlay(viewRoot:cc.Node, overlayNode:cc.Node)
    {
        cc.log("---------debug viewtree start-----------");
        viewRoot.children.forEach(c => cc.log(c.name + "\n"));
        cc.log(`overlay opcaity=${overlayNode.opacity}`);
        cc.log("---------debug viewtree end-----------");
    }
}

export class PopView
{
    private _path:string;
    private _node:cc.Node;
    private _parent:cc.Node;
    private _posX:number;
    private _posY:number;
    private _transition:UI_TRANSITION;
    private _config:UI_CONFIG;
    private _params:any[];
    private _isActive:boolean;
    private _isModal:boolean;
    private _isHide:boolean;

    constructor(path:string)
    {
        this._path = path;
        pool_mgr.get_inst().get_ui(path, gen_handler((node:cc.Node)=>{
            if(this._isHide) {
                pool_mgr.get_inst().put_ui(path, node);
                return;
            }
            this._node = node;
            if(cc.isValid(this._parent)) {
                this._setParent(this._parent, this._posX, this._posY);
            }
            if(this._transition != null) {
                this._setTransition(this._transition);
            }
            if(this._params != null) {
                this._show(this._config, ...this._params);
            }
            if(this._isActive != null) {
                this._setActive(this._isActive);
            }
            if(this._isModal != null) {
                this._setModal(this._isModal);
            }
        }, this));
    }

    show(config:UI_CONFIG, ...params)
    {
        this._config = config;
        this._params = params;
        if(this.isValid()) {
            this._show(config, ...params);
        }
    }

    private _show(config:UI_CONFIG, ...params)
    {
        const path = this._path;
        cc.log(`PopView show, path=${path}`);
        event_mgr.get_inst().fire(Event_Name.UI_SHOW, this);

        const uiBase = this._node.getComponent(POP_UI_BASE);
        uiBase.setView(this);
        uiBase.__show__(...params);
    }

    hide()
    {
        const path = this._path;
        if(this._isHide) {
            cc.log(`PopView hide, path=${path}, view is already hided`);
            return;
        }
        this._isHide = true;
        if(cc.isValid(this._node)) {
            const uiBase = this._node.getComponent(POP_UI_BASE);
            uiBase.__hide__();
            uiBase.setView(null);
            pool_mgr.get_inst().put_ui(path, this._node, isDestroyAtOnce(path));

            cc.log(`PopView hide, path=${path}`);
            event_mgr.get_inst().fire(Event_Name.UI_HIDE, this);
        }
    }

    setParent(parent:cc.Node, x = 0, y = 0)
    {
        this._parent = parent;
        this._posX = x;
        this._posY = y;
        if(this.isValid()) {
            this._setParent(parent, x, y);
        }
    }

    private _setParent(parent:cc.Node, x = 0, y = 0)
    {
        this._node.setParent(parent);
        this._node.setPosition(x, y);
    }

    setActive(active:boolean)
    {
        this._isActive = active;
        if(this.isValid()) {
            this._setActive(active);
        }
    }

    private _setActive(active:boolean)
    {
        this._node.active = active;
    }

    setModal(isModal:boolean)
    {
        if(this._isModal == isModal) {
            return;
        }
        this._isModal = isModal;
        if(this.isValid()) {
            this._setModal(isModal);
        }
    }

    private _setModal(isModal:boolean)
    {
        const hasComp = this._node.getComponent(cc.BlockInputEvents);
        if(isModal && !hasComp) {
            this._node.addComponent(cc.BlockInputEvents);
        }
        else if(!isModal && hasComp) {
            this._node.removeComponent(cc.BlockInputEvents);
        }
    }

    setTransition(transition:UI_TRANSITION)
    {
        this._transition = transition;
        if(this.isValid()) {
            this._setTransition(transition);   
        }
    }

    private _setTransition(transition:UI_TRANSITION)
    {
        transition = transition || {transType:UI_TRANSITION_TYPE.None};
        switch(transition.transType)
        {
            case UI_TRANSITION_TYPE.FadeIn:
                TweenUtil.from({target:this._node, duration:transition.duration || 1, opacity:0, tweenFunc:transition.tweenFunc || TweenFunc.Linear});
                break;
        }
    }

    private isValid()
    {
        return cc.isValid(this._node) && !this._isHide;
    }

    getPath()
    {
        return this._path;
    }

    getParent()
    {
        return this._parent;
    }

    getNode()
    {
        return this._node;
    }
}

//界面prefab路径配置, 相对于assets/resources目录
export const UI_NAME = {
    overlay_bg:"prefabs/panels/panel_overlay_bg",
    settlement:"prefabs/panels/panel_settlement",
    setting:"prefabs/panels/panel_setting",
    msgBox:"prefabs/panels/panel_msgBox",
}

const UI_CONFIG_MAP = {
    [UI_NAME.msgBox]: {dualInstance:true},
    [UI_NAME.settlement]: {fullScreen:true, destroyAtOnce:true},
}

export interface UI_CONFIG
{
    needOverlayBg?:boolean;
    overlayBgOpacity?:number;
    dualInstance?:boolean;
    fullScreen?:boolean;
    destroyAtOnce?:boolean;
}

interface UI_TRANSITION
{
    transType:UI_TRANSITION_TYPE;
    tweenFunc?:Function;
    duration?:number;
}

export const enum UI_TRANSITION_TYPE
{
    None = 1,
    FadeIn,
    DropDown,
    PopUp,
    LeftIn,
    RightIn,
}