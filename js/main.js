/**
 * main.js
 */
(function(){
	var sensor_types = [
		"http://webinos.org/api/sensors.temperature",
		"http://webinos.org/api/sensors.humidity",
		"http://webinos.org/api/sensors.light",
		"http://webinos.org/api/sensors.voltage",
		"http://webinos.org/api/sensors.electricity",
		"http://webinos.org/api/sensors.proximity"
		
	];
	var actuator_types = [
		"http://webinos.org/api/actuators.switch",
		"http://webinos.org/api/actuators.linearmotor"
	]
	var icons = {
			"http://webinos.org/api/sensors.temperature": "temperature-icon.png",
			"http://webinos.org/api/sensors.humidity": "humidity-icon.png",
			"http://webinos.org/api/sensors.light": "light-icon.png",
			"http://webinos.org/api/sensors.voltage": "voltage-icon.png",
			"http://webinos.org/api/sensors.electricity":"electricity-icon.png",
			"http://webinos.org/api/actuators.switch": "switch-icon.png",
			"http://webinos.org/api/sensors.proximity": "proximity-icon.png",
			"http://webinos.org/api/actuators.linearmotor": "linearmotor-icon.png"
	};
	
	var sensors = {};
	var actuators = {};
	var sensor_chart;
	var _token;
	var _settings = {};
	
	var token = function(t){
		if (typeof t == "string") {
			_token = t;
			jQuery.jStorage.set("token",t);
		}
		else if (typeof t == "undefined"){
			t = jQuery.jStorage.get('token',null);
			if (t) {
				_token = t;
			}
			return _token;
		}
		else {
			_token = null;
			jQuery.jStorage.deleteKey('token');
		}
	};
	
	var settings = function(key, value){
		if (key) {
			if (typeof value == "string") {
				_settings[key] = value;
				jQuery.jStorage.set("settings."+key,value);
			}
			else if (typeof value == "undefined"){
				value = jQuery.jStorage.get("settings."+key, null);
				if (!value) {
					value = _settings[key];
				}
				return value;
			}
			else {
				delete _settings[key];
				jQuery.jStorage.deleteKey("settings."+key);
			}
		}
	};
	
	var onSensorEvent = function(event){
		var sensor = sensors && sensors[event.sensorId];
		if (sensor) {
			if (!sensor.values) {
				sensor.values = [];
			}
			var date = new Date(event.timestamp);
			var item = {
				value: event.sensorValues[0] || 0,
				timestamp: event.timestamp,
				unit: event.unit,
				time: Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', event.timestamp)
			};
			sensor.values.push(item);
			if (location.hash == "#sensor?sid="+sensor.id) {
				if (sensor_chart && sensor_chart.series[0]) {
					var series = sensor_chart.get('values');
					series.addPoint({x: item.timestamp,y: item.value},true,series.data.length>10,true);
					jQuery("#sensor-value").html(item.value);
					jQuery("#sensor-unit").html(item.unit);
				}
			}
			jQuery("#sensor-"+sensor.id).html(item.value+" "+item.unit);
			jQuery("#time-"+sensor.id).html(item.time);
		}
	};
	
	jQuery.ajaxSetup({
		beforeSend: function (xhr) {
			var t = token();
			if (t) {
				xhr.setRequestHeader('token',t);
			}
		}
	});
	
	jQuery(document).ready(function() {
		jQuery('#actuators_host').val(settings('actuators_host'));
		Highcharts.setOptions({
            global: {
                useUTC: false
            }
        });
		sensor_chart = new Highcharts.Chart({
			chart: {
				renderTo: 'sensor-chart',
				type: 'area',
				marginRight: 10,
			},
			xAxis: {
				type: 'datetime',
				tickPixelInterval: 150
			},
			yAxis: {
				title: {
					text: ' '
				},
				plotLines: [{
					value: 0,
					width: 1,
					color: '#808080'
				}]
			},
			tooltip: {
				formatter: function() {
					return '<b>'+ this.series.name +'</b><br/>'+Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x) +'<br/>'+Highcharts.numberFormat(this.y, 2);
				}
			},
			legend: {
				enabled: false
			},
			exporting: {
				enabled: false
			},
			series: [{
				id: 'values',
				name: 'values',
				data: []
			}]
		});
		for ( var i in sensor_types) {
			var type = sensor_types[i];
			webinos.discovery.findServices(new ServiceType(type), {
				onFound: function (service) {
					console.log("Service "+service.serviceAddress+" found ("+service.api+")");
					sensors[service.id] = service;
					service.bind({
						onBind:function(){
		        			console.log("Service "+service.api+" bound");
		        			console.log(service);
		        			service.configureSensor({timeout: 120, rate: 500, eventFireMode: "fixedinterval"}, 
		        				function(){
		        					var sensor = service;
		                			console.log('Sensor ' + service.api + ' configured');
		                			var params = {sid: sensor.id};
		            				var values = sensor.values;
		            				var value = (values && values[values.length-1].value)  || '&minus;';
		            				var unit = (values && values[values.length-1].unit)  || '';
		            				var time = (values && values[values.length-1].time)  || '';
		            				jQuery("#sensors-list").append('<li><a href="#sensor?'+sem.serialize(params)+'"><img src="./assets/images/'+icons[sensor.api]+'"/><h3>'+sensor.displayName+'</h3><p>'+sensor.description+'</p><p class="ui-li-aside ui-li-desc"><strong id="sensor-'+sensor.id+'">'+value+' '+unit+'</strong><br><span id="time-'+sensor.id+'">'+time+'</span></p></a></li>');
		                			/*
		                			service.addEventListener('onEvent', 
		                    			function(event){
		                            		console.log("New Event");
		                            		console.log(event);
		                            		onSensorEvent(event);
		                        		},
		                    			false
		                    		);*/
		                			try {
		                				jQuery('#sensors-list').listview('refresh');
		                				jQuery("#sensors").trigger('updatelayout');
		                			} catch (e) {
		                				
		                			}
								},
								function (){
									console.error('Error configuring Sensor ' + service.api);
								}
							);
		        		}
					});
				}
			});
		}
		
		// discovering actuators
		for ( var i in actuator_types) {
			var type = actuator_types[i];
			webinos.discovery.findServices(new ServiceType(type), {
				onFound: function (service) {
					console.log("Service "+service.serviceAddress+" found ("+service.api+")");
					actuators[service.id] = service;
					service.bind({
						onBind:function(){
		        			console.log("Service "+service.api+" bound");
							var params = {aid: service.id};
							jQuery("#actuators-list").append('<li><a href="#actuator?'+sem.serialize(params)+'"><img src="./assets/images/'+icons[service.api]+'"/><h3>'+service.displayName+'</h3><p>'+service.description+'</p></a></li>');
		        			try {
		 						jQuery('#actuators-list').listview('refresh');
								jQuery("#actuators").trigger('updatelayout');
							}
							catch (e){
							}
		        		}
					});
				}
			});
		}
		
		// load static actuators
		jQuery.ajax('data/actuators.json',{
	        dataType: 'json',
	        success: function(data){
	        	actuators = data;
				for(var i in actuators){
					var actuator = actuators[i];
					var params = {aid: actuator.id};
					jQuery("#actuators-list").append('<li><a href="#actuator?'+sem.serialize(params)+'"><img src="./assets/images/'+icons[actuator.type]+'"/><h3>'+actuator.name+'</h3><p>'+actuator.description+'</p></a></li>');
				}
				try {
					jQuery('#actuators-list').listview('refresh');
					jQuery("#actuators").trigger('updatelayout');
				} catch (e) {
					
				}
			},
			error: function(){
				console.error(arguments);
			}
		});
	});
	
	jQuery('#sensors').live( 'pagebeforeshow',function(event){
		try {
			jQuery('#sensors-list').listview('refresh');
			jQuery("#sensors").trigger('updatelayout');
		} catch (e) {
			console.error(e);
		}
	});
	jQuery('#actuators').live( 'pagebeforeshow',function(event){
		try {
			jQuery('#actuators-list').listview('refresh');
			jQuery("#actuators").trigger('updatelayout');
		} catch (e) {
			console.error(e);
		}
	});
	
	jQuery('#sensor').live( 'pagebeforeshow',function(event,data){
		var params = sem.deserialize(location.hash);
		var sid = params['sid'];
		var sensor = sensors[sid];
		try {
			var series = sensor_chart.get('values');
			series.setData([],true);
			jQuery("#sensor-name").html("");
			jQuery("#sensor-value").html("-");
			jQuery("#sensor-unit").html("");
			if (sensor && sensor_chart) {
				jQuery("#sensor-name").html(sensor.displayName);
				//jQuery("#sensor-unit").html(sensor.unit);
				sensor_chart.setTitle({ text: sensor.displayName});
				var values = sensor.values && sensor.values.slice(-10) || [];
				var data = [];
				for ( var i in values) {
					var v = values[i];
					data.push({x: v.timestamp,y: v.value});
				}
				var v = values[values.length-1] 
				jQuery("#sensor-value").html( v && v.value || "-");
				jQuery("#sensor-unit").html( v && v.unit || "");
				series.name = sensor.displayName;
				series.setData(data,true);
			}
		} catch (e) {
			console.error(e);
		}
	});
	
	jQuery('#actuator').live( 'pagebeforeshow',function(event,data){
		var params = sem.deserialize(location.hash);
		var aid = params['aid'];
		var actuator = actuators[aid];
		
		jQuery('#actuator-name').empty();
		jQuery('#actuator_value_field').empty();
		jQuery('#actuator_value_btn').attr("disabled", false);
		if (actuator) {
			var html = "";
			jQuery('#actuator-name').html(actuator.name);

//			if (actuator.options) {
//				html += "<select id='actuator_value'>";
//				html += '<option>-- select --</option>';
//				for ( var val in actuator.options) {
//					var option = actuator.options[val];
//					html += '<option value="'+val+'">'+option+'</option>';
//				}
//				html += "</select>";
//			}
//			else {
//				html += "<input type='number' id='actuator_value'/>";
//			}
			
			if(actuator.range){
				var min = actuator.range[0][0];
				var max = actuator.range[0][1];
				if(max-min < 10){
					html += "<select id='actuator_value'>";
					html += '<option>-- select --</option>';
					for (var i=min; i<=max; i++) {
			 			html += '<option value="'+i+'">'+i+'</option>';
			 		}			 		
			 		html += "</select>";
				}
				else{
					html += "<input type='number' id='actuator_value'/>";
				}
			}
			else {
				html += "<input type='number' id='actuator_value'/>";
			}

			jQuery('#actuator_value_field').html(html);
			if (typeof actuator.value == "number") {
				jQuery('#actuator_value').val(actuator.value);
			}
			//jQuery("input[name='actuator_value']").checkboxradio("refresh");
		}
	});
	
	jQuery('#login').live( 'pagebeforeshow',function(event,data){
		jQuery('#login_err_msg').html("");
		jQuery('#login_btn').attr("disabled", false);
		jQuery.mobile.hidePageLoadingMsg();
		if (token()) {
			jQuery.mobile.changePage(jQuery("#home"));
		}
	});
	
	jQuery('#login_btn').live( 'click',function(event,data){
		jQuery('#login_btn').attr("disabled", true);
		jQuery.mobile.showPageLoadingMsg();
		jQuery.ajax('/login',{
			type: 'post',
			data: {
				'username': jQuery('#username').val(),
				'password': jQuery('#password').val()
			},
	        success: function(data,status,xhr){
	        	token(xhr.getResponseHeader('token'));
	        	jQuery.mobile.changePage(jQuery("#home"));
	        	jQuery('#login_btn').attr("disabled", false);
	        	jQuery.mobile.hidePageLoadingMsg();
			},
			error: function(){
				jQuery('#login_err_msg').html("Wrong username or password");
				jQuery('#login_btn').attr("disabled", false);
				jQuery.mobile.hidePageLoadingMsg();
			}
		});
	});
	
	jQuery('#logout_btn').live( 'click',function(event,data){
		token(null);
		jQuery.mobile.changePage(jQuery("#login"));
	});
	
	jQuery('#actuators_host').live( 'change',function(event,data){
		settings('actuators_host', this.value);
	});
	
	jQuery('#actuator_value_btn').live( 'click',function(event,data){
		var params = sem.deserialize(location.hash);
		var aid = params['aid'];
		var actuator = actuators[aid];
		var val = jQuery("#actuator_value").val();
		var val_array=new Array(); 
		val_array[0]=parseFloat(val);

		try{
			actuator.setValue(val_array,
				function(actuatorEvent){
					alert(JSON.stringify(actuatorEvent));
				},
				function(actuatorError){
					alert(JSON.stringify(actuatorError));
				}
			);
		}
		catch(err){
			console.log("Not a valid webinos actuator: " + err.message);
		}

		// -------------------old code-----------------------------
		// var actuators_host = settings('actuators_host');
		// if (!actuators_host) {
		// 	jQuery.mobile.changePage(jQuery("#settings"));
		// }
		// else {
		// 	var params = sem.deserialize(location.hash);
		// 	var aid = params['aid'];
		// 	var actuator = actuators[aid];
		// 	var val = jQuery("#actuator_value").val();
		// 	val = parseFloat(val);
		// 	if (actuator && !isNaN(val)) {
		// 		jQuery('#actuator_value_btn').attr("disabled", true);
		// 		jQuery.mobile.showPageLoadingMsg("a","Please Wait ...");
		// 		jQuery.getJSON('http://'+actuators_host+'/actuators/'+aid+'?callback=?',{'value': val},function(data){
		// 	        	actuator['value'] = val;
		// 	        	jQuery('#actuator_value_btn').attr("disabled", false);
		// 	        	jQuery.mobile.hidePageLoadingMsg();
		// 		});
		// 	}
		// }
	});
})();