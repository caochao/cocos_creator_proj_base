import { NodeBase } from "./nodebase";

//子node并行执行，等待它们全部执行完毕才执行自身continue
export class NodeSpawn extends NodeBase
{
    private _nodes:NodeBase[];
    private _waitCount:number;

    constructor(...nodes:NodeBase[])
    {
        super()
        this._nodes = nodes;
        this.arrageNodes();
    }

    protected execute()
    {
        this._nodes.forEach(node => {
            node.start();
        });
    }

    appendNode(node:NodeBase)
    {
        this._nodes.push(node);
        this.arrageNodes();
    }

    insertNodes(index:number, ...node:NodeBase[])
    {
        this._nodes.splice(index, 0, ...node);
        this.arrageNodes();
    }

    private arrageNodes()
    {
        const nodes = this._nodes;
        this._waitCount = nodes.length;
        nodes.forEach(node => {
            node.setFinishedCb(this.onChildNodeFinished.bind(this));
        });
    }

    private onChildNodeFinished()
    {
        this._waitCount--;
        if(this._waitCount == 0)
        {
            this.continue();
        }
    }

    protected getName()
    {
        return "NodeSpawn";
    }
}