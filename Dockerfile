FROM golang:1.9-stretch

RUN go get github.com/gorilla/handlers
RUN go get github.com/gorilla/websocket
RUN go get github.com/gorilla/mux

ADD static static
ADD views views
ADD client.go client.go
ADD hub.go hub.go
ADD main.go main.go
RUN go build

ENTRYPOINT [ "./go" ]