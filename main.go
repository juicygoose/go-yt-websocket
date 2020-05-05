package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

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

	router.Handle(roomPath, http.StripPrefix(roomPath, http.FileServer(http.Dir("./room/"))))
	router.PathPrefix(roomPath + "static/").Handler(http.StripPrefix(roomPath+"static/", http.FileServer(http.Dir("./static/"))))
	router.Handle(roomWebsocket, Websocket).Methods("GET")
}

func main() {

	flag.Parse()

	router := mux.NewRouter()
	rooms := []*Room{newRoom("rock"), newRoom("rap"), newRoom("house"), newRoom("techno")}

	for _, room := range rooms {
		exposeNewRoom(router, room)
	}

	var ExposeNewRoom = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if len(rooms) < 10 {
			newRoomName := r.FormValue("name")
			room := newRoom(newRoomName)
			exposeNewRoom(router, room)
			rooms = append(rooms, room)
			w.Write([]byte("Yeahh room " + newRoomName + " was created!!"))
		} else {
			w.Write([]byte("Max number of rooms reached, sorry bruh..."))
		}
	})

	var SearchVideo = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		searchText := r.FormValue("search_query")
		maxResults := r.FormValue("max_results")
		if searchText == "" || maxResults == "" {
			log.Printf("Missing mandatory search parameters")
		}
		searchResults := search(searchText, maxResults)
		byteResults, _ := json.Marshal(searchResults)
		w.Write(byteResults)
	})

	router.Handle("/expose-room", ExposeNewRoom)
	router.Handle("/search-video", SearchVideo)

	// Root path for landing page
	router.Handle("/", http.FileServer(http.Dir("./home/")))
	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("./static/"))))

	http.ListenAndServe(":8080", handlers.LoggingHandler(os.Stdout, router))
}
