
/*
 通讯录插件,
 其中init为插件初始化hook
 statusChanged为连接状态改变hook
 */
var _$cdt_plugin_agentpic={
  init:function(connection){
    this.connection = connection;
    this.online = false;
    this.from=localStorage.getItem("xmppId");
    Strophe.addNamespace('CDTContact', "http://www.cdtfax.com/xmpp/contact");
  },
  statusChanged:function(status){
    if (status === Strophe.Status.CONNECTED) {//连接已经建立
      this.online = true;
      connection.rawInput = function (data) { console.log('RECV: ' + data); };
      connection.rawOutput = function (data) { console.log('SEND: ' + data); };
      connection.addHandler(this.messageHandler.bind(this), null, "message");
    } else if (status === Strophe.Status.DISCONNECTED) {//构建连接
      this.online = false;
      console.log('链接关闭');
    }
  },

    save:function(imgUrl){
        var from = localStorage.getItem("xmppId");
        var serverAccount = connection.serverAccount;
        var reply = $msg({to: serverAccount, from:from+"@"+domain, type: 'normal',  xmlns : 'http://www.cdtfax.com/xmpp/contact'})
            .c("body").c("msg",{action :"saveUserPic",jid:from}).c("pic",{jid: from,type:'agent'}).t(imgUrl);//"hudingxiang@192.168.1.50"
        connection.send(reply.tree());
        return true;
    },

  messageHandler: function (msg) {
      console.log(" AGENT msg--"+msg.innerHTML);
     // alert(JSON.stringify(msg));
     // alert("msg--"+msg.innerHTML);
      var action= msg.getElementsByTagName('msg')[0].getAttribute("action");
      //alert(action);
      if(action == "saveUserPic"){
        var img= msg.getElementsByTagName('pic')[0].textContent;
        //alert(img);
      }
      return true;
  }

}

/**
 * 加载插件
 * roster为插件名称
 * _$cdt_plugin_templater
 */
Strophe.addConnectionPlugin("agentpic",_$cdt_plugin_agentpic);
