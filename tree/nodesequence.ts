import { NodeBase } from "./nodebase";

//子node依次执行，最后执行自身continue
export class NodeSequence extends NodeBase
{
    private _nodes:NodeBase[];

    constructor(...nodes:NodeBase[])
    {
        super();
        this._nodes = nodes;
        this.linkNodes();
    }

    protected execute()
    {
        if(this._nodes.length > 0)
        {
            this._nodes[0].start();
        }
    }

    appendNode(node:NodeBase)
    {
        this._nodes.push(node);
    }

    linkNodes()
    {
        const nodes = this._nodes;
        for(let i = 0, len = nodes.length; i < len - 1; i++)
        {
            nodes[i].setNext(nodes[i + 1]);
            nodes[i].setFinishedCb(null);
        }
        if(nodes.length > 0)
        {
            nodes[nodes.length - 1].setFinishedCb(this.continue.bind(this));
        }
    }

    protected getName()
    {
        return "NodeSequence";
    }
}