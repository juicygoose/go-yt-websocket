package main

import (
	"flag"
	"net/http"
	"os"
	"time"

	jwtmiddleware "github.com/auth0/go-jwt-middleware"
	"github.com/dgrijalva/jwt-go"
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
	var mySigningKey = []byte("secret")

	/* Handlers */
	var GetTokenHandler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		/* Create the token */
		token := jwt.New(jwt.SigningMethodHS256)

		/* Create a map to store our claims */
		claims := token.Claims.(jwt.MapClaims)

		/* Set token claims */
		claims["admin"] = true
		claims["name"] = "Ado Kukic"
		claims["exp"] = time.Now().Add(time.Hour * 24).Unix()

		/* Sign the token with our secret */
		tokenString, _ := token.SignedString(mySigningKey)

		/* Finally, write the token to the browser window */
		w.Write([]byte(tokenString))
	})

	var jwtMiddleware = jwtmiddleware.New(jwtmiddleware.Options{
		ValidationKeyGetter: func(token *jwt.Token) (interface{}, error) {
			return mySigningKey, nil
		},
		SigningMethod: jwt.SigningMethodHS256,
	})

	router := mux.NewRouter()

	// Serve static assets like javascript
	router.Handle("/", http.FileServer(http.Dir("./views/")))
	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("./static/"))))

	router.Handle("/status", jwtMiddleware.Handler(NotImplemented)).Methods("GET")
	router.Handle("/echo", Websocket).Methods("GET")
	router.Handle("/get-token", GetTokenHandler).Methods("GET")

	http.ListenAndServe(":8080", handlers.LoggingHandler(os.Stdout, router))
}
