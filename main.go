package main

import (
	"flag"
	"net/http"
	"os"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

func main() {

	flag.Parse()
	hub := newHub()
	go hub.run()

	var Websocket = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})
	var NotImplemented = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Not Implemented"))
	})

	router := mux.NewRouter()

	// Serve static assets like javascript
	router.Handle("/", http.FileServer(http.Dir("./views/")))
	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("./static/"))))

	router.Handle("/status", NotImplemented).Methods("GET")
	router.Handle("/echo", Websocket).Methods("GET")

	http.ListenAndServe(":8080", handlers.LoggingHandler(os.Stdout, router))
}
