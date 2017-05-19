
var commonService = angular.module('cdApp.servics', []);

commonService.factory('commonService', ['$http',  function ($http) {

    var find = function (postData,actionUrl) {
            return $http.post(actionUrl,
                $.param(postData),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                    }
                }
            )
        };

    var update = function (postData,actionUrl) {
        return $http.post(actionUrl,
            $.param(postData),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                }
            }
        )
    };

    var sendEnvelop=function(actionUrl,envelop){
            var data ={  requestMsg :envelop.getString()};
            return  $http.post(actionUrl,
                $.param(data),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                    }
                }
            )
    };

       return {
           sendEnvelop: function (actionUrl,envelop) {
                return sendEnvelop(actionUrl,envelop);
            },
            find: function (postData,actionUrl) {
                return find(postData,actionUrl);
            },
            update: function (postData,actionUrl) {
                return update(postData,actionUrl);
            },
        };
    }]);

//
commonService.factory('localStorageService', [function() {
    return {
        get: function localStorageServiceGet(key, defaultValue) {
            var stored = localStorage.getItem(key);
            try {
                stored = angular.fromJson(stored);
            } catch (error) {
                stored = null;
            }
            if (defaultValue && stored === null) {
                stored = defaultValue;
            }
            return stored;
        },
        update: function localStorageServiceUpdate(key, value) {
            if (value) {
                localStorage.setItem(key, angular.toJson(value));
            }
        },
        clear: function localStorageServiceClear(key) {
            localStorage.removeItem(key);
        }
    };
}]);

commonService.factory('jpushService',['$http','$window','$document',function($http,$window,$document){
    var jpushServiceFactory={};

    //var jpushapi=$window.plugins.jPushPlugin;

    //启动极光推送
    var _init=function(config){

        if($window.plugins && $window.plugins.jPushPlugin ) {
            $window.plugins.jPushPlugin.init();
            //设置tag和Alias触发事件处理
            document.addEventListener('jpush.setTagsWithAlias', config.stac, false);
            //打开推送消息事件处理
            $window.plugins.jPushPlugin.openNotificationInAndroidCallback = config.oniac;

            $window.plugins.jPushPlugin.setDebugMode(true);
        }
    }
    //获取状态
    var _isPushStopped=function(fun){
        $window.plugins.jPushPlugin.isPushStopped(fun)
    }
    //停止极光推送
    var _stopPush=function(){
        $window.plugins.jPushPlugin.stopPush();
    }

    //重启极光推送
    var _resumePush=function(){
        $window.plugins.jPushPlugin.resumePush();
    }

    //设置标签和别名
    var _setTagsWithAlias=function(tags,alias){
        $window.plugins.jPushPlugin.setTagsWithAlias(tags,alias);
    }

    //设置标签
    var _setTags=function(tags){
        $window.plugins.jPushPlugin.setTags(tags);
    }

    //设置别名
    var _setAlias=function(alias){
        $window.plugins.jPushPlugin.setAlias(alias);
    }

    jpushServiceFactory.init=_init;
    jpushServiceFactory.isPushStopped=_isPushStopped;
    jpushServiceFactory.stopPush=_stopPush;
    jpushServiceFactory.resumePush=_resumePush;
    jpushServiceFactory.setTagsWithAlias=_setTagsWithAlias;
    jpushServiceFactory.setTags=_setTags;
    jpushServiceFactory.setAlias=_setAlias;

    return jpushServiceFactory;
}]);


commonService.factory('appUpdateService',['$rootScope','$ionicActionSheet', '$timeout','$cordovaAppVersion', '$ionicPopup', '$ionicLoading','$cordovaFileTransfer', '$cordovaFile', '$cordovaFileOpener2',
    function($ionicPlatform, $rootScope,$ionicActionSheet, $timeout,  $cordovaAppVersion, $ionicPopup, $ionicLoading, $cordovaFileTransfer, $cordovaFile, $cordovaFileOpener2,commonService) {

        var updateService={};
    // 菜单键
        updateService.onHardwareMenuKeyDown = function() {
        debugger
        $ionicActionSheet.show({
            titleText: '检查更新',
            buttons: [
                { text: '关于' }
            ],
            destructiveText: '检查更新',
            cancelText: '取消',
            cancel: function () {
                // add cancel code..
            },
            destructiveButtonClicked: function () {
                //检查更新
                this.checkUpdate();
            },
            buttonClicked: function (index) {

            }
        });
        $timeout(function () {
            hideSheet();
        }, 2000);
    };

    //从服务端获取最新版本
    var serverAppVersion = "1.2.0";



    // 显示是否更新对话框
        updateService.showUpdateConfirm =function() {
        var confirmPopup = $ionicPopup.confirm({
            title: '版本升级',
            template: '1.当前最新版本为'+serverAppVersion, //从服务端获取更新的内容
            cancelText: '取消',
            okText: '升级'
        });
        confirmPopup.then(function (res) {
            if (res) {
                $ionicLoading.show({
                    template: "已经下载：0%"
                });
                var url = url+"app.apk"; //可以从服务端获取更新APP的路径
                var targetPath = "file:///storage/sdcard0/Download/dyys.apk"; //APP下载存放的路径，可以使用cordova file插件进行相关配置
                var trustHosts = true
                var options = {};
                $cordovaFileTransfer.download(url, targetPath, options, trustHosts).then(function (result) {
                    // 打开下载下来的APP
                    $cordovaFileOpener2.open(targetPath, 'application/vnd.android.package-archive'
                    ).then(function () {
                            // 成功
                            console.log("下载成功");
                        }, function (err) {
                            // 错误
                            console.log("下载失败"+err);
                        });
                    $ionicLoading.hide();
                }, function (err) {
                    alert('下载失败');
                }, function (progress) {
                    //进度，这里使用文字显示下载百分比
                    $timeout(function () {
                        var downloadProgress = (progress.loaded / progress.total) * 100;
                        $ionicLoading.show({
                            template: "已经下载：" + Math.floor(downloadProgress) + "%"
                        });
                        if (downloadProgress > 99) {
                            $ionicLoading.hide();
                        }
                    })
                });
            } else {
                // 取消更新
            }
        });
    }

return updateService;
}]);
