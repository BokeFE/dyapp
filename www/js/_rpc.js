/**
 * 用于轻量级网页(不使用 MAP 的 Web 窗体)的常用功能, 以 jQuery plugin 的形式
 */
(function ($) {
    /** 
     获得以 RFC 方式调用 MAP 中间层公式时的请求字符串
      - 参考 MAP.ui.Request.js 的 getRfcXml 方法;
      - formula: 公式名称(字符串);
      - params: 公式参数(数组);
     */
    var _getRfcXml = function(formula, params) {
		var _exp = formula;
		//var t = ['','<rfc>','<exp><![CDATA[',_exp,']]></exp>','<paras>'].join(''); // TODO
		var xml = '';
		xml += '<rfc>' //
				+ '<exp><![CDATA[' + _exp + ']]></exp>' // rfc_dbquery(rfc_para(sql))
				+ '<paras>'; //
		for (var i = 0; i < params.length; i++) { // defaultType:String
			xml += '<para name=\"para' + (i) + '\" type=\"String\">';
			{
				/* if ((typeof(params[i]) != 'undefined'
						&& params[i] != null && params[i].length > 0)
						|| Ext.isBoolean(params[i])) */
                if ( typeof(params[i])!='undefined' && params[i] != null)
					xml += '<![CDATA[' + params[i].toString() + ']]>';
				else
					xml += '<![CDATA[' + ']]>';
			}
			xml += '</para>';
		}
		xml += '</paras>' //
		     + '</rfc>';
		return xml;
	};
    
    
    $.fn.getRfcXml = _getRfcXml;
    
    $.fn.ajaxRfc = function(formula, params, options){
        if (! options){
            options = {};
        }
        $.ajax({
            type: "post",
            //FIXME: 必须把 html 文件放在 Yigo 目录的第一层子目录下
            url: "../rfc.do?ts="+(new Date()).getTime(),
            data: {                         //TODO: __dsn , SID
                "xml": _getRfcXml(formula, params),
                "__web": 1,
                "__out": 1
            },
            success: function(data){
                if (options.fnSuccess){
                    options.fnSuccess(data);
                }
            },
            error: function(jqXHR, textStatus, errorThrown){
                var errorMsg =
                    "状态: "+textStatus + "/" + jqXHR.status + "\n" +
                    FormatJSON([{error: errorThrown}, {responseText: jqXHR.responseText}]);
                if (options.fnError){
                    options.fnError(errorMsg, {
                        "jqXHR": jqXHR, "textStatus": textStatus, "errorThrown": errorThrown
                    });
                }else{
                    alert("运行错误!\n" + errorMsg);
                }
            }
        });
    };

})(jQuery);