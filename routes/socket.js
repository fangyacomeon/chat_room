// Keep track of which names are used so that there are no duplicates
var userNames = (function () {
  var names = {};
  var roomToUsers = new Map();

  var claim = function (name) {
    if (!name || names[name]) {
      return false;
    } else {
      names[name] = true;
      return true;
    }
  };

  var getUsersForRoom = function(roomName){
    return roomToUsers.get(roomName);
  };

  var update = function(oldName, newName,room_number){
    var users = roomToUsers.get(room_number);
    var i = users.indexOf(oldName);
    users.splice(i, 1, newName);
    roomToUsers.set(room_number,users);
  };

  var getRoomList = function(){
      var keys = Array.from(roomToUsers.keys());
      console.log("Room list is " + keys);
      return keys;
  };

  var removeUser = function(roomName, userName){
      console.log('roomName: '+ roomName, 'userName: '+ userName);
      var users = roomToUsers.get(roomName);
      var i = users.indexOf(userName);
      if(i!= -1){
        users.splice(i, 1);
      }
      roomToUsers.set(roomName, users);
  }

  var addRoomUserPair = function(roomName,userName){
      if(roomToUsers.has(roomName)){
        var value = roomToUsers.get(roomName);
        value.push(userName);
        roomToUsers.set(roomName, value);
      } else {
        var val = [];
        val.push(userName);
        roomToUsers.set(roomName, val);
        console.log('roomToUsers is ' + roomToUsers);
      }
  };
  // find the lowest unused "guest" name and claim it
  var getGuestName = function () {
    var name,
      nextUserId = 1;
    do {
      name = 'Guest ' + nextUserId;
      nextUserId += 1;
    } while (!claim(name));
    return name;
  };

  // serialize claimed names as an array
  var get = function () {
    var res = [];
    for (user in names) {
      res.push(user);
    }
    return res;
  };

  var free = function (name) {
    if (names[name]) {
      delete names[name];
    }
  };

  return {
    claim: claim,
    free: free,
    get: get,
    getGuestName: getGuestName,
    getRoomList: getRoomList,
    update:update,
    addRoomUserPair: addRoomUserPair,
    getUsersForRoom: getUsersForRoom,
    removeUser: removeUser
  };
}());

// export function for listening to the socket
module.exports = function (socket) {
  var name = userNames.getGuestName();
  var room_number = 'lobby';
  var roomList = userNames.getRoomList();
  userNames.addRoomUserPair(room_number, name);
  socket.join(room_number);

  // send the new user their name and a list of users
  socket.emit('init', {
    name: name,
    users: userNames.get(),

    roomList: userNames.getRoomList(),
    room: room_number,
    usersForRoom : userNames.getUsersForRoom(room_number)
  });

  // notify other clients that a new user has joined
  socket.broadcast.to(room_number).emit('user:join', {
    name: name,
    room: room_number,
  });

  

  // broadcast a user's message to other users
  socket.on('send:message', function (data) {
    console.log(data);
    socket.broadcast.to(data.room).emit('send:message', {
      user: name,
      text: data.message
    });
  });

  // validate a user's name change, and broadcast it on success
  socket.on('change:name', function (data, fn) {
    if (userNames.claim(data.name)) {
      var oldName = name;
      userNames.free(oldName);
      userNames.update(oldName, data.name, room_number);
      name = data.name;

      socket.broadcast.to(room_number).emit('change:name', {
        oldName: oldName,
        newName: name
      });
      fn(true);
    } else {
      fn(false);
    }
  });


  socket.on('user:changeRoom', function(data, fn){
      //console.log("I heard the change Room request");
      // for(var i = 0; i < roomList.length; i++){
      //   if(roomList[i] == data.room){
      //     room_number = roomList[i];
      //     userNames.addRoomUserPair(data.room, data.user);
      //   }
      // } 
          userNames.addRoomUserPair(data.room, data.user);
          userNames.removeUser(data.oldRoom, data.user);
          socket.join(data.room);
          room_number = data.room;
          socket.leave(data.oldRoom);
        // }
    
       socket.broadcast.to(data.oldRoom).emit('user:changeRoom', {
        user: data.user,
        room : data.room,
        roomList: userNames.getRoomList()
        //roomToUsers: userNames.roomToUsers(data.room)
      });


       socket.broadcast.to(data.room).emit('user:changeRoom', {
        user: data.user,
        room : data.room,
        roomList: userNames.getRoomList()
        //roomToUsers: userNames.roomToUsers(data.room)
      });
       fn({roomToUsers: userNames.getUsersForRoom(data.room)});
  });

  // clean up when a user leaves, and broadcast it to other users
  socket.on('disconnect', function () {
    socket.broadcast.to(room_number).emit('user:left', {
      name: name
    });
    userNames.free(name);
    userNames.removeUser(room_number, name);
  });
};
