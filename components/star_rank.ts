type StarOnTouchEnd = (index:number) => void;

const {ccclass, property} = cc._decorator;
@ccclass
export class StarRank extends cc.Component {

    @property({type: cc.SpriteFrame})
    lightStarSpriteFrame: cc.SpriteFrame = null;

    @property({type: cc.SpriteFrame})
    darkStarSpriteFrame: cc.SpriteFrame = null;

    @property
    spacing = 0;

    @property
    cellSize = cc.size(10, 10);
    
    @property({tooltip: "1 for horizontal, 2 for vertical"})
    direction = 1;
    
    private _comps:cc.Sprite[];
    private _compPool:cc.Sprite[];
    private _totalCnt:number;
    private _lightCnt:number;
    private _touchCb:StarOnTouchEnd;

    constructor()
    {
        super();
    }
    
    // onLoad()
    // {
    //     this.setTotalCnt(5);
    //     this.setLightCnt(1);
    //     cc.log(this.node.x, this.node.y)
    // }

    onDestroy()
    {
        this._comps = null;
        this._compPool = null;
        this._touchCb = null;
    }

    setSpacing(value:number)
    {
        this.spacing = value;
    }

    setDirection(value:number)
    {
        this.direction = value;
    }

    setTotalCnt(value:number)
    {
        if(value < 0)
        {
            cc.log(`invalid totalStar value`);
            return;
        }
        if(value == this._totalCnt)
        {
            return;
        }

        if(!this._comps)
        {
            this._comps = [];
            this._compPool = [];
            this._totalCnt = 0;
        }

        for(let i = this._totalCnt; i < value; i++)
        {
            let comp = this._compPool.pop();
            if(!comp)
            {
                const node = new cc.Node();
                node.width = this.cellSize.width;
                node.height = this.cellSize.height;
                comp = node.addComponent(cc.Sprite);
            }
            comp.node.parent = this.node;
            this._comps[i] = comp;
            comp.node.on(cc.Node.EventType.TOUCH_END, event => {
                if(this._touchCb) {
                    this._touchCb(i);
                }
            }, this);
        }
        for(let i = this._totalCnt - 1; i >= value; i--)
        {
            const comp = this._comps.pop();
            comp.node.targetOff(this);
            comp.node.removeFromParent();
            this._compPool.push(comp);
        }
        this._totalCnt = value;

        this.updateLayout();
    }

    private updateLayout()
    {
        //以锚点(0.5, 0.5)计算父容器和子节点位置
        if(this.direction == 1)
        {
            const deltaX = this.cellSize.width + this.spacing;
            this.node.width = this._totalCnt * deltaX;
            this.node.height = this.cellSize.height;
            this._comps.forEach((comp, idx) => {
                comp.node.x = idx * deltaX - 0.5 * (this._totalCnt - 1) * deltaX;
                comp.node.y = 0;
            });
        }
        else
        {
            const deltaY = this.cellSize.height + this.spacing;
            this.node.width = this.cellSize.width;
            this.node.height = this._totalCnt * deltaY;
            this._comps.forEach((comp, idx) => {
                comp.node.x = 0;
                comp.node.y = idx * deltaY - 0.5 * (this._totalCnt - 1) * deltaY;
            });
        }
    }

    setLightCnt(value:number)
    {
        if(value < 0 || value > this._totalCnt)
        {
            cc.log(`invalid lightStar value`);
            return;
        }
        if(value == this._lightCnt)
        {
            return;
        }
        this._lightCnt = value;

        for(let i = 0; i < this._totalCnt; i++)
        {
            this._comps[i].spriteFrame = i < value ? this.lightStarSpriteFrame : this.darkStarSpriteFrame;
        }
    }

    getLightCnt()
    {
        return this._lightCnt || 0;
    }

    setTouchCb(cb:StarOnTouchEnd)
    {
        this._touchCb = cb;
    }

    getComp(index:number)
    {
        return this._comps[index];
    }
}