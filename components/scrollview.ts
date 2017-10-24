export class ScrollView
{
    private scrollview:cc.ScrollView;
    private mask:cc.Node;
    private content:cc.Node;
    private item_templates:Map<string, cc.Node>;
    private node_pools:Map<string, cc.Node[]>;

    private dir:number;
    private width:number;
    private height:number;
    private gap_x:number;
    private gap_y:number;
    private cb_host:any;
    private item_setter:(item:cc.Node, key:string, data:any, index:number)=>[number, number];
    private recycle_cb:(item:cc.Node, key:string)=>void;
    private scroll_to_end_cb:()=>void;
    private auto_scrolling:boolean;
    private items:ScrollItem[];
    private start_index:number;
    private stop_index:number;

    constructor(params:ScrollViewParams)
    {
        this.scrollview = params.scrollview;
        this.mask = params.mask;
        this.content = params.content;
        this.node_pools = new Map();
        this.item_templates = new Map();
        params.item_templates.forEach((tpl) => {
            tpl.node.active = false;
            this.item_templates.set(tpl.key, tpl.node);
        });

        this.dir = params.direction || ScrollDirection.Vertical;
        this.width = params.width || this.mask.width;
        this.height = params.height || this.mask.height;
        this.gap_x = params.gap_x || 0;
        this.gap_y = params.gap_y || 0;
        this.cb_host = params.cb_host;
        this.item_setter = params.item_setter;
        this.recycle_cb = params.recycle_cb;
        this.scroll_to_end_cb = params.scroll_to_end_cb;
        this.auto_scrolling = params.auto_scrolling || false;

        if(this.dir == ScrollDirection.Vertical)
        {
            this.content.width = this.width;
        }
        else
        {
            this.content.height = this.height;
        }
        this.mask.setContentSize(this.width, this.height);
        this.mask.addComponent(cc.Mask);
        this.scrollview.node.setContentSize(this.width, this.height);
        this.scrollview.vertical = this.dir == ScrollDirection.Vertical;
        this.scrollview.horizontal = this.dir == ScrollDirection.Horizontal;
        this.scrollview.inertia = true;
        this.scrollview.node.on("scrolling", this.on_scrolling, this);
        this.scrollview.node.on("scroll-to-bottom", this.on_scroll_to_end, this);
        this.scrollview.node.on("scroll-to-right", this.on_scroll_to_end, this);
        // cc.info("constructor", this.mask.width, this.mask.height, this.scrollview.node.width, this.scrollview.node.height, this.content.width, this.content.height);
    }

    private on_scroll_to_end()
    {
        if(this.scroll_to_end_cb)
        {
            this.scroll_to_end_cb.call(this.cb_host);
        }
    }

    private on_scrolling()
    {
        if(!this.items || !this.items.length)
        {
            return;
        }
        if(this.dir == ScrollDirection.Vertical)
        {
            let posy:number = this.content.y;
            // cc.info("onscrolling, content posy=", posy);
            if(posy < 0)
            {
                posy = 0;
            }
            if(posy > this.content.height - this.height)
            {
                posy = this.content.height - this.height;
            }
            let start:number = 0;
            let stop:number = this.items.length - 1;
            let viewport_start:number = -posy;
            let viewport_stop:number = viewport_start - this.height;
            while(this.items[start].y - this.items[start].height > viewport_start)
            {
                start++;
            }
            while(this.items[stop].y < viewport_stop)
            {
                stop--;
            }
            if(start != this.start_index && stop != this.stop_index)
            {
                this.start_index = start;
                this.stop_index = stop;
                cc.info("render_from:", start, stop);
                this.render_items();
            }
        }
        else
        {
            let posx:number = this.content.x;
            // cc.info("onscrolling, content posx=", posx);
            if(posx > 0)
            {
                posx = 0;
            }
            if(posx < this.width - this.content.width)
            {
                posx = this.width - this.content.width;
            }
            let start:number = 0;
            let stop:number = this.items.length - 1;
            let viewport_start:number = -posx;
            let viewport_stop:number = viewport_start + this.width;
            while(this.items[start].x + this.items[start].width < viewport_start)
            {
                start++;
            }
            while(this.items[stop].x > viewport_stop)
            {
                stop--;
            }
            if(start != this.start_index && stop != this.stop_index)
            {
                this.start_index = start;
                this.stop_index = stop;
                cc.info("render_from:", start, stop);
                this.render_items();
            }
        }
    }

    private spawn_node(key:string):cc.Node
    {
        let node:cc.Node;
        let pools:cc.Node[] = this.node_pools.get(key);
        if(pools && pools.length > 0)
        {
            node = pools.pop();
        }
        else
        {
            node = cc.instantiate(this.item_templates.get(key));
            node.active = true;
            cc.info("spawn_node, key=", key);
        }
        node.parent = this.content;
        return node;
    }

    private recycle_item(item:ScrollItem)
    {
        if(item.node && cc.isValid(item.node))
        {
            let pools:cc.Node[] = this.node_pools.get(item.data.key);
            if(!pools)
            {
                pools = [];
                this.node_pools.set(item.data.key, pools);
            }
            pools.push(item.node);
            if(this.recycle_cb)
            {
                this.recycle_cb.call(this.cb_host, item.node, item.data.key);
            }
            item.node.removeFromParent();
            item.node = null;
        }
    }

    private clear_items()
    {
        if(this.items)
        {
            this.items.forEach((item) => {
                this.recycle_item(item);        
            });
        }
    }

    private render_items()
    {
        let item:ScrollItem;
        for(let i:number = 0; i < this.start_index; i++)
        {
            item = this.items[i];
            if(item.node)
            {
                cc.info("recycle_item", i);
                this.recycle_item(item);
            }
        }
        for(let i:number = this.items.length - 1; i > this.stop_index; i--)
        {
            item = this.items[i];
            if(item.node)
            {
                cc.info("recycle_item", i);
                this.recycle_item(item);
            }
        }
        for(let i:number = this.start_index; i <= this.stop_index; i++)
        {
            item = this.items[i];
            if(!item.node)
            {
                cc.info("render_item", i);
                item.node = this.spawn_node(item.data.key);
                this.item_setter.call(this.cb_host, item.node, item.data.key, item.data.data, i);
            }
            item.node.setPosition(item.x, item.y);
        }
    }

    private pack_item(index:number, data:ScrollItemData):ScrollItem
    {
        let node:cc.Node = this.spawn_node(data.key);
        let [width, height]:[number, number] = this.item_setter.call(this.cb_host, node, data.key, data.data, index);
        let item:ScrollItem = {x:0, y:0, width:width, height:height, data:data, node:node};
        this.recycle_item(item);
        return item;
    }

    private layout_items(start:number)
    {
        // cc.info("layout_items, start=", start);
        if(this.items.length <= 0)
        {
            return;
        }
        let start_pos:number = 0;
        if(start > 0)
        {
            let prev_item:ScrollItem = this.items[start - 1];
            if(this.dir == ScrollDirection.Vertical)
            {
                start_pos = prev_item.y - prev_item.height - this.gap_y;
            }
            else
            {
                start_pos = prev_item.x + prev_item.width + this.gap_x;
            }
        }
        for(let index:number = start, stop:number = this.items.length; index < stop; index++)
        {
            let item:ScrollItem = this.items[index];
            if(this.dir == ScrollDirection.Vertical)
            {
                item.x = 0;
                item.y = start_pos;
                start_pos -= item.height + this.gap_y;
            }
            else
            {
                item.y = 0;
                item.x = start_pos;
                start_pos += item.width + this.gap_x;
            }
        }
    }

    private resize_content()
    {
        if(this.items.length <= 0)
        {
            this.content.width = 0;
            this.content.height = 0;
            return;
        }
        let last_item:ScrollItem = this.items[this.items.length - 1];
        if(this.dir == ScrollDirection.Vertical)
        {
            this.content.height = Math.max(this.height, last_item.height - last_item.y);
        }
        else
        {
            this.content.width = Math.max(this.width, last_item.x + last_item.width);
        }
        // cc.info("resize_content", this.mask.width, this.mask.height, this.scrollview.node.width, this.scrollview.node.height, this.content.width, this.content.height);
    }

    set_data(datas:ScrollItemData[])
    {
        this.clear_items();
        this.items = [];
        datas.forEach((data, index) => {
            let item:ScrollItem = this.pack_item(index, data);
            this.items.push(item);
        });
        this.layout_items(0);
        this.resize_content();
        this.start_index = -1;
        this.stop_index = -1;
        if(this.dir == ScrollDirection.Vertical)
        {
            this.content.y = 0;
        }
        else
        {
            this.content.x = 0;
        }
        if(this.items.length > 0)
        {
            this.on_scrolling();
        }
    }

    insert_data(index:number, ...datas:ScrollItemData[])
    {
        if(datas.length == 0 )
        {
            cc.info("nothing to insert");
            return;
        }
        if(!this.items)
        {
            this.items = [];
        }
        if(index < 0 || index > this.items.length)
        {
            cc.warn("invalid index", index);
            return;
        }
        let is_append:boolean = index == this.items.length;
        let items:ScrollItem[] = [];
        datas.forEach((data, index) => {
            let item:ScrollItem = this.pack_item(index, data);
            items.push(item);
        });
        this.items.splice(index, 0, ...items);
        this.layout_items(index);
        this.resize_content();
        this.start_index = -1;
        this.stop_index = -1;

        if(this.auto_scrolling && is_append)
        {
            this.scroll_to_end();
        }
        this.on_scrolling();
    }

    append_data(...datas:ScrollItemData[])
    {
        if(!this.items)
        {
            this.items = [];
        }
        this.insert_data(this.items.length, ...datas);
    }

    scroll_to_end()
    {
        if(this.dir == ScrollDirection.Vertical)
        {
            this.scrollview.scrollToBottom();
        }
        else
        {
            this.scrollview.scrollToRight();
        }
    }

    destroy()
    {
        this.clear_items();
        this.node_pools.forEach((pools, key) => {
            pools.forEach((node) => {
                node.destroy();
            });
        });
        this.node_pools = null;
        this.items = null;
        
        if(cc.isValid(this.scrollview.node))
        {
            this.scrollview.node.off("scrolling", this.on_scrolling, this);
            this.scrollview.node.off("scroll-to-bottom", this.on_scroll_to_end, this);
            this.scrollview.node.off("scroll-to-right", this.on_scroll_to_end, this);
        }
    }
}

export type ScrollItemTemplate = {
    key:string;
    node:cc.Node;
}

export type ScrollItemData = {
    key:string;
    data:any;
}

export enum ScrollDirection 
{
    Vertical = 1,
    Horizontal = 2,
}

type ScrollViewParams = {
    scrollview:cc.ScrollView;
    mask:cc.Node;
    content:cc.Node;
    item_templates:ScrollItemTemplate[];
    direction?:ScrollDirection;
    width?:number;
    height?:number;
    gap_x?:number;
    gap_y?:number;
    cb_host?:any;                                                                       //回调函数host
    item_setter:(item:cc.Node, key:string, data:any, index:number)=>[number, number];   //item更新setter
    recycle_cb?:(item:cc.Node, key:string)=>void;                                                   //回收时的回调
    scroll_to_end_cb?:()=>void;                                                         //滚动到尽头的回调
    auto_scrolling?:boolean;                                                            //append时自动滚动到尽头
}

type ScrollItem = {
    x:number;
    y:number;
    width:number;
    height:number;
    data:ScrollItemData;
    node:cc.Node;
}