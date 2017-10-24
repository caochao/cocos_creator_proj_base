import {handler, gen_handler} from "../utils"
import {LinkList, LinkListNode} from "../linklist"

export class TimerMgr
{
    private static inst:TimerMgr;
    private list:LinkList<TimerHandler>;
    private pool:TimerHandler[];
    private key:number;

    private constructor()
    {
        this.key = 0;
        this.pool = [];
        this.list = new LinkList<TimerHandler>();
    }

    static getInst():TimerMgr
    {
        if(!this.inst)
        {
            this.inst = new TimerMgr();
        }
        return this.inst;
    }

    add(interval:number, delay:number, repeat:number, cb:handler, is_updater:boolean = false):number
    {
        let timerHandler:TimerHandler = this.pool.pop();
        if(timerHandler)
        {
            timerHandler.interval = interval;
            timerHandler.delay = delay;
            timerHandler.repeat = repeat;
            timerHandler.elapsed = 0;
            timerHandler.times = 0;
            timerHandler.is_updater = is_updater;
            timerHandler.cb = cb;
        }
        else
        {
            timerHandler = {interval:interval, delay:delay, repeat:repeat, elapsed:0, times:0, is_updater:is_updater, cb:cb};
        }
        return this.list.append(++this.key, timerHandler);
    }

    remove(key:number)
    {
        let timerHandler:TimerHandler = this.list.remove(key);
        if(timerHandler)
        {
            this.pool.push(timerHandler);
        }
    }

    loop(interval:number, cb:handler):number
    {
        return this.add(interval, 0, 0, cb);
    }

    loopTimes(interval:number, repeat:number, cb:handler):number
    {
        return this.add(interval, 0, repeat, cb);
    }

    frameLoop(cb:handler):number
    {
        return this.add(1/24, 0, 0, cb);
    }

    delayLoop(interval:number, delay:number, cb:handler):number
    {   
        return this.add(interval, delay, 0, cb);
    }

    once(delay:number, cb:handler):number
    {
        return this.add(0, delay, 1, cb);
    }

    add_updater(cb:handler):number
    {
        return this.add(0, 0, 0, cb, true);
    }

    update(dt:number)
    {
        if(!this.list.head)
        {
            return;
        }
        let node:LinkListNode<TimerHandler> = this.list.head;
        while(node)
        {
            if(node.data.is_updater)
            {
                node.data.cb.exec(dt);
                node = node.next;
                continue;
            }

            if(node.data.repeat != 0 && node.data.times >= node.data.repeat)
            {
                this.remove(node.key);
                node = node.next;
                continue;
            }

            if(node.data.elapsed >= node.data.delay + node.data.interval)
            {
                node.data.cb.exec();
                node.data.times++;
                node.data.elapsed = node.data.delay - dt;
            }

            node.data.elapsed += dt;
            node = node.next;
        }
    }
}

type TimerHandler = {
    interval:number;    //执行间隔, 只执行一次的定时器值为0，单位秒
    delay:number;       //延时多久执行，单位秒
    repeat:number;      //要执行多少次，0表示无限次
    elapsed:number;     //已过去的时间
    times:number;       //已执行次数
    is_updater:boolean; //是否每帧调用
    cb:handler;         //回调函数
}