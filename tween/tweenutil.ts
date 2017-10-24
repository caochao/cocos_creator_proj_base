import {TimerMgr} from "../timer/timer_mgr"
import {handler, gen_handler} from "../utils"
import {LinkList, LinkListNode} from "../linklist"
import {TweenFunc} from "./tweenfunc"

export class TweenUtil
{
    private static inst:TweenUtil;
    private list:LinkList<TweenHandler>;
    private pool:TweenHandler[];
    private key:number;
    private timer:number;

    private constructor()
    {
        this.key = 0;
        this.pool = [];
        this.list = new LinkList<TweenHandler>();
    }

    public static getInst()
    {
        if(!this.inst)
        {
            this.inst = new TweenUtil();
        }
        return this.inst;
    }

    to(params:TweenParams):number
    {
        let node = params.node;
        if(!node || !cc.isValid(node))
        {
            cc.warn("invalid node");
            return 0;
        }

        let th:TweenHandler = this.pool.pop();
        if(!th)
        {
            th = {
                node:null, elapsed:null, duration:null, delay:null, 
                exectors:null, tweenFunc:null, onUpdate:null, onComplete:null
            };
        }
        th.node = node;
        th.elapsed = 0;
        th.duration = params.duration || 1;
        th.delay = params.delay || 0;
        th.exectors = [];
        th.tweenFunc = params.tweenFunc || TweenFunc.Linear;
        th.onUpdate = params.onUpdate;
        th.onComplete = params.onComplete;

        if(params.x != null)
        {
            let from = node.x;
            let delta = params.x - from;
            th.exectors.push((elapsed) => {
                let curr_x = th.tweenFunc(elapsed, from, delta, th.duration);
                th.node.x = curr_x;     //测试发现用node.position.x，不能移动位置
            });
        }
        if(params.y != null)
        {
            let from = node.y;
            let delta = params.y - from;
            th.exectors.push((elapsed) => {
                let curr_y = th.tweenFunc(elapsed, from, delta, th.duration);
                th.node.y = curr_y;
            });
        }
        if(params.rotation != null)
        {
            let from = node.rotation;
            let delta = params.rotation - from;
            th.exectors.push((elapsed) => {
                let curr_rot = th.tweenFunc(elapsed, from, delta, th.duration);
                th.node.rotation = curr_rot;
            });
        }
        if(params.width != null)
        {
            let from = node.width;
            let delta = params.width - from;
            th.exectors.push((elapsed) => {
                let curr_width = th.tweenFunc(elapsed, from, delta, th.duration);
                th.node.width = curr_width;
            });
        }
        if(params.height != null)
        {
            let from = node.height;
            let delta = params.height - from;
            th.exectors.push((elapsed) => {
                let curr_height = th.tweenFunc(elapsed, from, delta, th.duration);
                th.node.height = curr_height;
            });
        }
        if(params.opacity != null)
        {
            let from = node.opacity;
            let delta = params.opacity - from;
            th.exectors.push((elapsed) => {
                let curr_opacity = th.tweenFunc(elapsed, from, delta, th.duration);
                th.node.opacity = curr_opacity;
            });
        }

        if(!this.timer)
        {
            this.timer = TimerMgr.getInst().add_updater(gen_handler(this.update, this));
        }
        return this.list.append(++this.key, th);
    }

    from(params:TweenParams):number
    {
        let node = params.node;
        if(!node || !cc.isValid(node))
        {
            cc.warn("invalid node");
            return 0;
        }
        if(params.x != null)
        {
            [node.x, params.x] = [params.x, node.x];
        }
        if(params.y != null)
        {
            [node.y, params.y] = [params.y, node.y];
        }
        if(params.rotation != null)
        {
            [node.rotation, params.rotation] = [params.rotation, node.rotation];
        }
        if(params.width != null)
        {
            [node.width, params.width] = [params.width, node.width];
        }
        if(params.height != null)
        {
            [node.height, params.height] = [params.height, node.height];
        }
        if(params.opacity != null)
        {
            [node.opacity, params.opacity] = [params.opacity, node.opacity];
        }
        return this.to(params);
    }

    kill(key:number)
    {
        let tweenHandler:TweenHandler = this.list.remove(key);
        if(tweenHandler)
        {
            this.pool.push(tweenHandler);
        }
    }

    static from(params:TweenParams):number
    {
        return this.getInst().from(params);
    }

    static to(params:TweenParams):number
    {
        return this.getInst().to(params);
    }

    static kill(key:number)
    {
        this.getInst().kill(key);
    }

    private update(dt:number)
    {
        let node:LinkListNode<TweenHandler> = this.list.head;
        if(!node)
        {
            if(this.timer)
            {
                TimerMgr.getInst().remove(this.timer);
            }
            this.timer = 0;
            return;
        }
        while(node)
        {
            //节点已失效
            if(!node.data.node || !cc.isValid(node.data.node))
            {
                this.kill(node.key);
                node = node.next;
                continue;
            }

            //执行完毕
            if(node.data.elapsed >= node.data.duration + node.data.delay)
            {
                node.data.exectors.forEach((func) => {
                    func(node.data.duration);
                });
                if(node.data.onComplete)
                {
                    node.data.onComplete.exec(node.data.node, 1);
                }
                this.kill(node.key);
                node = node.next;
                continue;
            }

            //延时时间到了
            if(node.data.elapsed >= node.data.delay)
            {
                if(node.data.onUpdate)
                {
                    node.data.onUpdate.exec(
                        node.data.node,
                        this.clamp01((node.data.elapsed - node.data.delay) / node.data.duration)
                    );
                }
                node.data.exectors.forEach((func) => {
                    func(node.data.elapsed - node.data.delay);
                });
            }
            node.data.elapsed += dt;
            node = node.next;  
        }
    }
    
    private clamp01(value:number)
    {
        if(value < 0)
        {
            value = 0;
        }
        if(value > 1)
        {
            value = 1;
        }
        return value;
    }
}

type TweenHandler = {
    node:cc.Node;
    elapsed:number;
    delay:number;
    duration:number;
    tweenFunc:Function;
    exectors:((elapsed:number) => void)[];
    onUpdate?:handler;
    onComplete?:handler;
}

type TweenParams = {
    node:cc.Node;
    duration:number;    //动画持续时间，单位秒
    delay?:number;      //延时多久执行
    x?:number;
    y?:number;
    rotation?:number;
    width?:number;
    height?:number;
    opacity?:number;
    tweenFunc?:Function;
    onUpdate?:handler;
    onComplete?:handler;
}
