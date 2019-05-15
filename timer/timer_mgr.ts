import {handler} from "../util"
import {LinkList} from "../linklist"

export class TimerMgr
{
    private static inst:TimerMgr;
    private iterList:LinkList<TimerHandler>;
    private pendingList:LinkList<TimerHandler>;
    private pool:TimerHandler[];
    private key:number;

    private constructor()
    {
        this.key = 0;
        this.pool = [];
        this.iterList = new LinkList<TimerHandler>();
        this.pendingList = new LinkList<TimerHandler>();
    }

    static getInst():TimerMgr
    {
        if(!this.inst) {
            this.inst = new TimerMgr();
        }
        return this.inst;
    }

    add(interval:number, delay:number, repeat:number, cb:handler, is_updater = false, tag:string = null, target:cc.Node = null):number
    {
        let th = this.pool.pop();
        if(!th) {
            th = new TimerHandler();
        }
        th.init(interval, delay, repeat, 0, 0, is_updater, cb, tag, target);
        return this.pendingList.append(++this.key, th);
    }

    remove(key:number)
    {
        if(!this.removeIter(key)) {
            this.removePending(key);
        }
    }

    private removeIter(key:number)
    {
        const node = this.iterList.remove(key);
        if(node) {
            this.pool.push(node.data);
            node.data = null;
            return true;
        }
        return false;
    }

    private removePending(key:number)
    {
        const node = this.pendingList.remove(key);
        if(node) {
            this.pool.push(node.data);
            node.data = null;
            return true;
        }
        return false;
    }

    loop(interval:number, cb:handler, tag:string = null, target:cc.Node = null):number
    {
        return this.add(interval, 0, 0, cb, false, tag, target);
    }

    loopTimes(interval:number, repeat:number, cb:handler, tag:string = null, target:cc.Node = null):number
    {
        return this.add(interval, 0, repeat, cb, false, tag, target);
    }

    frameLoop(cb:handler, tag:string = null, target:cc.Node = null):number
    {
        return this.add(1/60, 0, 0, cb, false, tag, target);
    }

    delayLoop(interval:number, delay:number, cb:handler, tag:string = null, target:cc.Node = null):number
    {   
        return this.add(interval, delay, 0, cb, false, tag, target);
    }

    once(delay:number, cb:handler, tag:string = null, target:cc.Node = null):number
    {
        return this.add(0, delay, 1, cb, false, tag, target);
    }

    add_updater(cb:handler, tag:string = null, target:cc.Node = null):number
    {
        return this.add(0, 0, 0, cb, true, tag, target);
    }

    update(dt:number)
    {
        let node = this.iterList.head;

        //执行当前帧的定时器
        while(node) {
            const timerHandler = node.data;
            // cc.log(`timer update, key=${timerHandler.tag}`);

            //目标已失效
            if(!timerHandler || !timerHandler.isValid()) {
                const next = node.next;
                this.removeIter(node.key);
                node = next;
                continue;
            }

            const repeat = timerHandler.repeat;
            const delay = timerHandler.delay;
            const interval = timerHandler.interval;
            const times = timerHandler.times;
            const elapsed = timerHandler.elapsed;
            const cb = timerHandler.cb;

            if(timerHandler.is_updater) {
                //先保存next引用，防止回调函数里回收node导致next被修改
                const next = node.next;
                cb.exec(dt);
                node = next;
                continue;
            }

            if(repeat != 0 && times >= repeat) {
                const next = node.next;
                this.removeIter(node.key);
                node = next;
                continue;
            }

            if(elapsed >= delay + interval) {
                //exec回调可能会调用remove函数回收timerHandler.避免操作已回收的对象。
                const next = node.next;
                timerHandler.times++;
                timerHandler.elapsed = delay;
                cb.exec();
                node = next;
            }
            else {
                timerHandler.elapsed += dt;
                node = node.next;
            }
        }
        
        //添加下一帧的定时器
        node = this.pendingList.head;
        while(node) {
            const key = node.key;
            const th = node.data;
            node = node.next;
            this.pendingList.remove(key);
            this.iterList.append(key, th);
        }
    }
}

class TimerHandler
{
    public interval:number;
    public delay:number;
    public repeat:number;
    public elapsed:number;
    public times:number;
    public is_updater:boolean;
    public cb:handler;
    public tag:string;
    public target:cc.Node;
    private _hasTarget:boolean;

    init(interval:number, delay:number, repeat:number, elapsed:number, times:number, is_updater:boolean, cb:handler, tag:string, target:cc.Node)
    {
        this.interval = interval;
        this.delay = delay;
        this.repeat = repeat;
        this.elapsed = elapsed;
        this.times = times;
        this.is_updater = is_updater;
        this.cb = cb;
        this.tag = tag;
        this.target = target;
        this._hasTarget = target != null;
    }

    isValid()
    {
        if(!this._hasTarget) {
            return true;
        }
        return cc.isValid(this.target) && this.target.activeInHierarchy;
    }
}