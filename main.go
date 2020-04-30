package main

import (
	"flag"
	"net/http"
	"os"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

// Room represents a room with its associated hub
type Room struct {
	hub  *Hub
	name []byte
}

func main() {

	flag.Parse()
	router := mux.NewRouter()

	houseHub := newHub()
	go houseHub.run()
	rockHub := newHub()
	go rockHub.run()

	var HouseWebsocket = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		serveWs(houseHub, w, r)
	})
	var RockWebsocket = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		serveWs(rockHub, w, r)
	})
	var NotImplemented = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Not Implemented"))
	})

	router.Handle("/", http.FileServer(http.Dir("./home/")))

	router.Handle("/house/", http.StripPrefix("/house/", http.FileServer(http.Dir("./room/"))))
	router.Handle("/rock/", http.StripPrefix("/rock/", http.FileServer(http.Dir("./room/"))))

	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("./static/"))))
	router.PathPrefix("/house/static/").Handler(http.StripPrefix("/house/static/", http.FileServer(http.Dir("./static/"))))
	router.PathPrefix("/rock/static/").Handler(http.StripPrefix("/rock/static/", http.FileServer(http.Dir("./static/"))))

	router.Handle("/status", NotImplemented).Methods("GET")
	router.Handle("/house-websocket", HouseWebsocket).Methods("GET")
	router.Handle("/rock-websocket", RockWebsocket).Methods("GET")

	http.ListenAndServe(":8080", handlers.LoggingHandler(os.Stdout, router))
}
