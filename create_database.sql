create database if not exists socket_chat;
use socket_chat;

create table if not exists session(
id int(9) not null primary key auto_increment,
datetime datetime
)
