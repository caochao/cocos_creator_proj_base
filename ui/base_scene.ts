import { BaseUIComponent } from "./base_ui_component";

const {ccclass, property} = cc._decorator;

@ccclass
export class BaseScene extends BaseUIComponent {
    private _name:string;

    setName(value:string)
    {
        this._name = value;
    }

    /**
     * 只能由scene_mgr调用
     */
    __onStarted__(...params)
    {
        cc.log(`scene<${this._name}> __onStarted__`, ...params);
        this.onStarted(...params);
        this.enabled = true;
    }
    
    /**
     * 只能由scene_mgr调用
     */
    __beforeDestroy__()
    {
        cc.log(`scene<${this._name}> __beforeDestroy__`);
        this.enabled = false;
        this.clearEventListeners();
        this.beforeDestroy();
    }

    /**
     * 场景start方法后调用
     */
    onStarted(...params)
    {

    }

    /**
     * 场景onDestroy方法前调用
     */
    beforeDestroy()
    {

    }
}