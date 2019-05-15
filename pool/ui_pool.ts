const DestroyAtOnce = false;

//lru(last recently used) cache
export class ui_pool
{
    private path2nodes:Map<string, cc.Node[]>; //path => cc.Node[]
    private path2time:Map<string, number>;
    private size:number;
    private max_size = 2;

    constructor()
    {
        this.path2nodes = new Map();
        this.path2time = new Map();
        this.size = 0;
    }

    get(path:string)
    {
        const nodes = this.path2nodes.get(path);
        if(nodes && nodes.length > 0)
        {
            this.size--;
            return nodes.pop();
        }
        return null;
    }

    put(path:string, node:cc.Node, destroyAtOnce:boolean)
    {
        if(DestroyAtOnce || destroyAtOnce)
        {
            node.destroy();
            return;
        }
        if(this.size >= this.max_size)
        {
            //删除最早的缓存
            let del_path:string;
            let ts = cc.sys.now();
            this.path2nodes.forEach((nodes, p) => {
                if(nodes.length > 0 && this.path2time.get(p) < ts)
                {
                    ts = this.path2time.get(p);
                    del_path = p;
                }
            });
            if(del_path)
            {
                const del_node = this.path2nodes.get(del_path).pop();
                del_node.destroy();
                this.size--;
                cc.log("ui_pool:pool capacity is max, destroy old ui,", del_path);
            }
        }
        let nodes = this.path2nodes.get(path);
        if(!nodes)
        {
            nodes = [];
            this.path2nodes.set(path, nodes);
        }
        node.removeFromParent(false);
        nodes.push(node);
        this.size++;
        this.path2time.set(path, cc.sys.now());
    }

    clear_atpath(path:string):void
    {
        const nodes = this.path2nodes.get(path);
        while(nodes && nodes.length > 0)
        {
            const node = nodes.pop();
            node.destroy();
            this.size--;
        }
    }

    clear():void
    {
        this.path2nodes.forEach((_, path) => {
            this.clear_atpath(path);
        });
        this.path2nodes.clear();
        this.path2time.clear();
        if(this.size != 0)
        {
            cc.warn("size should be 0, but now is", this.size);
        }
    }

    dump()
    {
        let str:string = "********ui_pool dump********";
        this.path2nodes.forEach((nodes, path) => {
            str += "\n" + path + "\n";
            nodes.forEach(node => {
                str += node.name + ",";
            });
        });
        cc.log(str);
    }
}