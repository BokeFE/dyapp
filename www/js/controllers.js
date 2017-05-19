var url = "http://222.42.38.189:8085/Yigo/app/";
//var url="http://localhost:2972/CDTORGAPP/js/";
//var url="http://localhost:8080/YigoProject/app/";
var baseUrl="http://222.42.38.189:8085/Yigo/";

angular.module('cdApp.controllers', ['cdApp.servics'])
    .controller('homeCtrl', function ($scope, $rootScope, $state, $cordovaToast, $cordovaDialogs, commonService,jpushService) {
            $scope.$on('$ionicView.beforeEnter', function () {
                $scope.checkLogin();
            });

        $scope.doingList = [];
        $scope.allList = [];
        $scope.orderDtl = {};
        $scope.first = 0;
        $scope.dataRows = [];
        $scope.activated=1;

        $scope.checkLogin = function () {
            if (localStorage.getItem("userid") == null || localStorage.getItem("userid") == "") {
                try {
                    $cordovaToast.showShortCenter('请登录').then(function (success) {
                    }, function (error) {
                    });
                } catch (e) {
                }
                $state.go("login");
            }
        };

        $scope.$on('$ionicView.enter', function () {
            $scope.load();
            $scope.loadAll();
        });
        $scope.init = function () {
            if (localStorage.getItem("userid") != null) {
                CurUser.reload();
            }
        }

        var envelop1 = new Envelop("loadTask");
        $scope.load = function () {
            ProgressIndicator.showSimple(true);
                envelop1.body.userid = localStorage.getItem("userid");
                commonService.sendEnvelop(url + "task.jsp?k="+uuid()+"&userid="+envelop1.body.userid, envelop1).success(function (result) {
               if (result.head.status == 1) {
                    $scope.isOnline = true;
                    $scope.doingList = result.body.doingList;
                    $scope.$broadcast('scroll.refreshComplete');
                } else {
                    $cordovaDialogs.alert(result.head.errorMsg, '', '确定');
                    $scope.$broadcast('scroll.refreshComplete');
                }
                    ProgressIndicator.hide();
            }).error(function (err) {
                ProgressIndicator.hide();
                $cordovaToast.showShortCenter('网络异常，请稍后重试');
            });
        }
        $scope.doRefresh = function () {
            if ($scope.activated == 2) {
                ProgressIndicator.showSimple(true);
                $scope.loadAll();
                ProgressIndicator.hide();
            } else {
                $scope.load();
            }
        }

        var envelop2 = new Envelop("contractTask");
        $scope.loadAll = function () {
            //ProgressIndicator.showSimple(true);
            envelop2.body.userid = localStorage.getItem("userid");
            commonService.sendEnvelop(url + "contractTask.jsp?k="+uuid()+"&userid="+ envelop2.body.userid, envelop2).success(function (result) {
                if (result.head.status == 1) {
                    $scope.allList = [];
                    $scope.allList=result.body.allList;
                    $scope.$broadcast('scroll.refreshComplete');
                } else {
                    $scope.$broadcast('scroll.refreshComplete');
                }
               // ProgressIndicator.hide();
            }).error(function (err) {
               // ProgressIndicator.hide();
                $cordovaToast.showShortCenter('网络异常，请稍后重试');
            });
          //  ProgressIndicator.hide();
        }

        $scope.loadMore = function () {
            if ($scope.activated == 1) {
                $scope.$broadcast('scroll.infiniteScrollComplete');
                return;
            }
            $scope.noMoreData = false;
            ProgressIndicator.showSimple(true);
            if (null != envelop2) {
                if (envelop2.body.pageIndex) {
                    envelop2.body.pageIndex = envelop2.body.pageIndex + 1;
                }
                else {
                    envelop2.body.pageIndex = 1;
                }
                envelop2.body.pageSize = 10;
                envelop2.body.userid = localStorage.getItem("userid");
                envelop2.body.curCity = localStorage.getItem("curCity");
                envelop2.body.domainid = localStorage.getItem("domainid");
                commonService.sendEnvelop(url + "loadOrgAllorder", envelop2).success(function (result) {
                    if (result.head.status == 1) {
                        if (result.body.hasData == 1) {
                            for (var i = 0; i < result.body.alllist.length; i++) {
                                $scope.allList.push(result.body.alllist[i]);
                                $scope.$broadcast('scroll.infiniteScrollComplete');
                            }
                            $scope.noMoreData = false;
                        } else {
                            $scope.noMoreData = true;
                            $cordovaToast.showShortCenter('没有更多了');
                            $scope.$broadcast('scroll.infiniteScrollComplete');
                        }
                    } else {
                        $cordovaDialogs.alert('数据异常，稍后请重试！', '', '确定');
                        $scope.noMoreData = true;
                    }
                    ProgressIndicator.hide()
                }).error(function (err) {
                    ProgressIndicator.hide();
                    $cordovaToast.showShortCenter('网络异常，请稍后重试');
                });
            }
        }

        //$scope.$on('$stateChangeSuccess', function () {
        //    //  $scope.loadMore();
        //});
        //tab 切换
        $scope.activated = 1;
        $scope.getList = function (t) {
            $scope.activated =t;
            $scope.noMoreData = true;
        }

        //明细
        $scope.viewDtl = function (order) {
            $state.go("orderDetail", {
                "orderId": order.billid,
                "flag": order.type
            });
        }

        //合同
        $scope.contractDtl = function (order) {
            $state.go("contractDetail", {
                "id": order.billid,
                "instanceid":order.instanceid,
                "workitemid":order.workitemid
            });
        }
    })

    .controller('contractDetailCtrl', function ($scope,$rootScope, $state,$timeout, $stateParams,$ionicPopup,$ionicPopover,$ionicLoading,$cordovaFileTransfer, $ionicHistory,$sce,$location, $cordovaDialogs, $cordovaToast, commonService) {
        $scope.$on('$ionicView.beforeEnter', function () {
            if (window.isOnline == false) {
                $state.go("offline");
                return;
            }
        });

        $scope.$on('$ionicView.enter', function () {
            document.addEventListener("deviceready", onDeviceReady, false);
            function onDeviceReady() {
                window.open = cordova.InAppBrowser.open;
            }
        });

        $scope.curOrder = {};
        $scope.curOrder.orderDtlTab=1;
        $scope.activated=1;
        $scope.curFile={hasfile:0};
        $scope.isAdmin=false;
        $scope.canChangeSPR=false;

        $scope.curWork="";
        $scope.load = function () {
            ProgressIndicator.showSimple(true);
            var orderId = $stateParams.id;
            var envelop = new Envelop("gettaskdtl");
            envelop.body.userid = localStorage.getItem("userid");
            envelop.body.id = orderId;
            envelop.body.instanceid= $stateParams.instanceid;
            commonService.sendEnvelop(url + "contractDtl.jsp?rd="+uuid()+"&id="+orderId+"&instanceid="+ $stateParams.instanceid, envelop).success(function (result) {
                if (result.head.status == 1) {
                    $scope.curOrder = result.body;
                    $scope.curOrder.basic=$scope.curOrder.basic[0];
                    if($scope.curOrder.files && $scope.curOrder.files.length>0) {
                        for (var i = 0; i < $scope.curOrder.files.length; i++) {
                            if($scope.curOrder.files[i].DOCTYPE=='JPG'){
                                $scope.curOrder.files[i].PATH =baseUrl+"/AttachMent/"+ $scope.curOrder.files[i].FILENAME ;
                            }else
                                {
                                $scope.curOrder.files[i].PATH = baseUrl+"/pdfjs/web/viewer.html?file=../../AttachMent/" + $scope.curOrder.files[i].FILENAME;

                            }
                            $scope.curOrder.files[i].LINKPATH =baseUrl+"/AttachMent/"+ $scope.curOrder.files[i].FILENAME ;
                        }
                    }
                    //是否需要设置人员
                    //if($scope.curOrder.users && $scope.curOrder.users.length>0){
                    //
                    //}else {
                        if ($scope.curOrder.workflow && $scope.curOrder.workflow.length > 0) {
                            $scope.curWork = $scope.curOrder.workflow[$scope.curOrder.workflow.length - 1].WORKITEMDESC;
                            if($scope.curWork=="规划部主任审批")
                                $scope.canChangeSPR=true;
                        }
                    //}
                    $scope.$broadcast('scroll.refreshComplete');
                } else {
                    $scope.$broadcast('scroll.refreshComplete');
                    $cordovaDialogs.alert(result.head.errorMsg, '', '确定');
                }
                 ProgressIndicator.hide();
            }).error(function (err) {
                // ProgressIndicator.hide();
                $cordovaToast.showShortCenter('网络异常，请稍后重试');
            });
            // ProgressIndicator.hide();
        }
        $scope.load();
        $scope.myGoBack = function () {
            $rootScope.$ionicGoBack();
        };
        $scope.go = function (path) {
            $location.path(path);
        };

        $scope.dtlTab =function(t){
            $scope.activated=t;
        }

        $scope.curFile={};

        $scope.down=function(row) {
            var ref = window.open(row.LINKPATH, '_system', 'location=yes');
            ref.addEventListener('loadstart', function (event) {
                console.log('start: ' + event.url);
            });
            ref.addEventListener('loadstop', function (event) {
                console.log('stop: ' + event.url);
            });
            ref.addEventListener('loaderror', function (event) {
                console.log('error: ' + event.message);
            });
            ref.addEventListener('exit', function (event) {
                console.log(event.type);
            });
        }

        $scope.downFile=function(row){
            var srvurl =url + "download.jsp?rd="+uuid()+"&path="+row.PATH
            var filename = row.PATH.split("\\").pop();

            var targetPath = cordova.file.externalRootDirectory + filename;
            var trustHosts = true;
            var options = {};
            //url提交的服务器地址 targetPath提交图片的本地地址
            $cordovaFileTransfer.download(srvurl, targetPath, options, trustHosts)
                .then(function(result) {
                    // Success!
                    $scope.curFile.name=filename;
                    $scope.curFile.path=targetPath;
                    alert(JSON.stringify(result));//把对象转化成字符串

                    var ext=filename.split(".").pop();
                    var filetype='';
                    if(ext.toUpperCase() == "PDF" ) {
                        filetype="application/pdf";
                    }else if(ext.toUpperCase() == "DOC" || ext.toUpperCase() == "DOCX"  ){
                        filetype="application/msword";
                    }else if(ext.toUpperCase() == "XLS" || ext.toUpperCase() == "XLSX"  ){
                        filetype="application/vnd.ms-excel";
                    }else{
                        filetype="image/"+ext;
                    }

                    $cordovaFileOpener2.open(
                        targetPath,
                        filetype
                    ).then(function() {
                            alert("OK");
                            console.log('Success');
                        }, function(err) {
                            console.log('Error' + err );
                        });

                }, function(error) {
                    // Error
                    alert(JSON.stringify(error));
                }, function (progress) {
                	 $timeout(function(){
                         var downloadProgress = (progress.loaded / progress.total) * 100;
                           $ionicLoading.show({
                                 template: "已经下载：" + Math.floor(downloadProgress) + "%"
                           });
                           if (downloadProgress > 99) {
                                 $ionicLoading.hide();
                           }
                     })
                });
        }

        $scope.viewFile=function(row,$event){
            if(!row.HASFILE){
                $cordovaToast.showShortCenter('未上传文件，无法预览');
                return;
            }
            $scope.curFile=row;
            //$scope.curFile.VIEWPATH=baseUrl+"AttachMent\\"+row.FILENAME;
            $scope.openPopover($event);
        }

        $scope.trustSrc = function(src) {
            return $sce.trustAsResourceUrl(src);
        }

        // 文档预览
        var template = '<ion-popover-view class="filePopover">' +
            '<ion-header-bar class=" bar">  <h1 class="title" style=" text-align: center;" >{{curFile.FILENAME}}</h1>  <a class="button" ng-click="closePopover()">X</a></ion-header-bar> ' +
            '<ion-content> ' +
            '<img ng-if="curFile.DOCTYPE==\'JPG\'" ng-src="{{curFile.PATH}}" />'+
            '<iframe ng-if="curFile.DOCTYPE==\'PDF\'" data-tap-disabled="true" style="height:100%;width:100%;min-height:480px" ng-src="{{trustSrc(curFile.PATH)}}"></iframe>'+
            '<div ng-if="curFile.DOCTYPE==\'OTHER\'" style="padding:20px">暂不支持该格式的文件(只支持PDF文件和图片预览)<br/> <a ng-click="down(curFile)">下载文件</a></div>'+
            ' </ion-content>' +
            '</ion-popover-view>';
        $scope.popover = $ionicPopover.fromTemplate(template, {
            scope: $scope
        });

        $scope.openPopover = function($event) {
            $scope.popover.show($event);
        };
        $scope.closePopover = function() {
            $scope.popover.hide();
        };
        // 清除浮动框
        $scope.$on('$destroy', function() {
            $scope.popover.remove();
        });
        // 在隐藏浮动框后执行
        $scope.$on('popover.hidden', function() {
            // 执行代码
        });
        // 移除浮动框后执行
        $scope.$on('popover.removed', function() {
            // 执行代码
        });

        //修改审批人
        $scope.changeSPR =function(){
            $state.go("auditUserSet", {
                "billid": $stateParams.id
            });
        }

        //审批
        $scope.doSubmit =function(auditResult){
            ProgressIndicator.showSimple(true);
            var envelop = new EmptyEnvelop("workflow");
            envelop.body.userid = localStorage.getItem("userid");
            envelop.body.bid =  $stateParams.id;
            envelop.body.result=auditResult.result;
            envelop.body.remark=auditResult.remark;
            envelop.body.wid=  $stateParams.workitemid;
            var stepGUID=$stateParams.stepGUID;
            var wurl =  url+"workflow.jsp?rd="+uuid()+"&userid="+ envelop.body.userid +"&bid=" +  $stateParams.id+ "&result=" + auditResult.result + "&remark=" + auditResult.remark+"&wid="+  $stateParams.workitemid;
            commonService.sendEnvelop( wurl , envelop).success(function (result) {
                if (result.head.status!="1"){
                    $cordovaDialogs.alert(result.ErrorMessage, '', '确定');
                    $scope.$broadcast('scroll.refreshComplete');
                }else{
                    $cordovaToast.showShortCenter('提交成功！');
                    $scope.myGoBack();
                }
                    ProgressIndicator.hide();
            }).error(function (err) {
                  ProgressIndicator.hide();
                $cordovaToast.showShortCenter('网络异常，请稍后重试');
            });
        }

    //设置参与会签人员
        $scope.setAuditUser = function() {
            $state.go("auditUser", {
                "billid": $stateParams.id
            });
        }

        $scope.submit =function() {
            //设置会签人员
            if( $scope.curWork == "合同管理人审批" && (!$scope.curOrder.users || $scope.curOrder.users.length==0) ){
                $scope.setAuditUser();
                return;
            }
            //设置审批人
            if( $scope.curWork == "规划部主任审批" &&  $scope.curOrder.basic.SHENPIREN==""){
                $scope.changeSPR();
                return;
            }

            $scope.auditResult = {};
            var myPopup = $ionicPopup.show({
                template: '<textarea rows="5" ng-model="auditResult.remark" style="width:100%"></textarea>',
                title: '填写处理意见',
                scope: $scope,
                buttons: [
                    {
                        text: '取消',
                        onTap: function (e) {
                            return 0;
                        }
                    },
                    {
                        text: '<b>不通过</b>',
                        type: 'button-assertive',
                        onTap: function (e) {
                            if (!$scope.auditResult.remark) {
                                $scope.auditResult.remark="";
                            //    e.preventDefault();
                            }
                                return -1;
                            //}
                        }
                    },
                    {
                        text: '<b>通过</b>',
                        type: 'button-positive',
                        onTap: function (e) {
                            if (!$scope.auditResult.remark) {
                                $scope.auditResult.remark="";
                                //    e.preventDefault();
                            }
                                return 1;
                            //}
                        }
                    },
                ]
            });

            myPopup.then(function (res) {
                if(res==0) {
                    return;
                }
                $scope.auditResult.result = res;
                $scope.doSubmit($scope.auditResult);
            });
        }
    })

    .controller('auditUserCtrl', function ($scope,$rootScope, commonService, $interval,$stateParams, $state, $cordovaDialogs, $cordovaToast, $ionicHistory) {

        $scope.$on('$ionicView.beforeEnter', function () {
            if (window.isOnline == false) {
                $state.go("offline");
                return;
            }
        });

        $scope.myGoBack = function () {
            $backView = $ionicHistory.backView();
            $backView.go();
        };

        $scope.items=[];
        $scope.load=function() {
            ProgressIndicator.showSimple(true);
            var envelop = new EmptyEnvelop("getAuditUser");
            envelop.body.userid =localStorage.getItem("userid");
            commonService.sendEnvelop(url + "getAuditUser.jsp" , envelop).success(function (result) {
                if(result.head.status=="1"){
                    $scope.items=result.body.list;
                }else{
                    $cordovaToast.showShortCenter('网络异常，请稍后重试');
                }
                ProgressIndicator.hide();
            }).error(function () {
                $cordovaToast.showShortCenter('网络异常，请稍后重试');
            });
        }

        $scope.load();

        $scope.submit=function() {
            var envelop = new EmptyEnvelop("submitAuditUser");
            envelop.body.userid =localStorage.getItem("userid");
            commonService.sendEnvelop(url + "updateAuditUser.jsp?rd="+uuid()+"&id="+$stateParams.billid+"&userlist="+JSON.stringify($scope.items) , envelop).success(function (result) {
                if(result.head.status=="1"){
                    $rootScope.$ionicGoBack();
                }else{
                    $cordovaToast.showShortCenter('网络异常，请稍后重试');
                }
            }).error(function () {
                $cordovaToast.showShortCenter('网络异常，请稍后重试');
            });
        }
    })
    .controller('auditUserSetCtrl', function ($scope,$rootScope, commonService, $interval,$stateParams, $state, $cordovaDialogs, $cordovaToast, $ionicHistory) {

        $scope.$on('$ionicView.beforeEnter', function () {
            if (window.isOnline == false) {
                $state.go("offline");
                return;
            }
        });

        $scope.myGoBack = function () {
            $backView = $ionicHistory.backView();
            $backView.go();
        };

        $scope.selectUser =function(item){
            for(var i=0;i< $scope.items.length;i++){
                if(item.LABEL==$scope.items[i].LABEL){
                    $scope.items[i].SELECTED=true;
                }else{
                    $scope.items[i].SELECTED=false;
                }
            }
        }

        $scope.items=[];
        $scope.load=function() {
            ProgressIndicator.showSimple(true);
            var envelop = new EmptyEnvelop("getAuditUserSet");
            envelop.body.userid =localStorage.getItem("userid");
            commonService.sendEnvelop(url + "getAuditUserSet.jsp?id="+$stateParams.billid  , envelop).success(function (result) {
                if(result.head.status=="1"){
                    $scope.items=result.body.list;
                }else{
                    $cordovaToast.showShortCenter('网络异常，请稍后重试');
                }
                ProgressIndicator.hide();
            }).error(function () {
                $cordovaToast.showShortCenter('网络异常，请稍后重试');
            });
        }

        $scope.load();

        $scope.submit=function() {
            var envelop = new EmptyEnvelop("submitAuditUser");
            envelop.body.userid =localStorage.getItem("userid");
            commonService.sendEnvelop(url + "updateAuditUserSet.jsp?rd="+uuid()+"&id="+$stateParams.billid+"&userlist="+JSON.stringify($scope.items) , envelop).success(function (result) {
                if(result.head.status=="1"){
                    $rootScope.$ionicGoBack();
                }else{
                    $cordovaToast.showShortCenter('网络异常，请稍后重试');
                }
            }).error(function () {
                $cordovaToast.showShortCenter('网络异常，请稍后重试');
            });
        }
    })
    .controller('loginCtrl', function ($scope, commonService, $interval, $state, $cordovaDialogs, $cordovaToast, $ionicHistory) {
        $scope.$on('$ionicView.beforeEnter', function () {
            if (window.isOnline == false) {
                $state.go("offline");
                return;
            }
        });
        $scope.user = {};
        $scope.myGoBack = function () {
            $backView = $ionicHistory.backView();
            $backView.go();
        };
        $scope.go = function (path) {
            $location.path(path);
        };
        $scope.login = function () {
            var user = $scope.user;
            if (!user.usercode) {
                return;
            }
            if (  !user.pwd) {
                user.pwd="";
            }

            //获取当前用户登录信息
            var curLoginInfo = localStorage.getItem(user.usercode);
            //初始化用户登录信息
            if (!curLoginInfo) {
                 curLoginInfo = {"tel": user.usercode, "failedLoginCount": 0, "lock": 0};
            } else {
                curLoginInfo = JSON.parse(curLoginInfo);
            }
            ProgressIndicator.showSimple(true);
            var envelop = new EmptyEnvelop("login");
            envelop.body.usercode = user.usercode;
            envelop.body.pwd = user.pwd;

            commonService.sendEnvelop(url + "userLogin.jsp?user="+user.usercode+"&pwd="+user.pwd, envelop).success(function (result) {
                 if (result.head.status == 1) {
                    $cordovaToast.showShortCenter('登陆成功');
                    curLoginInfo.lastSuccessLoginTime = (new Date()).Format("yyyy-M-d h:m:s.S");
                    curLoginInfo.failedLoginCount = 0;
                    curLoginInfo.lock = 0;
                    curLoginInfo.lockTime = null;
                    //connection.reConnect();
                    CurUser.init(result.body);
                    localStorage.setItem(user.usercode, JSON.stringify(curLoginInfo));
                    user.usercode = "";
                    user.pwd = "";
                    $state.go("tab.home");
                } else {
                    curLoginInfo.lastFailedLoginTime = (new Date()).Format("yyyy-M-d h:m:s.S");
                    var count = curLoginInfo.failedLoginCount;
                    if (!count) {
                        count = 0;
                    } else {
                        count = Number(count);
                    }
                    count += 1;
                    if (count >= 2 && count < 5) {
                        $cordovaDialogs.alert(result.head.errorMsg + "，您还有" + (5 - count) + "次机会，连续输入错误次数超过5次，账号将被锁定", '', '确定');
                    } else if (count >= 5) {
                        $cordovaDialogs.alert("由于您的输入次数超过5次，账号已被锁定,请您一个小时后再登录", '', '确定');
                        curLoginInfo.lock = 1;
                        curLoginInfo.lockTime = parseInt(new Date().getTime() / 1000);
                    } else {
                        $cordovaDialogs.alert("用户名或密码错误", '', '确定');
                    }
                    curLoginInfo.failedLoginCount = count;
                    //保存
                    localStorage.setItem(user.usercode, JSON.stringify(curLoginInfo));
                }
                ProgressIndicator.hide();
            }).error(function (err) {
                ProgressIndicator.hide();
                $cordovaToast.showShortCenter('网络异常，请稍后重试');
            })
        }
        $scope.paracont = "获取验证码";
        $scope.paraclass = "but_null";
        $scope.paraevent = true;
        $scope.fastLogin = function () {
            var user = $scope.user;
            if (!user.tel) {
                $cordovaDialogs.alert('请输入正确的手机号', '', '确定');
                return;
            }
            if (!user.sms) {
                $cordovaDialogs.alert('请输入验证码', '', '确定');
                return;
            }
            var envelop = new Envelop("fastLogin");
            envelop.body.tel = user.tel;
            envelop.body.validateCode = user.sms;
            ProgressIndicator.showSimple(true);
            commonService.sendEnvelop(url + "fastLogin", envelop).success(function (result) {
                ProgressIndicator.hide();
                if (result.head.status == 1) {
                    $cordovaToast.showShortCenter('登录成功！');
                    CurUser.init(result.body);
                    user.tel = "";
                    user.sms = "";
                    reConnect();
                    $state.go("tab.home", {})
                } else {
                    $cordovaDialogs.alert(result.head.errorMsg, '', '确定');
                }
            }).error(function (err) {
                ProgressIndicator.hide();
                $cordovaToast.showShortCenter('网络异常，请稍后重试');
            });
        }
        $scope.sendSmsCode = function () {
            var user = $scope.user;
            if (!user.tel) {
                $cordovaDialogs.alert("手机号不可为空", '', '确定');
                return;
            }
            var myreg = /(^13\d{9}$)|(^14)[5,7]\d{8}$|(^15[0,1,2,3,5,6,7,8,9]\d{8}$)|(^17)[0,6,7,8]\d{8}$|(^18\d{9}$)/;
            if (!myreg.test(user.tel)) {
                $cordovaDialogs.alert('请输入有效的手机号码！', '', '确定');
                return;
            }
            $scope.disabled = true;
            var envelop = new Envelop("sendValidateCode3");
            envelop.body.tel = user.tel;
            commonService.sendEnvelop(url + "sendValidateCode3", envelop).success(function (result) {
                if (result.head.status == 1) {
                    changeSecond();
                    localStorage.setItem("validateCode", result.body.code);
                } else {
                    $cordovaDialogs.alert(result.head.errorMsg, '', '确定');
                    $scope.disabled = false;
                }
            }).error(function (err) {
                ProgressIndicator.hide();
                $cordovaToast.showShortCenter('网络异常，请稍后重试');
                $scope.disabled = false;
            });
        }
        function changeSecond() {
            var second = 60,
                timePromise = undefined;
            timePromise = $interval(function () {
                if (second <= 0) {
                    $interval.cancel(timePromise);
                    timePromise = undefined;
                    second = 60;
                    $scope.paracont = "重发验证码";
                    $scope.paraclass = "but_null";
                    $scope.paraevent = true;
                    $scope.disabled = false;
                } else {
                    $scope.paracont = second + "秒后可重发";
                    $scope.paraclass = "not but_null";
                    $scope.disabled = true;
                    second--;
                }
            }, 1000, 100);
        }
    })
    .controller('successCtrl', function ($scope, $state, $stateParams, $ionicHistory) {
        $scope.num = $stateParams.successId;
        $scope.telNum = $stateParams.telNum;
        $scope.myGoBack = function () {
            $backView = $ionicHistory.backView();
            $backView.go();
        };
        $scope.go = function (path) {
            $location.path(path);
        };
        $scope.talk = function () {
            $state.go("messageDetail", {
                "messageId": $scope.telNum,
                "name": Strophe.getNodeFromJid($scope.telNum)
            });
        }
    })
    .controller('regCtrl', function ($scope, commonService, $state, $interval, $cordovaDialogs, $cordovaToast) {
        $scope.$on('$ionicView.beforeEnter', function () {
            if (window.isOnline == false) {
                $state.go("offline");
                return;
            }
        });
        $scope.paracont = "获取验证码";
        $scope.paraevent = true;
        $scope.data = {};
        $scope.register = function () {
            var data = $scope.data;
            if (!data.tel) {
                $cordovaDialogs.alert('请输入手机号', '', '确定');
                return;
            }
            if (!data.msg) {
                $cordovaDialogs.alert('请输入验证码', '', '确定');
                return;
            }
            if (!data.pwd) {
                $cordovaDialogs.alert('请输入密码', '', '确定');
                return;
            }
            var myreg = /(^13\d{9}$)|(^14)[5,7]\d{8}$|(^15[0,1,2,3,5,6,7,8,9]\d{8}$)|(^17)[0,6,7,8]\d{8}$|(^18\d{9}$)/;
            if (!myreg.test(data.tel)) {
                $cordovaDialogs.alert('请输入有效的手机号码！', '', '确定');
                return;
            }
            ProgressIndicator.showSimple(true);
            $scope.btnDisabled = true;
            var city = localStorage.getItem("curCity");
            var envelop = new Envelop("cdtRegister");
            envelop.body.tel = data.tel;
            envelop.body.validateCode = data.msg;
            envelop.body.pwd = data.pwd;
            envelop.body.city = city;
            envelop.body.inviteCode = data.inviteCode;
            commonService.sendEnvelop(url + "register", envelop).success(function (result) {
                ProgressIndicator.hide();
                if (result.head.status == 1) {
                    //$cordovaToast.showShortCenter('登录成功！');
                    CurUser.init(result.body);
                    reConnect();
                    $state.go("success", {
                        successId: "1",
                        telNum: ''
                    })
                } else {
                    //$scope.btnDisabled=false;
                    $cordovaDialogs.alert(result.head.errorMsg, '', '确定');
                }
                $scope.btnDisabled = false;
            });
        };
        //发送验证码
        $scope.sendValidateCode = function () {
            var data = $scope.data;
            if (!data.tel) {
                return;
            }
            var myreg = /(^13\d{9}$)|(^14)[5,7]\d{8}$|(^15[0,1,2,3,5,6,7,8,9]\d{8}$)|(^17)[0,6,7,8]\d{8}$|(^18\d{9}$)/;
            if (!myreg.test(data.tel)) {
                $cordovaDialogs.alert('请输入有效的手机号码！', '', '确定');
                return;
            }
            $scope.disabled = true;
            var envelop = new Envelop("sendValidateCode2");
            envelop.body.tel = data.tel;
            commonService.sendEnvelop(url + "sendValidateCode2", envelop).success(function (result) {
                if (result.head.status == 1) {
                    changeSecond();
                    localStorage.setItem("validateCode", result.body.code);
                } else {
                    $cordovaDialogs.alert(result.head.errorMsg, '', '确定');
                    $scope.disabled = false;
                }
            }).error(function (err) {
                $cordovaToast.showShortCenter('网络异常，请稍后重试');
                $scope.disabled = false;
            });
        }
        function changeSecond() {
            var second = 60,
                timePromise = undefined;
            timePromise = $interval(function () {
                if (second <= 0) {
                    $interval.cancel(timePromise);
                    timePromise = undefined;
                    second = 60;
                    $scope.paracont = "重发验证码";
                    $scope.paraclass = "but_null";
                    $scope.paraevent = true;
                    $scope.disabled = false;
                } else {
                    $scope.paracont = second + "秒后可重发";
                    $scope.paraclass = "not but_null";
                    $scope.disabled = true;
                    second--;
                }
            }, 1000, 100);
        }
    })


    .controller('forgetPassCtrl', function ($scope, commonService, $state, $interval, $cordovaDialogs, $cordovaToast) {
        $scope.$on('$ionicView.beforeEnter', function () {
            if (window.isOnline == false) {
                $state.go("offline");
                return;
            }
        });
        $scope.user = {};
        $scope.paracont = "获取验证码";
        $scope.paraclass = "but_null";
        $scope.paraevent = true;
        $scope.updPwd = function () {
            var user = $scope.user;
            var reg = /^(?![0-9]+$)(?![a-zA-Z]+$)[0-9A-Za-z]{6,16}$/;
            var str = document.getElementById("pwd");
            var str1 = document.getElementById("pwd1");
            if (!user.oldpwd) {
                $cordovaDialogs.alert('请输入原密码', '', '确定');
                return;
            }
            if (!user.pwd) {
                $cordovaDialogs.alert('密码小于6位数或未输入密码', '', '确定')
                return;
            }
            if (!user.pwd1) {
                $cordovaDialogs.alert('密码小于6位数或未输入密码', '', '确定')
                return;
            }
            if (!reg.test(str.value)) {
                $cordovaDialogs.alert('请输入6-16位且字母加数字的组合', '', '确定')
                    .then(function () {
                        str.value = "";
                        str1.value = "";
                    });
                return;
            }
            if (user.pwd != user.pwd1) {
                $cordovaDialogs.alert('密码输入不一致,请重新输入', '', '确定')
                return;
            }
            var envelop = new Envelop("pwdUpdate");
            envelop.body.oldpwd = user.oldpwd;
            envelop.body.pwd = user.pwd;
            envelop.body.pwd1 = user.pwd1;
            user.userid=localStorage.getItem("userid");
            commonService.sendEnvelop(url + "updPwd.jsp?user="+user.userid+"&pwd="+user.oldpwd+"&newpwd="+user.pwd, envelop).success(function (result) {
                if (result.head.status == 1) {
                    $cordovaToast.showShortCenter('密码修改成功！');
                    $state.go("tab.setting");
                    user.oldpwd = "";
                    user.pwd = "";
                    user.pwd1 = "";
                } else {
                    $cordovaDialogs.alert(result.head.errorMsg, '', '确定');
                }
            });
        }
        $scope.sendSmsCode = function () {
            var user = $scope.user;
            if (!user.tel) {
                $cordovaDialogs.alert('手机号不可为空', '', '确定')
                return;
            }
            var myreg = /(^13\d{9}$)|(^14)[5,7]\d{8}$|(^15[0,1,2,3,5,6,7,8,9]\d{8}$)|(^17)[0,6,7,8]\d{8}$|(^18\d{9}$)/;
            if (!myreg.test(user.tel)) {
                $cordovaDialogs.alert('请输入有效的手机号码！', '', '确定');
                return;
            }
            $scope.disabled = true;
            var envelop = new Envelop("sendValidateCode3");
            envelop.body.tel = user.tel;
            commonService.sendEnvelop(url + "sendValidateCode3", envelop).success(function (result) {
                if (result.head.status == 1) {
                    changeSecond();
                    localStorage.setItem("validateCode", result.body.code);
                   // console.log("验证码:" + result.body.code);
                } else {
                    $cordovaDialogs.alert(result.head.errorMsg, '', '确定');
                    $scope.disabled = false;
                }
            }).error(function (err) {
                $cordovaToast.showShortCenter('网络异常，请稍后重试');
                $scope.disabled = false;
            });
        }
        function changeSecond() {
            var second = 60,
                timePromise = undefined;
            timePromise = $interval(function () {
                if (second <= 0) {
                    $interval.cancel(timePromise);
                    timePromise = undefined;
                    second = 60;
                    $scope.paracont = "重发验证码";
                    $scope.paraclass = "but_null";
                    $scope.paraevent = true;
                    $scope.disabled = false;
                } else {
                    $scope.paracont = second + "秒后可重发";
                    $scope.paraclass = "not but_null";
                    $scope.disabled = true;
                    second--;
                }
            }, 1000, 100);
        }
    })
    .controller('myAccountCtrl', function ($scope, $timeout, $rootScope, $state, commonService, $cordovaFileTransfer, $cordovaActionSheet, $cordovaCamera, $cordovaDialogs, $cordovaToast) {
        $scope.$on('$ionicView.beforeEnter', function () {
            $scope.getCurrCity();
            setAgentAccount();
        });
        $scope.agentUser = {};
        $scope.getCurrCity = function () {
            if (!$rootScope.currCity) {
                $scope.currCity = '获取中…';
            } else {
                $scope.currCity = $rootScope.currCity;
            }
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        }
        $scope.$on('currCity_changed', function () {//监听新的消息的到来
            $scope.getCurrCity();
        });
        $scope.load = function () {
            if (localStorage.getItem('userid') == null || localStorage.getItem('userid') == '') {
                $state.go("login");
            } else {
                $scope.agentUser.imageUrl = 'images/defaultHeader.png';
                $scope.agentUser.status = 0;
                $scope.agentUser.tel = localStorage.getItem('usercode');
                var envelop = new Envelop("queryAgentAccount");
                envelop.body.userId = localStorage.getItem('userid');
                commonService.sendEnvelop(url + "queryAgentAccount", envelop).success(
                    function (responseData) {
                        if (responseData.head.status == 1) {
                            if (responseData.body.result == 1) {
                                $scope.agentUser.status = responseData.body.status;
                                if (null == responseData.body.imgUrl || responseData.body.imgUrl == '') {
                                    $scope.agentUser.imageUrl = 'images/defaultHeader.png';
                                } else {
                                    //  将服务器上图片下载到本地缓存
                                    var url = responseData.body.imgUrl;
                                    var targetPath = cordova.file.dataDirectory + "headerImage.jpg";
                                    var trustHosts = true;
                                    var options = {};
                                    $cordovaFileTransfer.download(url, targetPath, options, trustHosts)
                                        .then(function (result) {
                                           // console.log(result)
                                        }, function (err) {
                                            // Error
                                           // console.log(err)
                                        }, function (progress) {
                                            $timeout(function () {
                                                $scope.downloadProgress = (progress.loaded / progress.total) * 100;
                                                console.log($scope.downloadProgress);
                                                if ($scope.downloadProgress == 100) {
                                                    $scope.agentUser.imageUrl = targetPath;
                                                    localStorage.setItem('imageUrl', targetPath);
                                                    // 下载成功后对头像赋值
                                                }
                                            });
                                        });
                                }
                                $scope.agentUser.realName = responseData.body.realName;
                                $scope.agentUser.companyName = responseData.body.companyName;
                                $scope.agentUser.status = responseData.body.status;
                                //$scope.agentUser.tel=localStorage.getItem('usercode');
                                localStorage.setItem('headerImg', responseData.body.imgUrl);
                                localStorage.setItem('realName', responseData.body.realName);
                                localStorage.setItem('companyName', responseData.body.companyName);
                                localStorage.setItem('idStatus', responseData.body.status);
                                return;
                            }
                        }
                        setAgentAccount();
                    }
                ).error(function (data, status, headers, config) {
                        setAgentAccount();
                        //$cordovaDialogs.alert("连接错误，错误码：" + status, '温馨提示', '确定');
                    });
            }
        };
        function setAgentAccount() {
            if (null != localStorage.getItem('imageUrl') && localStorage.getItem('imageUrl') != '' && localStorage.getItem('imageUrl') != 'null') {
                $scope.agentUser.imageUrl = localStorage.getItem('imageUrl');
            } else {
                $scope.agentUser.imageUrl = 'images/defaultHeader.png';
            }
            if (null != localStorage.getItem('realName') && 'null' != localStorage.getItem('realName') && localStorage.getItem('realName') != '') {
                $scope.agentUser.realName = localStorage.getItem('realName');
            } else {
                $scope.agentUser.realName = "";//"未认证";
            }
            if (null != localStorage.getItem('companyName') && 'null' != localStorage.getItem('companyName') && localStorage.getItem('companyName') != '') {
                $scope.agentUser.companyName = localStorage.getItem('companyName');
            } else {
                $scope.agentUser.companyName = "";
            }
            if (null != localStorage.getItem('idStatus') && 'null' != localStorage.getItem('idStatus') && localStorage.getItem('idStatus') != '') {
                $scope.agentUser.status = localStorage.getItem('idStatus');
            } else {
                $scope.agentUser.status = 0;
            }
            $scope.agentUser.tel = localStorage.getItem('usercode');
        }

        $scope.changeHeaderImg = function () {
            var options = {
                title: '请选择',
                buttonLabels: ['拍照', '从相册选择'],
                addCancelButtonWithLabel: '取消',
                androidEnableCancelButton: true,
                winphoneEnableCancelButton: true
            };
            $cordovaActionSheet.show(options)
                .then(function (btnIndex) {
                    var index = btnIndex;
                    if (index == 1) {
                        $scope.changeByCamera(1);
                    } else if (index == 2) {
                        $scope.changeByCamera(0);
                    }
                });
        }
        $scope.changePic = function (url) {
            //$("#myHeaderImg").attr("src",url);
            $scope.agentUser.imageUrl = url;
        }
        $scope.changeByCamera = function (sourceType) {
            var options = {
                quality: 50,
                destinationType: Camera.DestinationType.FILE_URI,
                sourceType: sourceType,
                allowEdit: true,
                encodingType: Camera.EncodingType.JPEG,
                targetWidth: 100,
                targetHeight: 100,
                popoverOptions: CameraPopoverOptions,
                saveToPhotoAlbum: false,
                correctOrientation: true
            };
            $cordovaCamera.getPicture(options).then(function (imageData) {
                //var image = document.getElementById('myHeaderImg');
                //image.src = imageData;
                var server = 'uploadHeadImg';
                var filePath = imageData;
                var options = {};
                $cordovaFileTransfer.upload(url + server, filePath, options)
                    .then(function (result) {
                        if ('null' != result.response) {
                            var imageStr = result.response;
                            $scope.agentUser.imageUrl = imageStr;
                            localStorage.setItem("headerImg", imageStr);
                            localStorage.setItem("imageUrl", imageStr);
                            //localStorage.setItem("base64Image",imageStr);
                            //connection.agentpic.save(result.response);
                            var envelop = new Envelop("saveImageUrl");
                            envelop.body.userId = localStorage.getItem("userid");
                            envelop.body.imageUrl = imageStr;
                            commonService.sendEnvelop(url + "saveImageUrl", envelop).success(function (result) {
                                if (result.head.status == 1) {
                                    if (result.body.status == 1) {
                                        $cordovaToast.showShortCenter('图片上传成功');
                                    }
                                } else {
                                    $cordovaDialogs.alert(result.head.errorMsg, '温馨提示', '确定');
                                }
                            }).error(function (data, status, headers, config) {
                                $cordovaDialogs.alert("连接错误，错误码：" + status, '温馨提示', '确定');
                            });
                        }
                    }, function (err) {
                        $cordovaDialogs.alert('图像上传失败，稍后重试！', '温馨提示', '确定')
                    }, function (progress) {
                        // constant progress updates
                    });
            }, function (err) {
                // error
            });
        }
    })
    .controller('identificationCtrl', function ($scope, $state, commonService, $cordovaDialogs, $cordovaActionSheet, $cordovaCamera, $cordovaFileTransfer) {
        $scope.data = {};
        var envelop;
        $scope.load = function () {
            if (null != localStorage.getItem('userid') && localStorage.getItem('userid') != '') {
                envelop = new Envelop("queryAgentInfo");
                envelop.body.userId = localStorage.getItem('userid');
                commonService.sendEnvelop(url + "queryAgentInfo", envelop).success(function (result) {
                    if (result.head.status == 1) {
                        $scope.data.realName = result.body.realName;
                        $scope.data.idCard = result.body.idCard;
                        $scope.data.companyName = result.body.companyName;
                        $scope.data.status = result.body.status;
                        if (null != result.body.imgUrl && result.body.imgUrl != '') {
                            $scope.data.imgUrl = result.body.imgUrl;
                        } else {
                            $scope.data.imgUrl = "images/demo.png";
                        }
                    } else {
                        $cordovaDialogs.alert("数据异常，稍后请重试！", '温馨提示', '确定');
                    }
                });
            } else {
                $scope.data.imgUrl = 'images/demo.png';
            }
        };
        $scope.$on('$ionicView.beforeEnter', function () {
            if (window.isOnline == false) {
                $state.go("offline");
                return;
            }
            $scope.load();
        });
        $scope.changeIdImage = function () {
            var options = {
                title: '请选择',
                buttonLabels: ['拍照', '从相册选择'],
                addCancelButtonWithLabel: '取消',
                androidEnableCancelButton: true,
                winphoneEnableCancelButton: true
            };
            $cordovaActionSheet.show(options)
                .then(function (btnIndex) {
                    var index = btnIndex;
                    if (index == 1) {
                        $scope.changeByCamera(1);
                    } else if (index == 2) {
                        $scope.changeByCamera(0);
                    }
                });
        }
        $scope.changeByCamera = function (sourceType) {
            var options = {
                quality: 50,
                destinationType: Camera.DestinationType.FILE_URI,
                sourceType: sourceType,
                allowEdit: false,
                encodingType: Camera.EncodingType.JPEG,
                targetWidth: 100,
                targetHeight: 100,
                popoverOptions: CameraPopoverOptions,
                saveToPhotoAlbum: false,
                correctOrientation: true
            };
            $cordovaCamera.getPicture(options).then(function (imageData) {
                var server = 'upload';
                var filePath = imageData;
                var options = {};
                $cordovaFileTransfer.upload(url + server, filePath, options)
                    .then(function (result) {
                        if ('null' != result.response) {
                            $scope.data.imgUrl = result.response;//result.response;
                        }
                    }, function (err) {
                        $cordovaDialogs.alert('图像上传失败，稍后重试！', '', '确定')
                    }, function (progress) {
                        // constant progress updates
                    });
            }, function (err) {
                // error
            });
        }
        $scope.verifyIdCard = function () {
            var data = $scope.data;
            //alert(data);
            envelop = new Envelop("verifyIdCard");
            if (null == localStorage.getItem('userid') || localStorage.getItem('userid') == '') {
                $state.go("login");
                return;
            }
            if (null == data.realName || data.realName == '') {
                $cordovaDialogs.alert('真实姓名不能为空', '温馨提示！', '确定');
                return;
            }
            if (null == data.idCard || data.idCard == '') {
                $cordovaDialogs.alert('身份证不能为空', '温馨提示！', '确定');
                return;
            }
            //身份证正则表达式(18位)
            var isIDCard1 = /^[1-9]\d{7}((0\d)|(1[0-2]))(([0|1|2]\d)|3[0-1])\d{3}$|^[1-9]\d{5}[1-9]\d{3}((0\d)|(1[0-2]))(([0|1|2]\d)|3[0-1])\d{3}([0-9]|X)$/;
            if (!isIDCard1.test(data.idCard)) {
                $cordovaDialogs.alert('身份证不合法', '温馨提示！', '确定');
                return;
            }
            if (null == data.companyName || data.companyName == '') {
                $cordovaDialogs.alert('公司名称不能为空', '温馨提示！', '确定');
                return;
            }
            if (null == data.imgUrl || data.imgUrl == '' || data.imgUrl == 'images/demo.png') {
                $cordovaDialogs.alert('上传图片不能为空', '温馨提示！', '确定');
                return;
            }
            ProgressIndicator.showSimple(true);
            envelop.body.userId = localStorage.getItem('userid');// '5f263b57f09944cf9c696a646691eab4';
            envelop.body.realName = data.realName;
            envelop.body.idCard = data.idCard;
            envelop.body.companyName = data.companyName;
            envelop.body.city = localStorage.getItem('curCity');
            envelop.body.imgUrl = data.imgUrl;
            commonService.sendEnvelop(url + "verifyIdCard", envelop).success(function (result) {
                ProgressIndicator.hide();
                if (result.head.status == 1) {
                    if (result.body.result == 1 || result.body.result == 2) {
                        $cordovaDialogs.alert('提交成功！', '温馨提示！', '确定')
                            .then(function () {
                                $state.go("tab.myAccount");
                            });
                    } else {
                        $cordovaDialogs.alert('提交失败，稍后请重试！', '温馨提示！', '确定')
                    }
                } else {
                    $cordovaDialogs.alert('数据异常，稍后请重试！', '温馨提示！', '确定')
                }
            });
        };
    })
    .controller('descriptionCtrl', function ($scope, $state, commonService, $cordovaDialogs) {
        $scope.data = {};
        $scope.load = function () {
            if (null == localStorage.getItem('userid') || localStorage.getItem('userid') == '') {
                $cordovaDialogs.alert('请先登录后填写个人描述', '温馨提示！', '确定')
                    .then(function () {
                        $state.go("login");
                    });
                return;
            }
            var envelop = new Envelop("queryAgentDesc");
            envelop.body.userId = localStorage.getItem('userid');// '5f263b57f09944cf9c696a646691eab4';
            commonService.sendEnvelop(url + "queryAgentDesc", envelop).success(function (result) {
                if (result.head.status == 1) {
                    if (result.body.result == 1) {
                        $scope.data.content = result.body.content;
                    }
                } else {
                    $cordovaDialogs.alert("数据异常，稍后请重试！", '温馨提示', '确定');
                }
            });
        };
        $scope.$on('$ionicView.beforeEnter', function () {
            if (window.isOnline == false) {
                $state.go("offline");
                return;
            }
            $scope.load();
        });
        $scope.description = function () {
            var data = $scope.data;
            if (null == localStorage.getItem('userid') || localStorage.getItem('userid') == '') {
                $cordovaDialogs.alert('请先登录后填写个人描述', '温馨提示！', '确定')
                    .then(function () {
                        $state.go("login");
                    });
                return;
            }
            if (null == data.content || data.content == '') {
                $cordovaDialogs.alert('个人描述不能为空', '温馨提示！', '确定');
                return;
            }
            var envelop = new Envelop("description");
            envelop.body.userId = localStorage.getItem('userid');
            envelop.body.content = data.content;
            commonService.sendEnvelop(url + "description", envelop).success(function (result) {
                if (result.head.status == 1) {
                    if (result.body.result == 1) {
                        $cordovaDialogs.alert('提交成功！', '温馨提示！', '确定')
                            .then(function () {
                                $state.go("tab.myAccount");
                            });
                    } else {
                        $cordovaDialogs.alert('提交失败，稍后请重试！', '温馨提示！', '确定')
                    }
                } else {
                    $cordovaDialogs.alert('数据异常，稍后请重试！', '温馨提示！', '确定')
                }
            });
        };
    })


    .controller('settingCtrl', function ($scope, $ionicActionSheet, $timeout,  $cordovaAppVersion, $ionicPopup,$ionicHistory,$cordovaDialogs, $ionicLoading, $cordovaToast, $cordovaFileTransfer, $cordovaFile, $cordovaFileOpener2,commonService) {

        $scope.version="1.0.0";

        $scope.$on('$ionicView.beforeEnter', function () {
            if (window.isOnline == false) {
                $state.go("offline");
                return;
            }
        });

        $scope.$on('$ionicView.enter', function () {
            //检查更新
            cordova.getAppVersion.getVersionNumber(function(version){
                $scope.version=version;
                //如果本地与服务端的APP版本不符合
                commonService.find({},url+"getVersion.jsp?rd="+uuid()).success(function (result) {
                    if(result.head.status=="1") {
                        serverAppVersion = result.body.version;
                        if (version != serverAppVersion) {
                            $scope.version="有新版本V"+serverAppVersion;
                            localStorage.setItem("version",serverAppVersion);
                        }else{
                            $scope.version="当前版本"+serverAppVersion;
                        }
                    }
                },function(err){
                    alert(err);
                    //  console.log(err);
                });
            });
        });

        $scope.checkUpdate=function(){
                //获取版本
            ProgressIndicator.showSimple(true);
            cordova.getAppVersion.getVersionNumber(function(version){
                $scope.version=version;
                //如果本地与服务端的APP版本不符合
                commonService.find({},url+"getVersion.jsp?rd="+uuid()).success(function (result) {
                    if(result.head.status=="1") {
                        alert("服务器版本 ：" + result.body.version);
                        alert("当前版本 ：" + version);
                        serverAppVersion = result.body.version;
                        if (version != serverAppVersion) {
                            showUpdateConfirm(serverAppVersion);
                        }else{
                            $scope.version="当前版本"+serverAppVersion;
                        }
                    }else{
                        console.log(result);
                    }
                    ProgressIndicator.hide();
                },function(err){
                    console.log(err);
                });
            });

           // document.addEventListener("menubutton", onHardwareMenuKeyDown, false);
        }

         function onHardwareMenuKeyDown() {
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
                    $scope.checkUpdate();
                },
                buttonClicked: function (index) {

                }
            });
            $timeout(function () {
                hideSheet();
            }, 2000);
        };

        // 显示是否更新对话框
        function showUpdateConfirm(serverAppVersion) {

            var confirmPopup = $ionicPopup.confirm({
                title: '版本升级',
                template: '当前最新版本为' + serverAppVersion+"，确定更新吗？", //从服务端获取更新的内容
                cancelText: '取消',
                okText: '更新'
            });
            confirmPopup.then(function (res) {
                if (res) {
                    $ionicLoading.show({
                        template: "已经下载：0%"
                    });
                    alert("开始下载");
                    var updateurl = url + "app.apk"; //可以从服务端获取更新APP的路径
                    var targetPath = "file:///storage/sdcard0/Download/dyys.apk"; //APP下载存放的路径，可以使用cordova file插件进行相关配置
                    var trustHosts = true
                    var options = {};
                    $cordovaFileTransfer.download(updateurl, targetPath, options, trustHosts).then(function (result) {
                        // 打开下载下来的APP
                        $cordovaFileOpener2.open(targetPath, 'application/vnd.android.package-archive'
                        ).then(function () {
                                // 成功
                                console.log("下载成功");
                            }, function (err) {
                                // 错误
                                console.log("下载失败" + err);
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

        $scope.clearCache=function(){
            $ionicHistory.clearCache();
			var userid=localStorage.getItem("userid");
            window.localStorage.clear();
            localStorage.setItem("userid",userid);
            $cordovaToast.showShortCenter('缓存清除成功!');
        }
        //$scope.updateApp= function () {
        //    ProgressIndicator.showSimple(true);
        //    $timeout(function () {
        //        ProgressIndicator.hide();
        //        $cordovaToast.showShortCenter('当前为最新版本').then(function(success) {
        //            // success
        //        }, function (error) {
        //            // error
        //        });
        //    },3000)
        //}
        //$scope.quitApp= function () {
        //    $cordovaDialogs.confirm('是否确定退出应用？', '', ['取消','确定'])
        //        .then(function(buttonIndex) {
        //            var btnIndex = buttonIndex;
        //            if(btnIndex==2){
        //            		//清空数据表
        //                db.transaction(function (tx) {
        //                	tx.executeSql('delete from cdt_message');
        //					          tx.executeSql('delete from cdt_message_detail');
        //					        }, function (error) {
        //					        	console.log('transaction error: ' + error.message);
        //					        }, function () {
        //					        	console.log('transaction ok');
        //					        });
        //                navigator.app.exitApp();
        //            }
        //        });
        //}
        $scope.logout = function () {
            $cordovaDialogs.confirm('是否确定退出？', '', ['取消', '确定'])
                .then(function (buttonIndex) {
                    var btnIndex = buttonIndex;
                    if (btnIndex == 2) {
                        $ionicHistory.clearCache();
                        window.localStorage.clear();
                        ionic.Platform.exitApp();
                    }
                });
        }
    })
    .controller('changePassCtrl', function ($scope, commonService, $state, $interval, $cordovaDialogs, $cordovaToast) {
        $scope.$on('$ionicView.beforeEnter', function () {
            if (window.isOnline == false) {
                $state.go("offline");
                return;
            }
        });
        var tel = localStorage.getItem("usercode");
        $scope.user = {};
        $scope.paracont = "获取验证码";
        $scope.paraclass = "but_null";
        $scope.paraevent = true;
        $scope.updPwd = function () {
            var user = $scope.user;
            var reg = /^(?![0-9]+$)(?![a-zA-Z]+$)[0-9A-Za-z]{6,16}$/;
            var str = document.getElementById("pwd");
            var str1 = document.getElementById("pwd1");
            if (!user.oldpwd) {
                $cordovaDialogs.alert('请输入原密码', '', '确定');
                return;
            }
            if (!user.pwd) {
                $cordovaDialogs.alert('密码小于6位数或未输入密码', '', '确定')
                return;
            }
            if (!user.pwd1) {
                $cordovaDialogs.alert('密码小于6位数或未输入密码', '', '确定')
                return;
            }
            if (!reg.test(str.value)) {
                $cordovaDialogs.alert('请输入6-16位且字母加数字的组合', '', '确定')
                    .then(function () {
                        str.value = "";
                        str1.value = "";
                    });
                return;
            }
            if (user.pwd != user.pwd1) {
                $cordovaDialogs.alert('密码输入不一致,请重新输入', '', '确定')
                return;
            }
            var envelop = new Envelop("pwdUpdate");
            envelop.body.oldpwd = user.oldpwd;
            envelop.body.pwd = user.pwd;
            envelop.body.pwd1 = user.pwd1;
            user.userid=localStorage.getItem("userid");
            commonService.sendEnvelop(url + "updPwd.jsp?user="+user.userid+"&pwd="+user.oldpwd+"&newpwd="+user.pwd, envelop).success(function (result) {
                if (result.head.status == 1) {
                    $cordovaToast.showShortCenter('密码修改成功！');
                    $state.go("tab.setting");
                    user.oldpwd = "";
                    user.pwd = "";
                    user.pwd1 = "";
                } else {
                    $cordovaDialogs.alert(result.head.errorMsg, '', '确定');
                }
            });
        }
        $scope.sendSmsCode = function () {
            var user = $scope.user;
            if (!tel) {
                $cordovaDialogs.alert('您还未登录,请先登录', '温馨提示', '确定');
                return;
            }
            var myreg = /(^13\d{9}$)|(^14)[5,7]\d{8}$|(^15[0,1,2,3,5,6,7,8,9]\d{8}$)|(^17)[0,6,7,8]\d{8}$|(^18\d{9}$)/;
            if (!myreg.test(tel)) {
                $cordovaDialogs.alert('请输入有效的手机号码！', '', '确定');
                return;
            }
            $scope.disabled = true;
            var envelop = new Envelop("sendValidateCode3");
            envelop.body.tel = tel;
            commonService.sendEnvelop(url + "sendValidateCode3", envelop).success(function (result) {
                if (result.head.status == 1) {
                    changeSecond();
                    localStorage.setItem("validateCode", result.body.code);
                   // console.log("验证码:" + result.body.code);
                } else {
                    $cordovaDialogs.alert(result.head.errorMsg, '温馨提示！', '确定');
                    $scope.disabled = false;
                }
            }).error(function (err) {
                $cordovaToast.showShortCenter('网络异常，请稍后重试');
                $scope.disabled = false;
            });
        }
        function changeSecond() {
            var second = 60,
                timePromise = undefined;
            timePromise = $interval(function () {
                if (second <= 0) {
                    $interval.cancel(timePromise);
                    timePromise = undefined;
                    second = 60;
                    $scope.paracont = "重发验证码";
                    $scope.paraclass = "but_null";
                    $scope.paraevent = true;
                    $scope.disabled = false;
                } else {
                    $scope.paracont = second + "秒后可重发";
                    $scope.paraclass = "not but_null";
                    $scope.disabled = true;
                    second--;
                }
            }, 1000, 100);
        }
    })
    .controller('feedbackCtrl', function ($scope, $state, $cordovaDialogs, commonService) {
        $scope.data = {};
        $scope.$on('$ionicView.beforeEnter', function () {
            if (window.isOnline == false) {
                $state.go("offline");
                return;
            }
            $scope.data.content = '';
        });
        $scope.submitOpinion = function () {
            var data = $scope.data;
            var envelop = new Envelop("opinionFeedback");//undefined
            if (localStorage.getItem("userid") == null || localStorage.getItem("userid") == "") {
                $cordovaDialogs.alert('请先登录后发布贷款', '温馨提示！', '确定')
                    .then(function () {
                        $state.go("login");
                    });
            }
            if (data.content == null || data.content == "") {
                $cordovaDialogs.alert('请您输入反馈内容！', '温馨提示！', '确定');
                return;
            }
            envelop.body.content = data.content;
            envelop.body.userid = localStorage.getItem("userid");
            commonService.sendEnvelop(url + "suggest.jsp?user="+envelop.body.userid+"&su="+data.content, envelop).success(function (result) {
                if (result.head.status == 1) {
                    //alert( result.body.rows);
                    if (result.head.status=="1") {
                        $cordovaDialogs.alert('提交成功，感谢您宝贵的意见！', '温馨提示！', '确定')
                            .then(function () {
                                $state.go("tab.setting");
                            })
                    } else {
                        $cordovaDialogs.alert('提交失败，稍后请重试！', '温馨提示！', '确定');
                    }
                } else {
                    $cordovaDialogs.alert('数据异常，稍后请重试！', '温馨提示！', '确定');
                }
            });
        };
    })
    .controller('aboutCtrl', function ($scope) {
    })
    .controller('myOrderCtrl', function ($scope, $state, $cordovaDialogs, commonService) {
        $scope.$on('$ionicView.beforeEnter', function () {
            if (window.isOnline == false) {
                $state.go("offline");
            }
            $scope.load();
        });
        $scope.activated = 0;
        $scope.total = 0;
        var envelop;
        $scope.load = function () {
            if (localStorage.getItem('userid') == null) {
                $state.go("login");
            } else {
                $scope.row = {};
                envelop = new Envelop("myOrderCtrl");
                envelop.body.activated = $scope.activated;
                envelop.body.userId = localStorage.getItem('userid');
                envelop.body.pageSize = 5;
                envelop.body.pageIndex = 1;
                envelop.body.totalCount = 0;
                commonService.sendEnvelop(url + "myOrderCtrl", envelop).success(
                    function (responseData) {
                        if (responseData.head.status == 1) {
                            //成功
                            $scope.rows = responseData.body.orders;
                            $scope.total = responseData.body.total;
                        } else {
                            $cordovaDialogs.alert(responseData.body.errorMsg, '', '确定');
                        }
                    }
                ).error(function (data, status, headers, config) {
                        $cordovaDialogs.alert("连接错误，错误码：" + status, '', '确定');
                    });
            }
        }
        $scope.changeStatus = function (flag) {
            $scope.activated = flag;
            $scope.row = {};
            $scope.noMoreData = false;
            $scope.load();
        }
        $scope.talk = function (xmppid, username) {
            $state.go("messageDetail", {
                "messageId": xmppid + "@" + domain,
                "name": username
            });
        }
        $scope.loadMore = function () {
            $scope.noMoreData = false;
            if (null != envelop) {
                envelop.body.pageIndex = envelop.body.pageIndex + 1;
                commonService.sendEnvelop(url + "myOrderCtrl", envelop).success(function (result) {
                    if (result.head.status == 1) {
                        if (result.body.hasData == 1) {
                            for (var i = 0; i < result.body.orders.length; i++) {
                                $scope.rows.push(result.body.orders[i]);
                                $scope.$broadcast('scroll.infiniteScrollComplete');
                            }
                        } else {
                            $scope.noMoreData = true;
                            $scope.$broadcast('scroll.infiniteScrollComplete');
                        }
                    } else {
                        $cordovaDialogs.alert("数据异常，稍后请重试！", '', '确定');
                    }
                });
            }
        }
        $scope.$on('stateChangeSuccess', function () {
            $scope.loadMore();
        });
        $scope.changeOrder = function (id) {
            $state.go("disposeOrder", {
                "rowId": id
            });
        }
        //明细
        $scope.dtl = function (order) {
            alert(order.billid);
            $state.go("orderDetail", {
                "orderId": order.billid,
                "flag": order.type
            });
        }
    })
    .controller('orderDetailCtrl', function ($scope,$rootScope, $state, $stateParams, $ionicHistory,$ionicPopup, $location, $cordovaDialogs, $cordovaToast, commonService) {
        $scope.$on('$ionicView.beforeEnter', function () {
            if (window.isOnline == false) {
                $state.go("offline");
                return;
            }
        });
        $scope.curOrder = {};
        $scope.curOrder.orderDtlTab=1;
        $scope.flag = $stateParams.flag;
        $scope.btnDisabled = false;

        $scope.load = function () {
            ProgressIndicator.showSimple(true);
            var orderId = $stateParams.orderId;
            var envelop = new Envelop("getOrder");
            envelop.body.orderId = orderId;
            commonService.sendEnvelop(url + "taskDtl.jsp?id="+orderId+"&r="+uuid(), envelop).success(function (result) {
                if (result.head.status == 1) {
                        $scope.curOrder = result.body;
                        $scope.curOrder.main.type=$stateParams.flag;
                        $scope.curOrder.orderDtlTab=0;
                    $scope.$broadcast('scroll.refreshComplete');
                } else {
                    $scope.$broadcast('scroll.refreshComplete');
                    $cordovaDialogs.alert(result.head.errorMsg, '', '确定');
                }
                ProgressIndicator.hide();
            }).error(function (err) {
                ProgressIndicator.hide();
                $cordovaToast.showShortCenter('网络异常，请稍后重试');
            });
           //ProgressIndicator.hide();
        }
        $scope.load();
        $scope.myGoBack = function () {
            $backView = $ionicHistory.backView();
            $backView.go();
        };
        $scope.go = function (path) {
            $location.path(path);
        };

        $scope.dtlTab =function(t){
            $scope.curOrder.orderDtlTab=t;
        }

        //审批
        $scope.do = function(){
            $scope.auditResult = {};
            var myPopup = $ionicPopup.show({
                template: '<textarea rows="5" ng-model="auditResult.remark" style="width:100%"></textarea>',
                title: '填写处理意见',
                scope: $scope,
                buttons: [
                    {
                        text: '取消',
                        onTap: function (e) {
                            return 0;
                        }
                    },
                    {
                        text: '<b>不通过</b>',
                        type: 'button-assertive',
                        onTap: function (e) {
                            if (!$scope.auditResult.remark) {
                                $scope.auditResult.remark="";
                                //    e.preventDefault();
                            }
                                return -1;
                            //}
                        }
                    },
                    {
                        text: '<b>通过</b>',
                        type: 'button-positive',
                        onTap: function (e) {
                            if (!$scope.auditResult.remark) {
                                $scope.auditResult.remark="";
                                //    e.preventDefault();
                            }
                                return 1;
                            //}
                        }
                    },
                ]
            });

            myPopup.then(function (res) {
                if(res==0) {
                    return;
                }
                $scope.auditResult.result = res;
                $scope.doSubmit($scope.auditResult);
            });
        }


        $scope.doSubmit = function (auditResult) {
            var user = localStorage.getItem("userid");
            if (!user) {
                $state.go('login');
                $cordovaToast.showShortCenter('请登录后再审批').then(function (success) {
                    // success
                }, function (error) {
                    // error
                });
                return;
            }
                         //按钮置灰
                        $scope.btnDisabled = true;
                        $scope.realName = localStorage.getItem('realName');
                        ProgressIndicator.showSimple(true);
                        var envelop = new Envelop("doOrder");
                        envelop.body.orderId = $stateParams.orderId;
                        envelop.body.userid = user;
                        commonService.sendEnvelop(url + "audit.jsp?userid="+user+"&billid="
                            +$stateParams.orderId+"&type="+$scope.curOrder.main.type+"&r="+uuid()+"&result="+auditResult.result+"&remark="+auditResult.remark, envelop).success(function (result) {
                            ProgressIndicator.hide();
                            if (result.head.status == 1) {
                                if (result.body.result > 0) {
                                    $cordovaToast.showShortCenter('审批完成！');
                                    $state.go("tab.home");
                                   // $.postOffice.publish('order_changed');
                                    //$scope.$emit('order_changed', { });
                                } else {
                                    $cordovaDialogs.alert('单据已审批', '', '确定')
                                        .then(function () {
                                            $state.go("tab.home");
                                        });
                                }
                            } else {
                                    $cordovaDialogs.alert(result.head.errorMsg, '', '确定');
                            }
            });
        }
    })
    .controller('disposeOrderCtrl', function ($scope, $cordovaDialogs, $stateParams, $state, commonService) {
        $scope.$on('$ionicView.beforeEnter', function () {
            if (window.isOnline == false) {
                $state.go("offline");
                return;
            }
        });
        $scope.status = 1;
        $scope.row = {};
        $scope.changeDisStatus = function (flag) {
            $scope.status = flag;
        }
        $scope.submit = function () {
            ProgressIndicator.showSimple(true);
            var envelop = new Envelop("disposeOrder");
            envelop.body.rowId = $stateParams.rowId;
            envelop.body.status = $scope.status;
            envelop.body.remark = $scope.row.remark;
            commonService.sendEnvelop(url + "disposeOrder", envelop).success(function (result) {
                ProgressIndicator.hide();
                if (result.head.status == 1) {
                    $state.go("myOrder");
                } else {
                    $cordovaDialogs.alert(result.head.errorMsg, '', '确定');
                }
            });
        }
    })
    .controller('messageCtrl', function ($scope, $http, $state, $ionicPopup, $ionicHistory) {//会话列表控制器
        $scope.$on('$ionicView.afterEnter', function () {
            SessionManager._sessionStatus = "list";//通知会话管理器，进行会话列表状态
        });
        $scope.$on('$ionicView.beforeEnter', function () {//
            //检测用户是否登录
            if (localStorage.getItem("userid") == null || localStorage.getItem("userid") == "") {
                $state.go("login");
            }
            SessionManager._sessionStatus = "list";//通知会话管理器，进行会话列表状态
            $scope.sessionList = [];
            //查询数据，构建会话列表
            db.transaction(function (tx) {
                var query = "select * from cdt_message";//查询会话消息列表
                tx.executeSql(query, [], function (tx, res) {
                        //查询结果
                        for (var i = 0; i < res.rows.length; i++) {
                            var row = res.rows.item(i);
                            $scope.sessionList.push(row);
                        }
                    },
                    function (tx, error) {
                        console.log('query error: ' + error.message);
                    });
            }, function (error) {
                console.log('transaction error: ' + error.message);
            }, function () {
                console.log('transaction ok');
            });
        });
        //判断会话是否存在
        $scope.existsSession = function (session) {
            if ($scope.sessionList) {
                for (var i = 0; i < $scope.sessionList.length; i++) {
                    if ($scope.sessionList[i].sessionId == session.sessionId) {
                        return i;
                    }
                }
            }
            return -1;
        };
        $scope.$on('new_im_message', function (evt, session, message) {//监听新的消息的到来
            if ($scope.sessionList) {//如果列表存在
                var idx = $scope.existsSession(session);
                if (idx > -1) {//如果存在于会话列表中，更新之
                    $scope.sessionList[idx] = session;//列新原引用哟
                } else {//添加到会话列表中
                    $scope.sessionList.push(session);
                }
            } else {
                $scope.sessionList = [];
                $scope.sessionList.push(session);
            }
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });
        //视图离开事件
        $scope.$on('$ionicView.leave', function () {
            SessionManager._sessionStatus = "none";//通知会话管理器，离开会话列表状态
            $scope.sessionList = [];
        });
        //删除会话
        var removeItem = function (session, button) {
            $scope.sessionList.splice($scope.sessionList.indexOf(session), 1);
            connection.message.removeMessage(session);
            return true;
        };
        //删除会话
        $scope.removeItem = function (session) {
            removeItem(session);
        };
        //置顶---已经废弃
        $scope.setTop = function (session, index, toIndex) {
            $scope.session.splice(index, 1);  //  删除当前位置item
            $scope.session.splice(toIndex, 0, message);
        };
        //进入会话详细页
        $scope.messageDetails = function (session) {
            SessionManager._totalUnRead -= session.unRead;
            if (SessionManager._totalUnRead < 0) {
                SessionManager._totalUnRead = 0;
            }
            $state.go("messageDetail", {
                "messageId": session.sessionId,
                "name": session.name
            });
        }
        //回到上一级视图
        $scope.myGoBack = function () {
            $backView = $ionicHistory.backView();
            $backView.go();
        };
        //页面跳转
        $scope.go = function (path) {
            $location.path(path);
        };
    })
    //
    .controller('messageDetailCtrl', function ($scope, $state, $http, $stateParams, $ionicScrollDelegate, $timeout, $cordovaCamera, $cordovaFileTransfer, $cordovaDialogs, $ionicHistory, $cordovaCapture) {
        $scope.jid = connection.jid;
        $scope.mobile = Strophe.getNodeFromJid($stateParams.messageId);
        $scope.$on('$ionicView.afterEnter', function () {
            SessionManager._sessionStatus = "session";
            SessionManager._currJID = $stateParams.messageId;
            $ionicScrollDelegate.scrollBottom();
        });
        $scope.$on('$ionicView.beforeEnter', function () {
            if (window.isOnline == false) {
                $state.go("offline");
                return;
            }
            if (localStorage.getItem("userid") == null || localStorage.getItem("userid") == "") {
                $state.go("login");
                return;
            }
            SessionManager._sessionStatus = "session";
            SessionManager._currJID = $stateParams.messageId;
            $scope.imageData = '';
            $scope.showSend = 0;
            $scope.isAudio = 0;
            $scope.audioBtn = '按住说话';
            $scope.sid = $stateParams.messageId;
            $scope.name = $stateParams.name;
            $scope.currMsg = {};
            db.transaction(function (tx) {
                var query = "select * from cdt_message_detail where sessionId = ?";
                $scope.sds = [];
                tx.executeSql(query, [$scope.sid], function (tx, res) {
                        for (var i = 0; i < res.rows.length; i++) {
                            var row = res.rows.item(i);
                            $scope.addMessage(row);
                        }
                    },
                    function (tx, error) {
                        console.log('error: ' + error.message);
                    });
            }, function (error) {
                console.log('transaction error: ' + error.message);
            }, function () {
                console.log('transaction ok');
            });
            connection.message.updateMessage($scope.sid);
            $ionicScrollDelegate.scrollBottom();
        });
        $scope.addMessage = function (message) {
            if (!$scope.sds) {
                $scope.sds = [];
            }
            message.timestamp = new Date(message.timestamp);
            //var reg=new RegExp(/((http|https|Http|Https|HTTP|HTTPS):\/\/)(([a-zA-Z0-9\._-]+\.[a-zA-Z]{2,6})|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,4})*(\/[a-zA-Z0-9\&%_\./-~-]*)?/g);
            //var stringObj=message.content;
            //message.content=stringObj.replace(reg,"<a href=$&>$&</a>");
            var len = $scope.sds.length;
            if (len == 0) {
                message.timeFlag = 0;
            } else {
                var t1 = new Date($scope.sds[len - 1].timestamp).getTime();
                var t2 = new Date(message.timestamp).getTime();
                if (t2 - t1 >= 10800000) {
                    message.timeFlag = 1;
                } else {
                    message.timeFlag = 0;
                }
            }
            $scope.sds.push(message);
            $scope.sds = $scope.sds;
        }
        $scope.$on('$ionicView.leave', function () {
            connection.message.updateMessage($scope.sid);
            $scope.sds = [];
            SessionManager._sessionStatus = "none";
            SessionManager._currJID = "";
        });
        $scope.$on('new_im_message', function (evt, session, message) {//监听新的消息的到来
            if ($scope.sds) {//如果列表存在
                if (Strophe.getBareJidFromJid(session.sessionId) == $scope.sid) {
                    $scope.addMessage(message);
                }
            } else {
                $scope.sds = [];
                $scope.addMessage(message);
            }
            if (!$scope.$$phase) {
                $scope.$apply();
            }
            $ionicScrollDelegate.scrollBottom();
        });
        $scope.showKeyboard = function () {
            $scope.showSend = 1;
            $ionicScrollDelegate.resize();
            $ionicScrollDelegate.scrollBottom();
            $scope.chatTools = 0;
        }
        $scope.showTools = function () {
            $scope.chatTools = 1;
        }
        $scope.hideTools = function () {
            $scope.chatTools = 0;
            $scope.showSend = 0;
        }
        //以下为
        $scope.sendMsg = function (type) {
            var msg = {};
            msg.from = connection.jid;
            msg.to = $scope.sid;
            msg.type = 'txt';
            msg.fromName = localStorage.getItem('realName') || Strophe.getNodeFromJid(connection.jid);
            msg.fromHeadImage = localStorage.getItem('headerImg') || 'images/defaultHeader.png';
            if (type == 0) {
                msg.content = $scope.currMsg.content;
                if (msg.content == null || msg.content == '') {
                    $cordovaDialogs.alert('消息内容不能为空', '', '确定')
                        .then(function () {
                            return;
                        });
                } else {
                    connection.message.sendMessage(msg);
                    $scope.currMsg.content = '';
                    $scope.showSend = 0;
                }
            } else if (type == 1) {
                msg.type = 'image';
                msg.content = $scope.imageData;
                connection.message.sendMessage(msg);
            }
        }
        //
        $scope.changePicBy = function (sourceType) {
            var options = {
                quality: 50,
                destinationType: Camera.DestinationType.DATA_URL,
                sourceType: sourceType,
                allowEdit: false,
                encodingType: Camera.EncodingType.JPEG,
                targetWidth: 500,
                targetHeight: 500,
                popoverOptions: CameraPopoverOptions,
                saveToPhotoAlbum: false,
                correctOrientation: true
            };
            $cordovaCamera.getPicture(options).then(function (imageData) {
                var image = document.getElementById('myHeaderImg');
                $scope.imageData = imageData;
                $scope.sendMsg(1);
            }, function (err) {
                // error
            });
        }
        //放大图片
        $scope.magnify = function (me) {
            $scope.showBigPic = 1;
            $scope.bigPicUrl = me;
        }
        $scope.hideBigPic = function () {
            $scope.showBigPic = 0;
        }
        //    音频信息
        $scope.changeSendType = function (num) {
            if (num == 0) {
                $scope.isAudio = 0;
            } else if (num == 1) {
                $scope.isAudio = 1;
            }
        }
        $scope.getAudio = function () {
            var options = {limit: 3, duration: 10};
            $cordovaCapture.captureAudio(options).then(function (audioData) {
                //alert('获得了音频')
            }, function (err) {
                // An error occurred. Show a message to the user
            });
        }
        //
        $scope.myGoBack = function () {
            $backView = $ionicHistory.backView();
            $backView.go();
        };
        $scope.go = function (path) {
            $location.path(path);
        };
    })
    .controller('cityListCtrl', function ($scope, $rootScope, $ionicHistory, $cordovaToast, $http, commonService, $timeout, $cordovaDialogs, $state) {
        $scope.$on('$ionicView.beforeEnter', function () {
            if (window.isOnline == false) {
                $state.go("offline");
                return;
            }
            $scope.getCurrCity();
        });
        $scope.getCurrCity = function () {
            if (!$rootScope.currCity) {
                $scope.currCity = '获取中…'
            } else {
                $scope.currCity = $rootScope.currCity;
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        }
        $scope.$on('currCity_changed', function () {//监听获取到的地理位置
            $scope.getCurrCity();
        });
        $scope.checkCode = function (val) {
            if (/^[a-zA-Z]/.test(val) == true) {
                return 1
            } else {
                return 2
            }
        };
        $scope.changeCurrCity = function ($event) {
            var targetCity = $event.target.innerText;
            //查询所有已开通的城市节点
            if (Strophe.Status.DISCONNECTED) {
                $cordovaToast.showShortCenter('网络异常，请稍后重试');
            } else {
                var iq = $iq({
                    type: "get", to: "pubsub.xmpp.cdtfax.com"
                }).c("query", {xmlns: "http://jabber.org/protocol/disco#items"});
                connection.sendIQ(iq, function (result) {
                    var nodes = result.getElementsByTagName("subscription");
                    if (nodes.length == 0) {
                        $scope.subCity(targetCity);
                    } else {
                        for (var i = 0; i < nodes.length; i++) {
                            var node = nodes[i].getAttribute("node");
                            if (!node) {
                                return;
                            }
                            if (node.indexOf($event.target.innerText) > -1) {
                                //查询我的订阅，删除非$global_
                                var retrieveSubscriptions = $iq({
                                    type: "get", to: "pubsub.xmpp.cdtfax.com"
                                }).c("pubsub", {xmlns: "http://jabber.org/protocol/pubsub"}).c("subscriptions");
                                connection.sendIQ(retrieveSubscriptions, function (result) {
                                    //alert(ok.innerHTML);
                                    var nodes = result.getElementsByTagName("subscription");
                                    for (var i = 0; i < nodes.length; i++) {
                                        var node = nodes[i].getAttribute("node");
                                        if (node.indexOf('$global_') > -1) {
                                            continue;
                                        }
                                        var cancelMyNode = $iq({
                                            type: "set", to: "pubsub.xmpp.cdtfax.com"
                                        }).c("pubsub", {xmlns: "http://jabber.org/protocol/pubsub"}).
                                            c("unsubscribe", {
                                                node: node, jid: Strophe.getBareJidFromJid(connection.jid)
                                            });
                                        connection.sendIQ(cancelMyNode, function (ok) {
                                            //alert(ok.innerHTML);
                                        }, function (err) {
                                            //alert(err);
                                        });
                                    }
                                    //订阅目标城市
                                    $scope.subCity(targetCity);
                                    //
                                }, function (err) {
                                    $cordovaToast.showShortCenter('网络异常，请稍后重试')
                                });
                            } else {
                                $cordovaToast.showShortCenter('您选择的城市暂未开通服务')
                            }
                        }
                    }
                }, function (err) {
                    $cordovaToast.showShortCenter('网络异常，请稍后重试')
                });
            }
        }
        $scope.subCity = function (targetCity) {
            var subscribe = $iq({
                type: "set", to: "pubsub.xmpp.cdtfax.com"})
                .c("pubsub", {xmlns: "http://jabber.org/protocol/pubsub"}).
                c("subscribe", {node: 'sub_orgapp_' + targetCity, jid: Strophe.getBareJidFromJid(connection.jid)});
            connection.sendIQ(subscribe, function (ok) {
                //订阅成功
                $rootScope.currCity = targetCity;
                $scope.currCity = $rootScope.currCity;
                localStorage.setItem("curCity", targetCity);
                localStorage.setItem('currPOS', targetCity);
                localStorage.setItem("curNode", 'sub_orgapp_' + targetCity);
                CurUser.curCity = targetCity;
                CurUser.curNode = 'sub_orgapp_' + targetCity;
                localStorage.setItem("data", 0);
                CurUser.reload();
                OrderManager.reset();
                var envelop1 = new Envelop("loadOrgOrder");
                envelop1.body.userId = localStorage.getItem("userid");
                envelop1.body.city = targetCity;
                commonService.sendEnvelop(url + "changeCity", envelop1).success(function (result) {
                    if (result.head.status == 1) {
                        $state.go("tab.home");
                    } else {
                        $cordovaDialogs.alert(result.head.errorMsg, '', '确定');
                    }
                }).error(function (e) {
                    $cordovaDialogs.alert("修改城市失败" + e, '', '确定');
                });
            }, function (err) {
                $cordovaDialogs.alert('您选择的城市暂未开通服务', '', '确定');
            });
        }
        //
        $scope.myGoBack = function () {
            $backView = $ionicHistory.backView();
            $backView.go();
        };
        $scope.go = function (path) {
            $location.path(path);
        };
        $scope.changeVal = function ($event) {
            try {
                $scope.changeCity = $event.target.innerText;
            } catch (e) {
            }
        };
        $scope.load = function () {
            ProgressIndicator.showSimple(true);
            $http.get('js/cityList.json')
                .success(function (newItems) {
                    $scope.items = newItems;
                    $timeout(function () {
                        ProgressIndicator.hide();
                    }, 2000);
                }).error(function (e) {
                    $cordovaDialogs.alert(e, '', '确定');
                });
        };
        $scope.load();
    })
    .controller('offlineCtrl', function ($scope, $ionicHistory, $http, commonService, $timeout, $cordovaDialogs) {
        $scope.myGoBack = function () {
            $backView = $ionicHistory.backView();
            $backView.go();
        };
        $scope.go = function (path) {
            $location.path(path);
        };
        $scope.checkNetwork = function () {
            if (window.isOnline == true) {
                $scope.myGoBack();
            } else {
                return;
            }
        }
    })

    .controller('trackingCtrl', function ($scope, $ionicHistory, $http, commonService, $timeout, $cordovaDialogs,$state) {

        $scope.order={};
        $scope.search = function () {
            $state.go("trackingList", {
                "orderNo": $scope.order.orderNo,
                "hetonghao": $scope.order.hetonghao,
                "dateFrom":$scope.order.dateFrom,
                "dateTo":$scope.order.dateTo
            });
        }

    })
    .controller('trackingListCtrl', function ($scope, $ionicHistory, $stateParams, $http,$state, commonService, $timeout, $cordovaDialogs) {
        $scope.hasData=true;
        $scope.list=[];
        $scope.load = function () {
            ProgressIndicator.showSimple(true);
            var envelop = new Envelop("orderSearch");
            envelop.body= $stateParams;
            commonService.sendEnvelop(url + "orderSearch.jsp", envelop).success(function (result) {
                var orderId = $stateParams.orderId;
                if (result.head.status == 1) {
                    $scope.list = result.body.list;
                    if( !$scope.list ||  $scope.list.length==0){
                        $scope.hasData=false;
                    }
                    $scope.$broadcast('scroll.refreshComplete');
                } else {
                    $scope.hasData=false;
                    $cordovaDialogs.alert(result.head.errorMsg, '', '确定');
                    $scope.$broadcast('scroll.refreshComplete');
                }
                ProgressIndicator.hide();
            }).error(function (err) {
                ProgressIndicator.hide();
                $cordovaToast.showShortCenter('网络异常，请稍后重试');
            });
          //  ProgressIndicator.hide();
        }

        $scope.loadMore = function () {

        }
        $scope.load();
        $scope.doRefresh = function () {
            $scope.load();
        }

        $scope.myGoBack = function () {
            $backView = $ionicHistory.backView();
            $backView.go();
        };

        $scope.viewDtl = function (order) {
            $state.go("trackingDetail", {
                "orderId": order.billid,
                "wuliao": order.wuliaoid,

            });
        }
    })
    .controller('trackingDetailCtrl', function ($scope, $ionicHistory, $stateParams, $http, commonService, $timeout, $cordovaDialogs) {

        $scope.curOrder={};
        $scope.load = function () {
            ProgressIndicator.showSimple(true);
            var envelop = new Envelop("orderSearch");
            envelop.body= $stateParams;
            commonService.sendEnvelop(url + "orderDtl.jsp?id="+$stateParams.orderId+"&wuliao="+$stateParams.wuliao, envelop).success(function (result) {
                if (result.head.status == 1) {
                    $scope.curOrder = result.body;
                    $scope.$broadcast('scroll.refreshComplete');
                } else {
                    $cordovaDialogs.alert("发生异常，请联系管理员", '', '确定');
                    $scope.$broadcast('scroll.refreshComplete');
                }
                ProgressIndicator.hide();
            }).error(function (err) {
                ProgressIndicator.hide();
                $cordovaToast.showShortCenter('网络异常，请稍后重试');
            });
            //  ProgressIndicator.hide();
        }

        $scope.myGoBack = function () {
            $backView = $ionicHistory.backView();
            $backView.go();
        };

        $scope.load();

    })
    .controller('pushCtrl', function ($scope, $ionicHistory, $http, commonService, $timeout, $cordovaDialogs,$state,jpushService) {

        $scope.message="";

             $scope.options={
                    tags:"tag1",
                     alias:"alias1"
             };

     $scope.result="";

     // $scope.$on('$ionicView.beforeEnter',function(){
     //     var url=$stateParams.url;
     //     if(url){
     //         $state.go(url);
     //     }
     // });

     $scope.init=function(){
             jpushService.init();
             window.alert('执行启动');
         };

     $scope.stopPush=function(){
            jpushService.stopPush();
            window.alert('执行停止');
         };

     $scope.resumePush=function(){
            jpushService.resumePush();
            window.alert('执行重启');
         };

     $scope.getPushState=function(){
             jpushService.isPushStopped(function(data){
                    if(data==0){
                             window.alert('启动');
                         }else{
                             window.alert('停止');
                        }
                 });
         };

     $scope.setTags=function(){
             var tagArr=$scope.options.tags.split(',');
            setTagsWithAlias(tagArr,null);
             //jpushService.setTags(tagArr);
        }

     $scope.setAlias=function(){
             var alias=$scope.options.alias;
             setTagsWithAlias(null,alias);
             //jpushService.setAlias(alias);
         }

    var setTagsWithAlias=function(tags,alias){
             jpushService.setTagsWithAlias(tags,alias);
         }
    $scope.setTagsWithAlias=function(){
             var tagArr=$scope.options.tags.split(',')
             if(tagArr.length==0){
                     tagArr=null;
                 }

             var alias=$scope.options.alias;
             if(alias===''){
                     alias=null;
                 }
             setTagsWithAlias(tagArr,alias);

         }
     $scope.cleanTagAndAlias=function(){
             var tags=[];
             var alias="";
            setTagsWithAlias(tags,alias);
         }

    })
    .controller('pushListCtrl', function ($scope,noticeService) {
             $scope.items=noticeService.notices;
        })
     .controller('pushDetailCtrl', function ($scope,$stateParams) {
         var id=$stateParams.id;
        $scope.message='消息id：'+id;
     })

    .filter("cityFilter", function () {
        return function (list, para) {
            var result = [];
            if (para) {
                for (var e in list) {
                    if (list[e].pinyin.toUpperCase().substring(0, 1) == para) {
                        result.push(list[e]);
                    }
                }
                return result;
            }
            else {
                return list;
            }
        }
    });

