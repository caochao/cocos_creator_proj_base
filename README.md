# cocos_creator_proj_base
cocos creator项目基础类库，包括socket, http网络连接，资源加载与管理，ui加载与管理，事件系统，音效播放，常用控件如listview，scrollview等

使用说明:
2.ScrollView, 循环滚动列表，支持不定尺寸的item, 屏幕可见范围外item会回收等待下次复用
1).初始化，传入item模板列表，设置各种回调函数
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

设置item回调里根据key及data为对应模板item节点设置数据
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
2).追加数据, 传入key及item数据
```
const notify:pb.IRoomChatNotify = resp.roomChatNotify;
const key:number = notify.sender.acc == appdata.user.acc ? MsgType.RIGHT_CHAT : MsgType.LEFT_CHAT;
let data:ScrollItemData = {key:key.toString(), data:notify};
this.scview.append_data(data);
```
