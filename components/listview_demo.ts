import {ListView, ListViewDir} from "./listview"

const {ccclass, property} = cc._decorator;

@ccclass
export default class ListView_Demo extends cc.Component {

    @property(cc.ScrollView)
    scrollview: cc.ScrollView;

    @property(cc.Node)
    mask: cc.Node;

    @property(cc.Node)
    content: cc.Node;

    @property(cc.Node)
    item_tpl:cc.Node;

    onLoad() {
        let list:ListView = new ListView({
            scrollview:this.scrollview,
            mask:this.mask,
            content:this.content,
            item_tpl:this.item_tpl,
            cb_host:this,
            item_setter:this.update_list_item,
            select_cb:this.on_item_select,
            column:1,
            row:1,
            direction:ListViewDir.Vertical,
        });
        list.set_data([
            "第1条数据啊啊啊啊",
            "第2条数据啊啊啊啊",
            "第3条数据啊啊啊啊",
            "第4条数据啊啊啊啊",
            "第5条数据啊啊啊啊",
            "第6条数据啊啊啊啊",
            "第7条数据啊啊啊啊",
            "第8条数据啊啊啊啊",
            "第9条数据啊啊啊啊",
            "第10条数据啊啊啊啊",
            "第11条数据啊啊啊啊",
            "第12条数据啊啊啊啊",
            "第13条数据啊啊啊啊",
            "第14条数据啊啊啊啊",
            "第15条数据啊啊啊啊",
            "第16条数据啊啊啊啊",
            "第17条数据啊啊啊啊",
            "第18条数据啊啊啊啊",
            "第19条数据啊啊啊啊",
            "第20条数据啊啊啊啊",
        ]);
    }

    on_item_select(data:any, index:number)
    {
        cc.info(data, index);
    }

    update_list_item(item:cc.Node, data:any, index:number):void
    {
        item.getComponent(cc.Label).string = data.toString();
    }
}
