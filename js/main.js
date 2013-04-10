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
		"http://webinos.org/api/sensors.proximity",
		"http://webinos.org/api/sensors.heartratemonitor"
		
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
			"http://webinos.org/api/actuators.linearmotor": "switch-icon.png",
			"http://webinos.org/api/sensors.heartratemonitor": "heartratemonitor-icon.png"
	};
	
	var root_directory;
	var rules = [];	

	var sensors = {};
	var sensors_configuration = {};
	var actuators = {};
	var sensor_chart;
	var sensorActive = {};
	var _token;
	var _settings = {};
	var listeners = new Array();
	var displayed_actuator = 0;
	var sensor_to_be_configured = null;


	function toggle_sensor(ele) {
		var id = "";
		if(ele == undefined){
			id = sensor_to_be_configured;
			ele = "Start-" + id;
		}
		else{
			id = ele.split('-')[1];
		}

		//jQuery('#cfg_startstop_but').button();
		if(jQuery('#'+ele).val() === "Start"){
			jQuery('#'+ele).val("Stop");
			jQuery('#cfg_startstop_but').val("Stop");
		}
		
		else{
			jQuery('#'+ele).prop('value', "Start");
			jQuery('#cfg_startstop_but').val("Start");
		}


		jQuery('#'+ele).button("refresh");
		jQuery('#cfg_startstop_but').button("refresh");


        if(sensorActive[id]) {
            sensors[id].removeEventListener('sensor', onSensorEvent, false);
            sensorActive[id] = false;
        }
        else {
            sensors[id].addEventListener('sensor', onSensorEvent, false);
            sensorActive[id] = true;
        }
    };
	
	function format_time(timestamp) {
	    //var dt = new Date(unixTimestamp * 1000);
	    var dt = new Date(timestamp);

	    var hours = dt.getHours();
	    var minutes = dt.getMinutes();
	    var seconds = dt.getSeconds();

	    // the above dt.get...() functions return a single digit
	    // so I prepend the zero here when needed
	    if (hours < 10) 
	     hours = '0' + hours;

	    if (minutes < 10) 
	     minutes = '0' + minutes;

	    if (seconds < 10) 
	     seconds = '0' + seconds;

	    return hours + ":" + minutes + ":" + seconds;
	}  


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
			//jQuery("#sensor-"+sensor.id).html(item.value+" "+item.unit);
			jQuery("#sensor-"+sensor.id).html(item.value+" ");
			jQuery("#time-"+sensor.id).html(format_time(event.timestamp));

			for(var i=0; i<rules.length; i++){
				if(rules[i].sensor == event.sensorId){
					var do_action = false;
					if(rules[i].operator == ">"){
						if(Number(item.value) > Number(rules[i].threshold)){
							do_action = true;
						}
					}
					else if(rules[i].operator == "="){
						if(Number(item.value) == Number(rules[i].threshold)){
							do_action = true;
						}
					}
					else if(rules[i].operator == "<"){
						if(Number(item.value) < Number(rules[i].threshold)){
							do_action = true;
						}
					}

					if(do_action){
						//alert("Setting " + actuators[rules[i].actuator].displayName + " to " + rules[i].action);
						try{
							var val_array=new Array(); 
							val_array[0]=parseFloat(rules[i].action);
							actuators[rules[i].actuator].setValue(val_array,
								function(actuatorEvent){
									//alert(JSON.stringify(actuatorEvent));
									jQuery('#actuator_value_'+ actuatorEvent.actuatorId).html(actuatorEvent.actualValue[0]);
								},
								function(actuatorError){
									//alert(JSON.stringify(actuatorError));
								}
							);
						}
						catch(err){
							console.log("Not a valid webinos actuator: " + err.message);
						}
					}
				}
			}
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
	
	function init_rules_ui(){
		try {
			var row = "";
			row += "<tr><td id='add_sensor_td'>";
			row += " <select id='rules_sensors_list' class='styled-select'>";
			row += '<option>Sensor</option>';
			for (var i in sensors) {
				var descr = sensors[i].description + " ["+sensors[i].api.slice(sensors[i].api.lastIndexOf(".")+1) + "]";
			 	row += '<option value="'+i+'">'+descr+'</option>';
			}			 		
			row += "</select></td>";
			
			row += "<td id='add_operator_td'><select id='rules_operators_list' class='styled-select'>";
			row += "<option value='>'>&gt</option>";
			row += "<option value='='>=</option>";
			row += "<option value='<'>&lt</option>";
			row += "</select></td>";	
			
			row += "<td id='add_threshold_td'><input type='text' id='rules_threshold_text' class='styled-text'></td>";

			row += "<td id='add_actuator_td'><select id='rules_actuators_list' class='styled-select'>";
			row += '<option>Actuator</option>';
			for (var i in actuators) {
				var descr = actuators[i].description + " ["+actuators[i].api.slice(actuators[i].api.lastIndexOf(".")+1) + "]";
			 	row += '<option value="'+i+'">'+descr+'</option>';
			}			 		
			row += "</select></td>";

			row += "<td id='add_action_td'><input type='text' id='rules_action_text' class='styled-text'></td>";

			row += "<td id='add_rule_but'><button id='rules_button_save'>Add</button></td>";
			row += "</tr>";
			jQuery('#add_rule_table tbody tr').remove();
			jQuery('#add_rule_table').append(row);
			
		} catch (e) {
			console.error(e);
		}
	}

	function refresh_rules(){
        //because i'm doing refresh, delete previous data with jQuery .remove
        $('#rules_table tbody tr').remove();
        //add rules in the table
        var counter = 0;
        if(rules.length != 0){
        	var num_showed_rules = 0;
            for(i in rules){
            	try{
	            	var row = "";
	            	var class_name = (counter++ %2 == 0) ? "even_row" : "odd_row";
	            	row += "<tr class='" + class_name + "''>";
	                //row += "<tr class='even_row'>";
	                var sensor = sensors[rules[i].sensor];
	                var actuator = actuators[rules[i].actuator];
	                row += "<td class='td_rule'><p class='rule_elem_name'>" + sensor.displayName + "</p><p class='rule_elem_description'>" + sensor.description+"</p></td>";
	                row += "<td class='td_rule'>" + rules[i].operator + "</td>";
	                row += "<td class='td_rule'>" + rules[i].threshold + "</td>";
	                row += "<td class='td_rule'><p class='rule_elem_name'>" + actuator.displayName + "</p><p class='rule_elem_description'>" + actuator.description+"</p></td>";
	                row += "<td class='td_rule'>" + rules[i].action + "</td>";
	                row += "<td class='icon_td'> <img id='"+rules[i].id+"' src='./assets/remove2.png'/></td></tr>";
	                //table_rules is the id of table. With Jquery we append the rules
	                $('#rules_table').append(row);

	                $('#'+rules[i].id).live( 'click',function(event,data){
	                        delete_rule(this.id);
	                });
	                num_showed_rules++;
	            }
	            catch(e){
	            	console.log("Exception : " + e.message);
	            }
            }
            if(num_showed_rules == 0){
            	var row = "<tr><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td></td></tr>";
            	$('#rules_table').append(row);
            }

        }
        else{
            var row = "<tr><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td></td></tr>";
            $('#rules_table').append(row);
        }
    }	

    function save_rules_to_file(data, file_name){
		if(!data)
			data = rules;
		if(!file_name)
			file_name = "rules.txt";

		root_directory.getFile(file_name, {create: true, exclusive: false}, 
			function (entry) {
				entry.createWriter(
					function (writer) {
						var written = false;
						writer.onerror = function (evt) {
							alert("Error writing file (#" + evt.target.error.name + ")");
						}

						writer.onwrite = function (evt) {
							if (!written) {
								written = true;
								writer.write(new Blob([JSON.stringify(data)]));
							} else
								;
						}
						writer.truncate(0);
					}, 
					function (error){
						alert("Error retrieving file writer (#" + error.name + ")");
					}
				);
			},
			function (error) {
				alert(error.message);
			}
		);
	}

	function load_rules_from_file(file_name){
		if(!file_name)
			file_name = "rules.txt";

		root_directory.getFile(file_name, {create: true, exclusive: false}, 
			function (entry) {
				var reader = new window.FileReader();
				reader.onerror = function (evt) {
					alert("Error reading file (#" + evt.target.error.name + ")");
				}

				reader.onload = function (evt) {
					try{
						//alert(evt.target.result);
						rules = JSON.parse(evt.target.result);
						refresh_rules();
					}
					catch(err){
						//alert(err.message);
					}
				}

				entry.file(function (file) {
					reader.readAsText(file);
				}, function (error) {
					alert("Error retrieving file (#" + error.name + ")");
				});
			},
			function (error) {
				alert(error.message);
				//alert("Error creating file (#" + error.name + ")");
			}
		);
	}

	function delete_rule(id_rule){
		var index = -1;
		for(var i=0; i<rules.length; i++){
			if(rules[i].id == id_rule){
				index = i;
				break;
			}
		}
		if(index != -1){
			rules.splice(index,1);
			save_rules_to_file();
			refresh_rules();
		}
	}

	function refresh_all(){
		discover_sensors();
		jQuery("#sensors-list").hide();
		jQuery("#sensors_waiting").show();
				
		discover_actuators();
		jQuery("#actuators-list").hide();
		jQuery("#actuators_waiting").show();
		setTimeout(function(){
			try {
				jQuery("#sensors-list").listview();
				jQuery("#sensors-list").listview('refresh');
				jQuery("#sensors").trigger('updatelayout');	
			} catch (e) {

			}
			finally{
				jQuery("#sensors-list").show();
				jQuery("#sensors_waiting").hide();
			}

			try{
				jQuery("#actuators-list").listview();
				jQuery("#actuators-list").listview('refresh');
				jQuery("#actuators").trigger('updatelayout');
			}
			catch (e) {
				
			}
			finally{
				jQuery("#actuators-list").show();
				jQuery("#actuators_waiting").hide();
			}

			init_rules_ui();
			load_rules_from_file();	
		},3000);
	}

	function discover_sensors(whenFinish){
		jQuery("#sensors-list").empty();
		for ( var i in sensor_types) {
			var type = sensor_types[i];
			webinos.discovery.findServices(new ServiceType(type), {
				onFound: function (service) {
//					console.log("Service "+service.serviceAddress+" found ("+service.api+")");
					sensors[service.id] = service;
					sensorActive[service.id] = false;
					service.bind({
						onBind:function(){
		        			console.log("Service "+service.api+" bound");
		        			console.log(service);
		        			service.configureSensor({rate: 500, eventFireMode: "fixedinterval"}, 
		        				function(){
		        					var sensor = service;
		                			var params = {sid: sensor.id};
		            				var values = "";//sensor.values;
		            				var value = (values && values[values.length-1].value)  || '&minus;';
		            				//var unit = (values && values[values.length-1].unit)  || '';
		            				var unit = "";
		            				var type = sensor.api.slice(sensor.api.lastIndexOf(".")+1);
		            				if(type === "temperature")
		            					unit = "C&ordm"
		            				var time = (values && values[values.length-1].time)  || '';
		            				
		            				var userid = "";
                                    var deviceid = "";
		            				try{
                                        deviceid = service.serviceAddress.split('_')[0];
                                        userid = service.serviceAddress.split('_')[1];
                                        //userid = service.serviceAddress.split('_')[1].split('/')[0];
                                        //deviceid = service.serviceAddress.split('/')[1].split('_')[0];
                                    }
                                    catch(e){
                                    	alert(e);
                                    }
                                    
                                    var sensorCode = '<table id="sensors_table"><tr><td rowspan=\'2\' width=\'12%\'><a href="#sensor?'+sem.serialize(params)+'"><img src="./assets/images/'+icons[sensor.api]+'"/></a></td><td rowspan=\'2\' width=\'28%\'><h3>'+sensor.displayName+'</h3><p>'+sensor.description+'</p></td><td class=\'user_cell_label\'><strong>User:</strong></td><td class=\'user_cell_value\'>'+userid+'</td><td rowspan=\'2\' width=\'20%\'><p class="ui-li-aside ui-li-desc"><strong id="sensor-'+sensor.id+'">'+value+'</strong><strong>'+unit+'</strong><br><span id="time-'+sensor.id+'">'+time+'</span></p></td><td rowspan=\'2\' width=\'20%\'><input type=button id=\'Start-'+sensor.id+'\' value=\'Start\'></input></td></tr><tr><td class=\'device_cell_label\'><strong>Device:</strong></td><td class=\'device_cell_value\'>'+deviceid+'</td></td></table>';
                                    jQuery("#sensors-list").append(sensorCode);
                                    
									$('#Start-'+sensor.id).button();

									if(listeners.indexOf(sensor.id) == -1){
                                    	$('#Start-'+sensor.id).live( 'click',function(event,data){
											toggle_sensor(this.id);
										});
										listeners.push(sensor.id);
                                    }

									$('#Start-'+sensor.id).button("refresh");
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
		if(whenFinish)
			whenFinish();
	}

	function configure_sensor(mode,timeout,rate){
		if(mode === "")
			alert("Choose a valide mode");
		else{
			if(mode === "fixedinterval" && rate === "")
				alert("Choose a valid rate (>0)");
			else{
				var params = {"mode":mode, "timeout":timeout, "rate":rate};
				sensors_configuration[sensor_to_be_configured] = params;
				sensors[sensor_to_be_configured].configureSensor(params, function(){}, function(){});
			}
		}
	}

	function discover_actuators(whenFinish){
		jQuery("#actuators-list").empty();
		for ( var i in actuator_types) {
			var type = actuator_types[i];
			webinos.discovery.findServices(new ServiceType(type), {
				onFound: function (service) {
					console.log("Service "+service.serviceAddress+" found ("+service.api+")");
					actuators[service.id] = service;
					service.bind({
						onBind:function(){
		        			console.log("Service "+service.api+" bound");
							var actuator = service;
							var params = {aid: service.id};
							//jQuery("#actuators-list").append('<li><a href="#actuator?'+sem.serialize(params)+'"><img src="./assets/images/'+icons[service.api]+'"/><h3>'+service.displayName+'</h3><p>'+service.description+'</p></a></li>');
		        			
							var userid = "";
                            var deviceid = "";
            				try{
                                deviceid = service.serviceAddress.split('_')[0];
                                userid = service.serviceAddress.split('_')[1];
                                //userid = service.serviceAddress.split('_')[1].split('/')[0];
                                //deviceid = service.serviceAddress.split('/')[1].split('_')[0];
                            }
                            catch(e){}
                            
                            var actuatorCode = '<table id="actuators_table">'+
                            '<tr><td rowspan=\'2\' width=\'12%\'><a href="#actuator?'+sem.serialize(params)+'"><img src="./assets/images/'+icons[actuator.api]+'"/></a></td>'+
                            '<td rowspan=\'2\' width=\'28%\'><h3>'+actuator.displayName+'</h3><p>'+actuator.description+'</p></td>'+
                            '<td class=\'user_cell_label\'><strong>User:</strong></td>'+
                            '<td class=\'user_cell_value\'>'+userid+'</td>'+
                            '<td class=\'actuator_current_value_td\' rowspan=\'2\'><p class=\'actuator_current_value_p\' id=\'actuator_value_'+ actuator.id+'\'>--</p></td></tr>'+
                            '<tr><td class=\'device_cell_label\'><strong>Device:</strong></td>'+
                         	'<td class=\'device_cell_value\'>'+deviceid+'</td></td></table>';
                            
                            jQuery("#actuators-list").append(actuatorCode);
		        		}
					});
				}
			});
		}
		if(whenFinish)
			whenFinish();
	}


	jQuery(document).ready(function() {
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
		
		discover_sensors();
		discover_actuators();
		jQuery('#cfg_startstop_but').button();

		webinos.discovery.findServices(new ServiceType("http://webinos.org/api/file"), {
			onFound: function (service) {
				service.bindService({
					onBind: function () {
						service.requestFileSystem(1, 1024, 
							function (filesystem) {
								root_directory = filesystem.root;
								load_rules_from_file("rules.txt");
							},
							function (error) {
								alert("Error requesting filesystem (#" + error.code + ")");
							}
						);					
					}
				});
			},
			onError: function (error) {
				alert("Error finding service: " + error.message + " (#" + error.code + ")");
			}
		});
	});


	/*------------------------------------Start of Sensors Pages-------------------------------------*/
	jQuery('#sensors').live( 'pagebeforeshow',function(event){
		try {
			jQuery('#sensors-list').listview('refresh');
			jQuery("#sensors").trigger('updatelayout');
		} catch (e) {
			console.error(e);
		}
	});

	jQuery('#refresh_sensors').live( 'click',function(event,data){
		refresh_all();
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

				if(sensorActive[sid]){
					jQuery('#cfg_startstop_but').val("Stop");
				}
				else{
					jQuery('#cfg_startstop_but').val("Start");
				}
				jQuery('#cfg_startstop_but').button("refresh");

				sensor_to_be_configured = sid;
				if(sensors_configuration[sid]){
					jQuery('#cfg_mode').val(sensors_configuration[sid].mode);
					jQuery('#cfg_timeout').val(sensors_configuration[sid].timeout);
					jQuery('#cfg_rate').val(sensors_configuration[sid].rate);
				}
				else{
					jQuery('#cfg_timeout').val("");
					jQuery('#cfg_rate').val("");
				}

			}
		} catch (e) {
			console.error(e);
		}
	});

	/* Set configuration div */
	jQuery('#cfg_but').live( 'click',function(event,data){
		var mode = jQuery('#cfg_mode').val();
		var timeout = jQuery('#cfg_timeout').val();
		var rate = jQuery('#cfg_rate').val();
		
		configure_sensor(mode,timeout,rate);
	});

	jQuery('#cfg_startstop_but').live( 'click',function(event,data){
		toggle_sensor();
	});
	/*------------------------------------End of Sensors Pages-------------------------------------*/




	/*------------------------------------Start of Actuators Pages---------------------------------*/
	jQuery('#actuators').live( 'pagebeforeshow',function(event){
		try {
			jQuery('#actuators-list').listview('refresh');
			jQuery("#actuators").trigger('updatelayout');
		} catch (e) {
			console.error(e);
		}
	});

	jQuery('#refresh_actuators').live( 'click',function(event,data){
		refresh_all();
	});

	jQuery('#actuator').live( 'pagebeforeshow',function(event,data){
		var params = sem.deserialize(location.hash);
		var aid = params['aid'];
		var actuator = actuators[aid];
		displayed_actuator = actuator;
		
		jQuery('#actuator-name').empty();
		jQuery('#actuator_value_field').empty();
		jQuery('#actuator_value_btn').attr("disabled", false);
		if (actuator) {
			var html = "";
			jQuery('#actuator-name').html(actuator.displayName);
			jQuery('#actuator-descr').html(actuator.description);

			var value = jQuery('#actuator_value_'+ actuator.id).html();
			if(value == "--")
				value = 0;

			html += "<center><table>";
			html += "<tr><td><button id=\'actuator_set_value_minus\'>-</button></td><td><input id='actuator_value' value=\'"+value+"\' type=\'text\''></input></td><td><button id=\'actuator_set_value_plus\'>+</button></td></tr>";
			html += "</table>";
			html += "<p><button id=\'actuator_value_btn\'>Submit</button></p></center>";

			jQuery('#actuator_value_field').html(html);
			if (typeof actuator.value == "number") {
				jQuery('#actuator_value').val(actuator.value);
			}
		}
	});

	jQuery('#actuator_set_value_minus').live( 'click',function(event,data){
		var value;
		value = (jQuery('#actuator_value').val()) || 0;
		value = Number(value);
		try{
			var min = displayed_actuator.range[0][0];
			var max = displayed_actuator.range[0][1];
			if(value > min)
				jQuery('#actuator_value').val(--value);
		}
		catch(e){
			jQuery('#actuator_value').val(--value);
		}
	});

	jQuery('#actuator_set_value_plus').live( 'click',function(event,data){
			value = (jQuery('#actuator_value').val()) || 0;
			var value;
			value = Number(value);
		try{	
			var min = displayed_actuator.range[0][0];
			var max = displayed_actuator.range[0][1];
			if(value < max)
				jQuery('#actuator_value').val(++value);
		}
		catch(e){
			jQuery('#actuator_value').val(++value);	
		}
	});


	jQuery('#actuator_value_btn').live( 'click',function(event,data){
		var params = sem.deserialize(location.hash);
		var aid = params['aid'];
		var actuator = actuators[aid];
		var val = jQuery("#actuator_value").val() || 0;
		jQuery("#actuator_value").val(val);
		var val_array=new Array(); 
		val_array[0]=parseFloat(val);
		var min = displayed_actuator.range[0][0];
		var max = displayed_actuator.range[0][1];
		if(val_array[0] < min || val_array[0] > max){
			alert("Choose a value inside actuator's range : " + displayed_actuator.range);
			jQuery("#actuator_value").val("0");
		}
		else{
			try{
				actuator.setValue(val_array,
					function(actuatorEvent){
						//alert(JSON.stringify(actuatorEvent));
						jQuery('#actuator_value_'+ actuator.id).html(actuatorEvent.actualValue[0]);
					},
					function(actuatorError){
						//alert(JSON.stringify(actuatorError));
					}
				);
			}
			catch(err){
				console.log("Not a valid webinos actuator: " + err.message);
			}
		}
	});

	/*------------------------------------End of Actuators Pages-------------------------------*/




	/*------------------------------------Start of Rules Pages---------------------------------*/
	jQuery('#settings').live( 'pagebeforeshow',function(event){
		init_rules_ui();
	});

	jQuery('#refresh_rules').live( 'click',function(event,data){
		refresh_all();
	});

	jQuery('#rules_button_save').live( 'click',function(event,data){
		var tmp =  
				{id:new Date().getTime(),
					sensor:jQuery('#rules_sensors_list').val(), 
					operator:jQuery('#rules_operators_list').val(), 
					threshold: (jQuery('#rules_threshold_text').val()) || "0" , 
					actuator:jQuery('#rules_actuators_list').val(), 
					action: (jQuery('#rules_action_text').val()) || "0"
				};
		
		if(sensors[tmp.sensor] == undefined)
			alert("Choose a valid sensor");
		else if(actuators[tmp.actuator] == undefined)
			alert("Choose a valid actuator");
		else{
			rules.push(tmp);
			refresh_rules();
			init_rules_ui();
			save_rules_to_file();
		}
	});	
})();
