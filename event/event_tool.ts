import { Event_Name, MyEvnetHandler, event_mgr } from "../event/event_mgr";

export class EventTool
{
    private _eventListeners:{event:Event_Name, handler:MyEvnetHandler}[];

    constructor()
    {
    }

    protected addEventListener(event:Event_Name, handler:MyEvnetHandler)
    {
        event_mgr.get_inst().add(event, handler, this);
        if(!this._eventListeners) {
            this._eventListeners = [];
        }
        this._eventListeners.push({event, handler});
    }

    protected removeEventListener(event:Event_Name, handler:MyEvnetHandler)
    {
        event_mgr.get_inst().remove(event, handler, this);
    }

    protected fireEvent(event:Event_Name, ...params)
    {
        event_mgr.get_inst().fire(event, ...params);
    }

    protected clearEventListeners()
    {
        const eventListeners = this._eventListeners;
        if(eventListeners && eventListeners.length) {
            const eventMgr = event_mgr.get_inst();
            eventListeners.forEach(listener => {
                eventMgr.remove(listener.event, listener.handler, this);
            });
        }
        this._eventListeners = null;
        cc.game.targetOff(this);
    }
}