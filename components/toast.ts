import {pool_mgr} from "../pool/pool_mgr"
import {handler, gen_handler} from "../utils"

const prefab_path:string = "prefabs/toast_tips";

export class toast
{
    private static inst:toast;
    private queue:toast_item[];
    private is_show:boolean;

    private constructor()
    {
    }

    static get_inst():toast
    {
        if(!this.inst)
        {
            this.inst = new toast();
        }
        return this.inst;
    }
    
    static show(content:string, duration:number = 1, delay:number = 0):void
    {
        toast.get_inst().show(content, duration, delay);
    }

    show(content:string, duration:number = 1, delay:number = 0):void
    {
        if(!this.queue)
        {
            this.queue = [];
        }
        let item:toast_item = new toast_item();
        item.content = content;
        item.duration = duration;
        item.delay = delay;
        this.queue.push(item);
        if(!this.is_show)
        {
            this.pop_next();
        }
    }

    private pop_next():void
    {
        let item:toast_item = this.queue.shift();
        if(!item)
        {
            this.is_show = false;
            return;
        }
        this.is_show = true;
        pool_mgr.get_inst().get_ui(prefab_path, gen_handler((node:cc.Node):void=>{
            cc.game.addPersistRootNode(node);
            // cc.director.getScene().addChild(node);
            this.set_content(node, item);
            node.runAction(cc.sequence(cc.delayTime(item.delay), cc.fadeOut(item.duration), cc.callFunc(this.on_toast_finish, this, node)));
        }, this));
    }

    private set_content(node:cc.Node, item:toast_item):void
    {
        let txt_node:cc.Node = node.getChildByName("txt");
        let bg_node:cc.Node = node.getChildByName("bg");
        txt_node.getComponent(cc.Label).string = item.content;
        let txt_size:cc.Size = txt_node.getContentSize();
        bg_node.setContentSize(txt_size.width + 20, txt_size.height + 20);
    }

    private on_toast_finish(node:cc.Node):void
    {
        node.opacity = 255;
        pool_mgr.get_inst().put_ui(prefab_path, node);
        this.pop_next();
    }
}

class toast_item
{
    content:string;
    delay:number;
    duration:number;
}