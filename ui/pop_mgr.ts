import {pool_mgr} from "../pool/pool_mgr"
import {handler, gen_handler} from "../utils"
import {POP_UI_BASE} from "./pop_ui_base"

export class pop_mgr
{
    private static inst:pop_mgr;
    private ui_cache:any;      //path => pop_ui

    private constructor()
    {
        this.ui_cache = {};
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
        }
    }
}

type pop_ui = {
    node:cc.Node;
    is_show:boolean;
}

//界面prefab路径配置, 相对于assets/resources目录
export const UI_CONFIG = {
    overlay_bg:"prefabs/panel_overlay_bg",
    login:"prefabs/panel_login",
    register:"prefabs/panel_register",
    findpwd:"prefabs/panel_findpwd",
    cash:"prefabs/panel_cash",
    updatepwd:"prefabs/panel_updatepwd",
    bindcard:"prefabs/panel_bindcard",
    unbindcard:"prefabs/panel_unbindcard",
    bind_phone:"prefabs/panel_bindphone",
    reset_pwd:"prefabs/panel_resetpwd",
    msg_box:"prefabs/panel_msgbox",
    notice:"prefabs/panel_notice",
    head_list:"prefabs/panel_headlist",
    server_list:"prefabs/panel_serverlist",
    create_pack_room:"prefabs/panel_createpackroom",
    create_sg_room:"prefabs/panel_createsgroom",
    create_ros_room:"prefabs/panel_createrosroom",
    join_room:"prefabs/panel_joinroom",
    pack_play:"prefabs/panel_packplay",
    game_music:"prefabs/panel_gamemusic",
    ros_play:"prefabs/panel_roshambo",
    wxrecharge:"prefabs/panel_recharge",
}