/**
 * Created by other on 2016/6/20.
 */
/*
 ***插件,
 其中init为插件初始化hook
 statusChanged为连接状态改变hook
 */
function Session() {//会话
    this.sessionId = null;//会话id，裸JID
    this.name = null;//会话名称
    this.headimage = null;//会话图标
    this.unRead = 0;//会话中未图条数
    this.lastMessage = null;//最后一条消息
    this.lastTime = null;//最后发送时间
}
Session.prototype = {}
function SessionDetails() {//会话明细列表
    this.sessionId = null;//会话id，裸JID
    this.fromHeadImage = null;//headImage of from
    this.from = null;//jid of from
    this.fromName = null;//name of from
    this.to = null;//jid of to
    this.toName = null;//name of to
    this.toHeadImage = null;//headImage of to
    this.type = "txt";//会话类型
    this.content = "";//会话内容
    this.timestamp = new Date();//消息时间
    this.delay = null;//是否为延迟消息，消息发送时的时间戳
}
SessionDetails.prototype = {}
var format = function (time, format) {
    var t = new Date(time);
    var tf = function (i) {return (i < 10 ? '0' : "") + i};
    return format.replace(/yyyy|MM|dd|HH|mm|ss/g, function (a) {
        switch (a) {
            case 'yyyy':
                return tf(t.getFullYear());
                break;
            case 'MM':
                return tf(t.getMonth() + 1);
                break;
            case 'mm':
                return tf(t.getMinutes());
                break;
            case 'dd':
                return tf(t.getDate());
                break;
            case 'HH':
                return tf(t.getHours());
                break;
            case 'ss':
                return tf(t.getSeconds());
                break;
        }
    })
}

window.unReadCount=0;//未读消息计数

/*
    会话管理器对象
 */
var SessionManager = {
    /**
     * 会话视图状态：
     * (1) 当应用进入会话列表页面时，会话状态为list，
     * (2) 当应用进入会话页面时，会话状态为session
     * (3)当会话不处于list或session页面时，会话状态为none
     */
    _sessionStatus:"none",//默认的会话状态为none
    _totalUnRead:0,//总未读数
    _currJID:'',//当前聊天人JID

    addReceiveMessage: function (msg) {//接收到新的消息时的处理函数
        //解析出会话对象
        var sid = msg.sessionId;
        var curSession = new Session();
        curSession.sessionId = sid;
        curSession.name = msg.fromName || Strophe.getNodeFromJid(msg.from);
        curSession.headimage = msg.fromHeadImage || this.getDefaultHeadImage();
        if(msg.type=='image'){
            curSession.lastMessage = '[图片]';
        }else if(msg.type=='mp4'){
            curSession.lastMessage = '[语音]';
        }else{
            curSession.lastMessage = msg.content;
        }
        curSession.lastTime = format(msg.timestamp, 'MM-dd HH:mm:ss');

        //将消息保存到数据库中
        db.transaction(function (tx) {
            var queryMessage = "select * from cdt_message where sessionId = ?";
            var insertMessage = "INSERT INTO cdt_message (sessionId,name,headimage,unRead,lastMessage,lastTime) VALUES (?,?,?,?,?,?)";
            var updateMessage = "update cdt_message set name = ?, headimage = ?, unRead = ?, lastMessage = ?,lastTime = ? where sessionId = ?";
            var insertDetail = "INSERT INTO cdt_message_detail (`sessionId`,`fromHeadImage`,`from`,`fromName`,`to`,`toName`,`toHeadImage`,`type`,`content`,`timestamp`,`delay`) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
            //会话数据操作
            tx.executeSql(queryMessage, [sid], function (tx, resultSet) {
                if(resultSet.rows.length > 0){//已经存在会话
                    if(SessionManager._sessionStatus=="session"){//会话中
                        if(SessionManager._currJID==sid){
                            curSession.unRead=0;
                        }else{
                            curSession.unRead=resultSet.rows.item(0).unRead+1;//未读计数加1
                            SessionManager._totalUnRead+=1;  //总未读计数加1
                        }
                    }else{//非会话中
                        curSession.unRead=resultSet.rows.item(0).unRead+1;//未读计数加1
                        SessionManager._totalUnRead+=1;  //总未读计数加1
                    }
                    //更新数据
                    tx.executeSql(updateMessage, [
                        curSession.name,
                        curSession.headimage,
                        curSession.unRead,
                        curSession.lastMessage,
                        curSession.lastTime,
                        curSession.sessionId
                    ], function (tx, res) {
                        console.log("updateId: " + res.insertId);
                    },
                    function (tx, error) {
                        console.log('update error: ' + error.message);
                    });
                }else{//创建新的会话
                    //插入数据
                    if(SessionManager._sessionStatus=="session"){//会话中
                        curSession.unRead=0;
                    }else{
                        curSession.unRead=1;//初始未读计数1
                    }
                    tx.executeSql(insertMessage, [
                        curSession.sessionId,
                        curSession.name,
                        curSession.headimage,
                        curSession.unRead,
                        curSession.lastMessage,
                        curSession.lastTime
                    ], function (tx, res) {
                        console.log("insertId: " + res.insertId);
                    },
                    function (tx, error) {
                        console.log('insert error: ' + error.message);
                    });
                }

                //数据库操作：--插入会话明细
                tx.executeSql(insertDetail, [
                        msg.sessionId,
                        msg.fromHeadImage,
                        msg.from,
                        msg.fromName,
                        msg.to,
                        msg.toName,
                        msg.toHeadImage,
                        msg.type,
                        msg.content,
                        msg.timestamp,
                        msg.delay
                    ], function (tx, res) {
                        console.log("insertId: " + res.insertId);
                        //fire 收到新的事件消息
                        $.postOffice.publish('new_im_message',curSession,msg);
                    },
                    function (tx, error) {
                        console.log('insert error: ' + error.message);
                    });

            }, function (error) {
                console.log('transaction error: ' + error.message);
            }, function () {
                console.log('transaction ok');
            });
            },
            function (tx, error) {//事务执行失败
                console.log('transaction error: ' + error.message);
            });


    },


    addSendMessage: function (msg) { //发出的消息
        var sid = msg.sessionId;
        var curSession =new Session();
        curSession.sessionId = sid;
        curSession.name = msg.toName || Strophe.getNodeFromJid(msg.to);
        curSession.headimage = msg.toHeadImage || this.getDefaultHeadImage();
        if(msg.type=='image'){
            curSession.lastMessage = '[图片]';
        }else if(msg.type=='mp4'){
            curSession.lastMessage = '[语音]';
        }
        else{
            curSession.lastMessage = msg.content;
        }
        curSession.lastTime = format(msg.timestamp, 'MM-dd HH:mm:ss');

        //将消息保存在本地数据库
        db.transaction(function (tx) {
            var queryMessage = "select * from cdt_message where sessionId = ?";
            var insertMessage = "INSERT INTO cdt_message (sessionId,name,headimage,unRead,lastMessage,lastTime) VALUES (?,?,?,?,?,?)";
            var updateMessage = "update cdt_message set lastMessage = ?,lastTime = ? where sessionId = ?";
            var insertDetail = "INSERT INTO cdt_message_detail (`sessionId`,`fromHeadImage`,`from`,`fromName`,`to`,`toName`,`toHeadImage`,`type`,`content`,`timestamp`,`delay`) VALUES (?,?,?,?,?,?,?,?,?,?,?)";

            tx.executeSql(queryMessage, [sid], function (tx, resultSet) {
                if(resultSet.rows.length > 0){
                    //更新数据
                    tx.executeSql(updateMessage, [
                        //curSession.name,
                        //curSession.headimage,
                        ////curSession.unRead,--不影响未读计数
                        curSession.lastMessage,
                        curSession.lastTime,
                        curSession.sessionId
                    ], function (tx, res) {
                        console.log("updateId: " + res.insertId);
                    },
                    function (tx, error) {
                        console.log('update error: ' + error.message);
                    });
                }else{
                    //插入数据
                    tx.executeSql(insertMessage, [
                        curSession.sessionId,
                        curSession.name,
                        curSession.headimage,
                        //curSession.unRead,--不影响未读计数
                        curSession.lastMessage,
                        curSession.lastTime
                    ], function (tx, res) {
                        console.log("insertId: " + res.insertId);
                    },
                    function (tx, error) {
                        console.log('insert error: ' + error.message);
                    });
                }
            },
            function (tx, error) {
                console.log('SELECT error: ' + error.message);
            });

            tx.executeSql(insertDetail, [
                msg.sessionId,
                msg.fromHeadImage,
                msg.from,
                msg.fromName,
                msg.to,
                msg.toName,
                msg.toHeadImage,
                msg.type,
                msg.content,
                msg.timestamp,
                msg.delay
            ], function (tx, res) {
                $.postOffice.publish('new_im_message',curSession,msg);
                console.log("insertId: " + res.insertId);
            },
            function (tx, error) {
                console.log('insert error: ' + error.message);
            });

        }, function (error) {
            console.log('transaction error: ' + error.message);
        }, function () {
            console.log('transaction ok');
        });
    },

    //获取默认的用户图像
    getDefaultHeadImage: function () {
        var DefaultHeadImage = 'images/defaultHeader.png'
        return DefaultHeadImage;
    }
}


/**
 * IM聊天插件
 * @type {{init: Function, statusChanged: Function, messageHandler: Function, sendMessage: Function, removeMessage: Function, updateMessage: Function}}
 * @private
 */

var _$cdt_plugin_message = {//消息插件

    init: function (connection) {//插件初始化
        this.connection = connection;
        this.online = false;
        Strophe.addNamespace('CDTMSG', "http://www.cdtfax.com/xmpp/msg");
    },

    statusChanged: function (status) {//插件连接状态改变
        if (status === Strophe.Status.CONNECTED) {//连接已经建立
            this.online = true;
            //connection.rawInput = function (data) { console.log('RECV: ' + data); };
            //connection.rawOutput = function (data) { console.log('SEND: ' + data); };
            connection.addHandler(this.messageHandler.bind(this), null, "message");//接收到消息时的消息处理器
        } else if (status === Strophe.Status.DISCONNECTED) {//构建连接
            this.online = false;
            console.log('链接关闭');
        }
    },

    /*
        功能：XMPP消息接收处理器,接收并解码消息
     */
    messageHandler: function (msg) {
        /**
         * 只处理符合IM协议的消息，IM协议如下：
         * <message from="sourceJID" to="targetJID" type="chat">
         *    <body>
         *        <!--自定义消息格式-->
         *        <msg type="txt|image|mp4|html" xmlns="http://www.cdtfax.com/xmpp/msg">
         *            <meta name="" headImg="">
         *            <content></content>
         *         </msg>
         *    </body>
         *    <!--由系统生成，表示消息错误-->
         *    <error code="" type="" >error desciption</error>
         *    <!--由系统生成，表示离线消息-->
         *    <delay xmlns="" from="" stamp=""></delay>
         * </message>
         */
        if(msg.getElementsByTagName('msg').length != 0 && msg.getElementsByTagName('meta').length != 0){
            var sd = new SessionDetails();
            sd.sessionId = Strophe.getBareJidFromJid(msg.getAttribute('from'));
            sd.from = msg.getAttribute('from');
            sd.to = msg.getAttribute('to');
            sd.fromHeadImage = msg.getElementsByTagName('meta')[0].getAttribute('headimage') || SessionManager.getDefaultHeadImage();
            sd.fromName = msg.getElementsByTagName('meta')[0].getAttribute('name');
            sd.toName = '';
            sd.toHeadImage = '';
            sd.type = msg.getElementsByTagName('msg')[0].getAttribute('type');
            sd.content = msg.getElementsByTagName('content')[0].textContent;
            var delay = msg.getElementsByTagName("delay");
            if (delay.length > 0) {
                sd.delay = delay[0].getAttribute('stamp');//消息发送时的时间戳
            }
            //添加接收到的消息到会话明细中
            SessionManager.addReceiveMessage(sd);
        }

        return true;
    },

    /**
     * 功能:发送XMPP消息，并将消息添加到会话管理器中
     * @param msg
     */
    sendMessage: function (msg) {
        var sd = new SessionDetails();
        sd.sessionId = Strophe.getBareJidFromJid(msg.to);
        sd.to = msg.to;
        sd.fromHeadImage = msg.fromHeadImage || SessionManager.getDefaultHeadImage();
        sd.fromName = msg.fromName || Strophe.getNodeFromJid(msg.from);
        sd.toName = '';
        sd.toHeadImage = '';
        sd.type = msg.type;
        if(sd.type=='image'){
            var imageData=msg.content;
            sd.content=imageData;
        }else{
            sd.content = msg.content;;
        }
        var sendMsg = $msg({from: msg.from, to: msg.to, type: "chat"})
            .c("body")
            .c("msg", {xmlns: Strophe.NS.CDTMSG, type: msg.type})
            .c("meta", {
                name: msg.fromName || Strophe.getNodeFromJid(msg.from),
                headimage: msg.fromHeadImage || SessionManager.getDefaultHeadImage()
            })
            .up().c("content").t(msg.content);

        //发送消息，需要处理这时的异常---这里需要修正消息的发送可靠性问题.
        connection.sendproxy.send(sendMsg.tree());

        //添加接收到的消息到会话明细中
        SessionManager.addSendMessage(sd);
    },

    /**
     * 删除会话，但不删除消息明细
     * @param session
     */
    removeMessage:function(session){//仅删除会话，不删除明细
        db.transaction(function (tx) {
            var del = "delete from cdt_message where sessionId = ?";
            tx.executeSql(del, [session.sessionId], function (tx, res) {
                console.log("delId: " + res.insertId);
            },
            function (tx, error) {
                console.log('DELETE error: ' + error.message);
            });
        }, function (error) {
            console.log('transaction error: ' + error.message);
        }, function () {
            console.log('transaction ok');
        });
    },

    /*
       功能：更新消息，将未读数设置为0
     */
    updateMessage:function(sid){
        db.transaction(function (tx) {
            var update = "update cdt_message set unRead = 0 where sessionId = ?";
            tx.executeSql(update, [sid], function (tx, res) {
                    console.log("updateId: " + res.insertId);
                },
                function (tx, error) {
                    console.log('update error: ' + error.message);
                });
        }, function (error) {
            console.log('transaction error: ' + error.message);
        }, function () {
            console.log('transaction ok');
        });
    },
}



/**
 * 加载消息插件
 * roster为插件名称
 * _$cdt_plugin_templater
 */
Strophe.addConnectionPlugin("message", _$cdt_plugin_message);

