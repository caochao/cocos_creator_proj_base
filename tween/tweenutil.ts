import {TimerMgr} from "../timer/timer_mgr"
import {gen_handler} from "../util"
import {LinkList} from "../linklist"
import {TweenFunc} from "./tweenfunc"

const clamp01 = (value:number) => {
    if(value < 0) {
        value = 0;
    }
    if(value > 1) {
        value = 1;
    }
    return value;
};

export class TweenUtil
{
    private static inst:TweenUtil;
    private iterList:LinkList<TweenTarget>;
    private pendingList:LinkList<TweenTarget>;
    private pool:TweenTarget[];
    private key:number;
    private timer:number;

    private constructor()
    {
        this.key = 0;
        this.pool = [];
        this.iterList = new LinkList<TweenTarget>();
        this.pendingList = new LinkList<TweenTarget>();
    }

    public static getInst()
    {
        if(!this.inst) {
            this.inst = new TweenUtil();
        }
        return this.inst;
    }

    from(params:TweenParams):number
    {
        const target = params.target;
        if(!target || !cc.isValid(target)) {
            cc.warn("TweenUtil, invalid tween target");
            return 0;
        }

        let tweenTarget = this.pool.pop();
        if(!tweenTarget) {
            tweenTarget = new TweenTarget();
        }
        tweenTarget.init(target, 0, params.delay || 0,  params.duration || 1, params.tweenFunc || TweenFunc.Linear, params.onUpdate, params.onComplete);

        if(params.x != null) {
            const prop = TweenProperty.x;
            const value = tweenTarget.getValue(prop);
            tweenTarget.setValue(prop, params.x);
            params.x = value;
        }
        if(params.y != null) {
            const prop = TweenProperty.y;
            const value = tweenTarget.getValue(prop);
            tweenTarget.setValue(prop, params.y);
            params.y = value;
        }
        if(params.scaleX != null) {
            const prop = TweenProperty.scaleX;
            const value = tweenTarget.getValue(prop);
            tweenTarget.setValue(prop, params.scaleX);
            params.scaleX = value;
        }
        if(params.scaleY != null) {
            const prop = TweenProperty.scaleY;
            const value = tweenTarget.getValue(prop);
            tweenTarget.setValue(prop, params.scaleY);
            params.scaleY = value;
        }
        if(params.scale != null) {
            const prop = TweenProperty.scale;
            const value = tweenTarget.getValue(prop);
            tweenTarget.setValue(prop, params.scale);
            params.scale = value;
        }
        if(params.rotation != null) {
            const prop = TweenProperty.rotation;
            const value = tweenTarget.getValue(prop);
            tweenTarget.setValue(prop, params.rotation);
            params.rotation = value;
        }
        if(params.width != null) {
            const prop = TweenProperty.width;
            const value = tweenTarget.getValue(prop);
            tweenTarget.setValue(prop, params.width);
            params.width = value;
        }
        if(params.height != null) {
            const prop = TweenProperty.height;
            const value = tweenTarget.getValue(prop);
            tweenTarget.setValue(prop, params.height);
            params.height = value;
        }
        if(params.opacity != null) {
            const prop = TweenProperty.opacity;
            const value = tweenTarget.getValue(prop);
            tweenTarget.setValue(prop, params.opacity);
            params.opacity = value;
        }
        if(params.startValue != null) {
            const prop = TweenProperty.string;
            params.stopValue = params.stopValue || tweenTarget.getValue(prop);
            tweenTarget.setValue(prop, params.startValue);
        }
        return this.to(params, tweenTarget);
    }

    to(params:TweenParams, tweenTarget:TweenTarget = null):number
    {
        const target = params.target;
        if(!target || !cc.isValid(target)) {
            cc.warn("TweenUtil, invalid tween target");
            return 0;
        }

        if(!tweenTarget) {
            tweenTarget = this.pool.pop();
            if(!tweenTarget) {
                tweenTarget = new TweenTarget();
            }
            tweenTarget.init(target, 0, params.delay || 0,  params.duration || 1, params.tweenFunc || TweenFunc.Linear, params.onUpdate, params.onComplete);
        }

        const funcs:((elapsed:number) => void)[] = [];
        if(params.x != null) {
            const prop = TweenProperty.x;
            const from = tweenTarget.getValue(prop);
            const delta = params.x - from;
            funcs.push(elapsed => {
                const value = tweenTarget.tweenFunc(elapsed, from, delta, tweenTarget.duration);
                tweenTarget.setValue(prop, value);
            });
        }
        if(params.y != null) {
            const prop = TweenProperty.y;
            const from = tweenTarget.getValue(prop);
            const delta = params.y - from;
            funcs.push(elapsed => {
                const value = tweenTarget.tweenFunc(elapsed, from, delta, tweenTarget.duration);
                tweenTarget.setValue(prop, value);
            });
        }
        if(params.scaleX != null) {
            const prop = TweenProperty.scaleX;
            const from = tweenTarget.getValue(prop);
            const delta = params.scaleX - from;
            funcs.push(elapsed => {
                const value = tweenTarget.tweenFunc(elapsed, from, delta, tweenTarget.duration);
                tweenTarget.setValue(prop, value);
            });
        }
        if(params.scaleY != null) {
            const prop = TweenProperty.scaleY;
            const from = tweenTarget.getValue(prop);
            const delta = params.scaleY - from;
            funcs.push(elapsed => {
                const value = tweenTarget.tweenFunc(elapsed, from, delta, tweenTarget.duration);
                tweenTarget.setValue(prop, value);
            });
        }
        if(params.scale != null) {
            const prop = TweenProperty.scale;
            const from = tweenTarget.getValue(prop);
            const delta = params.scale - from;
            funcs.push(elapsed => {
                const value = tweenTarget.tweenFunc(elapsed, from, delta, tweenTarget.duration);
                tweenTarget.setValue(prop, value);
            });
        }
        if(params.rotation != null) {
            const prop = TweenProperty.rotation;
            const from = tweenTarget.getValue(prop);
            const delta = params.rotation - from;
            funcs.push(elapsed => {
                const value = tweenTarget.tweenFunc(elapsed, from, delta, tweenTarget.duration);
                tweenTarget.setValue(prop, value);
            });
        }
        if(params.width != null) {
            const prop = TweenProperty.width;
            const from = tweenTarget.getValue(prop);
            const delta = params.width - from;
            funcs.push(elapsed => {
                const value = tweenTarget.tweenFunc(elapsed, from, delta, tweenTarget.duration);
                tweenTarget.setValue(prop, value);
            });
        }
        if(params.height != null) {
            const prop = TweenProperty.height;
            const from = tweenTarget.getValue(prop);
            const delta = params.height - from;
            funcs.push(elapsed => {
                const value = tweenTarget.tweenFunc(elapsed, from, delta, tweenTarget.duration);
                tweenTarget.setValue(prop, value);
            });
        }
        if(params.opacity != null) {
            const prop = TweenProperty.opacity;
            const from = tweenTarget.getValue(prop);
            const delta = params.opacity - from;
            funcs.push(elapsed => {
                const value = tweenTarget.tweenFunc(elapsed, from, delta, tweenTarget.duration);
                tweenTarget.setValue(prop, value);
            });
        }
        if(params.stopValue != null) {
            const prop = TweenProperty.string;
            const from = params.startValue || tweenTarget.getValue(prop);
            const delta = params.stopValue - from;
            funcs.push(elapsed => {
                const value = parseInt(tweenTarget.tweenFunc(elapsed, from, delta, tweenTarget.duration));
                if(params.onSetValue && tweenTarget.isValid()) {
                    params.onSetValue(value);
                }
                else {
                    tweenTarget.setValue(prop, value);
                }
            });
        }
        
        const onUpdate = tweenTarget.onUpdate;
        const onComplete = tweenTarget.onComplete;
        tweenTarget.onUpdate = (ratio:number, elapsed:number) => {
            if(!tweenTarget.isValid()) {
                return;
            }
            funcs.forEach(func => func(elapsed));
            if(onUpdate) {
                onUpdate(ratio, elapsed);
            }
        };
        tweenTarget.onComplete = (ratio:number, elapsed:number) => {
            if(!tweenTarget.isValid()) {
                return;
            }
            funcs.forEach(func => func(elapsed));
            if(onComplete) {
                onComplete(ratio, elapsed);
            }
        };
        this.addTween(tweenTarget);
    }

    private ratio(duration:number, delay?:number, onUpdate?:TweenOnUpdate, onComplete?:TweenOnComplete, tweenFunc?:Function)
    {
        let tweenTarget = this.pool.pop();
        if(!tweenTarget) {
            tweenTarget = new TweenTarget();
        }
        tweenTarget.init(null, 0, delay || 0,  duration || 1, tweenFunc || TweenFunc.Linear, onUpdate, onComplete);
        this.addTween(tweenTarget);
    }

    private addTween(tweenTarget:TweenTarget)
    {
        if(!this.timer) {
            this.timer = TimerMgr.getInst().add_updater(gen_handler(this.update, this), "TweenUtil addTween");
        }
        return this.pendingList.append(++this.key, tweenTarget);
    }

    private kill(key:number)
    {
        if(!this.killIter(key)) {
            this.killPending(key);
        }
    }

    private killIter(key:number)
    {
        const node = this.iterList.remove(key);
        if(node) {
            this.pool.push(node.data);
            node.data = null;
            return true;
        }
        return false;
    }

    private killPending(key:number)
    {
        const node = this.pendingList.remove(key);
        if(node) {
            this.pool.push(node.data);
            node.data = null;
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

    static ratio(duration:number, delay?:number, onUpdate?:TweenOnUpdate, onComplete?:TweenOnComplete, tweenFunc?:Function)
    {
        return this.getInst().ratio(duration, delay, onUpdate, onComplete, tweenFunc);
    }

    static kill(key:number)
    {
        this.getInst().kill(key);
    }

    private update(dt:number)
    {
        //什么都没有，停止定时器
        if(!this.iterList.head && !this.pendingList.head) {
            TimerMgr.getInst().remove(this.timer);
            this.timer = 0;
            return;
        }

        //执行当前帧的th
        let node = this.iterList.head;
        while(node) {
            const tweenTarget = node.data;

            //目标已失效
            if(!tweenTarget || !tweenTarget.isValid()) {
                //先保存next引用，防止回调函数里回收node导致next被修改
                const next = node.next;
                this.killIter(node.key);
                node = next;
                continue;
            }
            
            const elapsed = tweenTarget.elapsed;
            const delay = tweenTarget.delay;
            const duration = tweenTarget.duration;

            //执行完毕
            if(elapsed >= duration + delay) {
                const next = node.next;
                const key = node.key;
                if(tweenTarget.onUpdate) {
                    tweenTarget.onUpdate(1, duration);
                }
                if(tweenTarget.onComplete) {
                    tweenTarget.onComplete(1, duration);
                }
                this.killIter(key);
                node = next;
                continue;
            }

            //延时时间到了
            if(elapsed >= delay) {
                //onUpdate回调可能会调用kill回收tweenHandler.避免操作已回收的对象。
                const next = node.next;
                tweenTarget.elapsed += dt;
                if(tweenTarget.onUpdate) {
                    tweenTarget.onUpdate(clamp01((elapsed - delay) / duration), elapsed - delay);
                }
                node = next;
            }
            else {
                tweenTarget.elapsed += dt;
                node = node.next;  
            }
        }

        //添加下一帧的th
        node = this.pendingList.head;
        while(node) {
            const key = node.key;
            const tt = node.data;
            node = node.next;
            this.pendingList.remove(key);
            this.iterList.append(key, tt);
        }
    }
}

interface TweenParams
{
    target:cc.Node|cc.Label;
    duration:number;    //动画持续时间，单位秒
    delay?:number;      //延时多久执行
    x?:number;
    y?:number;
    scaleX?:number;
    scaleY?:number;
    scale?:number;
    rotation?:number;
    width?:number;
    height?:number;
    opacity?:number;
    startValue?:number;
    stopValue?:number;
    tweenFunc?:Function;
    onUpdate?:TweenOnUpdate;
    onComplete?:TweenOnComplete;
    onSetValue?:TweenOnSetValue;
}

enum TweenProperty
{
    x = "x",    
    y = "y",
    scaleX = "scaleX",
    scaleY = "scaleY",
    scale = "scale",
    rotation = "rotation",
    width = "width",
    height = "height",
    opacity = "opacity",
    string = "string",
}

type TweenOnUpdate = (ratio:number, elapsed:number) => void;
type TweenOnComplete = (ratio:number, elapsed:number) => void;
type TweenOnSetValue = (value:number) => void;

class TweenTarget
{
    public elapsed:number;
    public delay:number;
    public duration:number;
    public tweenFunc:Function;
    public onUpdate:TweenOnUpdate;
    public onComplete:TweenOnComplete;
    private _hasTarget:boolean;
    private _node:cc.Node;
    private _label:cc.Label;

    init(target:cc.Node|cc.Label, elapsed:number, delay:number, duration:number, tweenFunc:Function, onUpdate:TweenOnUpdate, onComplete:TweenOnComplete)
    {
        this.elapsed = elapsed;
        this.delay = delay;
        this.duration = duration;
        this.tweenFunc = tweenFunc;
        this.onUpdate = onUpdate;
        this.onComplete = onComplete;
        this._hasTarget = target != null;
        if(target) {
            if((<cc.Node>target).getPosition) {
                this._node = target as cc.Node;
                this._label = null;
            }
            else if((<cc.Label>target).string) {
                this._label = target as cc.Label;
                this._node = null;
            }
        }
    }

    isValid()
    {
        if(!this._hasTarget) {
            return true;
        }
        if(this._node) {
            return cc.isValid(this._node);
        }
        else if(this._label && this._label.node) {
            return cc.isValid(this._label.node);
        }
        return false;
    }

    setValue(key:TweenProperty, value:number)
    {
        if(!this._hasTarget) {
            return;
        }
        if(!this.isValid()) {
            return;
        }
        if(this._node) {
            this._node[key] = value;
        }
        else if(this._label && this._label.node) {
            this._label[key] = value;
        }
    }

    getValue(key:TweenProperty):number
    {
        if(!this._hasTarget) {
            return 0;
        }
        if(!this.isValid()) {
            return 0;
        }
        if(this._node) {
            return parseFloat(this._node[key]);
        }
        else if(this._label && this._label.node) {
            return parseFloat(this._label[key]);
        }
        return 0;
    }
}
