import { handler } from "../util";

export class HttpService
{
    private static _inst:HttpService;

    private constructor()
    {
    }

    static getInst():HttpService
    {
        if(!this._inst)
        {
            this._inst = new HttpService();
        }
        return this._inst;
    }

    doGet(url:string, headers, params, cb:handler)
    {
        if(params)
        {
            if(url.indexOf("?") == -1)
            {
                url += "?";
            }
            url += this.getQueryString(params);
        }
        this.doHttp(url, headers, null, "GET", cb);
    }

    doPost(url:string, headers, params, cb:handler)
    {
        this.doHttp(url, headers, params, "POST", cb);
    }

    doDownload()
    {

    }

    private doHttp(url:string, headers, params, method:string, cb:handler)
    {
        const xhr = new XMLHttpRequest();
        xhr.responseType = "text";
        xhr.onreadystatechange = this.onReadyStateChange.bind(this, xhr, cb);
        xhr.ontimeout = this.onTimeout.bind(this, xhr, url);
        xhr.onerror = this.onError.bind(this, xhr, url);
        xhr.onabort = this.onAbort.bind(this, xhr, url);

        cc.log(`HttpService, doHttp url=${url}, method=${method}, parmas=${params}`)
        xhr.open(method, url, true);
        if(headers)
        {
            this.setHttpHeaders(xhr, headers);
        }
        if (cc.sys.isNative)
        {
            this.setHttpHeaders(xhr, {"Accept-Encoding": "gzip,deflate"});
        }
        if(params && typeof params === "object")
        {
            params = JSON.stringify(params);
        }
        xhr.send(params);
    }

    private onReadyStateChange(xhr:XMLHttpRequest, cb:handler)
    {
        cc.log(`HttpService, onReadyStateChange, readyState=${xhr.readyState}, status=${xhr.status}`);
        if(xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) 
        {
            cc.log(`HttpService, onReadyStateChange, responseText=${xhr.responseText}`);
            let data;
            let code = HttpCode.kUnknown;
            const response = JSON.parse(xhr.responseText);
            if(response && response.code)
            {
                code = response.code;
                data = response.content; 
            }
            else
            {
                code = HttpCode.kSuccess;
                data = response;
            }
            this.notifyCallback(cb, code, data);
            this.removeXhrEvent(xhr);
        }
    }

    private onTimeout(xhr:XMLHttpRequest, url:string)
    {
        cc.warn(`${url}, request ontimeout`);
        this.removeXhrEvent(xhr);
    }

    private onError(xhr:XMLHttpRequest, url:string)
    {
        cc.warn(`${url}, request onerror`);
        this.removeXhrEvent(xhr);
    }

    private onAbort(xhr:XMLHttpRequest, url:string)
    {
        cc.warn(`${url}, request onabort`);
        this.removeXhrEvent(xhr);
    }

    private removeXhrEvent(xhr:XMLHttpRequest)
    {
        xhr.ontimeout = null;
        xhr.onerror = null;
        xhr.onabort = null;
        xhr.onreadystatechange = null;
    }

    private notifyCallback(cb:handler, code:number, data?)
    {
        if(cb)
        {
            cb.exec(code, data);
        }
    }

    private setHttpHeaders(xhr:XMLHttpRequest, headers)
    {
        for(let key in headers)
        {
            xhr.setRequestHeader(key, headers[key]);
        }
    }

    private getQueryString(params)
    {
        const tmps:string[] = [];
        for(let key in params)
        {
            tmps.push(`${key}=${params[key]}`);
        }
        return tmps.join("&");
    }
}

export enum HttpCode {
    kSuccess = 0,
    kTimeout = 10000,
    kUnknown = 10001,
    kSessionTimeout = -8,
    kIAmInBlocklist = -3013,
    kUserIsInMyBlocklist = -3014
}