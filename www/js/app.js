// Ionic Starter App
var CurUser=new User();

var OrderManager = {
    _orderList: [],
    _orderMap: {},
    _orderAllList: [],
    pageIndex: 1,
    pageSize: 5,
    totalCount: 0,
    init: function (arr) {
        for (var o in arr) {
            var code = arr[o].code;
            this._orderMap[code] = arr[o];
            this._orderList.push(arr[o]);
        }
        if (!arr || arr.length == 0) {
            this._orderList = [];
            this._orderMap = {};
        }
        this.totalCount = arr.length;
    },
    save: function () {
        var orderlistJson = JSON.stringify(this._orderList);
        localStorage.setItem("orderlistJson", orderlistJson);
        var ordermapJson = JSON.stringify(this._orderMap);
        localStorage.setItem("ordermapJson", ordermapJson);
        var orderallJson = JSON.stringify(this._orderAllList);
        localStorage.setItem("orderallJson", orderallJson);
    },
    reload: function () {
        var orderlistJson = localStorage.getItem("orderlistJson");
        this._orderList = JSON.parse(orderlistJson);
        var ordermapJson = localStorage.getItem("ordermapJson");
        this._orderMap = JSON.parse(ordermapJson);
        var orderallJson = localStorage.getItem("orderallJson");
        this._orderAllList = JSON.parse(orderallJson);
    },
    reset: function () {
        localStorage.setItem("orderlistJson", "");
        this._orderList = [];
        localStorage.setItem("ordermapJson", "");
        this._orderMap = {};
        localStorage.setItem("orderallJson", "");
        this._orderAllList = [];
    },
    reloadArr: function () {
        this._orderList = [];
        for (var o in this._orderMap) {
            var code = this._orderMap[o].code;
            this._orderList.push(this._orderMap[o]);
        }
    },
    addOrder: function (order) {
        var neworder = order;
        this._orderList.unshift(neworder);
        this._orderMap[neworder.code, neworder];
        this.save();
        $.postOffice.publish('orderChange');
    },
    removeOrder: function (order) {
        delete this._orderMap[order.code];
        this.reloadArr();
        this.save();
        $.postOffice.publish('orderChange');
    },
    removeOrderByCode: function (code) {
        delete this._orderMap[code];
        this.reloadArr();
        this.save();
        $.postOffice.publish('orderChange');
    }

    //loadData:function(){
    //  var arr=[];
    //  this._orderList=
    //      if(this._orderList && this._orderList.length){
    //   for(var i=0;i<this._orderList.length;)  {}
    //
    //}
};

function User() {
    this.userid = null;
    this.usercode = null;
    this.xmppId = null;
    this.xmppPwd = null;
    this.curCity = null;
    this.curNode = null;
    this.simpleCode = null;
    this.inviteCode = null;
    this.imageUrl = null;
    this.status = null;
    this.domainid=null;
    this.online=false;

    this.init = function (userobj) {
        localStorage.setItem("userid", userobj.userid);
        localStorage.setItem("usercode", userobj.usercode);
        localStorage.setItem("secretkey", userobj.secretkey);
        localStorage.setItem("imei", userobj.imei);
        localStorage.setItem("status", userobj.status);

        this.userid = userobj.userid;
        this.usercode = userobj.usercode;
        this.imageUrl = userobj.imageUrl;
        this.status = userobj.status;
    };

    this.online = function () {

    };

    this.reload = function () {
        this.userid = localStorage.getItem("userid");
        this.usercode = localStorage.getItem("usercode");
        this.secretkey = localStorage.getItem("secretkey");
        this.imei = localStorage.getItem("imei");

    };


    //this.addSubscribe=function() {
    //    //订阅系统节点，无需查询是否已订阅
    //    var iq=$iq({type:"set",to:"pubsub.xmpp.cdtfax.com"}).c("pubsub",{xmlns:"http://jabber.org/protocol/pubsub"}).
    //        c("subscribe",{node:"$global_orgapp",jid:Strophe.getBareJidFromJid(connection.jid)});
    //    connection.sendproxy.sendIQ(iq,function(ok){
    //        console.log('订阅系统节点成功');
    //        //alert("ok");
    //    },function(err){
    //        //alert("error");
    //    });
    //}
    //
    //this.cancelSubscribe=function(){
    //    //取消订阅城市节点
    //    var reply = $iq({to:"pubsub."+domain, from:connection.jid, type: 'get', id: 'search' , xmlns : 'http://jabber.org/protocol/httpbind'})
    //        .c("pubsub",{xmlns : 'http://jabber.org/protocol/pubsub'}).c("subscriptions");
    //    connection.sendproxy.sendIQ(reply.tree(),
    //        function(e){
    //            var subs=e.getElementsByTagName("subscription");
    //            for(var i=0;i<subs.length;i++){
    //                var sid=subs[i].getAttribute("subid");
    //                var n= subs[i].getAttribute("node");
    //                var jid=subs[i].getAttribute("jid");
    //                if(n==this.curNode){
    //                    var re = $iq({to:"pubsub."+domain, from: connection.jid, type: 'set'})
    //                        .c("pubsub",{xmlns : 'http://jabber.org/protocol/pubsub'}).c("unsubscribe",{node :this.curNode  ,jid : jid ,subid:sid});
    //                    connection.sendproxy.sendIQ(re.tree());
    //                }
    //            }
    //        },
    //        function(){
    //            alert("error substrib ");
    //        },10000
    //    );
    //}
};

$.postOffice = ( function () {
    /**订阅消息
     * @param {Object} channel:订阅的频道
     * @param {Object} fn：回调函数
     */
    var subscribe = function (channel, fn, owner) {
            //alert("subscribe:"+channel);
            if (!$.postOffice.channels[channel]) {
                $.postOffice.channels[channel] = [];
            }
            if (owner) {
                $.postOffice.channels[channel].push({
                    context: owner, //这里的owner是订阅消息的对象，函数fn是其中的一个函数
                    callback: fn
                });
                return this;
                //注意，默认情况这里的this为邮局对象本身
            } else {
                $.postOffice.channels[channel].push({
                    context: this,
                    callback: fn
                });
                return this;
            }
        },
        /**
         * 向某个频道发送消息，消息一旦发布，会立马查看订阅了该频道消息的的对象，并执行其回调函数
         * @param {Object} channel 频道
         */
        publish = function (channel) {
            if (!$.postOffice.channels[channel]) {//发布时没有人订阅事件，不需要处理
                return false;
            }
            //注意，发布消息时，除了第一个参数外，其他的参数作为回调函数的输入参数被输入
            var args = Array.prototype.slice.call(arguments, 1);
            //获取除chanel外的参数
            //扫描这个频道的订阅者
            for (var i = 0, l = $.postOffice.channels[channel].length; i < l; i++) {
                var subscription = $.postOffice.channels[channel][i];
                subscription.callback.apply(subscription.context, args);
            }
            return this;
        };

    /*
     *返回对应的对象，
     */
    return {
        channels: {},
        publish: publish,
        subscribe: subscribe,
        /**
         *  将消息安装到obj对象上，这样obj对象即为当前的工作上下文，等效于subscribe中的owner代理
         * @param {Object} obj
         */
        installTo: function (obj) {
            obj.subscribe = subscribe;
            obj.publish = publish;
        }
    };

}());

angular.module('cdApp', ['ionic', 'ngCordova', 'cdApp.routes', 'cdApp.controllers','ionic-native-transitions'])
    .run(function ($ionicPlatform, $rootScope, $cordovaNetwork,$ionicPopup,$cordovaToast, $cordovaDialogs,$ionicViewSwitcher, $location, $ionicHistory, $state,$cordovaDevice) {
        $ionicPlatform.ready(function () {
            var platform = $cordovaDevice.getPlatform();
            localStorage.setItem('device',platform);
            if (window.cordova && window.cordova.plugins.Keyboard) {
                var device=localStorage.getItem('device');
                if(device=='iOS'){
                    cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
                    cordova.plugins.Keyboard.disableScroll(true);
                }
            }
            if (window.StatusBar) {
                StatusBar.styleLightContent();
            }

            navigator.splashscreen.hide();

            //检测更新

            //推送初始化
           //var options={
           //     tags:"tag1",
           //     alias:"alias1"
           // };
           // var setTagsWithAliasCallback=function(event){
           //     window.alert('result code:'+event.resultCode+' tags:'+event.tags+' alias:'+event.alias);
           // }
           // var openNotificationInAndroidCallback=function(data){
           //     var json=data;
           //     window.alert(json);
           //     if(typeof data === 'string'){
           //         json=JSON.parse(data);
           //     }
           //     var id=json.extras['cn.jpush.android.EXTRA'].id;
           //     //window.alert(id);
           //     var alert = json.extras['cn.jpush.android.ALERT'];
           //     $state.go('pushDetail',{id:id+alert});
           // }
           // var config={
           //     stac:setTagsWithAliasCallback,
           //     oniac:openNotificationInAndroidCallback
           // };

            //jpushService.init(config);
            //
            //jpushService.setTagsWithAlias(options);

            //检测设备网络状况
            $rootScope.$on('$cordovaNetwork:online', function (event, networkState) {
                window.isOnline = true;
            });
            $rootScope.$on('$cordovaNetwork:offline', function (event, networkState) {
                window.isOnline = false;
            });

        });

        /*注册返回事件*/

        $ionicPlatform.registerBackButtonAction(function (e) {
            //判断处于哪个页面时双击退出
            e.preventDefault();
            if ($location.path() == '/tab/home' || $location.path() == '/tab/tracking' || $location.path() == '/tab/setting') {
                if ($rootScope.backButtonPressedOnceToExit) {
                    ionic.Platform.exitApp();
                } else {
                    $rootScope.backButtonPressedOnceToExit = true;
                    $cordovaToast.showShortTop('再按一次退出系统');
                    setTimeout(function () {
                        $rootScope.backButtonPressedOnceToExit = false;
                    }, 2000);
                }
            }
            else if ($ionicHistory.backView() ) {
                $ionicHistory.goBack();
            } else {
                $rootScope.backButtonPressedOnceToExit = true;
                $cordovaToast.showShortTop('再按一次退出系统');
                setTimeout(function () {
                    $rootScope.backButtonPressedOnceToExit = false;
                }, 2000);
            }

            return false;
        }, 101);

        //
    })
    .config(['$ionicConfigProvider', function ($ionicConfigProvider) {
        $ionicConfigProvider.tabs.position('bottom'); // other values: top
        $ionicConfigProvider.views.maxCache(0); // 清楚缓存设置
        $ionicConfigProvider.views.transition('no'); //去掉国际化设置
    }])
    //原生插件 提升性能
    .config(function($ionicNativeTransitionsProvider){
        $ionicNativeTransitionsProvider.setDefaultOptions({
            duration: 400, // in milliseconds (ms), default 400,
            slowdownfactor: 4, // overlap views (higher number is more) or no overlap (1), default 4
            iosdelay: -1, // ms to wait for the iOS webview to update before animation kicks in, default -1
            androiddelay: -1, // same as above but for Android, default -1
            winphonedelay: -1, // same as above but for Windows Phone, default -1,
            fixedPixelsTop: 0, // the number of pixels of your fixed header, default 0 (iOS and Android)
            fixedPixelsBottom: 0, // the number of pixels of your fixed footer (f.i. a tab bar), default 0 (iOS and Android)
            triggerTransitionEvent: '$ionicView.afterEnter', // internal ionic-native-transitions option
            backInOppositeDirection: false // Takes over default back transition and state back transition to use the opposite direction transition to go back
        });
    });
//
