import { EventTool } from "../event/event_tool";

export class TabPage extends EventTool
{
    protected _node:cc.Node;
    protected _parent:cc.Node;
    protected _isSelected:boolean;

    constructor(node:cc.Node)
    {
        super();
        this._node = node;
        this.onInit();
    }

    onInit()
    {

    }

    setParent(parent:cc.Node)
    {
        this._parent = parent;
    }
    
    alignToParent()
    {
        this._node.setPosition(0, 0);
    }

    setSelected(value:boolean)
    {
        if(this._isSelected == value) {
            return;
        }
        this._isSelected = value;
        
        if(value && !this._node.parent) {
            this._node.parent = this._parent;
            this.onBecameVisible();
        }
        else if(!value && this._node.parent) {
            this._node.removeFromParent(false);
            this.onBecameInvisible();
        }
    }

    protected onBecameVisible()
    {
    }

    protected onBecameInvisible()
    {   
    }

    get selected()
    {
        return this._isSelected;
    }

    destroy()
    {
        this.onDestroy();
        this._parent = null;
        if(cc.isValid(this._node)) {
            this._node.destroy();
            this._node = null;
        }
    }

    onDestroy()
    {
        
    }
}