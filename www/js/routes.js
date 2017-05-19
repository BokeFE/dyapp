angular.module('cdApp.routes', [])
    .config(function($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise("/tab/home");
        $stateProvider
            .state("tab", {
                url: "/tab",
                abstract: true,
                templateUrl: "views/tabs.html",
            })
            .state('tab.home', {
                url: '/home',
                views: {
                    'tab-home': {
                        templateUrl: 'views/home.html',
                        controller: "homeCtrl"
                    }
                }
            })
            .state('tab.tracking', {
                url: '/tracking',
                views: {
                    'tab-tracking': {
                        templateUrl: 'views/tracking.html',
                        controller: "trackingCtrl"
                    }
                }
            })
            .state('orderDetail', {
                url: '/orderDetail/:orderId/:flag',
                templateUrl: 'views/order/orderDetail.html',
                controller: "orderDetailCtrl"
            })
            .state('contractDetail', {
                url: '/contractDetail/:id/:instanceid/:workitemid',
                templateUrl: 'views/order/contractDetail.html',
                controller: "contractDetailCtrl"
            })
            .state('auditUser', {
                url: '/auditUser/:billid/',
                templateUrl: 'views/order/auditUser.html',
                controller: "auditUserCtrl"
            })
            .state('auditUserSet', {
                url: '/auditUserSet/:billid/',
                templateUrl: 'views/order/auditUserSet.html',
                controller: "auditUserSetCtrl"
            })
            .state('trackDetail', {
                url: '/trackDetail/:orderId/:wuliao',
                templateUrl: 'views/trackDetail.html',
                controller: "trackDetailCtrl"
            })
            .state('city', {
                url: '/city',
                templateUrl: 'views/cityList.html',
                controller: "cityListCtrl"
            })
            .state('tab.message', {
                url: '/message',
                views: {
                    'tab-message': {
                        templateUrl: 'views/message/message.html',
                        controller: "messageCtrl"
                    }
                }
            })

            .state('messageDetail', {
                url: '/messageDetail/:messageId/:name',
                templateUrl: "views/message/messageDetail.html",
                controller: "messageDetailCtrl"
            })
            .state('roster', {
                url: '/roster',
                templateUrl: "views/message/roster.html",
                controller: "rosterCtrl"
            })

            .state('tab.myAccount', {
                url: '/myAccount',
                views: {
                    'tab-myAccount': {
                        templateUrl: 'views/account/myAccount.html',
                        controller: "myAccountCtrl"
                    }
                }
            })

            .state('tab.setting', {
                url: '/setting',
                views: {
                    'tab-setting': {
                        templateUrl: 'views/account/setting.html',
                        controller: "settingCtrl"
                    }
                }
            })

            .state('setting', {
                url: '/setting',
                views: {
                    'tab-setting': {
                        templateUrl: 'views/account/setting.html',
                        controller: "settingCtrl"
                    }
                }
            })

            .state('identification', {
                url: '/identification',
                templateUrl: 'views/account/identification.html',
                controller: "identificationCtrl"
            })
            .state('description', {
                url: '/description',
                templateUrl: 'views/account/description.html',
                controller: "descriptionCtrl"
            })

            .state('feedback', {
                url: '/feedback',
                templateUrl: 'views/account/feedback.html',
                controller: "feedbackCtrl"
            })
            .state('about', {
                url: '/about',
                templateUrl: 'views/account/about.html',
                controller: "aboutCtrl"
            }).state('login', {
                url: '/login',
                templateUrl: 'views/login.html',
                controller: "loginCtrl"
            })
            .state('reg', {
                url: '/reg',
                templateUrl: 'views/reg.html',
                controller: "regCtrl"
            })
            .state('forgetPass', {
                url: '/forgetPass',
                templateUrl: 'views/forgetPass.html',
                controller: "forgetPassCtrl"
            })
            .state('changePass', {
                url: '/changePass',
                templateUrl: 'views/account/changePass.html',
                controller: "changePassCtrl"
            })
            .state('success', {
                url: '/success/:successId/:telNum',
                templateUrl: 'views/success.html',
                controller: "successCtrl"
            })

            .state('offline', {
                url: '/offline',
                templateUrl: "views/offline.html",
                controller: "offlineCtrl"
            })
            .state('tracking', {
                url: '/tracking',
                templateUrl: 'views/tracking.html',
                controller: "trackingCtrl"
            })
            .state('trackingList', {
                url: '/trackingList/:orderNo/:hetonghao/:dateFrom/:dateTo',
                templateUrl: 'views/trackingList.html',
                controller: "trackingListCtrl"
            })
            .state('trackingDetail', {
                url: '/trackingDetail/:orderId/:wuliao',
                templateUrl: 'views/trackDetail.html',
                controller: "trackingDetailCtrl"
            })
            .state('push', {
                url: '/push',
                templateUrl: 'views/push/push.html',
                controller: "pushCtrl"
            })
            .state('pushList', {
                url: '/pushList',
                templateUrl: 'views/push/list.html',
                controller: "pushListCtrl"
            })
            .state('pushDetail', {
                url: '/pushDetail/:id',
                templateUrl: 'views/push/detail.html',
                controller: "pushDetailCtrl"
            })
    });
