const {ccclass, property} = cc._decorator;
@ccclass
export class ListViewItem extends cc.Component 
{
    // constructor()
    // {
    //     super();
    // }

    onInit()
    {
        // cc.log("item初如化");
    }

    onUnInit()
    {
        // cc.log("item析构");
    }

    onSetData(data:any, index:number)
    {
        // cc.log("item设置数据");
    }

    onSetSelect(is_select:boolean, index:number)
    {
        // cc.log("item选中状态改变");
    }

    onRecycle(data:any)
    {
        // cc.log("item被回收");
    }

    onSelected(data:any, index:number)
    {
        // cc.log("item被选中");
    }

    onTouchEnd(touchPos:cc.Vec2, data:any, index:number)
    {
        // cc.log("item非滑动状态下被点击");
    }

    onBecameInvisible()
    {
        // cc.log("item从父节点移除或不可见");
    }

    setLeftTop(left:number, top:number)
    {
        this.node.x = left + this.node.anchorX * this.node.width;
        this.node.y = top - (1 - this.node.anchorY) * this.node.height;
    }
}