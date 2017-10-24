import {loader_mgr} from "../common/loader/loader_mgr"
import * as consts from "../consts"

let handler_pool:handler[] = [];
let handler_pool_size = 10;

//用于绑定回调函数this指针
export class handler
{
    private cb:Function;
    private host:any;
    private args:any[];
    private times:number;
    private is_persist:boolean;

    constructor(){}

    init(cb:Function, host:any = null, ...args:any[]):void
    {
        this.cb = cb;
        this.host = host;
        this.args = args;
        this.times = 0;
        this.is_persist = false;
    }

    exec(...extras:any[]):void
    {
        //持久的handler, exec可能会执行多次，每次执行前要清理一下旧参数
        if(this.is_persist && this.times > 0)
        {
            this.args = [];
            cc.info("handler exec", this.times, "times, clear prev args");
        }

        this.args = this.args.concat(extras);
        this.cb.apply(this.host, this.args);
        this.times++;

        //临时的用完回收
        if(!this.is_persist)
        {
            this.release();
        }
    }

    retain()
    {
        this.is_persist = true;
    }

    release()
    {
        // this.cb = null;
        // this.host = null;
        // this.args = null;
        // this.times = null;
        // this.is_persist = false;
        // if(handler_pool.length < handler_pool_size)
        // {
        //     handler_pool.push(this);
        // }
    }
}

/**注意区分一次性和持久的handler */
export function gen_handler(cb:Function, host:any = null, ...args:any[]):handler
{
    let single_handler:handler = handler_pool.length < 0 ? handler_pool.pop(): new handler()
    //这里要展开args, 否则会将args当数组传给wrapper, 导致其args参数变成2维数组[[]]
    single_handler.init(cb, host, ...args);
    return single_handler;
}

//本地存储
export class localStorage
{
    static set(key:string, value:any):void
    {
        cc.sys.localStorage.setItem(key, value);
    }

    static get(key:string):string
    {
        return cc.sys.localStorage.getItem(key);
    }

    static remove(key:string):void
    {
        cc.sys.localStorage.removeItem(key);
    }

    static set_json(key:string, obj:any):void
    {
        this.set(key, JSON.stringify(obj));
    }

    static get_json(key:string):any
    {
        return JSON.parse(this.get(key));
    }

    static get_float(key:string):number
    {
        let str_val = this.get(key);
        if(str_val)
        {
            return parseFloat(str_val);
        }
        return null;
    }

    static get_int(key:string):number
    {
        let str_val = this.get(key);
        if(str_val)
        {
            return parseInt(str_val);
        }
        return null;
    }
}

export function load_head(sprite, head_name)
{
    if(!head_name || head_name == "")
    {
        head_name = consts.MISC.DEFAULT_HEAD;
    }
    loader_mgr.get_inst().loadAsset(head_name, gen_handler((res) => {
        sprite.spriteFrame = res;
    }), cc.SpriteFrame);
}

export function load_img(sprite, img_path)
{
    loader_mgr.get_inst().loadAsset(img_path, gen_handler((res) => {
        sprite.spriteFrame = res;
    }), cc.SpriteFrame);
}