import {TimerMgr} from "../timer/timer_mgr"
import {handler, gen_handler} from "../util"
import {LinkList} from "../linklist"
import {TweenFunc} from "./tweenfunc"

export class TweenUtil
{
    private static inst:TweenUtil;
    private iterList:LinkList<TweenHandler>;
    private pendingList:LinkList<TweenHandler>;
    private pool:TweenHandler[];
    private key:number;
    private timer:number;

    private constructor()
    {
        this.key = 0;
        this.pool = [];
        this.iterList = new LinkList<TweenHandler>();
        this.pendingList = new LinkList<TweenHandler>();
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
        const node = params.node;
        if(!node || !cc.isValid(node))
        {
            cc.warn("invalid node");
            return 0;
        }

        let th = this.pool.pop();
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
            const from = node.x;
            const delta = params.x - from;
            th.exectors.push((elapsed) => {
                const curr_x = th.tweenFunc(elapsed, from, delta, th.duration);
                th.node.x = curr_x;     //测试发现用node.position.x，不能移动位置
            });
        }
        if(params.y != null)
        {
            const from = node.y;
            const delta = params.y - from;
            th.exectors.push((elapsed) => {
                const curr_y = th.tweenFunc(elapsed, from, delta, th.duration);
                th.node.y = curr_y;
            });
        }
        if(params.rotation != null)
        {
            const from = node.rotation;
            const delta = params.rotation - from;
            th.exectors.push((elapsed) => {
                const curr_rot = th.tweenFunc(elapsed, from, delta, th.duration);
                th.node.rotation = curr_rot;
            });
        }
        if(params.width != null)
        {
            const from = node.width;
            const delta = params.width - from;
            th.exectors.push((elapsed) => {
                const curr_width = th.tweenFunc(elapsed, from, delta, th.duration);
                th.node.width = curr_width;
            });
        }
        if(params.height != null)
        {
            const from = node.height;
            const delta = params.height - from;
            th.exectors.push((elapsed) => {
                const curr_height = th.tweenFunc(elapsed, from, delta, th.duration);
                th.node.height = curr_height;
            });
        }
        if(params.opacity != null)
        {
            const from = node.opacity;
            const delta = params.opacity - from;
            th.exectors.push((elapsed) => {
                const curr_opacity = th.tweenFunc(elapsed, from, delta, th.duration);
                th.node.opacity = curr_opacity;
            });
        }

        if(!this.timer)
        {
            this.timer = TimerMgr.getInst().add_updater(gen_handler(this.update, this));
        }
        return this.pendingList.append(++this.key, th);
    }

    from(params:TweenParams):number
    {
        const node = params.node;
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
        if(!this.killIter(key))
        {
            this.killPending(key);
        }
    }

    private killIter(key:number)
    {
        const node = this.iterList.remove(key);
        if(node)
        {
            this.pool.push(node.data);
            return true;
        }
        return false;
    }

    private killPending(key:number)
    {
        const node = this.pendingList.remove(key);
        if(node)
        {
            this.pool.push(node.data);
            return true;
        }
        return false;
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
        //什么都没有，停止定时器
        if(!this.iterList.head && !this.pendingList.head)
        {
            TimerMgr.getInst().remove(this.timer);
            this.timer = 0;
            return;
        }

        //执行当前帧的th
        let node = this.iterList.head;
        while(node)
        {
            //节点已失效
            const displayNode = node.data.node;
            if(!displayNode || !cc.isValid(displayNode))
            {
                //先保存next引用，防止回调函数里回收node导致next被修改
                const next = node.next;
                this.killIter(node.key);
                node = next;
                continue;
            }
            
            const elapsed = node.data.elapsed;
            const delay = node.data.delay;
            const duration = node.data.duration;

            //执行完毕
            if(elapsed >= duration + delay)
            {
                const next = node.next;
                const key = node.key;
                node.data.exectors.forEach(func => {
                    func(duration);
                });
                if(node.data.onComplete)
                {
                    node.data.onComplete.exec(displayNode, 1);
                }
                this.killIter(key);
                node = next;
                continue;
            }

            //延时时间到了
            if(elapsed >= delay)
            {
                //onUpdate回调可能会调用kill回收tweenHandler.避免操作已回收的对象。
                const next = node.next;
                node.data.elapsed += dt;
                node.data.exectors.forEach(func => {
                    func(elapsed - delay);
                });
                if(node.data.onUpdate)
                {
                    node.data.onUpdate.exec(displayNode, this.clamp01((elapsed - delay) / duration));
                }
                node = next;
            }
            else
            {
                node.data.elapsed += dt;
                node = node.next;  
            }
        }

        //添加下一帧的th
        node = this.pendingList.head;
        while(node)
        {
            const key = node.key;
            const th = node.data;
            node = node.next;
            this.pendingList.remove(key);
            this.iterList.append(key, th);
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
