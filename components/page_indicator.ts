const {ccclass, property} = cc._decorator;
@ccclass
export class PageIndicator extends cc.Component {

    @property({type: cc.SpriteFrame})
    selectedSpriteFrame: cc.SpriteFrame = null;

    @property({type: cc.SpriteFrame})
    unSelectedSpriteFrame: cc.SpriteFrame = null;

    @property
    spacing = 0;

    @property
    cellSize = cc.size(10, 10);
    
    @property({tooltip: "1 for horizontal, 2 for vertical"})
    direction = 1;
    
    private _comps:cc.Sprite[];
    private _compPool:cc.Sprite[];
    private _compsCnt:number;
    private _selectedIndex:number = -1;

    constructor()
    {
        super();
    }

    onDestroy()
    {
        this._comps = null;
        this._compPool = null;
    }

    setPageCnt(value:number)
    {
        if(value == this._compsCnt)
        {
            return;
        }

        if(!this._comps)
        {
            this._comps = [];
            this._compPool = [];
            this._compsCnt = 0;
        }

        for(let i = this._compsCnt; i < value; i++)
        {
            let comp = this._compPool.pop();
            if(!comp)
            {
                const node = new cc.Node();
                node.width = this.cellSize.width;
                node.height = this.cellSize.height;
                comp = node.addComponent(cc.Sprite);
                comp.spriteFrame = this.unSelectedSpriteFrame;
            }
            comp.node.parent = this.node;
            this._comps[i] = comp;
        }
        for(let i = this._compsCnt - 1; i >= value; i--)
        {
            const comp = this._comps.pop();
            comp.node.removeFromParent();
            this._compPool.push(comp);
        }
        this._compsCnt = value;

        this.updateLayout();
    }

    private updateLayout()
    {
        //以锚点(0.5, 0.5)计算父容器和子节点位置
        if(this.direction == 1)
        {
            const deltaX = this.cellSize.width + this.spacing;
            this.node.width = (this._compsCnt - 1) * deltaX;
            this.node.height = this.cellSize.height;
            const halfWidth = this.node.width / 2;
            this._comps.forEach((comp, idx) => {
                comp.node.x = idx * deltaX - halfWidth;
                comp.node.y = 0;
            });
        }
        else
        {
            const deltaY = this.cellSize.height + this.spacing;
            this.node.width = this.cellSize.width;
            this.node.height = (this._compsCnt - 1) * deltaY;
            const halfHeight = this.node.height / 2;
            this._comps.forEach((comp, idx) => {
                comp.node.x = 0;
                comp.node.y = idx * deltaY - halfHeight;
            });
        }
    }

    turningTo(pageIdx:number)
    {
        if(pageIdx == this._selectedIndex)
        {
            return;
        }
        if(this._selectedIndex != -1 && this._selectedIndex < this._compsCnt)
        {
            this._comps[this._selectedIndex].spriteFrame = this.unSelectedSpriteFrame;
        }
        this._selectedIndex = pageIdx;
        this._comps[pageIdx].spriteFrame = this.selectedSpriteFrame;
    }
}