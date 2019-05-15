type NodeFinishedCb = (...params) => void;

export class NodeBase
{
    private _next:NodeBase;
    private _finishedCb:NodeFinishedCb;

    constructor()
    {
    }
    
    protected onEnter(...params)
    {
    }

    protected execute(...params)
    {
    }

    protected onExit(...params)
    {
    }

    start(...params)
    {
        this.onEnter(...params);
        this.execute(...params);
    }

    protected continue(...params)
    {
        this.onExit(...params);
        if(this._finishedCb)
        {
            this._finishedCb(...params);
        }
        if(this._next)
        {
            this._next.start(...params);
        }
    }

    protected break()
    {
        this.onExit();
        this._next = null;
    }

    setNext(next:NodeBase)
    {
        this._next = next;
    }

    setFinishedCb(cb:NodeFinishedCb)
    {
        this._finishedCb = cb;
    }

    protected getName()
    {
        return "NodeBase";
    }
}