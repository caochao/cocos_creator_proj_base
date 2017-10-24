import * as consts from "../consts"
import {handler, gen_handler} from "./utils"
import {sprintf} from "../3rd/sprintfjs/format"
import {toast} from "./components/toast"
import {appdata} from "../appdata"
import {pb} from "../proto/pb"

type cmd_listener = {
    cb:handler;
    cx:cc.Component;
};

export class Net
{
    private static inst:Net;
    private error_handler:handler;
    private cmd_listeners:Map<pb.Command, cmd_listener[]>;
    private context_cmds:Map<cc.Component, pb.Command[]>;
    private session_data:Map<number, any[]>;
    private ws:WebSocket;
    private session:number;
    public is_connected:boolean;
    private is_connecting:boolean;
    private connected_cb:handler;

    private constructor()
    {
        this.error_handler = gen_handler(this.handle_response_error, this);
        this.error_handler.retain();
        this.cmd_listeners = new Map();     //测试发现Map索引[]和get, delete不能混用，否则会出现取不到值。
        this.context_cmds = new Map();      //例如session_data[key] = value, session_data.get(key)会为null;
        this.session_data = new Map();
        this.session = 0;                   //send函数使session从1开始，服务器推送的数据包session默认为0
    }

    static get_inst():Net
    {
        if(!this.inst)
        {
            this.inst = new Net();
        }
        return this.inst;
    }

    send(msg:pb.IC2S, ...req_data:any[])
    {
        if(!this.is_connected)
        {
            cc.warn("socket is not connected, readyState=", this.ws.readyState);
            return;
        }
        if(req_data.length > 0)
        {
            this.session++;
            msg.session = this.session;
            this.session_data.set(this.session, req_data);
        }
        let bytes:Uint8Array = pb.C2S.encode(msg).finish();
        this.ws.send(bytes);
        cc.info("socket send", msg, ...req_data);
    }

    connect(cb?:handler)
    {
        if(this.is_connected)
        {
            cc.info("socket is alreay connected");
            cb && cb.exec();
            return;
        }

        if(this.is_connecting)
        {
            cc.info("socket is connecting");
            return;
        }
        this.is_connecting = true;
        this.connected_cb = cb;

        this.ws = new WebSocket(consts.SERVER_URL.ip);
        this.ws.binaryType = "arraybuffer";
        this.ws.onopen = this.on_ws_open.bind(this);
        this.ws.onerror = this.on_ws_error.bind(this);
        this.ws.onmessage = this.on_ws_message.bind(this);
        this.ws.onclose = this.on_ws_close.bind(this);
    }

    dis_connect()
    {
        if(!this.is_connected)
        {
            return;
        }
        this.ws.close();
    }

    private on_ws_open(event:Event):any
    {
        cc.info("socket connected, addr=", consts.SERVER_URL.ip);
        this.is_connected = true;
        if(this.connected_cb)
        {
            this.connected_cb.exec();
        }
    }

    private on_ws_error(event:Event):any
    {
        cc.info("socket error", event);
    }

    private on_ws_message(event:MessageEvent):any
    {
        let msg:pb.IS2C = pb.S2C.decode(new Uint8Array(event.data));
        if(msg.cmd == pb.Command.KPing)
        {
            this.send({cmd:pb.Command.KPong});
            return;
        }
        this.handle_response(msg);
    }

    private on_ws_close(event:CloseEvent):any
    {
        //code定义见https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
        cc.info("socket closed, code=", event.code);
        this.is_connected = false;
        this.is_connecting = false;

        //退出登录
        if(cc.director.getScene().name != consts.SCENE_NAME.START)
        {
            appdata.logout();
            appdata.loadScene(consts.SCENE_NAME.START);
        }
    }

    private handle_response(msg:pb.IS2C)
    {
        cc.info("handle_response", msg);
        let is_ok:boolean = msg.code == 0;
        if(!is_ok)
        {
            this.error_handler.exec(msg.code, msg.errmsg);
        }

        //执行协议回调
        let cmd:pb.Command = msg.cmd;
        let listeners:cmd_listener[] = this.cmd_listeners.get(cmd);
        if(!listeners)
        {
            return;
        }
        let req_data:any[];
        if(msg.session > 0)
        {
            req_data = this.session_data.get(msg.session);
            this.session_data.delete(msg.session);
        }
        listeners.forEach((listener:cmd_listener, index:number):void=>{
            if(!cc.isValid(listener.cx))
            {
                return;
            }
            if(req_data)
            {
                listener.cb.exec(is_ok, msg, ...req_data);
            }
            else
            {
                listener.cb.exec(is_ok, msg);
            }
        });
    }

    private handle_response_error(code:number, errmsg:string)
    {
        toast.show(consts.MSG_ERROR[code] || errmsg);
    }

    private register_listener(cmd:pb.Command, cb:handler, context:cc.Component)
    {
        //cmd->listeners
        let listeners:cmd_listener[] = this.cmd_listeners.get(cmd);
        if(!listeners)
        {
            listeners = [];
            this.cmd_listeners.set(cmd, listeners);
        }
        //持久化handler
        cb.retain();
        listeners.push({cb:cb, cx:context})

        //context->cmds
        let cmds:pb.Command[] = this.context_cmds.get(context);
        if(!cmds)
        {
            cmds = [];
            this.context_cmds.set(context, cmds);
        }
        cmds.push(cmd);
    }

    private unregister_listeners(context:cc.Component)
    {
        let cmds:pb.Command[] = this.context_cmds.get(context);
        if(!cmds)
        {
            cc.info(context.name, "has no cmds");
            return;
        }
        cmds.forEach((cmd:pb.Command):void=>{
            let listeners:cmd_listener[] = this.cmd_listeners.get(cmd);
            if(!listeners)
            {
                return;
            }
            for(let i:number = listeners.length - 1; i >= 0; i--)
            {
                if(listeners[i].cx === context)
                {
                    //释放handler
                    listeners[i].cb.release();
                    listeners.splice(i, 1);
                    cc.info(context.name, "remove listener");
                }
            }
        });
        this.context_cmds.delete(context);
    }

    private unregister_all()
    {
        for(let key of this.context_cmds.keys())
        {
            this.unregister_listeners(key);
        }
    }

    private register_error_handler(cb:handler)
    {
        this.error_handler = cb;
    }

    static register_listener(cmd:pb.Command, cb:handler, context:cc.Component)
    {
        Net.get_inst().register_listener(cmd, cb, context);
    }

    static unregister_listeners(context:cc.Component)
    {
        Net.get_inst().unregister_listeners(context);
    }

    static unregister_all()
    {
        Net.get_inst().unregister_all();
    }

    static register_error_handler(cb:handler)
    {
        Net.get_inst().register_error_handler(cb);
    }

    static send(msg:pb.IC2S, ...req_data:any[])
    {
        Net.get_inst().send(msg, ...req_data);
    }

    static connect(cb?:handler)
    {
        Net.get_inst().connect(cb);
    }

    static dis_connect()
    {
        Net.get_inst().dis_connect();
    }
}