import {pool_mgr} from "../pool/pool_mgr"
import {handler, gen_handler} from "../util"
import {POP_UI_BASE} from "./pop_ui_base"

export class pop_mgr
{
    private static inst:pop_mgr;
    private ui_cache:any;           //path => pop_ui
    private ui_stack:Array<string>; //ui stacks
    private ui_show_handler:handler;
    private ui_hide_handler:handler;

    private constructor()
    {
        this.ui_cache = {};
        this.ui_stack = new Array<string>();
    }

    static get_inst():pop_mgr
    {
        if(!this.inst)
        {
            this.inst = new pop_mgr();
        }
        return this.inst;
    }

    private get_ui(path:string):pop_ui
    {
        let ui:pop_ui = this.ui_cache[path];
        if(!ui)
        {
            this.ui_cache[path] = ui = {node:null, is_show:false};
        }
        return ui;
    }

    clear()
    {
        for(let path in this.ui_cache)
        {
            this.hide(path);
        }
        this.ui_cache = {};
        this.ui_stack.length = 0;
    }

    peek()
    {
        return this.ui_stack[this.ui_stack.length - 1];
    }

    set_handlers(on_ui_show:handler, on_ui_hide:handler)
    {
        this.ui_show_handler = on_ui_show;
        this.ui_hide_handler = on_ui_hide;
    }

    is_show(path:string):boolean
    {
        let ui:pop_ui = this.ui_cache[path];
        return ui && ui.is_show;
    }

    show(path:string, ...params:any[]):void
    {
        let ui:pop_ui = this.get_ui(path);
        if(ui.is_show)
        {
            return;
        }
        ui.is_show = true;
        pool_mgr.get_inst().get_ui(path, gen_handler((node:cc.Node):void=>{
            if(!ui.is_show)
            {
                pool_mgr.get_inst().put_ui(path, node);
                return;
            }
            ui.node = node;
            cc.director.getScene().addChild(node);
            //调用show
            let ui_base:POP_UI_BASE = node.getComponent(POP_UI_BASE);
            ui_base.ui_name = path;
            ui_base.__show__(...params);
            //进栈
            this.ui_stack.push(path);
            //钩子函数调用
            if(this.ui_show_handler)
            {
                this.ui_show_handler.exec();
            }
        }, this));
    }

    //关闭界面时不destroy，只是从父节点移除并缓存
    hide(path:string):void
    {
        let ui:pop_ui = this.ui_cache[path];
        if(!ui || !ui.is_show)
        {
            return;
        }
        this.ui_cache[path] = null;
        ui.is_show = false;
        if(ui.node)
        {
            pool_mgr.get_inst().put_ui(path, ui.node);
            //调用hide
            let ui_base:POP_UI_BASE = ui.node.getComponent(POP_UI_BASE);
            ui_base.__hide__();
            //出栈
            const lastIdx = this.ui_stack.lastIndexOf(path);
            if(lastIdx != -1)
            {
                this.ui_stack.splice(lastIdx, 1);
            }
            //钩子函数调用
            if(this.ui_hide_handler)
            {
                this.ui_hide_handler.exec();
            }
        }
    }
}

type pop_ui = {
    node:cc.Node;
    is_show:boolean;
}

//界面prefab路径配置, 相对于assets/resources目录
export const UI_CONFIG = {
    overlay_bg:"panels/panel_overlay_bg",
    level:"panels/panel_level",
    level_detail:"panels/panel_leveldetail",
    game:"panels/panel_game",
    level_result:"panels/panel_levelresult",
    level_reward:"panels/panel_levelreward",
    rank:"panels/panel_rank",
    newbee_gift:"panels/panel_newbeegift",
    sos_gift:"panels/panel_sosgift",
}