import {LayoutUtil} from "./layout_utils"

export class ListView
{
    private scrollview:cc.ScrollView;
    private mask:cc.Node;
    private content:cc.Node;
    private item_tpl:cc.Node;
    private node_pool:cc.Node[];

    private dir:number;
    private width:number;
    private height:number;
    private gap_x:number;
    private gap_y:number;
    private row:number;
    private col:number;
    private item_width:number;
    private item_height:number;
    private cb_host:any;
    private item_setter:(item:cc.Node, data:any, index:number)=>void;
    private recycle_cb:(item:cc.Node)=>void;
    private select_cb:(data:any, index:number)=>void;
    private select_setter:(item:cc.Node, is_select:boolean, index:number)=>void;
    private scroll_to_end_cb:()=>void;
    private auto_scrolling:boolean;
    private items:ListItem[];
    private start_index:number;
    private stop_index:number;
    private _datas:any[];
    private _selected_index:number = -1;

    constructor(params:ListViewParams)
    {
        this.scrollview = params.scrollview;
        this.mask = params.mask;
        this.content = params.content;
        this.item_tpl = params.item_tpl;
        this.item_tpl.active = false;
        this.item_width = this.item_tpl.width;
        this.item_height = this.item_tpl.height;
        this.dir = params.direction || ListViewDir.Vertical;
        this.width = params.width || this.mask.width;
        this.height = params.height || this.mask.height;
        this.gap_x = params.gap_x || 0;
        this.gap_y = params.gap_y || 0;
        this.row = params.row || 1;
        this.col = params.column || 1;
        this.cb_host = params.cb_host;
        this.item_setter = params.item_setter;
        this.recycle_cb = params.recycle_cb;
        this.select_cb = params.select_cb;
        this.select_setter = params.select_setter;
        this.scroll_to_end_cb = params.scroll_to_end_cb;
        this.auto_scrolling = params.auto_scrolling || false;
        this.node_pool = [];

        if(this.dir == ListViewDir.Vertical)
        {
            let real_width:number = (this.item_width + this.gap_x) * this.col - this.gap_x;
            if(real_width > this.width)
            {
                cc.info("real width > width, resize scrollview to realwidth,", this.width, "->", real_width);
                this.width = real_width;
            }
            this.content.width = this.width;
        }
        else
        {
            let real_height:number = (this.item_height + this.gap_y) * this.row - this.gap_y;
            if(real_height > this.height)
            {
                cc.info("real height > height, resize scrollview to realheight,", this.height, "->", real_height);
                this.height = real_height;
            }
            this.content.height = this.height;
        }
        this.mask.setContentSize(this.width, this.height);
        this.mask.addComponent(cc.Mask);
        this.scrollview.node.setContentSize(this.width, this.height);
        this.scrollview.vertical = this.dir == ListViewDir.Vertical;
        this.scrollview.horizontal = this.dir == ListViewDir.Horizontal;
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
        if(this.dir == ListViewDir.Vertical)
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
            while(this.items[start].y - this.item_height > viewport_start)
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
                // cc.info("render_from:", start, stop);
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
            while(this.items[start].x + this.item_width < viewport_start)
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
                // cc.info("render_from:", start, stop);
                this.render_items();
            }
        }
    }

    select_item(index)
    {
        if(index == this._selected_index)
        {
            return;
        }
        if(this._selected_index != -1)
        {
            this.inner_select_item(this._selected_index, false);
        }
        this.inner_select_item(index, true);
    }

    private inner_select_item(index:number, is_select:boolean)
    {
        let item:ListItem = this.items[index];
        if(!item)
        {
            cc.warn("inner_select_item index is out of range{", 0, this.items.length - 1, "}", index);
            return;
        }
        item.is_select = is_select;
        if(item.node && this.select_setter)
        {
            this.select_setter.call(this.cb_host, item.node, is_select, index);
        }
        if(is_select)
        {
            this._selected_index = index;
            if(this.select_cb)
            {
                this.select_cb.call(this.cb_host, item.data, index);
            }
        }
    }

    private spawn_node(index:number):cc.Node
    {
        let node:cc.Node = this.node_pool.pop();
        if(!node)
        {
            node = cc.instantiate(this.item_tpl);
            node.active = true;
            // cc.info("spawn_node", index);
        }
        node.parent = this.content;
        return node;
    }

    private recycle_item(item:ListItem)
    {
        if(item.node && cc.isValid(item.node))
        {
            if(this.recycle_cb)
            {
                this.recycle_cb.call(this.cb_host, item.node);
            }
            item.node.removeFromParent();
            this.node_pool.push(item.node);
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
        let item:ListItem;
        for(let i:number = 0; i < this.start_index; i++)
        {
            item = this.items[i];
            if(item.node)
            {
                // cc.info("recycle_item", i);
                this.recycle_item(item);
            }
        }
        for(let i:number = this.items.length - 1; i > this.stop_index; i--)
        {
            item = this.items[i];
            if(item.node)
            {
                // cc.info("recycle_item", i);
                this.recycle_item(item);
            }
        }
        for(let i:number = this.start_index; i <= this.stop_index; i++)
        {
            item = this.items[i];
            if(!item.node)
            {
                // cc.info("render_item", i);
                item.node = this.spawn_node(i);
                this.item_setter.call(this.cb_host, item.node, item.data, i);
                if(this.select_setter)
                {
                    this.select_setter.call(this.cb_host, item.node, item.is_select, i);
                }
            }
            item.node.setPosition(item.x, item.y);
        }
    }

    private pack_item(data:any):ListItem
    {
        return {x:0, y:0, data:data, node:null, is_select:false};
    }

    private layout_items(start:number)
    {
        // cc.info("layout_items, start=", start);
        for(let index:number = start, stop:number = this.items.length; index < stop; index++)
        {
            let item:ListItem = this.items[index];
            if(this.dir == ListViewDir.Vertical)
            {
                [item.x, item.y] = LayoutUtil.vertical_layout(index, this.item_width, this.item_height, this.col, this.gap_x, this.gap_y);
            }
            else
            {
                [item.x, item.y] = LayoutUtil.horizontal_layout(index, this.item_width, this.item_height, this.row, this.gap_x, this.gap_y);
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
        let last_item:ListItem = this.items[this.items.length - 1];
        if(this.dir == ListViewDir.Vertical)
        {
            this.content.height = Math.max(this.height, this.item_height - last_item.y);
        }
        else
        {
            this.content.width = Math.max(this.width, last_item.x + this.item_width);
        }
        // cc.info("resize_content", this.mask.width, this.mask.height, this.scrollview.node.width, this.scrollview.node.height, this.content.width, this.content.height);
    }

    set_data(datas:any[])
    {
        this.clear_items();
        this.items = [];
        this._datas = datas;
        datas.forEach((data) => {
            let item:ListItem = this.pack_item(data);
            this.items.push(item);
        });
        this.layout_items(0);
        this.resize_content();
        this.start_index = -1;
        this.stop_index = -1;
        if(this.dir == ListViewDir.Vertical)
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

    insert_data(index:number, ...datas:any[])
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
        if(!this._datas)
        {
            this._datas = [];
        }
        if(index < 0 || index > this.items.length)
        {
            cc.warn("invalid index", index);
            return;
        }
        let is_append:boolean = index == this.items.length;
        let items:ListItem[] = [];
        datas.forEach((data) => {
            let item:ListItem = this.pack_item(data);
            items.push(item);
        });
        this._datas.splice(index, 0, ...datas);
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

    remove_data(index:number, count:number = 1)
    {
        if(!this.items)
        {
            cc.info("call set_data before call this method");
            return;
        }
        if(index < 0 || index >= this.items.length)
        {
            cc.warn("invalid index", index);
            return;
        }
        if(count < 1)
        {
            cc.info("nothing to remove");
            return;
        }
        let old_length:number = this.items.length;
        let del_items:ListItem[] = this.items.splice(index, count);
        this._datas.splice(index, count);
        //回收node
        del_items.forEach((item) => {
            this.recycle_item(item);
        });

        //重新排序index后面的
        if(index + count < old_length)
        {
            this.layout_items(index);
        }
        this.resize_content();
        if(this.items.length > 0)
        {
            this.start_index = -1;
            this.stop_index = -1;
            this.on_scrolling();
        }
    }

    append_data(...datas:any[])
    {
        if(!this.items)
        {
            this.items = [];
        }
        this.insert_data(this.items.length, ...datas);
    }

    scroll_to(index:number)
    {
        if(this.dir == ListViewDir.Vertical)
        {
			const min_y = this.height - this.content.height;
			if(min_y >= 0)
			{
				cc.info("no need to scroll");
				return;
			}
			let [_, y] = LayoutUtil.vertical_layout(index, this.item_width, this.item_height, this.col, this.gap_x, this.gap_y);
			if(y < min_y)
			{
				y = min_y;
				cc.info("content reach bottom");
			}
			if(y > 0)
			{
				y = 0;
				cc.info("content reach top");
			}
			this.scrollview.setContentPosition(cc.v2(this.content.getPositionX(), -y));
			this.on_scrolling();
        }
        else
        {
			const max_x = this.content.width - this.width;
			if(max_x <= 0)
			{
				cc.info("no need to scroll");
				return;
			}
			let [x, _] = LayoutUtil.horizontal_layout(index, this.item_width, this.item_height, this.row, this.gap_x, this.gap_y);
			if(x > max_x)
			{
				x = max_x;
				cc.info("content reach right");
			}
			if(x < 0)
			{
				x = 0;
				cc.info("content reach left");
			}
			this.scrollview.setContentPosition(cc.v2(-x, this.content.getPositionY()));
			this.on_scrolling();
        }
    }

    scroll_to_end()
    {
        if(this.dir == ListViewDir.Vertical)
        {
            this.scrollview.scrollToBottom();
        }
        else
        {
            this.scrollview.scrollToRight();
        }
    }

    refresh_item(index:number, data:any)
    {
        if(!this.items)
        {
            cc.info("call set_data before call this method");
            return;
        }
        if(index < 0 || index >= this.items.length)
        {
            cc.warn("invalid index", index);
            return;
        }
        let item:ListItem = this.items[index];
        item.data = data;
        this._datas[index] = data;
        if(item.node)
        {
            if(this.recycle_cb)
            {
                this.recycle_cb.call(this.cb_host, item.node);
            }
            this.item_setter.call(this.cb_host, item.node, item.data, index);
        }
    }

    destroy()
    {
        this.clear_items();
        this.node_pool.forEach((node) => {
            node.destroy();
        });
        this.node_pool = null;
        this.items = null;
        this._datas = null;

        if(cc.isValid(this.scrollview.node))
        {
            this.scrollview.node.off("scrolling", this.on_scrolling, this);
            this.scrollview.node.off("scroll-to-bottom", this.on_scroll_to_end, this);
            this.scrollview.node.off("scroll-to-right", this.on_scroll_to_end, this);
        }
    }

    get datas():any[]
    {
        return this._datas;
    }

    get selected_index():number
    {
        return this._selected_index;
    }

    get selectd_data():any
    {
        let item:ListItem = this.items[this._selected_index];
        if(item)
        {
            return item.data;
        }
        return null;
    }
}

export enum ListViewDir 
{
    Vertical = 1,
    Horizontal = 2,
}

type ListViewParams = {
    scrollview:cc.ScrollView;
    mask:cc.Node;
    content:cc.Node;
    item_tpl:cc.Node;
    direction?:ListViewDir;
    width?:number;
    height?:number;
    gap_x?:number;
    gap_y?:number;
    row?:number;                                                                //水平方向排版时，垂直方向上的行数
    column?:number;                                                             //垂直方向排版时，水平方向上的列数
    cb_host?:any;                                                               //回调函数host
    item_setter:(item:cc.Node, data:any, index:number)=>void;                   //item更新setter
    recycle_cb?:(item:cc.Node)=>void;                                           //回收时的回调
    select_cb?:(data:any, index:number)=>void;                                  //item选中回调
    select_setter?:(item:cc.Node, is_select:boolean, index:number)=>void;       //item选中效果setter
    scroll_to_end_cb?:()=>void;                                                 //滚动到尽头的回调
    auto_scrolling?:boolean;                                                    //append时自动滚动到尽头
}

type ListItem = {
    x:number;
    y:number;
    data:any;
    node:cc.Node;
    is_select:boolean;
}