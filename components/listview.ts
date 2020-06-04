import { LayoutUtil } from "./layout_utils"
import { ListViewItem } from "./listviewitem";
import { TimerMgr } from "../timer/timer_mgr";
import { gen_handler } from "../util";

export class ListView
{
    private scrollview:cc.ScrollView;
    private mask:cc.Mask;
    private content:cc.Node;
    private item_tpl:cc.Node;
    private item_pool:ListViewItem[];

    private dir:number;
    private width:number;
    private height:number;
    private original_width:number;
    private original_height:number;
    private gap_x:number;
    private gap_y:number;
    private padding_left:number;
    private padding_right:number;
    private padding_top:number;
    private padding_bottom:number;
    private item_anchorX:number;
    private item_anchorY:number;
    private row:number;
    private col:number;
    private item_width:number;
    private item_height:number;
    private content_width:number;
    private content_height:number;
    private item_class:new() => ListViewItem;
    private cb_host:any;
    private scroll_to_end_cb:()=>void;
    private auto_scrolling:boolean;
    private packItems:PackItem[];
    private start_index:number;
    private stop_index:number;
    private _selected_index:number = -1;
    private renderDirty:boolean;
    private timer:number;

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
        this.width = params.width || this.scrollview.node.width;
        this.height = params.height || this.scrollview.node.height;
        this.gap_x = params.gap_x || 0;
        this.gap_y = params.gap_y || 0;
        this.padding_left = params.padding_left || 0;
        this.padding_right = params.padding_right || 0;
        this.padding_top = params.padding_top || 0;
        this.padding_bottom = params.padding_bottom || 0;
        this.item_anchorX = params.item_anchorX != null ? params.item_anchorX : 0;
        this.item_anchorY = params.item_anchorY != null ? params.item_anchorY : 1;
        this.row = params.row || 1;
        this.col = params.column || 1;
        this.cb_host = params.cb_host;
        this.scroll_to_end_cb = params.scroll_to_end_cb;
        this.item_class = params.item_class;
        this.auto_scrolling = params.auto_scrolling || false;
        this.item_pool = [];

        if(this.dir == ListViewDir.Vertical)
        {
            const content_width = (this.item_width + this.gap_x) * this.col - this.gap_x + this.padding_left + this.padding_right;
            if(content_width > this.width)
            {
                cc.log("content_width > width, resize listview to content_width,", this.width, "->", content_width);
                this.width = content_width;
            }
            this.set_content_size(this.width, 0);
        }
        else
        {
            const content_height = (this.item_height + this.gap_y) * this.row - this.gap_y + this.padding_top + this.padding_bottom;
            if(content_height > this.height)
            {
                cc.log("content_height > height, resize listview to content_height,", this.height, "->", content_height);
                this.height = content_height;
            }
            this.set_content_size(0, this.height);
        }
        this.original_width = this.width;
        this.original_height = this.height;
        this.mask.node.setContentSize(this.width, this.height);
        this.scrollview.node.setContentSize(this.width, this.height);
        this.scrollview.vertical = this.dir == ListViewDir.Vertical;
        this.scrollview.horizontal = this.dir == ListViewDir.Horizontal;
        this.scrollview.inertia = true;
        this.scrollview.node.on("scrolling", this.on_scrolling, this);
        this.scrollview.node.on("scroll-to-bottom", this.on_scroll_to_end, this);
        this.scrollview.node.on("scroll-to-right", this.on_scroll_to_end, this);
        this.scrollview.node.on(cc.Node.EventType.TOUCH_START, this.on_scroll_touch_start, this);
        this.scrollview.node.on(cc.Node.EventType.TOUCH_END, this.on_scroll_touch_end, this);
        this.scrollview.node.on(cc.Node.EventType.TOUCH_CANCEL, this.on_scroll_touch_cancel, this);
        this.timer = TimerMgr.getInst().add_updater(gen_handler(this.onUpdate, this), "listView render timer");
        // cc.log("constructor", this.mask.width, this.mask.height, this.scrollview.node.width, this.scrollview.node.height, this.content.width, this.content.height);
    }

    private _touchBeganPosition:cc.Vec2;
    private _touchEndPosition:cc.Vec2;
    private on_scroll_touch_start(event:cc.Event.EventTouch)
    {
        this._touchBeganPosition = event.touch.getLocation();
    }
    
    private on_scroll_touch_cancel(event:cc.Event.EventTouch)
    {
        this._touchEndPosition = event.touch.getLocation();
        this.handle_release_logic();
    }
    
    private on_scroll_touch_end(event:cc.Event.EventTouch)
    {
        this._touchEndPosition = event.touch.getLocation();
        this.handle_release_logic();
    }

    private handle_release_logic()
    {
        const touchPos = this._touchEndPosition;
        const moveOffset = this._touchBeganPosition.sub(this._touchEndPosition);
        const dragDirection = this.get_drag_direction(moveOffset);
        if(dragDirection != 0) 
        {
            return;
        }
        if(!this.packItems || !this.packItems.length)
        {
            return;
        }
        //无滑动的情况下点击
        const touchPosInContent = this.content.convertToNodeSpaceAR(touchPos);
        for(let i = this.start_index; i <= this.stop_index; i++)
        {
            const packItem = this.packItems[i];
            if(packItem && packItem.item && packItem.item.node.getBoundingBox().contains(touchPosInContent))
            {
                packItem.item.onTouchEnd(packItem.item.node.convertToNodeSpaceAR(touchPos), packItem.data, i);
                break;
            }
        }
    }

    private get_drag_direction(moveOffset:cc.Vec2) {
        if (this.dir === ListViewDir.Horizontal) 
        {
            if (Math.abs(moveOffset.x) < 3) { return 0; }
            return (moveOffset.x > 0 ? 1 : -1);
        }
        else if (this.dir === ListViewDir.Vertical) 
        {
            // 由于滚动 Y 轴的原点在在右上角所以应该是小于 0
            if (Math.abs(moveOffset.y) < 3) { return 0; }
            return (moveOffset.y < 0 ? 1 : -1);
        }
    }

    private on_scroll_to_end()
    {
        if(this.scroll_to_end_cb)
        {
            this.scroll_to_end_cb.call(this.cb_host);
        }
    }

    private last_content_pos:number;
    private on_scrolling()
    {
        let pos:number;
        let threshold:number;
        if(this.dir == ListViewDir.Vertical)
        {
            pos = this.content.y;
            threshold = this.item_height;
        }
        else
        {
            pos = this.content.x;
            threshold = this.item_width;
        }
        if(this.last_content_pos != null && Math.abs(pos - this.last_content_pos) < threshold)
        {
            return;
        }
        this.last_content_pos = pos;
        this.render();
    }

    private render()
    {
        if(!this.packItems || !this.packItems.length)
        {
            return;
        }
        if(this.dir == ListViewDir.Vertical)
        {
            let posy = this.content.y;
            // cc.log("onscrolling, content posy=", posy);
            if(posy < 0)
            {
                posy = 0;
            }
            else if(posy > this.content_height - this.height)
            {
                posy = this.content_height - this.height;
            }
            let viewport_start = -posy;
            let viewport_stop = viewport_start - this.height;
            // while(this.packItems[start].y - this.item_height > viewport_start)
            // {
            //     start++;
            // }
            // while(this.packItems[stop].y < viewport_stop)
            // {
            //     stop--;
            // }
            let start = this.indexFromOffset(viewport_start);
            let stop = this.indexFromOffset(viewport_stop);

            //expand viewport for better experience
            start = Math.max(start - this.col, 0);
            stop = Math.min(this.packItems.length - 1, stop + this.col);
            if(start != this.start_index)
            {
                this.start_index = start;
                this.renderDirty = true;
            }
            if(stop != this.stop_index)
            {
                this.stop_index = stop;
                this.renderDirty = true;
            }
        }
        else
        {
            let posx = this.content.x;
            // cc.log("onscrolling, content posx=", posx);
            if(posx > 0)
            {
                posx = 0;
            }
            else if(posx < this.width - this.content_width)
            {
                posx = this.width - this.content_width;
            }
            let viewport_start = -posx;
            let viewport_stop = viewport_start + this.width;
            let start = this.indexFromOffset(viewport_start);
            let stop = this.indexFromOffset(viewport_stop);

            //expand viewport for better experience
            start = Math.max(start - this.row, 0);
            stop = Math.min(this.packItems.length - 1, stop + this.row);
            if(start != this.start_index)
            {
                this.start_index = start;
                this.renderDirty = true;
            }
            if(stop != this.stop_index)
            {
                this.stop_index = stop;
                this.renderDirty = true;
            }
        }
    }

    onUpdate()
    {
        if(this.renderDirty && cc.isValid(this.scrollview.node))
        {
            cc.log("listView, render_from:", this.start_index, this.stop_index);
            this.render_items();
            this.renderDirty = false;
        }
    }

    //不支持多行多列
    private indexFromOffset(offset:number)
    {
        let low = 0; 
        let high = 0;
        let max_idx = 0;
        high = max_idx = this.packItems.length - 1;
        if(this.dir == ListViewDir.Vertical)
        {
            while(high >= low)
            {
                const index = low + Math.floor((high - low) / 2);
                const itemStart = this.packItems[index].y;
                const itemStop = index < max_idx ? this.packItems[index + 1].y : -this.content_height;
                if(offset <= itemStart && offset >= itemStop)
                {
                    return index;
                }
                else if(offset > itemStart)
                {
                    high = index - 1;
                }
                else
                {
                    low = index + 1;
                }
            }
        }
        else
        {
            while(high >= low)
            {
                const index = low + Math.floor((high - low) / 2);
                const itemStart = this.packItems[index].x;
                const itemStop = index < max_idx ? this.packItems[index + 1].x : this.content_width;
                if(offset >= itemStart && offset <= itemStop)
                {
                    return index;
                }
                else if(offset > itemStart)
                {
                    low = index + 1;
                }
                else
                {
                    high = index - 1;
                }
            }
        }
        return -1;
    }

    select_data(data)
    {
        const idx = this.packItems.findIndex(item => item.data == data);
        if(idx != -1)
        {
            this.select_item(idx);
        }
    }

    select_item(index:number)
    {
        if(index == this._selected_index)
        {
            return;
        }
        if(this._selected_index != -1)
        {
            this.inner_select_item(this._selected_index, false);
        }
        this._selected_index = index;
        this.inner_select_item(index, true);
    }

    private inner_select_item(index:number, is_select:boolean)
    {
        let packItem:PackItem = this.packItems[index];
        if(!packItem)
        {
            cc.warn("inner_select_item index is out of range{", 0, this.packItems.length - 1, "}", index);
            return;
        }
        packItem.is_select = is_select;
        if(packItem.item)
        {
            packItem.item.onSetSelect(is_select, index);
            if(is_select)
            {
                packItem.item.onSelected(packItem.data, index);
            }
        }
    }

    private spawn_item(index:number):ListViewItem
    {
        let item:ListViewItem = this.item_pool.pop();
        if(!item)
        {
            item = cc.instantiate(this.item_tpl).addComponent(this.item_class) as ListViewItem;
            item.node.active = true;
            //仅仅改变父节点锚点，子元素位置不会随之变化
            // item.node.setAnchorPoint(this.item_anchorX, this.item_anchorY);
            LayoutUtil.set_pivot_smart(item.node, this.item_anchorX, this.item_anchorY);
            item.onInit();
            // cc.log("spawn_item", index);
        }
        item.node.parent = this.content;
        return item;
    }

    private recycle_item(packItem:PackItem)
    {
        const item = packItem.item;
        if(item && cc.isValid(item.node))
        {
            item.onRecycle(packItem.data);
            item.node.removeFromParent();
            this.item_pool.push(item);
            packItem.item = null;
        }
    }

    private clear_items()
    {
        if(this.packItems)
        {
            this.packItems.forEach(packItem => {
                this.recycle_item(packItem);        
            });
        }
    }

    private render_items()
    {
        let packItem:PackItem;
        for(let i = 0; i < this.start_index; i++)
        {
            packItem = this.packItems[i];
            if(packItem.item)
            {
                // cc.log("recycle_item", i);
                this.recycle_item(packItem);
            }
        }
        for(let i = this.packItems.length - 1; i > this.stop_index; i--)
        {
            packItem = this.packItems[i];
            if(packItem.item)
            {
                // cc.log("recycle_item", i);
                this.recycle_item(packItem);
            }
        }
        for(let i = this.start_index; i <= this.stop_index; i++)
        {
            packItem = this.packItems[i];
            if(!packItem.item)
            {
                // cc.log("render_item", i);
                packItem.item = this.spawn_item(i);
                packItem.item.onSetData(packItem.data, i);
                packItem.item.onSetSelect(packItem.is_select, i);
                if(packItem.is_select)
                {
                    packItem.item.onSelected(packItem.data, i);
                }
            }
            //列表添加与删除时item位置会变化，因此每次render_items都要执行
            // packItem.item.node.setPosition(packItem.x, packItem.y);
            packItem.item.setLeftTop(packItem.x, packItem.y);
        }
    }

    private pack_item(data:any):PackItem
    {
        return {x:0, y:0, data:data, item:null, is_select:false};
    }

    private layout_items(start:number)
    {
        // cc.log("layout_items, start=", start);
        for(let index = start, stop = this.packItems.length; index < stop; index++)
        {
            const packItem = this.packItems[index];
            if(this.dir == ListViewDir.Vertical)
            {
                [packItem.x, packItem.y] = LayoutUtil.vertical_layout(index, this.item_width, this.item_height, this.col, this.gap_x, this.gap_y, this.padding_left, this.padding_top);
            }
            else
            {
                [packItem.x, packItem.y] = LayoutUtil.horizontal_layout(index, this.item_width, this.item_height, this.row, this.gap_x, this.gap_y, this.padding_left, this.padding_top);
            }
        }
    }

    private adjust_content()
    {
        if(this.packItems.length <= 0) {
            this.set_content_size(0, 0);
            return;
        }
        const last_packItem = this.packItems[this.packItems.length - 1];
        if(this.dir == ListViewDir.Vertical) {
            const height = Math.max(this.height, this.item_height - last_packItem.y + this.padding_bottom);
            this.set_content_size(this.content_width, height);
        }
        else {
            const width = Math.max(this.width, last_packItem.x + this.item_width + this.padding_right);
            this.set_content_size(width, this.content_height);
        }
    }

    private set_content_size(width:number, height:number)
    {
        if(this.content_width != width)
        {
            this.content_width = width;
            this.content.width = width;
        }
        if(this.content_height != height)
        {
            this.content_height = height;
            this.content.height = height;
        }
        // cc.log("ListView, set_content_size", width, height, this.content.width, this.content.height);
    }

    set_viewport(width?:number, height?:number)
    {
        if(width == null)
        {
            width = this.width;
        }
        else if(width > this.content_width)
        {
            width = this.content_width;
        }

        if(height == null)
        {
            height = this.height;
        }
        else if(height > this.content_height)
        {
            height = this.content_height;
        }
        //设置遮罩区域尺寸
        this.width = width;
        this.height = height;
        this.mask.node.setContentSize(width, height);
        this.scrollview.node.setContentSize(width, height);
        this.render();
    }

    renderAll(value:boolean)
    {
        let width:number;
        let height:number;
        if(value)
        {
            width = this.content_width;
            height = this.content_height;
        }
        else
        {
            width = this.original_width;
            height = this.original_height;
        }
        this.set_viewport(width, height);
    }

    set_data(datas:any[])
    {
        if(this.packItems)
        {
            this.clear_items();
            this.packItems.length = 0;
        }
        else
        {
            this.packItems = [];
        }
        datas.forEach(data => {
            let packItem = this.pack_item(data);
            this.packItems.push(packItem);
        });
        this.layout_items(0);
        this.adjust_content();
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
        if(this.packItems.length > 0)
        {
            this.render();
        }
    }

    insert_data(index:number, ...datas:any[])
    {
        if(datas.length == 0 )
        {
            cc.log("nothing to insert");
            return;
        }
        if(!this.packItems)
        {
            this.packItems = [];
        }
        if(index < 0 || index > this.packItems.length)
        {
            cc.warn("insert_data, invalid index", index);
            return;
        }
        let is_append = index == this.packItems.length;
        let packItems:PackItem[] = [];
        datas.forEach(data => {
            let packItem = this.pack_item(data);
            packItems.push(packItem);
        });
        this.packItems.splice(index, 0, ...packItems);
        this.layout_items(index);
        this.adjust_content();
        this.start_index = -1;
        this.stop_index = -1;
        
        if(this.auto_scrolling && is_append)
        {
            this.scroll_to_end();
        }
        this.render();
    }

    remove_data(index:number, count:number = 1)
    {
        if(!this.packItems)
        {
            cc.log("call set_data before call this method");
            return;
        }
        if(index < 0 || index >= this.packItems.length)
        {
            cc.warn("remove_data, invalid index", index);
            return;
        }
        if(count < 1)
        {
            cc.log("nothing to remove");
            return;
        }
        let old_length = this.packItems.length;
        let del_items = this.packItems.splice(index, count);
        //回收node
        del_items.forEach(packItem => {
            this.recycle_item(packItem);
        });

        //重新排序index后面的
        if(index + count < old_length)
        {
            this.layout_items(index);
        }
        this.adjust_content();
        if(this.packItems.length > 0)
        {
            this.start_index = -1;
            this.stop_index = -1;
            this.render();
        }
    }

    append_data(...datas:any[])
    {
        if(!this.packItems)
        {
            this.packItems = [];
        }
        this.insert_data(this.packItems.length, ...datas);
    }

    scroll_to(index:number, time = 0)
    {
        if(!this.packItems)
        {
            return;
        }
        const packItem = this.packItems[index];
        if(!packItem)
        {
            cc.log("scroll_to, index out of range");
            return;
        }
        if(this.dir == ListViewDir.Vertical)
        {
			const min_y = this.height - this.content_height;
			if(min_y >= 0)
			{
				cc.log("no need to scroll");
				return;
            }
            let y = packItem.y;
			if(y < min_y)
			{
				y = min_y;
				cc.log("content reach bottom");
            }
            const x = this.content.x;
            if(time == 0)
            {
                this.scrollview.setContentPosition(cc.v2(x, -y));
            }
            else
            {
                this.scrollview.scrollToOffset(cc.v2(x, -y), time);
            }
            this.render();
        }
        else
        {
			const max_x = this.content_width - this.width;
			if(max_x <= 0)
			{
				cc.log("no need to scroll");
				return;
			}
			let x = packItem.x;
			if(x > max_x)
			{
				x = max_x;
				cc.log("content reach right");
            }
            const y = this.content.y;
            if(time == 0)
            {
                this.scrollview.setContentPosition(cc.v2(-x, y));
            }
            else
            {
                this.scrollview.scrollToOffset(cc.v2(-x, y), time);
            }
            this.render();
        }
    }

    get_scroll_offset()
    {
        const offset = this.scrollview.getScrollOffset();
        if(this.dir == ListViewDir.Vertical)
        {
            return offset.y;
        }
        else
        {
            return offset.x;
        }
    }

    scroll_to_offset(value:number, time = 0)
    {
        if(this.dir == ListViewDir.Vertical)
        {
            const x = this.content.x;
            if(time == 0)
            {
                this.scrollview.setContentPosition(cc.v2(x, value));
            }
            else
            {
                this.scrollview.scrollToOffset(cc.v2(x, value), time);
            }
            this.render();
        }
        else
        {
            const y = this.content.y;
            if(time == 0)
            {
                this.scrollview.setContentPosition(cc.v2(value, y));
            }
            else
            {
                this.scrollview.scrollToOffset(cc.v2(value, y), time);
            }
            this.render();
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
        const packItem = this.get_pack_item(index);
        if(!packItem)
        {
            return;
        }
        const oldData = packItem.data;
        packItem.data = data;
        if(packItem.item)
        {
            packItem.item.onRecycle(oldData);
            packItem.item.onSetData(data, index);
        }
    }

    reload_item(index:number)
    {
        const packItem = this.get_pack_item(index);
        if(packItem && packItem.item)
        {
            packItem.item.onRecycle(packItem.data);
            packItem.item.onSetData(packItem.data, index);
        }
    }

    private get_pack_item(index:number)
    {
        if(!this.packItems)
        {
            cc.log("call set_data before call this method");
            return null;
        }
        if(index < 0 || index >= this.packItems.length)
        {
            cc.warn("get_pack_item, invalid index", index);
            return null;
        }
        return this.packItems[index];
    }

    get_item(index:number)
    {
        const packItem = this.get_pack_item(index);
        return packItem ? packItem.item : null;
    }

    get_data(index:number)
    {
        const packItem = this.get_pack_item(index);
        return packItem ? packItem.data : null;
    }

    find_item(predicate:(data:any) => boolean)
    {
        if(!this.packItems || !this.packItems.length)
        {
            cc.log("call set_data before call this method");
            return null;
        }
        for(let i = this.start_index; i <= this.stop_index; i++)
        {
            const packItem = this.packItems[i];
            if(predicate(packItem.data))
            {
                return packItem.item;
            }
        }
        return null;
    }

    find_index(predicate:(data:any) => boolean)
    {
        if(!this.packItems || !this.packItems.length)
        {
            cc.log("call set_data before call this method");
            return -1;
        }
        return this.packItems.findIndex(packItem => {
            return predicate(packItem.data);
        });
    }

    get renderedItems()
    {
        const items:ListViewItem[] = [];
        for(let i = this.start_index; i <= this.stop_index; i++)
        {
            const packItem = this.packItems[i];
            if(packItem && packItem.item)
            {
                items.push(packItem.item);
            }
        }
        return items;
    }

    get length()
    {
        if(!this.packItems)
        {
            cc.log("call set_data before call this method");
            return 0;
        }
        return this.packItems.length;
    }

    destroy()
    {
        this.clear_items();
        this.item_pool.forEach(item => {
            item.onUnInit();
            item.node.destroy();
        });
        this.item_pool = null;
        this.packItems = null;

        if(this.timer)
        {
            TimerMgr.getInst().remove(this.timer);
            this.timer = null;
        }
        this.renderDirty = null;

        if(cc.isValid(this.scrollview.node))
        {
            this.scrollview.node.off("scrolling", this.on_scrolling, this);
            this.scrollview.node.off("scroll-to-bottom", this.on_scroll_to_end, this);
            this.scrollview.node.off("scroll-to-right", this.on_scroll_to_end, this);
            this.scrollview.node.off(cc.Node.EventType.TOUCH_START, this.on_scroll_touch_start, this);
            this.scrollview.node.off(cc.Node.EventType.TOUCH_END, this.on_scroll_touch_end, this);
            this.scrollview.node.off(cc.Node.EventType.TOUCH_CANCEL, this.on_scroll_touch_cancel, this);
        }
    }

    get selected_index():number
    {
        return this._selected_index;
    }

    get selected_data():any
    {
        let packItem:PackItem = this.packItems[this._selected_index];
        if(packItem)
        {
            return packItem.data;
        }
        return null;
    }

    set scrollable(value:boolean)
    {
        if(this.dir == ListViewDir.Vertical)
        {
            this.scrollview.vertical = value;
        }
        else
        {
            this.scrollview.horizontal = value;
        }
    }

    get startIndex()
    {
        return this.start_index;
    }

    get stopIndex()
    {
        return this.stop_index;
    }
}

export enum ListViewDir 
{
    Vertical = 1,
    Horizontal = 2,
}

type ListViewParams = {
    scrollview:cc.ScrollView;
    mask:cc.Mask;
    content:cc.Node;
    item_tpl:cc.Node;
    item_class:new() => ListViewItem;   //item对应的类型
    direction?:ListViewDir;
    width?:number;
    height?:number;
    gap_x?:number;
    gap_y?:number;
    padding_left?:number;
    padding_right?:number;
    padding_top?:number;
    padding_bottom?:number;
    item_anchorX?:number;
    item_anchorY?:number;
    row?:number;                    //水平方向排版时，垂直方向上的行数
    column?:number;                 //垂直方向排版时，水平方向上的列数
    cb_host?:any;                   //回调函数host
    scroll_to_end_cb?:()=>void;     //滚动到尽头的回调
    auto_scrolling?:boolean;        //append时自动滚动到尽头
}

type PackItem = {
    x:number;
    y:number;
    data:any;
    is_select:boolean;
    item:ListViewItem;
}
