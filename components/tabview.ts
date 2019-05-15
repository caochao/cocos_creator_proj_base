import { loader_mgr } from "../loader/loader_mgr";
import { TabPage } from "./tabpage";
import { gen_handler } from "../util";

export class TabView
{
    private _tabContainer:cc.Node;
    private _pageContainer:cc.Node;
    private _tabBg:cc.Node;
    private _pageParamMap:Map<string, PageParams>;
    private _btnMap:Map<string, cc.Node>;
    private _pageMap:Map<string, TabPage>;
    private _loadingMap:Map<string, boolean>;
    private _selectedTab:string;
    private _onTabSelected:TabSelectedCb;

    constructor(params:TabParams)
    {
        this._onTabSelected = params.onTabSelected;
        this._pageParamMap = new Map();
        this._btnMap = new Map();
        this._pageMap = new Map();
        this._loadingMap = new Map();

        this._tabContainer = params.tabContainer;
        this._pageContainer = params.pageContainer;
        this._tabBg = params.tabBg;
        params.pages.forEach(page => {
            const btn = this._tabContainer.getChildByName(page.btnPath);
            const normal = btn.getChildByName("normal");
            const select = btn.getChildByName("select");
            normal.active = true;
            select.active = false;
            this._btnMap.set(page.key, btn);
            this._pageParamMap.set(page.key, page);

            normal.on(cc.Node.EventType.TOUCH_END, this.select.bind(this, page.key), this);
            if(page.btnTxt) {
                normal.getChildByName("txt").getComponent(cc.Label).string = page.btnTxt;
                select.getChildByName("txt").getComponent(cc.Label).string = page.btnTxt;
            }
        });

        if(params.initTab) {
            this.select(params.initTab);
        }
    }

    select(key:string)
    {
        if(key == this._selectedTab) {
            return;
        }

        const param = this._pageParamMap.get(key);
        if(!param) {
            cc.log(`TabView, select, invalid tabKey=${key}`);
            return;
        }

        if(this._selectedTab) {
            this.setBtnSelected(this._selectedTab, false);
            this.setPageSelected(this._selectedTab, false);
        }
        this.setBtnSelected(key, true);
        this._selectedTab = key;
        if(this._onTabSelected) {
            this._onTabSelected(key);
        }

        //adjust tab btns z-index
        if(this._tabBg) {
            this.adjustOrder();
        }

        //load tabpage
        const page = this._pageMap.get(key);
        if(page) {
            page.setSelected(true);
        }
        else {
            const isLoading = this._loadingMap.get(key);
            if(isLoading) {
                return;
            }
            this._loadingMap.set(key, true);
            loader_mgr.get_inst().loadRes(param.resPath, gen_handler((pKey:string, res:cc.Prefab) => {
                //已经destroy了
                if(!this._loadingMap) {
                    return;
                }
                this._loadingMap.delete(pKey);
                if(this._selectedTab != pKey) {
                    cc.log(`TabView, loadPage done, selectedTab=${this._selectedTab}, argTab=${pKey}`);
                    return;
                }
                const node = cc.instantiate(res);
                const pageInst = new param.clazz(node);
                pageInst.setParent(this._pageContainer);
                pageInst.alignToParent();
                pageInst.setSelected(true);
                this._pageMap.set(pKey, pageInst);
            }, this, key));
        }
    }

    getPage(key:string)
    {
        return this._pageMap.get(key);
    }

    getSelectedPage()
    {
        if(this._selectedTab) {
            return this._pageMap.get(this._selectedTab);
        }
        return null;
    }

    private setBtnSelected(key:string, selected:boolean)
    {
        const btn = this._btnMap.get(key);
        const normal = btn.getChildByName("normal");
        const select = btn.getChildByName("select");
        normal.active = !selected;
        select.active = selected;
    }

    private setPageSelected(key:string, selected:boolean)
    {
        const page = this._pageMap.get(key);
        if(page) {
            page.setSelected(selected);
        }
    }

    private adjustOrder()
    {
        const selectedBtn = this._btnMap.get(this._selectedTab);
        const childCnt = this._tabContainer.childrenCount;
        selectedBtn.setSiblingIndex(childCnt - 1);
        this._tabBg.setSiblingIndex(childCnt - 2);
    }

    updateBtnTxts(values:{key:string, txt:string}[])
    {
        values.forEach(v => {
            const btn = this._btnMap.get(v.key);
            if(btn) {
                btn.getChildByName("normal").getChildByName("txt").getComponent(cc.Label).string = v.txt;
                btn.getChildByName("select").getChildByName("txt").getComponent(cc.Label).string = v.txt;
            }
        });
    }

    destroy()
    {
        this._pageParamMap.clear();
        this._pageParamMap = null;
        
        this._btnMap.forEach(btn => {
            const normal = btn.getChildByName("normal");
            normal.off(cc.Node.EventType.TOUCH_END);
        });
        this._btnMap.clear();
        this._btnMap = null;
        
        this._pageMap.forEach(page => {
            page.destroy();
        });
        this._pageMap.clear();
        this._pageMap = null;
        
        this._loadingMap.clear();
        this._loadingMap = null;

        this._tabContainer = null;
        this._pageContainer = null;
        this._tabBg = null;
        this._selectedTab = null;
        this._onTabSelected = null;
    }
}

export type TabSelectedCb = (key:string) => void;

type TabParams = {
    tabContainer:cc.Node;
    pageContainer:cc.Node;
    tabBg?:cc.Node;
    pages:PageParams[];
    initTab?:string;
    onTabSelected?:TabSelectedCb;
}

type PageParams = {
    key:string;
    btnPath:string;
    btnTxt?:string;
    resPath:string;
    clazz:new(node:cc.Node) => TabPage;
}