import { ScrollViewItem } from "./scrollviewitem";
import { TimerMgr } from "../timer/timer_mgr";
import { gen_handler } from "../util";
import { LayoutUtil } from "./layout_utils";
import { Action1 } from "../../const";

export class ScrollView extends cc.EventTarget
{
    protected scrollview:cc.ScrollView;
    protected mask:cc.Mask;
    protected content:cc.Node;
    protected item_templates:Map<string, cc.Node>;
    protected item_classes:Map<string, new() => ScrollViewItem>;
    protected item_pools:Map<string, ScrollViewItem[]>;

    protected dir:number;
    protected width:number;
    protected height:number;
    protected original_width:number;
    protected original_height:number;
    protected gap_x:number;
    protected gap_y:number;
    protected padding_left:number;
    protected padding_right:number;
    protected padding_top:number;
    protected padding_bottom:number;
    protected item_anchorX:number;
    protected item_anchorY:number;
    protected cb_host:any;
    protected scroll_to_end_cb:Action1;
    protected auto_scrolling:boolean;
    protected packItems:PackItem[];
    protected start_index:number;
    protected stop_index:number;
    private _selected_index:number = -1;
    private content_width:number;
    private content_height:number;
    private min_item_width:number;
    private min_item_height:number;
    private max_item_width:number;
    private max_item_height:number;
    private renderDirty:boolean;
    private timer:number;

    constructor(params:ScrollViewParams)
    {
        super();
        this.scrollview = params.scrollview;
        this.mask = params.mask;
        this.content = params.content;
        this.item_pools = new Map();
        this.item_templates = new Map();
        this.item_classes = new Map();
        params.item_templates.forEach(tpl => {
            tpl.node.active = false;
            this.item_templates.set(tpl.key, tpl.node);
            this.item_classes.set(tpl.key, tpl.item_class);
        });

        this.dir = params.direction || ScrollDirection.Vertical;
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
        this.cb_host = params.cb_host;
        this.scroll_to_end_cb = params.scroll_to_end_cb;
        this.auto_scrolling = params.auto_scrolling || false;
        this.min_item_width = Infinity;
        this.min_item_height = Infinity;
        this.max_item_width = 0;
        this.max_item_height = 0;

        if(this.dir == ScrollDirection.Vertical)
        {
            this.set_content_size(this.width, 0);
        }
        else
        {
            this.set_content_size(0, this.height);
        }
        this.original_width = this.width;
        this.original_height = this.height;
        this.mask.node.setContentSize(this.width, this.height);
        this.scrollview.node.setContentSize(this.width, this.height);
        this.scrollview.vertical = this.dir == ScrollDirection.Vertical;
        this.scrollview.horizontal = this.dir == ScrollDirection.Horizontal;
        this.scrollview.inertia = true;
        this.scrollview.node.on("scrolling", this.on_scrolling, this);
        this.scrollview.node.on("scroll-to-bottom", this.on_scroll_to_end, this);
        this.scrollview.node.on("scroll-to-right", this.on_scroll_to_end, this);
        this.scrollview.node.on(cc.Node.EventType.TOUCH_START, this.on_scroll_touch_start, this);
        this.scrollview.node.on(cc.Node.EventType.TOUCH_END, this.on_scroll_touch_end, this);
        this.scrollview.node.on(cc.Node.EventType.TOUCH_CANCEL, this.on_scroll_touch_cancel, this);
        this.timer = TimerMgr.getInst().add_updater(gen_handler(this.onUpdate, this), "scrollView render timer");
        // cc.log("constructor", this.mask.width, this.mask.height, this.scrollview.node.width, this.scrollview.node.height, this.content.width, this.content.height);
    }

    protected _touchBeganPosition:cc.Vec2;
    protected _touchEndPosition:cc.Vec2;
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

    protected handle_release_logic()
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
                packItem.item.onTouchEnd(packItem.key, packItem.data, packItem.item.node.convertToNodeSpaceAR(touchPos), i);
                break;
            }
        }
    }

    protected get_drag_direction(moveOffset:cc.Vec2) {
        if (this.dir === ScrollDirection.Horizontal) 
        {
            if (Math.abs(moveOffset.x) < 3) { return 0; }
            return (moveOffset.x > 0 ? 1 : -1);
        }
        else if (this.dir === ScrollDirection.Vertical) 
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
    protected on_scrolling()
    {
        let pos:number;
        let threshold:number;
        if(this.dir == ScrollDirection.Vertical)
        {
            pos = this.content.y;
            threshold = this.min_item_height;
        }
        else
        {
            pos = this.content.x;
            threshold = this.min_item_width;
        }
        if(this.last_content_pos != null && Math.abs(pos - this.last_content_pos) < threshold)
        {
            return;
        }
        this.last_content_pos = pos;
        this.render();
    }

    protected render()
    {
        if(!this.packItems || !this.packItems.length)
        {
            return;
        }
        if(this.dir == ScrollDirection.Vertical)
        {
            let posy = this.content.y;
            // cc.log("onscrolling, content posy=", posy);
            if(posy < 0)
            {
                posy = 0;
            }
            if(posy > this.content_height - this.height)
            {
                posy = this.content_height - this.height;
            }
            let viewport_start = -posy;
            let viewport_stop = viewport_start - this.height;
            // while(this.packItems[start].y - this.packItems[start].height > viewport_start)
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
            start = Math.max(start - 1, 0);
            stop = Math.min(this.packItems.length - 1, stop + 1);
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
            if(posx < this.width - this.content_width)
            {
                posx = this.width - this.content_width;
            }
            let viewport_start = -posx;
            let viewport_stop = viewport_start + this.width;
            // while(this.packItems[start].x + this.packItems[start].width < viewport_start)
            // {
            //     start++;
            // }
            // while(this.packItems[stop].x > viewport_stop)
            // {
            //     stop--;
            // }
            let start = this.indexFromOffset(viewport_start);
            let stop = this.indexFromOffset(viewport_stop);

            //expand viewport for better experience
            start = Math.max(start - 1, 0);
            stop = Math.min(this.packItems.length - 1, stop + 1);
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
            cc.log("scrollView, render_from:", this.start_index, this.stop_index);
            this.render_items();
            this.renderDirty = false;
        }
    }

    private indexFromOffset(offset:number)
    {
        let low = 0; 
        let high = 0;
        let max_idx = 0;
        high = max_idx = this.packItems.length - 1;
        if(this.dir == ScrollDirection.Vertical)
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
            packItem.item.onSetSelect(packItem.key, is_select, index);
            if(is_select)
            {
                packItem.item.onSelected(packItem.key, packItem.data, index);
            }
        }
    }

    private spawn_item(key:string, is_measure = false):ScrollViewItem
    {
        const pools = this.item_pools.get(key);
        let item:ScrollViewItem;
        if(pools && pools.length > 0)
        {
            item = pools.pop();
        }
        else
        {
            item = cc.instantiate(this.item_templates.get(key)).addComponent(this.item_classes.get(key)) as ScrollViewItem;
            item.node.active = true;
            //仅仅改变父节点锚点，子元素位置不会随之变化
            // item.node.setAnchorPoint(this.item_anchorX, this.item_anchorY);
            LayoutUtil.set_pivot_smart(item.node, this.item_anchorX, this.item_anchorY);
            item.onInit(key);
            // cc.log("spawn_item, key=", key);
        }
        if(!is_measure)
        {
            item.node.parent = this.content;
        }
        return item;
    }

    private recycle_item(packItem:PackItem, is_measure = false)
    {
        const item = packItem.item;
        if(item && cc.isValid(item.node))
        {
            let pools = this.item_pools.get(packItem.key);
            if(!pools)
            {
                pools = [];
                this.item_pools.set(packItem.key, pools);
            }
            pools.push(item);
            item.onRecycle(packItem.key, packItem.data, is_measure);
            item.node.removeFromParent();
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
                packItem.item = this.spawn_item(packItem.key);
                packItem.item.onSetData(packItem.key, packItem.data, i, false);
                packItem.item.onSetSelect(packItem.key, packItem.is_select, i);
                if(packItem.is_select) {
                    packItem.item.onSelected(packItem.key, packItem.data, i);
                }
            }
            // packItem.item.node.setPosition(packItem.x, packItem.y);
            packItem.item.setLeftTop(packItem.x, packItem.y);
        }
    }

    private pack_item(index:number, data:ScrollItemData):PackItem
    {
        const item = this.spawn_item(data.key, true);
        const [width, height]:[number, number] = item.onSetData(data.key, data.data, index, true);
        const packItem:PackItem = {x:0, y:0, width, height, item, key:data.key, data:data.data, is_select:false};
        this.recycle_item(packItem, true);
        if(width < this.min_item_width) {
            this.min_item_width = width;
        }
        else if(width > this.max_item_width) {
            this.max_item_width = width;
        }
        if(height < this.min_item_height) {
            this.min_item_height = height;
        }
        else if(height > this.max_item_height) {
            this.max_item_height = height;
        }
        return packItem;
    }

    protected layout_items(start:number)
    {
        // cc.log("layout_items, start=", start);
        if(this.packItems.length <= 0)
        {
            return;
        }
        let start_pos = this.dir == ScrollDirection.Vertical ? -this.padding_top : this.padding_left;
        if(start > 0)
        {
            const prev_packItem = this.packItems[start - 1];
            if(this.dir == ScrollDirection.Vertical)
            {
                start_pos = prev_packItem.y - prev_packItem.height - this.gap_y;
            }
            else
            {
                start_pos = prev_packItem.x + prev_packItem.width + this.gap_x;
            }
        }
        for(let index = start, stop = this.packItems.length; index < stop; index++)
        {
            const packItem = this.packItems[index];
            if(this.dir == ScrollDirection.Vertical)
            {
                packItem.x = this.padding_left;
                packItem.y = start_pos;
                start_pos -= packItem.height + this.gap_y;
            }
            else
            {
                packItem.x = start_pos;
                packItem.y = -this.padding_top;
                start_pos += packItem.width + this.gap_x;
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
        if(this.dir == ScrollDirection.Vertical) {
            //content_width可能比width大，导致水平方向上有部分内容被裁剪
            const width = Math.max(this.width, this.padding_left + this.max_item_width + this.padding_right);
            const height = Math.max(this.height, last_packItem.height - last_packItem.y + this.padding_bottom);
            this.set_content_size(width, height);
        }
        else {
            const width = Math.max(this.width, last_packItem.x + last_packItem.width + this.padding_right);
            //content_height可能比height大，导致垂直方向上有部分内容被裁剪
            const height = Math.max(this.height, this.padding_top + this.max_item_height + this.padding_bottom);
            this.set_content_size(width, height);
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
        // cc.log("ScrollView, set_content_size", width, height, this.content.width, this.content.height);
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

    set_data(datas:ScrollItemData[])
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
        datas.forEach((data, index) => {
            let packItem = this.pack_item(index, data);
            this.packItems.push(packItem);
        });
        this.layout_items(0);
        this.adjust_content();
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
        if(this.packItems.length > 0)
        {
            this.render();
        }
    }

    insert_data(index:number, ...datas:ScrollItemData[])
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
        datas.forEach((data, index) => {
            let packItem = this.pack_item(index, data);
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
    
    append_data(...datas:ScrollItemData[])
    {
        if(!this.packItems)
        {
            this.packItems = [];
        }
        this.insert_data(this.packItems.length, ...datas);
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

    scroll_to(index:number, time:number = 0)
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
        if(this.dir = ScrollDirection.Vertical)
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
        if(this.dir == ScrollDirection.Vertical)
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
        if(this.dir == ScrollDirection.Vertical)
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

    refresh_item(index:number, data:ScrollItemData)
    {
        const packItem = this.get_pack_item(index);
        if(!packItem)
        {
            return;
        }
        const oldData = packItem;
        packItem.key = data.key;
        packItem.data = data.data;
        if(packItem.item)
        {
            packItem.item.onRecycle(oldData.key, oldData.data, false);
            packItem.item.onSetData(packItem.key, packItem.data, index, false);
        }
    }

    reload_item(index:number)
    {
        const packItem = this.get_pack_item(index);
        if(packItem && packItem.item)
        {
            packItem.item.onRecycle(packItem.key, packItem.data, false);
            packItem.item.onSetData(packItem.key, packItem.data, index, false);
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
    
    find_item(predicate:(key:string, data:any) => boolean)
    {
        if(!this.packItems || !this.packItems.length)
        {
            cc.log("call set_data before call this method");
            return null;
        }
        for(let i = this.start_index; i <= this.stop_index; i++)
        {
            const packItem = this.packItems[i];
            if(predicate(packItem.key, packItem.data))
            {
                return packItem.item;
            }
        }
        return null;
    }

    find_index(predicate:(key:string, data:any) => boolean)
    {
        if(!this.packItems || !this.packItems.length)
        {
            cc.log("call set_data before call this method");
            return -1;
        }
        return this.packItems.findIndex(packItem => {
            return predicate(packItem.key, packItem.data);
        });
    }

    get renderedItems()
    {
        const items:ScrollViewItem[] = [];
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
        this.item_pools.forEach((pools, key) => {
            pools.forEach(item => {
                item.onUnInit(key);
                item.node.destroy();
            });
        });
        this.item_templates = null;
        this.item_classes = null;
        this.item_pools = null;
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
        if(this.dir == ScrollDirection.Vertical)
        {
            this.scrollview.vertical = value;
        }
        else
        {
            this.scrollview.horizontal = value;
        }
    }
}

export type ScrollItemTemplate = {
    key:string;
    node:cc.Node;
    item_class:new() => ScrollViewItem;   //item对应的类型
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

export type ScrollViewParams = {
    scrollview:cc.ScrollView;
    mask:cc.Mask;
    content:cc.Node;
    item_templates:ScrollItemTemplate[];
    direction?:ScrollDirection;
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
    cb_host?:any;                     //回调函数host
    scroll_to_end_cb?:Action1;       //滚动到尽头的回调
    auto_scrolling?:boolean;          //append时自动滚动到尽头
}

type PackItem = {
    x:number;
    y:number;
    width:number;
    height:number;
    key:string;
    data:any;
    is_select:boolean;
    item:ScrollViewItem;
}