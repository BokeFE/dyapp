/*
 订单处理插件,
 其中init为插件初始化hook
 statusChanged为连接状态改变hook
 抢单中的订单
 */

var _$cdt_plugin_order = {
    init: function (connection) {
        this.connection = connection;
        this.online = false;
        this.from = localStorage.getItem("imAccount");
        Strophe.addNamespace('CDTOrder', "http://www.cdtfax.com/xmpp/order");
    },
    statusChanged: function (status) {
        if (status === Strophe.Status.CONNECTED) {//连接已经建立
            this.online = true;
            connection.addHandler(this.messageHandler.bind(this), null, "message");
            //CurUser.addSubscribe();
        } else if (status === Strophe.Status.DISCONNECTED) {//构建连接
            this.online = false;
            console.log('链接关闭');
        }
    },
    //发送移除订单消息
    sendMsg: function (order) {
        var reply = $msg({
            to: connection.serverAccount, from: connection.curUser, type: 'normal',
            xmlns: 'http://www.cdtfax.com/xmpp/order'
        })
            .c("body").c("msg", {
                action: "delOrder", jid: connection.curUser
            }).c("order", {id: order}).t(JSON.stringify(order));
        connection.sendproxy.send(reply.tree());
        return true;
    },
    /**
     * 消息接收处理器
     * @param msg
     * @returns {boolean}
     */
    messageHandler: function (msg) {
        //console.log("reciver msg:"+msg.innerHTML);
        try {
            var action = msg.getElementsByTagName('msg')[0].getAttribute("action");
            if (!action) {
                return true;
            }
            if (action == "addOrder") {
                var o = msg.getElementsByTagName('order')[0].innerHTML;
                if (o) {
                    var order = JSON.parse(o);
                    var code = order.code;
                    OrderManager.addOrder(order);
                }
            } else if (action == "delOrder") {
                var order = msg.getElementsByTagName('order')[0].innerHTML;
                if (order) {
                    var orderBean = JSON.parse(order);
                    var code = orderBean.code;
                    OrderManager.removeOrder(orderBean);
                }
            }
            return true;
        } catch (e) {
            //console.log("some error --"+ e);
            //alert("error:"+ e.innerHTML);
            return true;
        }
    }
}
/**
 * 加载插件
 */
Strophe.addConnectionPlugin("order", _$cdt_plugin_order);




