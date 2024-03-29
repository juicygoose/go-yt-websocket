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

	router.Handle("/expose-room", ExposeNewRoom)
	router.Handle("/search-video", SearchVideo)
	router.Handle("/playlist", GetPlaylist)
	router.Handle("/rooms-stats", RoomsStats)

	path := getStaticFilesPath()

	// Root path for landing page
	router.Handle("/", http.FileServer(http.Dir(path+"/home/")))
	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir(path+"/static/"))))
	router.PathPrefix("/parts/").Handler(http.StripPrefix("/parts/", http.FileServer(http.Dir(path+"/parts/"))))

	// Get PORT env var defined in deployed heroku environments
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	} else {
		// If deployed in heroku and not local
		// Redirect http to https
		go http.ListenAndServe(":80", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Redirect(w, r, "https://"+r.Host+r.URL.String(), http.StatusMovedPermanently)
		}))
	}

	http.ListenAndServe(":"+port, handlers.LoggingHandler(os.Stdout, router))
}
