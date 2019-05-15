//item及父节点锚点都为(0,1)
export class LayoutUtil
{
    static vertical_layout(index:number, item_width:number, item_height:number, column = 1, gap_x = 0, gap_y = 0, padding_left = 0, padding_top = 0):[number, number]
    {
        const x = (index % column) * (item_width + gap_x) + padding_left;
        const y = -Math.floor(index / column) * (item_height + gap_y) - padding_top;
        return [x, y];
    }

    static horizontal_layout(index:number, item_width:number, item_height:number, row = 1, gap_x = 0, gap_y = 0, padding_left = 0, padding_top = 0):[number, number]
    {
        const x = Math.floor(index / row) * (item_width + gap_x) + padding_left;
        const y = -(index % row) * (item_height + gap_y) - padding_top; 
        return [x, y];
    }

    static set_pivot_smart(node:cc.Node, ax:number, ay:number, recursive = false)
    {
        const deltaAx = ax - node.anchorX;
        const deltaAy = ay - node.anchorY;
        node.anchorX = ax;
        node.anchorY = ay;

        //改变节点锚点，位置值相对锚点不变。需要调整节点至新位置才能保持一致视觉效果
        const deltaX = deltaAx * node.width;
        const deltaY = deltaAy * node.height;
        node.x += deltaX;
        node.y += deltaY;

        node.children.forEach(child => {
            //父节点锚点改变，子节点相对父节点位置值不变，需要调整子节点至新位置才能保持一致视觉效果
            child.x -= deltaX;
            child.y -= deltaY;
            if(recursive) {
                LayoutUtil.set_pivot_smart(child, ax, ay);
            }
        });
    }
}