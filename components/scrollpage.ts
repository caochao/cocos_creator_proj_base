import { ScrollView, ScrollViewParams, ScrollDirection } from "./scrollview";
import { Action1 } from "../../const";
import { TimerMgr } from "../timer/timer_mgr";
import { gen_handler } from "../util";

//参考自engine/CCPageView
export class ScrollPage extends ScrollView
{
    private _curPageIdx:number;
    private _lastPageIdx:number;
    private _pageTurningSpeed:number;
    private _scrollThreshold:number;
    private _autoPageTurningThreshold:number;
    private _scrollCenterOffsetX:number[]; // 每一个页面居中时需要的偏移量（X）
    private _scrollCenterOffsetY:number[]; // 每一个页面居中时需要的偏移量（Y）
    private _onTurning:(pageIndex:number) => void;
    private _onScrolling:Action1;
    private _timer:number;

    constructor(params:ScrollPageParams)
    {
        super(params);
        this._onTurning = params.on_turning;
        this._onScrolling = params.on_scrolling;
        this._curPageIdx = 0;
        this._lastPageIdx = -1;
        this._pageTurningSpeed = 0.3;
        this._scrollThreshold = 0.5;
        this._autoPageTurningThreshold = 100;
        this._scrollCenterOffsetX = [];
        this._scrollCenterOffsetY = [];
    }

    scroll_to_page(idx:number, time = 0, delayTurning = false)
    {
        if (idx < 0 || idx >= this.packItems.length)
        {
            return;
        }
        this._curPageIdx = idx;
        this.scrollview.scrollToOffset(this._moveOffsetValue(idx), time, true);
        this.render();
        //用以在onTurning事件回调中获取scrollViewItem
        if(delayTurning) {
            this._timer = TimerMgr.getInst().once(0, gen_handler(this._dispatchPageTurningEvent, this), "ScrollPage, scroll_to_page timer", this.scrollview.node);
        }
        else {
            this._dispatchPageTurningEvent();
        }
    }

    get page_index()
    {
        return this._curPageIdx;
    }

    protected on_scrolling()
    {
        super.on_scrolling();
        if(this._onScrolling) {
            this._onScrolling.call(this.cb_host);
        }
    }

    protected handle_release_logic()
    {
        super.handle_release_logic();
        
        let bounceBackStarted = this.scrollview._startBounceBackIfNeeded();
        let moveOffset = this._touchBeganPosition.sub(this._touchEndPosition);
        let dragDirection = this.get_drag_direction(moveOffset);

        //点击无滑动
        if(dragDirection === 0) {
            return;
        }

        if(!this.packItems || !this.packItems.length)
        {
            return;
        }

        if (bounceBackStarted) {
            if (dragDirection === 0) {
                return;
            }
            if (dragDirection > 0) {
                this._curPageIdx = this.packItems.length - 1;
            }
            else {
                this._curPageIdx = 0;
            }
        }
        else {
            let index = this._curPageIdx, nextIndex = index + dragDirection;
            let timeInSecond = this._pageTurningSpeed * Math.abs(index - nextIndex);
            if (nextIndex >= 0 && nextIndex < this.packItems.length) {
                if (this._isScrollable(moveOffset, index, nextIndex)) {
                    this.scroll_to_page(nextIndex, timeInSecond);
                    return;
                }
                else {
                    let touchMoveVelocity = this.scrollview._calculateTouchMoveVelocity();
                    if (this._isQuicklyScrollable(touchMoveVelocity)) {
                        this.scroll_to_page(nextIndex, timeInSecond);
                        return;
                    }
                }
            }
            this.scroll_to_page(index, timeInSecond);
        }
    }

    private _dispatchPageTurningEvent() {
        if (this._lastPageIdx === this._curPageIdx) return;
        this._lastPageIdx = this._curPageIdx;

        if(this._onTurning)
        {
            this._onTurning.call(this.cb_host, this._curPageIdx);
        }
    }

    // 是否超过自动滚动临界值
    private _isScrollable(offset, index, nextIndex) {
        let curPageCenter, nextPageCenter;
        if (this.dir === ScrollDirection.Horizontal) {
            curPageCenter = this._scrollCenterOffsetX[index];
            nextPageCenter = this._scrollCenterOffsetX[nextIndex];
            return Math.abs(offset.x) >= Math.abs(curPageCenter - nextPageCenter) * this._scrollThreshold;
        }
        else if (this.dir === ScrollDirection.Vertical) {
            curPageCenter = this._scrollCenterOffsetY[index];
            nextPageCenter = this._scrollCenterOffsetY[nextIndex];
            return Math.abs(offset.y) >= Math.abs(curPageCenter - nextPageCenter) * this._scrollThreshold;
        }
    }

    // 快速滑动
    private _isQuicklyScrollable(touchMoveVelocity) {
        if (this.dir === ScrollDirection.Horizontal) {
            if (Math.abs(touchMoveVelocity.x) > this._autoPageTurningThreshold) {
                return true;
            }
        }
        else if (this.dir === ScrollDirection.Vertical) {
            if (Math.abs(touchMoveVelocity.y) > this._autoPageTurningThreshold) {
                return true;
            }
        }
        return false;
    }

    // 通过 idx 获取偏移值数值
    private _moveOffsetValue(idx) {
        let offset = cc.v2(0, 0);
        if (this.dir === ScrollDirection.Horizontal) {
            offset.x = this._scrollCenterOffsetX[idx];
        }
        else if (this.dir === ScrollDirection.Vertical) {
            offset.y = this._scrollCenterOffsetY[idx];
        }
        return offset;
    }

    protected layout_items(start:number)
    {
        super.layout_items(start);

        const scrollWidth = this.width;
        const scrollHeight = this.height;
        for (let i = 0, len = this.packItems.length; i < len; ++i) {
            //居中显示每个page
            if (this.dir === ScrollDirection.Horizontal) {
                this._scrollCenterOffsetX[i] = Math.abs(this.packItems[i].x) - (Math.abs(scrollWidth - this.packItems[i].width) >> 1);
            }
            else {
                this._scrollCenterOffsetY[i] = Math.abs(this.packItems[i].y) - (Math.abs(scrollHeight - this.packItems[i].height) >> 1);
            }
        }
    }

    remove_data(index:number, count:number = 1)
    {
        super.remove_data(index, count);

        //选中项被删除
        const maxPageIdx = this.packItems.length - 1;
        if(this._curPageIdx > maxPageIdx)
        {
            this.scroll_to_page(maxPageIdx, 0);
        }
    }

    destroy()
    {
        this._onTurning = null;
        this._onScrolling = null;
        this._scrollCenterOffsetX = null;
        this._scrollCenterOffsetY = null;
        if(this._timer) {
            TimerMgr.getInst().remove(this._timer);
            this._timer = null;
        }
        super.destroy()
    }
}

export interface ScrollPageParams extends ScrollViewParams
{
    on_turning?:(pageIndex:number) => void;
    on_scrolling?:Action1;
}