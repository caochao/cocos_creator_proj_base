import {pop_mgr, UI_CONFIG} from "./pop_mgr"
import {pool_mgr} from "../pool/pool_mgr"
import {handler, gen_handler} from "../util"
import * as Audio from "../../common/audio/audioplayer"
import {wxHttpClient} from "../../common/wxapi/index"

const {ccclass, property} = cc._decorator;
const pop_overlay_bg:string = "panel_overlay_bg";

@ccclass
export class POP_UI_BASE extends cc.Component {

	@property(cc.Button)
    btn_close: cc.Button = null;

    //界面名字，UI_CONFIG.*
    private _ui_name:string;
    protected is_show:boolean;

    /*由于pop_mgr缓存策略，此方法只会在首次打开界面时调用1次, 缓存以后再打开不会执行onLoad.
        因此不能用来做每次打开界面时的初始化工作
    */
	// onLoad()
	// {
    //     cc.info("on_load 00000000000000000");
    // }
    
    set ui_name(value:string)
    {
        this._ui_name = value;
    }
    
    /**
     * 只能由pop_mgr调用
     */
    __show__(...params:any[]):void
    {
        cc.info("show", this._ui_name, ...params);
        if(this.btn_close)
        {
            this.btn_close.node.on(cc.Node.EventType.TOUCH_END, this.onCloseBtnTouch, this);
        }
        this.is_show = true;
        this.on_show(...params);

        //添加遮罩背景
        let overlay:cc.Node = this.node.getChildByName(pop_overlay_bg);
        if(!overlay)
        {
            pool_mgr.get_inst().get_ui(UI_CONFIG.overlay_bg, gen_handler((bg_node:cc.Node):void=>{
                if(!this.is_show || this.node.getChildByName(pop_overlay_bg))
                {
                    pool_mgr.get_inst().put_ui(UI_CONFIG.overlay_bg, bg_node);
                    return;
                }
                bg_node.name = pop_overlay_bg;
                this.node.addChild(bg_node);
                bg_node.setSiblingIndex(0);
            }, this));
        }
    }

    /**
     * 只能由pop_mgr调用
     */
    __hide__():void
    {
        cc.info("hide", this._ui_name);
        if(this.btn_close)
        {
            this.btn_close.node.off(cc.Node.EventType.TOUCH_END, this.onCloseBtnTouch, this);
        }
        this.is_show = false;
        this.on_hide();
        wxHttpClient.unregisterCtxHandler(this);
    }

    /**弹出界面时调用，且在onLoad之后调用，可以用来做一些初始化工作*/
    on_show(...params:any[]):void
    {
        
    }

    /**关闭界面时调用，用来做清理工作*/
    on_hide():void
    {
        
    }

    /**关闭自身*/
    hide():void
    {
        pop_mgr.get_inst().hide(this._ui_name);
    }

    onCloseBtnTouch():void
    {
        this.hide();
        Audio.AudioPlayer.getInst().play_sound(Audio.AUDIO_CONFIG.Audio_Btn);
    }
}