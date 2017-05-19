/*
 *消息发�?�代理，用于可靠性消息发�?
 */
var _$cdt_plugin_sendproxy={
    online:false,
    _pools:[],
    _ping_host:"27.17.54.125",


    init:function(connection){
        _$cdt_plugin_sendproxy.connection = connection;
        _$cdt_plugin_sendproxy._clock=setInterval(_$cdt_plugin_sendproxy._sendPoolsMessage,5000);
    },

    statusChanged:function(status){//连接状�??
        if (status === Strophe.Status.CONNECTED) {//连接已经建立
            _$cdt_plugin_sendproxy.online = true;
        } else if (status === Strophe.Status.DISCONNECTED) {//构建连接
            _$cdt_plugin_sendproxy.online = false;
        }
    },
    _sendPoolsMessage:function(){
        if(_$cdt_plugin_sendproxy._pools && _$cdt_plugin_sendproxy._pools.length>0 && _$cdt_plugin_sendproxy.online && _$cdt_plugin_sendproxy._canSendMessage()){//具备发放消息的条�?
            for(var i=0;i<_$cdt_plugin_sendproxy._pools.length;i++){//准许发�?�消�?
                 var message=_$cdt_plugin_sendproxy._pools.shift();//弹出消息
                 if(message.type=="message"){
                     _$cdt_plugin_sendproxy._resend(message);
                 }else if(message.type=="iq"){
                     _$cdt_plugin_sendproxy._resendIQ(message);
                 }else{
                     console.log("unkown message.");
                 }
            }
        }
    },

    /**
     * message格式�?
     *  �?
     *       type:"message",
     *       message:msg,
     *       callback:callback,
     *       args:参数数组
     *       recount:0
     *
     *  �?
     * @param messaage
     * @private
     */
     _resend:function(message){
        if(connection.connected && connection.authenticated){
            connection.sendIQ($iq({to:_$cdt_plugin_sendproxy._ping_host,type:"get"}).c("ping",{xmlns:"urn:xmpp:ping"}),function(){
                connection.send(message.message);
                if(message.callback &&   typeof message.callback == 'function'){
                    var args = Array.prototype.slice.call(arguments, 2);
                    message.callback.apply(_$cdt_plugin_sendproxy,message.args);
                }

            },function(){//发�?�失败，�?要缓存消息，后续再次发�??
                if(message.recount<500){
                    message.recount+=1;
                    _$cdt_plugin_sendproxy._pools.push(message);//推�?�到缓冲池中
                }
            })
        }else{//缓存
            if(message.recount<500){
                message.recount+=1;//计数�?1
                _$cdt_plugin_sendproxy._pools.push(message);//推�?�到缓冲池中
            }
        }
    },


    /**
     * iq数据类型�?
     *  �?
     *      type:"iq",
     *      message:iq,
     *      ok:ok,
     *      failed: failed,
     *      recount:0
     *  �?
     * @param iq
     * @private
     */
    _resendIQ:function(iq){
        //尝试发�?�，尝试1000
        if(connection.connected && connection.authenticated){
            //发�?�ping�?
            connection.sendIQ($iq({to:_$cdt_plugin_sendproxy._ping_host,type:"get"}).c("ping",{xmlns:"urn:xmpp:ping"}),function(ok){
                connection.sendIQ(iq.message,function(sucess){
                    if(iq.ok &&   typeof iq.ok == 'function'){
                        iq.ok(sucess);
                    }
                },function(error){//返回对应的错误信�?
                    if(iq.failed &&   typeof iq.failed == 'function'){
                        iq.failed(error);
                    }
                })
            },function(err){
                if(iq.recount<500){
                    iq.recount+=1;//计数�?1
                    _$cdt_plugin_sendproxy._pools.push(iq);//推�?�到缓冲池中
                }
            });
        }else{//缓存
            if(iq.recount<500){
                iq.recount+=1;//计数�?1
                _$cdt_plugin_sendproxy._pools.push(iq);//推�?�到缓冲池中
            }
        }
    },


    _canSendMessage:function(){
        return connection.connected && connection.authenticated;
    },



    /**
     * 发�?�消息，可靠性消息发�?
     * callback,发�?�成功时的回调函�?
     *
      */
     send:function(msg,callback){
        //ping成功后发送消�?
        if(connection.connected && connection.authenticated){
            connection.sendIQ($iq({to:_$cdt_plugin_sendproxy._ping_host,type:"get"}).c("ping",{xmlns:"urn:xmpp:ping"}),function(){
                connection.send(msg);
                if(callback &&   typeof callback == 'function'){
                    var args = Array.prototype.slice.call(arguments, 2);
                    callback(args);
                }
            },function(){//发�?�失败，�?要缓存消息，后续再次发�??
                _$cdt_plugin_sendproxy._pools.push({type:"message",message:msg,callback:callback,args: Array.prototype.slice.call(arguments, 2),recount:0});//推�?�到缓冲池中
            })
        }else{//缓存
            _$cdt_plugin_sendproxy._pools.push({type:"message",message:msg,callback:callback,args: Array.prototype.slice.call(arguments, 2),recount:0});//推�?�到缓冲池中
        }
     },

     sendIQ:function(iq,ok,failed){
         //尝试发�?�，尝试1000
         if(connection.connected && connection.authenticated){
             connection.sendIQ($iq({to:_$cdt_plugin_sendproxy._ping_host,type:"get"}).c("ping",{xmlns:"urn:xmpp:ping"}),function(sucess){
                 connection.sendIQ(iq,function(msg){
                     if(ok &&   typeof ok == 'function'){
                         ok(msg);
                     }
                 },function(error){//返回对应的错误信�?
                     if(failed &&   typeof failed == 'function'){
                         failed(error);
                     }
                 })
             },function(err){
                 _$cdt_plugin_sendproxy._pools.push({type:"iq",message:iq,ok:ok,failed: failed,recount:0});//推�?�到缓冲池中
             });
         }else{//缓存
             _$cdt_plugin_sendproxy._pools.push({type:"iq",message:iq,ok:ok,failed: failed,recount:0});//推�?�到缓冲池中
         }
     }
}

/**
 * 加载插件
 * roster为插件名�?
 * _$cdt_plugin_templater
 */
Strophe.addConnectionPlugin("sendproxy",_$cdt_plugin_sendproxy);




