# cocos_creator_proj_base
 cocos creator项目基础类库，包括socket, http网络连接，资源加载与管理，ui加载与管理，事件系统，音效播放，常用控件如listview，scrollview等
 
 A cocos creator project framework, including socket, http, asset loading, ui loading, event system, audio play and some widget like recycle list view.
 
 使用说明
 
 1.ListView, 循环滚动列表，固定尺寸item, 屏幕可见范围外item会回收等待下次复用。支持横向，竖向，多行多列。支持追加删除数据。支持上右下左padding, 支持设置item锚点。
    
    * 初始化，传入各种参数，设置item class
    ```
     @property(cc.Node)
     scrollView: cc.Node = null;
 
     private _listView:ListView;
 
     on_show(...params)
     {
         const maskNode = this.scrollView.getChildByName("mask");
         const content = maskNode.getChildByName("content");
         const item_tpl = content.getChildByName("item");
         const scrollview = this.scrollView.getComponent(cc.ScrollView);
         const mask = maskNode.getComponent(cc.Mask);
         this._listView = new ListView({
             scrollview,
             mask,
             content,
             item_tpl,
             item_class:UnlockNewSongItem,
             column:1,
             gap_y:8,
             item_anchorX:0.5,
             item_anchorY:0.5,
             direction:ListViewDir.Vertical,
         });
         this._listView.set_data(this._songs);
     }
    ```

    * 实现列表item回调方法
    ```
    export class UnlockNewSongItem extends ListViewItem 
    {
        private _bg:cc.Sprite;
        private _txtSongName:cc.Label;
        private _txtAuthor:cc.Label;
        private _listenView:TrialListenView;

        onInit()
        {
            const node = this.node;
            this._txtSongName = node.getChildByName("songName").getComponent(cc.Label);
            this._txtAuthor = node.getChildByName("author").getComponent(cc.Label);

            this._listenView = new TrialListenView();
            this._listenView.addTo(node, 223, -151);
        }

        onUnInit()
        {
            this._listenView.destroy();
            this._listenView = null;
        }

        onSetData(songId:number, index:number)
        {
            const songCfg = appData.songLibrary.get(songId);
            if(!songCfg) return;
            
            //songname
            this._txtSongName.string = songCfg.name;
            this._txtAuthor.string = songCfg.author;

            this._likeView.setVisible(true);
            this._likeView.setLike(localData.songInfo.isFavoriteSong(songId));

            //试听
            if(songCfg.hasMp3) {
                const listenState = Mp3Player.getInst().getListenState(songId);
                this._listenView.setState(listenState || SongListenState.Idle);
            }
            else {
                this._listenView.setState(SongListenState.None);
            }
        }

        onRecycle(songId:number)
        {
            this._listenView.setState(SongListenState.None);
        }

        onTouchEnd(touchPos:cc.Vec2, songId:number, index:number)
        {
            if(this._listenView.handleTouchEnd(touchPos, songId)) {
                return;
            }
            if(this._likeView.handleTouchEnd(touchPos, songId, source)) {
                return;
            }
        }
    }
    ```
    
    
 2.ScrollView, 循环滚动列表，支持不定尺寸的item, 屏幕可见范围外item会回收等待下次复用。支持横向，竖向, 但不支持多行多列。支持追加删除数据。支持上右下左padding, 支持设置item锚点。
 
    * 初始化，传入各种参数，设置item class
    ```
    @property(cc.Node)
    scrollView:cc.Node = null;

    private initSongsView()
    {
        const maskNode = this.scrollView.getChildByName("mask");
        const content = maskNode.getChildByName("content");
        const item_tpl = content.getChildByName("item");
        const scrollview = this.scrollView.getComponent(cc.ScrollView);
        const mask = maskNode.getComponent(cc.Mask);
        const templates:ScrollItemTemplate[] = [
            {key:PushViewItemType.PushSongItem, node:item_tpl, item_class:LatestSongPushItem},
        ];
        this._songsView = new ScrollPage({
            scrollview,
            mask,
            content,
            item_templates:templates,
            gap_x:-30,
            padding_left:124,
            padding_right:124,
            padding_top:200,
            direction:ScrollDirection.Horizontal,
            cb_host:this,
            on_turning:this.onTurning,
            on_scrolling:this.onScrolling,
            item_anchorX:0.5,
            item_anchorY:0.5,
        });
        const itemDatas:ScrollItemData[] = this._songs.map(data => {
            return {
                key:PushViewItemType.PushSongItem,
                data,
            }
        });
        this._songsView.set_data(itemDatas);
    }
    ```

    * 实现列表item回调方法
    ```
    export class LatestSongPushItem extends ScrollViewItem
    {
        private _defaultCover:cc.Node;
        private _coverSprite:cc.Sprite;
        private _coverSpriteFrame:cc.SpriteFrame;
        private _listenView:TrialListenView;

        onInit(key:PushViewItemType)
        {
            const node = this.node;
            this._defaultCover = node.getChildByName("defaultCover");
            this._coverSprite = node.getChildByName("cover").getComponent(cc.Sprite);

            this._coverSpriteFrame = new cc.SpriteFrame();
            this._coverSpriteFrame.name = "LatestSongPushItemSpriteFrame";

            this._listenView = new TrialListenView({
                prefabPath:"prefabs/misc/trialListen2",
                downloadingTexure:"xinge_tanchuang_shiting_02",
                listeningDbPath:"main/xinge_shiting_dh",
                listeningDbArmature:"xinge_shiting_dh",
                listeningDbAnim:"xinge_shiting_dh",
                listeningDbPosX:0,
                listeningDbPosY:0,
            });
            this._listenView.addTo(node, 89, -331);
        }

        onUnInit(key:PushViewItemType)
        {
            this._listenView.destroy();
            this._listenView = null;

            this._coverSpriteFrame.clearTexture();
            // this._coverSpriteFrame.destroy();
            this._coverSpriteFrame = null;
        }

        private _currSongId:number;
        onSetData(key:PushViewItemType, songId:number, index:number, is_mesure:boolean):[number, number]
        {
            if(is_mesure) {
                return [this.node.width, this.node.height];
            }

            const songCfg = appData.songLibrary.get(songId);
            if(!songCfg) return [this.node.width, this.node.height];

            this._defaultCover.active = !songCfg.cover;
            this._coverSprite.node.active = !!songCfg.cover;
            if(songCfg.cover) {
                this._currSongId = songId;
                ImageUtil.getInst().setExternalSpriteFrame(songCfg.cover, songId, (tag, tex) => {
                    if(tag == this._currSongId && cc.isValid(this.node) && cc.isValid(this._coverSpriteFrame)) {
                        this._coverSpriteFrame.setTexture(tex);
                        this._coverSprite.spriteFrame = this._coverSpriteFrame;
                    }
                });
            }

            //试听
            if(songCfg.hasMp3) {
                const listenState = Mp3Player.getInst().getListenState(songId);
                this._listenView.setState(listenState || SongListenState.Idle);
            }
            else {
                this._listenView.setState(SongListenState.None);
            }

            return [this.node.width, this.node.height];
        }

        onRecycle(key:PushViewItemType, songId:number, is_mesure:boolean)
        {
            if(is_mesure)
            {
                return;
            }
            this._coverSprite.spriteFrame = null;
            this._listenView.setState(SongListenState.None);
        }

        onTouchEnd(key:PushViewItemType, songId:number, touchPos:cc.Vec2, index:number)
        {
            this._listenView.handleTouchEnd(touchPos, songId);
        }
    }
    ```

    * 追加数据, 传入key及item数据
    ```
    const notify:pb.IRoomChatNotify = resp.roomChatNotify;
    const key:number = notify.sender.acc == appdata.user.acc ? MsgType.RIGHT_CHAT : MsgType.LEFT_CHAT;
    let data:ScrollItemData = {key:key.toString(), data:notify};
    this.scview.append_data(data);
    ```

 3.TabView, 多标签界面。支持按需加载。

    * 初始化TabView, 传入tab根节点, tab页父节点, tab页class及对应prefab, tabbtn节点路径及文本.
    ```
    this._tabView = new TabView({
        tabContainer: this.tabContainer,
        pageContainer: this.pageContainer,
        pages:[
            {
                key:TabKeys.LatestSongs,
                btnPath:"tab1",
                btnTxt:i18n.t("新歌"),
                resPath:"prefabs/pages/latestSongView",
                clazz:LatestSongView,
            },
            {
                key:TabKeys.MainSongs,
                btnPath:"tab2",
                btnTxt:i18n.t("音乐"),
                resPath:"prefabs/pages/mainSongView",
                clazz:MainSongView,
            },
        ],
        onTabSelected:this.onTabSelected.bind(this),
    });
    ```

    * 实现tab页
    ```
    export class MainSongView extends TabPage
    {
        onInit()
        {
            //...
        }

        protected onBecameVisible()
        {
            //...
        }

        protected onBecameInvisible()
        {
            //...
        }
    ```
 
 4.TweenUtil, 缓动工具
 
    * 传入节点，用时，延时，要变动的属性, 曲线函数
    ```
    let tween = TweenUtil.to({
        node:coin, duration:0.8, delay:delay, x:dest_pos.x, y:dest_pos.y, tweenFunc:TweenFunc.Sine.easeIn,
        onComplete:utils.gen_handler(this.on_fly_to_dest, this)
    });
    ```
    * 取消缓动
    ```
    TweenUtil.kill(tween);
    ```
    
 5.TimerMgr, 定时器
    
    * 无限循环
    ```
    TimerMgr.getInst().loop(0.1, utils.gen_handler(this.loop, this));
    ```
    * 循环10次
   ```
   TimerMgr.getInst().loopTimes(0.1, 10, utils.gen_handler(this.loopTimes, this));
   ```
   * 延时0.2秒后再循环
   * 0.2秒后再循环
   ```
   TimerMgr.getInst().delayLoop(0.1, 0.2, utils.gen_handler(this.delayLoop, this));
   ```
   * 延时0.2秒后招行一次
   * 0.2秒后执行一次
   ```
   TimerMgr.getInst().once(0.2, utils.gen_handler(this.once, this));
   ```
