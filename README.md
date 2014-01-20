Obsolete: This application has evolved to the new webinos home hub https://github.com/webinos/hub-homeController

SmartEnergyMonitor
==================

The modern city is turning into to a central hub of human life which depends on information and communication technologies (ICT). New technical solutions are being developed and perhaps most importantly, existing infrastructures can be utilized more efficiently. Therefore, ICT infrastructures of the smart city are logically connected to each other in order to exchange and use data about status, demands and capacities. Information is available wherever it is needed and the modern city thus makes itself transparent. The technology itself takes a backseat because the control concepts fit seamlessly into the everyday life and customs of the people. Energy is one of the important topics discussed in context of Smart cities: power supply system will be converted into an intelligent energy information system that will not only transport energy but also information about consumption and availability. In smart cities, a transparent data exchange for the consumer will support conscious power consumption. The SmartEnergyMonitor is a cross-platform mobile application that allows household users to monitor, control and manage their energy consumption at home from anywhere at any time. The application considers the perspective of a consumer who wants to manage their energy consumption, own their energy consumption data and use that data to negotiate with their energy suppliers and / or switch energy suppliers. Furthermore, household consumers are able to control the energy consumption of connected (via actuators) devices ( e.g. Switch for turning light ON or OFF, Thermostat for maintaining the temperature near a desired setpoint, etc. ) through this application.

This application offers a visualisation of data originating from all connected sensor nodes. Further it provides means to control connected actuator nodes by  
accessing remote data and services through the webinos overlay network. The application is meant to be executed as a widget within a webinos enabled Web runtime.
 
How to create the SmartEnergyMonitor widget
===========================================

    cd app-sem
    zip -r sem.wgt *.html ./js/*.js ./js/jqm/* ./js/highcharts/* ./css/*.css ./assets/* config.xml 

License
=======

All source code and content created by members of the webinos project is 
released with the APACHE 2.0 license (see the LICENSE file).

We have included other modules not created by the webinos project 
with different licenses.  This includes:

 * jquery and jquery-UI files which are under the MIT license - 
   http://github.com/jquery/jquery/blob/master/MIT-LICENSE.txt 
