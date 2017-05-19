//var BOSH_SERVICE ="https://192.168.1.50:9090:7443/http-bind/";
var BOSH_SERVICE="http://192.168.1.50:9090/http-bind/ ";
var connection = null;

function log(msg) 
{
    $('#log').append('<div></div>').append(document.createTextNode(msg));
}

function onConnect(status)
{
    if (status == Strophe.Status.CONNECTING) {

	log('Strophe is connecting.');
    } else if (status == Strophe.Status.CONNFAIL) {
	log('Strophe failed to connect.');
	$('#connect').get(0).value = 'connect';
    } else if (status == Strophe.Status.DISCONNECTING) {
	log('Strophe is disconnecting.');
    } else if (status == Strophe.Status.DISCONNECTED) {
	log('Strophe is disconnected.');
	$('#connect').get(0).value = 'connect';
    } else if (status == Strophe.Status.CONNECTED) {
	log('Strophe is connected.');
	log('ECHOBOT: Send a message to ' + connection.jid + 
	    ' to talk to me.');

	connection.addHandler(onMessage, null, 'message', null, null,  null); 
	connection.send($pres().tree());
    }
}

function onMessage(msg) {
    var to = msg.getAttribute('to');
    var from = msg.getAttribute('from');
    var type = msg.getAttribute('type');
    var elems = msg.getElementsByTagName('body');

    if (type == "chat" && elems.length > 0) {
	var body = elems[0];

	log('ECHOBOT: I got a message from ' + from + ': ' + 
	    Strophe.getText(body));
    
	var reply = $msg({to: from, from: to, type: 'chat'})
            .cnode(Strophe.copyElement(body));
	connection.send(reply.tree());

	log('ECHOBOT: I sent ' + from + ': ' + Strophe.getText(body));
    }

    // we must return true to keep the handler alive.  
    // returning false would remove it after it finishes.
    return true;
}

$(document).ready(function () {
    connection = new Strophe.Connection(BOSH_SERVICE);

    // Uncomment the following lines to spy on the wire traffic.
    connection.rawInput = function (data) { log('RECV: ' + data); };
    connection.rawOutput = function (data) { log('SEND: ' + data); };

    // Uncomment the following line to see all the debug output.
    //Strophe.log = function (level, msg) { log('LOG: ' + msg); };
    $('#connect').bind('click', function () {
	var button = $('#connect').get(0);
	if (button.value == 'connect') {
	    button.value = 'disconnect';

	    connection.connect($('#jid').get(0).value,
			       $('#pass').get(0).value,
			       onConnect);
	} else {
	    button.value = 'connect';
	    connection.disconnect();
	}
    });


	$("#clear").bind("click",function(){
		$('#log').empty();

	});

	/*
     <input type='button' id='add' value='添加联系人' />
     <input type='button' id='del' value='删除联系人' />
     <input type='button' id='mod' value='修改联系人' />

     */
	$("#add").bind("click",function(){
		var index=connection.jid.indexOf("syz");
		if(index==0){
			connection.roster.subscribe("test@192.168.1.50:9090","test",["english"]);
		}else{
			connection.roster.subscribe("syz@192.168.1.50:9090","myt1",["english"]);
		}

	});

	$("#del").bind("click",function(){
		var index=connection.jid.indexOf("syz");
		if(index==0){
			connection.roster.unsubscribe("test@192.168.1.50:9090","myt1",["english"]);
		}else{
			connection.roster.unsubscribe("syz@192.168.1.50:9090","myt1",["english"]);
		}
	});

	$("#mod").bind("click",function(){
		var index=connection.jid.indexOf("syz");
		if(index==0){
			connection.roster.modifyContact("test@192.168.1.50:9090","myt111",["english"]);
		}else{
			connection.roster.modifyContact("syz@192.168.1.50:9090","mysyz11",["english"]);
		}
	})



});
