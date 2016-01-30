# socket.chat.server
A WebSocket server that serves the socket.chat web application.

This application was developed and tested on the following server specifications:

Ubuntu server 14.04

mysql 5.5.47

node.js 5.5.0

<h3>Install</h3>
git clone this repository<br>

``git clone https://github.com/final60/socket.chat.server.git``

create database for usage recording <i>(optional)</i><br>

``create_database.sql``

install the socket.chat.server<br>

``npm install``

rename <b>sample-config.json</b> to <b>config.json</b> and modify the values as necessary

run server<br>

``node server.js``

<h3>Notes</h3>
ensure the port you choose is open

supervisor is a good application for managing and auto-restarting the server if it goes down


