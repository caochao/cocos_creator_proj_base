# cocos_creator_proj_base
cocos creator项目基础类库，包括socket, http网络连接，资源加载与管理，ui加载与管理，事件系统，音效播放，常用控件如listview，scrollview等

使用说明:
* ListView, 循环滚动列表，固定尺寸item, 屏幕可见范围外item会回收等待下次复用。支持横向，竖向，多行多列。
   
   1.初始化，传入item模板节点(cc.Node)，设置各种回调函数
   ```
   @property(cc.ScrollView)
    scrollview: cc.ScrollView = null;

    @property(cc.Node)
    mask: cc.Node = null;

    @property(cc.Node)
    content: cc.Node = null;

    @property(cc.Node)
    item_tpl:cc.Node = null;

    private list:ListView.ListView;

    on_show(...params)
    {
        this.list = new ListView.ListView({
            scrollview:this.scrollview,
            mask:this.mask,
            content:this.content,
            item_tpl:this.item_tpl,
            cb_host:this,
            item_setter:this.list_item_setter,
            select_cb:this.list_item_onselect,
            recycle_cb:this.list_item_onrecycle,
            column:1,
            gap_y:10,
            direction:ListView.ListViewDir.Vertical,
        });
        this.list.set_data(Consts.AllStages);
    }
   ```
   2.设置item回调函数
   ```
   list_item_setter(item:cc.Node, desc:Consts.StageDesc, index:number):void
    {
        const isOpen = appdata.getStageOpenState(desc.stage, desc.unlockcond, desc.total);
        const isPassed = appdata.isStagePassed(desc.stage, desc.total);

        const cond = item.getChildByName("cond");
        const txt_cond = cond.getChildByName("txt_cond");
        const txt_progress = item.getChildByName("txt_progress");
        const btn_share = item.getChildByName("btn_share");
        const img_star = item.getChildByName("img_star");
        const gold_star = img_star.getChildByName("gold_star");
        //省略
    }
   ```
   
* ScrollView, 循环滚动列表，支持不定尺寸的item, 屏幕可见范围外item会回收等待下次复用。支持横向，竖向, 但不支持多行多列。

   1.初始化，传入item模板节点(cc.Node)列表，设置各种回调函数
   ```
   const templates:ScrollItemTemplate[] = [
      {key:MsgType.ROUND_START.toString(), node:this.item_roundstart},
      {key:MsgType.LEFT_REDPACK.toString(), node:this.item_leftpack},
      {key:MsgType.RIGHT_REDPACK.toString(), node:this.item_rightpack},
      {key:MsgType.GRAB_NOTIFY.toString(), node:this.item_grab},
      {key:MsgType.ROUND_END.toString(), node:this.item_common},
      {key:MsgType.ROUND_RESULT.toString(), node:this.item_roundresult},
      {key:MsgType.LEFT_CHAT.toString(), node:this.item_leftchat},
      {key:MsgType.RIGHT_CHAT.toString(), node:this.item_rightchat},
      {key:MsgType.JOIN_ROOM_NOTIFY.toString(), node:this.item_common},
      {key:MsgType.QUIT_ROOM_NOTIFY.toString(), node:this.item_common},
      {key:MsgType.DISMISS_ROOM_NOTIFY.toString(), node:this.item_common},
      {key:MsgType.ROUND_TIMEOUT_NOTICE.toString(), node:this.item_common},
   ];
   this.scview = new ScrollView({
       scrollview:this.scrollview,
       mask:this.mask,
       content:this.content,
       item_templates:templates,
       cb_host:this,
       item_setter:this.item_setter,
       recycle_cb:this.list_item_recyle,
       gap_y:10,
       auto_scrolling:true,
       direction:ScrollDirection.Vertical,
   });
   ```
   2.设置item回调内部根据传入的key及data为对应item节点设置数据
   ```
   item_setter(item:cc.Node, key:string, data:any, index:number):[number, number]
   {
     const enum_key:number = parseInt(key);
     switch(enum_key)
     {
         case MsgType.ROUND_START:
             item.getComponent(cc.Label).string = format.sprintf("第%d轮开始", data);
             return [item.width, item.height];

         case MsgType.LEFT_REDPACK:
         case MsgType.RIGHT_REDPACK:
             return this.set_pack_item(item, data);

         case MsgType.ROUND_RESULT:
             let node_names:cc.Node = item.getChildByName("names");
             node_names.getComponent(cc.Label).string = data;
             item.height = node_names.height - node_names.y;
             return [item.width, item.height];

         case MsgType.LEFT_CHAT:
         case MsgType.RIGHT_CHAT:
             return this.set_chat_item(item, data);

         case MsgType.GRAB_NOTIFY:
             return this.set_grab_item(item, data);

         case MsgType.DISMISS_ROOM_NOTIFY:
         case MsgType.ROUND_TIMEOUT_NOTICE:
         case MsgType.JOIN_ROOM_NOTIFY:
         case MsgType.QUIT_ROOM_NOTIFY:
         case MsgType.ROUND_END:
             item.getComponent(cc.Label).string = data as string;
             return [item.width, item.height];

         default:
             return [0, 0];
     }
   }
   ```
   3.追加数据, 传入key及item数据
   ```
   const notify:pb.IRoomChatNotify = resp.roomChatNotify;
   const key:number = notify.sender.acc == appdata.user.acc ? MsgType.RIGHT_CHAT : MsgType.LEFT_CHAT;
   let data:ScrollItemData = {key:key.toString(), data:notify};
   this.scview.append_data(data);
   ```
