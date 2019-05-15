export type MyEvnetHandler = (...params) => void;

class MyEventListeners
{
    public handlers:MyEvnetHandler[];
    public targets:any[];
    public isInvoking:boolean;
    private containCanceled:boolean;
    
    constructor()
    {
        this.handlers = [];
        this.targets = [];
        this.isInvoking = false;
        this.containCanceled = false;
    }
    
    add(handler:MyEvnetHandler, target)
    {
        this.handlers.push(handler);
        this.targets.push(target);
    }

    remove(index:number)
    {
        this.handlers.splice(index, 1);
        this.targets.splice(index, 1);
    }

    removeByTarget(target)
    {
        const targets = this.targets;
        const handlers = this.handlers;
        for(let i = targets.length - 1; i >= 0; i--) {
            if(targets[i] == target) {
                targets.splice(i, 1);
                handlers.splice(i, 1);
            }
        }
    }

    removeByHandler(handler:MyEvnetHandler)
    {
        const handlers = this.handlers;
        const targets = this.targets;
        for(let i = handlers.length - 1; i >= 0; i--) {
            if(handlers[i] == handler) {
                handlers.splice(i, 1);
                targets.splice(i, 1);
            }
        }
    }

    removeByHandlerTarget(handler:MyEvnetHandler, target)
    {
        const handlers = this.handlers;
        const targets = this.targets;
        for(let i = handlers.length - 1; i >= 0; i--) {
            if(handlers[i] == handler && targets[i] == target) {
                handlers.splice(i, 1);
                targets.splice(i, 1);
            }
        }
    }

    removeAll()
    {
        this.handlers.length = 0;
        this.targets.length = 0;
    }

    cancel(index:number)
    {
        this.handlers[index] = null;
        this.targets[index] = null;
        this.containCanceled = true;
    }

    cancelByTarget(target)
    {
        const targets = this.targets;
        const handlers = this.handlers;
        for(let i = targets.length - 1; i >= 0; i--) {
            if(targets[i] == target) {
                targets[i] = null;
                handlers[i] = null;
            }
        }
        this.containCanceled = true;
    }

    cancelByHandler(handler:MyEvnetHandler)
    {
        const handlers = this.handlers;
        const targets = this.targets;
        for(let i = handlers.length - 1; i >= 0; i--) {
            if(handlers[i] == handler) {
                handlers[i] = null;
                targets[i] = null;
            }
        }
        this.containCanceled = true;
    }

    cancelByHandlerTarget(handler:MyEvnetHandler, target)
    {
        const handlers = this.handlers;
        const targets = this.targets;
        for(let i = handlers.length - 1; i >= 0; i--) {
            if(handlers[i] == handler && targets[i] == target) {
                handlers[i] = null;
                targets[i] = null;
            }
        }
        this.containCanceled = true;
    }

    cancelAll()
    {
        const handlers = this.handlers;
        const targets = this.targets;
        for(let i = handlers.length - 1; i >= 0; i--) {
            handlers[i] = null;
            targets[i] = null;
        }
        this.containCanceled = true;
    }

    has(handler:MyEvnetHandler, target)
    {
        const handlers = this.handlers;
        const targets = this.targets;
        for(let i = handlers.length - 1; i >= 0; i--) {
            if(handlers[i] == handler && targets[i] == target) {
                return true;
            }
        }
        return false;
    }

    purgeCanceled()
    {
        if(this.containCanceled) {
            this.removeByHandler(null);
            this.containCanceled = false;
        }
    }

    isEmpty()
    {
        return this.handlers.length == 0;
    }
}

export class event_mgr
{
    private static inst:event_mgr;
    private eventMap:Map<Event_Name, MyEventListeners>;

    private constructor()
    {
        this.eventMap = new Map();
    }

    static get_inst():event_mgr
    {
        if(!this.inst) {
            this.inst = new event_mgr();
        }
        return this.inst;
    }

    fire(event:Event_Name, ...params)
    {
        // EventHelper.log(`EventMgr`, `fire event ${event}`);
        const listeners = this.eventMap.get(event);
        if(!listeners || listeners.isEmpty()) {
            return;
        }

        //事件处理函数中可能会删除事件，导致循环出错
        listeners.isInvoking = true;
        const handlers = listeners.handlers;
        const targets = listeners.targets;

        for(let i = 0, len = handlers.length; i < len; i++) {
            const handler = handlers[i];
            const target = targets[i];
            if(!handler) {
                continue;
            }
            //如果target是cc.Component，则在其节点有效时才调用事件函数
            if(target && (<cc.Component>target).node) {
                const node = (target as cc.Component).node;
                if(cc.isValid(node)) {
                    handler.call(target, ...params);
                }
                else {
                    listeners.cancelByTarget(target);
                }
            }
            else {
                handler.call(target, ...params);
            }
        }
        //循环结束后再删除
        listeners.isInvoking = false;
        listeners.purgeCanceled();
    }

    has(event:Event_Name, handler:MyEvnetHandler, target = null)
    {
        let listeners = this.eventMap.get(event);
        if(!listeners) {
            return false;
        }
        if(handler) {
            return listeners.has(handler, target);
        }
        //检查event是否有监听者
        if(listeners.isInvoking) {
            const handlers = listeners.handlers;
            for(let i = 0, len = handlers.length; i < len; i++) {
                if(handlers[i]) {
                    return true;
                }
            }
            return false;
        }
        else {
            return !listeners.isEmpty();
        }
    }

    add(event:Event_Name, handler:MyEvnetHandler, target = null)
    {
        // EventHelper.log(`EventMgr`, `add, event = ${event}`);
        let listeners = this.eventMap.get(event);
        if(!listeners) {
            listeners = new MyEventListeners();
            this.eventMap.set(event, listeners);
        }
        listeners.add(handler, target);
    }

    once(event:Event_Name, handler:MyEvnetHandler, target = null)
    {
        // EventHelper.log(`EventMgr`, `once, event = ${event}`);
        let wrapperCb:MyEvnetHandler;
        wrapperCb = (...params) => {
            this.remove(event, wrapperCb, target);
            handler.call(target, ...params);
        };
        this.add(event, wrapperCb, target);
    }

    remove(event:Event_Name, handler:MyEvnetHandler, target = null)
    {
        const listeners = this.eventMap.get(event);
        if(!listeners || listeners.isEmpty()) {
            return;
        }
        if(target) {
            if(listeners.isInvoking) {
                listeners.cancelByHandlerTarget(handler, target);
            }
            else {
                listeners.removeByHandlerTarget(handler, target);
            }
        }
        else {
            if(listeners.isInvoking) {
                listeners.cancelByHandler(handler);
            }
            else {
                listeners.removeByHandler(handler);
            }
        }
    }

    removeByTarget(target) {
        this.eventMap.forEach((listeners, event) => {
            if(listeners.isEmpty()) {
                return;
            }
            if(listeners.isInvoking) {
                listeners.cancelByTarget(target);
            }
            else {
                listeners.removeByTarget(target);
            }
        });
    }

    removeByEvent(event:Event_Name)
    {
        const listeners = this.eventMap.get(event);
        if(!listeners || listeners.isEmpty()) {
            return;
        }
        if(listeners.isInvoking) {
            listeners.cancelAll();
        }
        else {
            listeners.removeAll();
        }
    }
}

/**事件名称定义*/
export enum Event_Name {
    SCENE_CHANGED = "SCENE_CHANGED",
    UI_SHOW = "UI_SHOW",
    UI_HIDE = "UI_HIDE",
    LANGUAGE_CHANGED = "LANGUAGE_CHANGED",
    LANGUAGE_USED = "LANGUAGE_USED",
    REMOTE_ASSETS_UPDATED = "REMOTE_ASSETS_UPDATED",
    CONFIG_UPDATED = "CONFIG_UPDATED",
}