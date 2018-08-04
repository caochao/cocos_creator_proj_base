//lru(last recently used) cache
export class ui_pool
{
    private cache:any; //path => cc.Node[]
    private path2time:any;
    private size:number;
    private max_size:number = 2;

    constructor()
    {
        this.cache = {};
        this.path2time = {};
        this.size = 0;
    }

    get(path:string):cc.Node
    {
        let uis:cc.Node[] = this.cache[path];
        if(uis && uis.length > 0)
        {
            this.size--;
            return uis.pop();
        }
        return null;
    }

    put(path:string, ui:cc.Node):void
    {
        if(this.size >= this.max_size)
        {
            //删除最早的缓存
            let del_path:string;
            let ts:number = cc.sys.now();
            for(let p in this.cache)
            {
                if(this.cache[p].length > 0 && this.path2time[p] < ts)
                {
                    ts = this.path2time[p];
                    del_path = p;
                }
            }
            if(del_path && del_path != "")
            {
                let del_ui:cc.Node = this.cache[del_path].pop();
                del_ui.destroy();
                this.size--;
                // cc.info("ui_pool:pool capacity is max, destroy old ui,", del_path);
            }
        }
        let uis:cc.Node[] = this.cache[path];
        if(!uis)
        {
            this.cache[path] = uis = []; 
        }
        ui.removeFromParent(false);
        uis.push(ui);
        this.size++;
        this.path2time[path] = cc.sys.now();
    }

    clear_atpath(path:string):void
    {
        let uis:cc.Node[] = this.cache[path];
        if(!uis || uis.length <= 0)
        {
            return;
        }
        while(uis.length > 0)
        {
            let ui:cc.Node = uis.pop();
            ui.destroy();
            this.size--;
        }
    }

    clear():void
    {
        for(let path in this.cache)
        {
            this.clear_atpath(path);
        }
        this.cache = {};
        this.path2time = {};
        if(this.size != 0)
        {
            cc.warn("size should be 0, but now is", this.size);
        }
    }

    dump()
    {
        let str:string = "********ui_pool dump********";
        for(let path in this.cache)
        {
            str += "\n" + path + "\n";
            this.cache[path].forEach((u:cc.Node):void=>{
                str += u.name + ",";
            });
        }
        cc.info(str);
    }
}