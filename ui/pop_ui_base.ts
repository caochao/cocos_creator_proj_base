import { PopView } from "./pop_mgr"
import { BaseUIComponent } from "./base_ui_component";

const {ccclass, property} = cc._decorator;

@ccclass
export class POP_UI_BASE extends BaseUIComponent {

	@property(cc.Button)
    btn_close: cc.Button = null;

    protected is_show:boolean;
    protected view:PopView;

    setView(value:PopView)
    {
        this.view = value;
    }
    
    /**
     * 只能由pop_mgr调用
     */
    __show__(...params)
    {
        if(this.btn_close)
        {
            this.btn_close.node.on(cc.Node.EventType.TOUCH_END, this.onCloseBtnTouch, this);
        }
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchSelf, this);
        this.is_show = true;
        this.on_show(...params);
        this.enabled = true;
    }

    /**
     * 只能由pop_mgr调用
     */
    __hide__()
    {
        if(this.btn_close)
        {
            this.btn_close.node.off(cc.Node.EventType.TOUCH_END, this.onCloseBtnTouch, this);
        }
        this.node.off(cc.Node.EventType.TOUCH_END, this.onTouchSelf, this);
        this.is_show = false;
        this.enabled = false;
        this.clearEventListeners();
        this.on_hide();
    }

    /**弹出界面时调用，可以用来做初始化工作*/
    protected on_show(...params)
    {
        
    }

    /**关闭界面时调用，用来做清理工作*/
    protected on_hide()
    {
        
    }

    /**关闭自身*/
    hide()
    {
        if(this.view) {
            this.view.hide();
        }
    }

    protected onCloseBtnTouch()
    {
        this.hide();
    }

    protected onTouchSelf(event:cc.Event.EventTouch)
    {

    }
}