import { loader_mgr } from "../loader/loader_mgr";
import { gen_handler } from "../util";

export class Toast 
{
    public static resPath = "prefabs/misc/toast";
    private static inst:Toast;
    private nodePool:cc.Node[];

    private constructor() 
    {
        this.nodePool = [];
    }

    private static getInst() 
    {
        if(!this.inst) 
        {
            this.inst = new Toast();
        }
        return this.inst;
    }

    private run(node:cc.Node)
    {
        node.parent = cc.director.getScene();
        cc.game.addPersistRootNode(node);

        node.opacity = 0;
        node.setPosition(375, 0);
        const moveUp = cc.moveBy(0.2, cc.v2(0, 117));
        const fadeIn = cc.fadeIn(0.2);
        const moveFadeAct = cc.spawn(moveUp, fadeIn);
        const delayAction = cc.delayTime(1);
        const fadeOut = cc.fadeOut(0.5);
        const onFinished = cc.callFunc(() => {
            cc.game.removePersistRootNode(node);
            node.removeFromParent();
            this.nodePool.push(node);
        }, this);
        node.runAction(cc.sequence(moveFadeAct, delayAction, fadeOut, onFinished));
    }

    private configure(node:cc.Node, params:ToastParmas)
    {
        const label = node.getChildByName("txt").getComponent(cc.Label);
        label.string = params.txt;
        label.node.color = params.txtColor || cc.color(255, 255, 255);
        
        //label size
        label.overflow = cc.Label.Overflow.NONE;
        label._updateRenderData(true);
        let labelWidth = label.node.width;
        let labelHeight = label.node.height;
        if(labelWidth > 500) {
            labelWidth = 500;
            label.node.width = labelWidth;
            label.overflow = cc.Label.Overflow.RESIZE_HEIGHT;
            label._updateRenderData(true);
            labelHeight = label.node.height;
            if(labelHeight > 90) {
                labelHeight = 90
                label.node.height = labelHeight;
                label.overflow = cc.Label.Overflow.SHRINK;
            }
        }

        //bg size
        const bg = label.node.parent;
        let bgWidth = Math.max(397, labelWidth + 50);
        let bgHeight = Math.max(76, labelHeight + 40);
        bg.setContentSize(bgWidth, bgHeight);

        this.run(node);
    }

    private make(params:ToastParmas)
    {
        if(this.nodePool.length > 0) 
        {
            this.configure(this.nodePool.pop(), params);
        }
        else
        {
            loader_mgr.get_inst().loadPrefabObj(Toast.resPath, gen_handler((node:cc.Node) => {
                this.configure(node, params);
            }));
        }
    }

    private clear()
    {
        this.nodePool.forEach(node => node.destroy());
        this.nodePool.length = 0;
    }

    static show(params:ToastParmas)
    {
        Toast.getInst().make(params);
    }

    static clear()
    {
        Toast.getInst().clear();
    }
}

interface ToastParmas 
{
    txt:string;
    txtColor?:cc.Color;
}