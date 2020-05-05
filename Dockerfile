FROM golang:1.13-stretch

RUN go get github.com/gorilla/handlers
RUN go get github.com/gorilla/websocket
RUN go get github.com/gorilla/mux

ADD static static
ADD room room
ADD home home
ADD client.go client.go
ADD hub.go hub.go
ADD main.go main.go
ADD search.go search.go
RUN go build

ENTRYPOINT [ "./go" ]