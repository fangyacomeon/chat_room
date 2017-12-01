'use strict';

/* Controllers */

function AppCtrl($scope, socket) {

  // Socket listeners
  // ================
  $scope.messages = [];
  socket.on('init', function (data) {
    console.log(data);
    $scope.name = data.name;
    $scope.room = data.room;
    //$scope.users = data.users;
    //$scope.roomList = data.roomList;
    $scope.roomList = data.roomList;
    $scope.usersForRoom = data.usersForRoom;
    $scope.messages.push({
      user: 'chatroom',
      text: 'You are now known as ' + $scope.name + ', Users in the ' +$scope.room + ' are ' + $scope.usersForRoom
    });
  });

  socket.on('send:message', function (message){
    console.log(message);
    $scope.messages.push(message);
  });

  socket.on('change:name', function (data) {
    console.log('I heard the change name message');
    $scope.messages.push({
      user:'chatroom',
      text: data.oldName + ' changed to new name : ' + data.newName
    });
  });

  socket.on('user:changeRoom', function(data){
    console.log('I heard the change room info')
    // $scope.room = data.room;
    // $scope.roomList = data.roomList;
    $scope.usersForRoom = data.usersForRoom;
    $scope.roomList = data.roomList;
    $scope.messages.push({
      user:'chatroom',
      // text:'User' + data.user + 'joined ' + data.room +', Users in the room' + $scope.room + 'are ' + $scope.usersForRoom
      text: data.user + ' left the current room and joined ' + data.room
    });

  });

  socket.on('user:join', function (data) {
    $scope.messages.push({
      user: 'chatroom',
      text:  data.name + ' Joined ' + data.room
    });
  });

  // add a message to the conversation when a user disconnects or leaves the room
  socket.on('user:left', function (data) {
    $scope.messages.push({
      user: 'chatroom',
      text: 'User ' + data.name + ' has left.'
    });
    var i, user;
    for (i = 0; i < $scope.users.length; i++) {
      user = $scope.users[i];
      if (user === data.name) {
        $scope.users.splice(i, 1);
        break;
      }
    }
  });

  // Private helpers
  // ===============

  var changeName = function (oldName, newName) {
    // rename user in list of users
    // var i;
    // for (i = 0; i < $scope.users.length; i++) {
    //   if ($scope.users[i] === oldName) {
    //     $scope.users[i] = newName;
    //   }
    // }

    $scope.messages.push({
      user: 'chatroom',
      text: 'You are now known as ' + newName + '.'
    });
  }

  var changeRoom = function (oldRoom, newRoom, roomToUsers) {
    // rename user in list of users
    var i;
    var roomExist = false;
    for (i = 0; i < $scope.roomList.length; i++) {
      if ($scope.roomList[i] === newRoom) {
        roomExist = true;
      }
    }
    if(!roomExist){
      $scope.roomList.push(newRoom);
    }
    $scope.messages.push({
      user: 'chatroom',
      text: 'Room changed. You joined ' + newRoom + '.' + 'The users in ' + newRoom + ' are ' + roomToUsers
    });
  }

  // Methods published to the scope
  // ==============================

  $scope.changeName = function () {
    socket.emit('change:name', {
      name: $scope.newName
    }, function (result) {
      if (!result) {
        alert('There was an error changing your name');
      } else {
        changeName($scope.name, $scope.newName);
        $scope.name = $scope.newName;
        $scope.newName = '';
      }
    });
  };

  $scope.sendMessage = function () {
    socket.emit('send:message', {
      message: $scope.message,
      room: $scope.room
    });

    // add the message to our model locally
    $scope.messages.push({
      user: $scope.name,
      text: $scope.message
    });

    // clear message box
    $scope.message = '';
  };

  $scope.changeRoom = function(){
    socket.emit('user:changeRoom',{
      oldRoom: $scope.room,
      room: $scope.newRoom,
      user:$scope.name
    }, function (result) {
      console.log("Change room is called");
      // if (!result) {
      //   alert('There was an error changing the room');
      // } else {
        changeRoom($scope.room, $scope.newRoom, result.roomToUsers);
        $scope.room = $scope.newRoom;
        $scope.newRoom = '';
      
    });
  }
}
