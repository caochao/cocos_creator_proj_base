import {pool_mgr} from "../pool/pool_mgr"
import {handler, gen_handler} from "../utils"
import {appdata} from "../../appdata"
import {TweenUtil} from "../tween/tweenutil"

export class toast
{
    private static inst:toast;
    private anchors:cc.Node[];
    private pool_nodes:cc.Node[];
    private using_nodes:cc.Node[];

    private constructor()
    {
        this.pool_nodes = [];
        this.using_nodes = [];
        this.anchors = [];

        appdata.app.toast.children.forEach((node) => {
            if(node.name.indexOf("tip") != -1)
            {
                this.pool_nodes.push(node);
            }
            if(node.name.indexOf("anchor") != -1)
            {
                this.anchors.push(node);
            }
        });
    }

    static get_inst():toast
    {
        if(!this.inst)
        {
            this.inst = new toast();
        }
        return this.inst;
    }
    
    static show(content:string)
    {
        toast.get_inst().show(content);
    }

    show(content:string)
    {
        let node = this.pool_nodes.pop();
        if(!node)
        {
            this.layout_nodes();
            node = this.using_nodes.shift();
            node.removeFromParent();
        }
        this.using_nodes.push(node);

        //找到第一个空的位置
        let anchor = this.anchors.find((ar) => {
            return ar.childrenCount == 0;
        });
        node.parent = anchor;
        node.setPosition(0, 0);
        this.handle_node(node, content);
        this.set_top();
    }

    private handle_node(node:cc.Node, content:string)
    {
        node.active = true;
        node.opacity = 255;
        this.set_content(node, content);
        node.runAction(cc.sequence(cc.delayTime(1.5), cc.fadeOut(0.4), cc.callFunc(this.on_node_hide, this, node)));
    }

    private set_content(node:cc.Node, content:string)
    {
        let bg_node:cc.Node = node.getChildByName("bg");
        let txt_node:cc.Node = node.getChildByName("txt");
        let txt = txt_node.getComponent(cc.Label);
        txt.overflow = cc.Label.Overflow.NONE;
        txt.string = content;
        // cc.info("set_content, width=", txt_node.width);
        // if(txt_node.width > 500)
        // {
        //     txt.overflow = cc.Label.Overflow.RESIZE_HEIGHT;
        //     txt_node.width = 500;
        // }
        bg_node.setContentSize(txt_node.width + 20, txt_node.height + 20);
    }

    private on_node_hide(node:cc.Node)
    {
        node.removeFromParent();
        let index = this.using_nodes.findIndex((pnode) => {
            return pnode == node;
        });
        this.using_nodes.splice(index, 1);
        this.pool_nodes.push(node);
    }

    private set_top()
    {
        let toast = appdata.app.toast;
        toast.setSiblingIndex(toast.parent.childrenCount - 1);
    }

    private layout_nodes()
    {
        if(this.using_nodes.length <= 0)
        {
            return;
        }
        for(let i = this.using_nodes.length - 1; i > 0; i--)
        {
            this.using_nodes[i].parent = this.using_nodes[i-1].parent;
            this.using_nodes[i].setPosition(0, 0);
        }
    }
}