package main

import (
	"encoding/json"
	"flag"
	"net/http"
	"os"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

func main() {

	flag.Parse()

	router := mux.NewRouter()
	rooms := []*Room{newRoom("general"), newRoom("techno"), newRoom("house")}

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

	var RoomsStats = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var roomsStats []*RoomStats
		for _, room := range rooms {
			roomStats := newRoomStats(room.name, len(room.hub.clients))
			roomsStats = append(roomsStats, roomStats)
		}
		byteResults, _ := json.Marshal(roomsStats)
		w.Write(byteResults)
	})

	// Expose Acme Challenge
	var ExposeAcmeChallenge = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("aqXPXyrez9loja_eF9C5ezf5MrQRG-E4OSQnWsIqXw0.hom1I0XD-mW1TC3-ZqMYuQT-ClTsOIiU2ywy1LWrOJU"))
	})

	router.Handle("/expose-room", ExposeNewRoom)
	router.Handle("/search-video", SearchVideo)
	router.Handle("/rooms-stats", RoomsStats)

	// Expose Acme Challenge
	router.Handle("/.well-known/acme-challenge/aqXPXyrez9loja_eF9C5ezf5MrQRG-E4OSQnWsIqXw0", ExposeAcmeChallenge)

	path := getStaticFilesPath()

	// Root path for landing page
	router.Handle("/", http.FileServer(http.Dir(path+"/home/")))
	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir(path+"/static/"))))
	router.PathPrefix("/parts/").Handler(http.StripPrefix("/parts/", http.FileServer(http.Dir(path+"/parts/"))))

	// Acme challenge for let's encrypt certificate

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	http.ListenAndServe(":"+port, handlers.LoggingHandler(os.Stdout, router))
}
