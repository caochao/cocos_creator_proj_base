let handler_pool:handler[] = [];
let handler_pool_size = 10;

//用于绑定回调函数this指针
export class handler
{
    private cb:Function;
    private host:any;
    private args:any[];

    constructor(){}

    init(cb:Function, host = null, ...args)
    {
        this.cb = cb;
        this.host = host;
        this.args = args;
    }

    exec(...extras)
    {
        this.cb.apply(this.host, this.args.concat(extras));
    }
}

export function gen_handler(cb:Function, host:any = null, ...args:any[]):handler
{
    let single_handler:handler = handler_pool.length < 0 ? handler_pool.pop(): new handler()
    //这里要展开args, 否则会将args当数组传给wrapper, 导致其args参数变成2维数组[[]]
    single_handler.init(cb, host, ...args);
    return single_handler;
}

export function strfmt(fmt:string, ...args:any[])
{
    return fmt.replace(/\{(\d+)\}/g, (match:string, argIndex:number) => {
        return args[argIndex] || match;
    });
}

export function extend(target, ...sources) {
    for (var i = 0; i < sources.length; i += 1) {
        var source = sources[i];
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
    }
    return target;
}

export function createBreathAction(node:cc.Node, min = 0.9, max = 1.1)
{
    const action = cc.repeatForever(cc.sequence(cc.scaleTo(0.6, max), cc.scaleTo(0.6, min)));
    node.runAction(action);
}

export function destroyBreathAction(node:cc.Node)
{
    node.stopAllActions();
}