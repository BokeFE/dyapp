/**
 * 花名册插件
 */

/**
 * 定义联系人对象及其方法
 *
 */
function Contact(){
    this.name="";//名称
    this.jid="";
    /*
       联系人连接的资源列表
        resources:{
            "library":｛show:"away",status:"reading"｝
        }
     */
    this.resources={};
    //出席订阅情况
    this.subscription="none";
    this.ask="";
    //联系人所属于花名册组
    this.groups=[];
}
//联系人对象的原型对象
Contact.prototype={
    //判断联系人是否在线,如果其有一个资源在线，则认为联系人在线，否则认为其不在线
    online:function(){
        var result=false;
        for(var k in this.resources){
            result=true;
            break;
        }
        return result;
    }
}

/*
    联系人插件,
        其中init为插件初始化hook
            statusChanged为连接状态改变hook
 */
var _$cdt_plugin_roster={
    //插件初始化操作
    init:function(connection){
       this.connection=connection;
        this.contacts={};
        Strophe.addNamespace('ROSTER',"jabber:iq:roster");
    },
    //状态改变时触发的代码
    statusChanged:function(status){
       if(status===Strophe.Status.CONNECTED){//连接已经建立
           this.contacts={};
           //监测自己的其他连接广播过来的联系人变化情况
           this.connection.addHandler(this.rosterChanged.bind(this),Strophe.NS.ROSTER,"iq","set");
           //监测花名册中的好友广播过来的出席通知
           this.connection.addHandler(this.presenceChanged.bind(this),null,"presence");
           //发送初始化花名册查询，并初始化花名册
           var roster_iq=$iq({type:"get"}).c('query',{xmlns:Strophe.NS.ROSTER});
           var me=this;
           this.connection.sendIQ(roster_iq,function(iq){
                var flag=false;
                $(iq).find("item").each(function(){
                    //构建花名册联系人
                    var contact=new Contact();
                    contact.name=$(this).attr('name') || "";
                    contact.jid=$(this).attr('jid');
                    contact.subscription=$(this).attr("subscription") || "none";
                    contact.ask=$(this).attr("ask") || "";
                    $(this).find("group").each(function(){
                        if(!contact.groups){
                            contact.groups=[];
                        }
                        contact.groups.push($(this).text());
                    });

                    me.contacts[$(this).attr("jid")]=contact;
                    flag=true;
                });

               if(flag){

                   $.postOffice.publish('roster_changed');
               }

           });

       }else if(status===Strophe.Status.DISCONNECTED){//构建连接
           //设置所有的用户为离线状态
           for(var contact in this.contacts){
               this.contacts[contact].resources={};
           }
           //触发通知
           //$(document).trigger('roster_changed',this);
           $.postOffice.publish('roster_changed');
       }
    },

    //监测自己的其他连接广播过来的联系人变化情况
    rosterChanged:function(iq){
        var item=$(iq).find('item');
        var jid=item.attr("jid");
        var subscription=item.attr("subscription")|| "";
        if(subscription==="remove"){
            //删除联系人
            delete  this.contacts[jid];
        }else  if(subscription==="none"){
            //添加联系人
            var contact=new Contact();
            contact.name=item.attr("name")||"";
            contact.jid=$(this).attr('jid');
            item.find("group").each(function(){
                if(!contact.groups){
                    contact.groups=[];
                }
                contact.groups.push($(this).text());
            });
            this.contacts[jid]=contact;
        }else{
            //修改了联系人
            var contact=this.contacts[jid];
            contact.name=item.attr("name")|| contact.name;
            contact.jid=$(this).attr('jid');
            contact.subscription=subscription|| contact.subscription;
            contact.ask=item.attr("ask")||contact.ask;
            contact.groups=[];
            item.find("group").each(function(){
                if(!contact.groups){
                    contact.groups=[];
                }
               contact.groups.push($(this).text());
            });
        }
        //响应iq
        this.connection.send($iq({type:"result",id:$(iq).attr("id")}));
        //触发通知
        //$(document).trigger('roster_changed',this);
      $.postOffice.publish('roster_changed');
        return true;
    },
    //监测花名册中的好友广播过来的出席通知
    presenceChanged:function(presence){
        var from=$(presence).attr("from");
        var jid=Strophe.getBareJidFromJid(from);
        var resource=Strophe.getResourceFromJid(from);
        var ptype=$(presence).attr("type") || "available";
        if(ptype==="subscribe"){
            //自动订阅，注意，但是没有添加好友
            this.connection.send($pres({to:jid,type:"subscribed"}));
            return true;
        }
        if(!this.contacts[jid] || ptype==="error"){
            //忽略错误
            return true;
        }
        if(ptype==="unavailable"){
            //删除对应下线的资源
            delete this.contacts[jid].resources[resource];
        }else{
            this.contacts[jid].resources[resource]={
                show:$(presence).find("show").text() || "online",
                status:$(presence).find("status").text() || ""
            };
        }
        //触发通知
        //$(document).trigger('roster_changed',this);
        $.postOffice.publish('roster_changed');
        return true;

    },
    //添加联系人Strophe.NS.ROSTER
    addContact:function(jid,name,groups){
        var iq=$iq({type:"set"})
            .c("query",{xmlns:Strophe.NS.ROSTER})
            .c("item",{name:name||"",jid:jid});
        if(groups && groups.length>0){
            $.each(groups,function(){
               iq.c("group").t(this).up();
            });
        }
        this.connection.sendIQ(iq);
    },
    //删除联系人
    deleteContact:function(jid){
        var iq=$iq({type:"set"})
            .c("query",{xmlns:Strophe.NS.ROSTER})
            .c("item",{jid:jid,subscription:"remove"});
        this.connection.sendIQ(iq);

    },
    //修改联系人
    modifyContact:function(jid,name,groups){
        this.addContact(jid,name,groups);
    },

    //订阅并添加联系人
    subscribe:function(jid,name,groups){
        this.addContact(jid,name,groups);//先添加联系人
        var presence=$pres({to:jid,type:"subscribe"});
        this.connection.send(presence);

    },

    //退订并删除联系人
    unsubscribe:function(jid){
        var presence=$pres({to:jid,type:"unsubscribe"});
        this.connection.send(presence);
        this.deleteContact(jid);//删除联系人
   }

}

/**
 * 加载插件
 * roster为插件名称
 * _$cdt_plugin_roster
 */
Strophe.addConnectionPlugin("roster",_$cdt_plugin_roster);




