import {loader_mgr} from "../loader/loader_mgr"
import {handler, gen_handler} from "../util"
import {ui_pool} from "./ui_pool"

export class pool_mgr
{
    private static _inst:pool_mgr;
    private ui_pool:ui_pool;

    private constructor()
    {
        this.ui_pool = new ui_pool(); 
    }

    static get_inst():pool_mgr
    {
        if(!this._inst)
        {
            this._inst = new pool_mgr();
        }
        return this._inst;
    }

    get_ui(path:string, cb:handler):void
    {
        let ui:cc.Node = this.ui_pool.get(path);
        if(ui)
        {
            // cc.info("pool_mgr:get_ui from cache", path);
            cb.exec(ui);
            return;
        }
        // cc.info("pool_mgr:get_ui from loader", path);
        loader_mgr.get_inst().loadPrefabObj(path, cb);
    }

    put_ui(path:string, ui:cc.Node):void
    {
        if(!ui)
        {
            cc.warn("pool_mgr:put_ui, invalid node");
            return;
        }
        this.ui_pool.put(path, ui);
    }

    clear_atpath(path:string)
    {
        this.ui_pool.clear_atpath(path);
    }

    clear()
    {
        this.ui_pool.clear();
    }

    dump()
    {
        this.ui_pool.dump();
    }
}