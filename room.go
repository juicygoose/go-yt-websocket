package main

import (
	"net/http"

	"github.com/gorilla/mux"
)

// RoomStats gives stats about the room
type RoomStats struct {
	Name            string
	NumberOfClients int
}

func newRoomStats(name string, numberOfClients int) *RoomStats {
	return &RoomStats{Name: name, NumberOfClients: numberOfClients}
}

// Room represents a room with its associated hub
type Room struct {
	hub  *Hub
	name string
}

func newRoom(name string) *Room {
	return &Room{hub: newHub(), name: name}
}

func exposeNewRoom(router *mux.Router, room *Room) {
	go room.hub.run()

	var Websocket = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		serveWs(room.hub, w, r)
	})

	roomPath := "/" + room.name + "/"
	roomWebsocket := "/" + room.name + "-websocket"

	path := getStaticFilesPath()

	router.Handle(roomPath, http.StripPrefix(roomPath, http.FileServer(http.Dir(path+"/room/"))))
	router.PathPrefix(roomPath + "static/").Handler(http.StripPrefix(roomPath+"static/", http.FileServer(http.Dir(path+"/static/"))))
	router.PathPrefix(roomPath + "parts/").Handler(http.StripPrefix(roomPath+"parts/", http.FileServer(http.Dir(path+"/parts/"))))
	router.Handle(roomWebsocket, Websocket).Methods("GET")
}
