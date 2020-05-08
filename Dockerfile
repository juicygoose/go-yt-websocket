FROM golang:1.13-stretch

RUN go get github.com/gorilla/handlers
RUN go get github.com/gorilla/websocket
RUN go get github.com/gorilla/mux

ADD app/* /go/
ADD app/static /go/static
ADD app/room /go/room
ADD app/home /go/home
RUN go build

ENTRYPOINT [ "./go" ]