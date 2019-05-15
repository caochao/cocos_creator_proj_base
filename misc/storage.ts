export class LocalStorage
{
    private static _inst:LocalStorage;

    private constructor()
    {
    }

    static getInst():LocalStorage
    {
        if(!this._inst)
        {
            this._inst = new LocalStorage();
        }
        return this._inst;
    }

    remove(key:string)
    {
        cc.sys.localStorage.removeItem(key);
    }

    clear()
    {
        cc.sys.localStorage.clear();
    }

    getString(key:string, defaultValue = "")
    {
        const value = cc.sys.localStorage.getItem(key);
        if(value != null) {
            return value;
        }
        return defaultValue;
    }

    setString(key:string, value:string)
    {
        cc.sys.localStorage.setItem(key, value);
    }

    getInt(key:string, defaultValue = 0)
    {
        const value = cc.sys.localStorage.getItem(key);
        if(value != null)
        {
            return parseInt(value);
        }
        return defaultValue;
    }

    setInt(key:string, value:number)
    {
        cc.sys.localStorage.setItem(key, value.toString());
    }

    getBool(key:string, defaultValue = false)
    {
        const value = cc.sys.localStorage.getItem(key);
        if(value != null)
        {
            return parseInt(value) == 1;
        }
        return defaultValue;
    }

    setBool(key:string, value:boolean)
    {
        cc.sys.localStorage.setItem(key, value ? "1" : "0");
    }

    getFloat(key:string, defaultValue = 0)
    {
        const value = cc.sys.localStorage.getItem(key);
        if(value != null)
        {
            return parseFloat(value);
        }
        return defaultValue;
    }

    setFloat(key:string, value:number)
    {
        cc.sys.localStorage.setItem(key, value.toString());
    }

    getJson(key:string, defaultValue = null)
    {
        const value = cc.sys.localStorage.getItem(key);
        if(value != null)
        {
            return JSON.parse(value);
        }
        return defaultValue;
    }

    setJson(key:string, value:object)
    {
        cc.sys.localStorage.setItem(key, JSON.stringify(value));
    }
}

export const LocalStorageKey = {
    initialLangId: "__initialLangId__",
};