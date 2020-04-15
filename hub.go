package main

import (
	"log"
	"strings"
)

// Broadcast contains the message from the client
// as well as a reference to the client
type Broadcast struct {
	// Message received from client
	message []byte
	// Client sending the message
	client *Client
}

// Hub maintains the set of active clients and broadcasts messages to the
// clients.
type Hub struct {
	// Registered clients.
	clients map[*Client]bool

	// Inbound messages from the clients.
	// broadcast chan []byte
	broadcast chan *Broadcast

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client
}

func newHub() *Hub {
	return &Hub{
		broadcast:  make(chan *Broadcast),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
		case broadcast := <-h.broadcast:
			message := broadcast.message
			log.Printf("Received a message from the client %v", string(message))

			if broadcast.client.master {
				log.Printf("Client emitting message is master!!!")

				// We send back to all clients only in case it was master
				// Here we are looping on all clients and sending
				// back the message we received from one client
				for client := range h.clients {
					select {
					case client.send <- message:
						log.Printf("Sent same message back to the client %v", string(message))
					default:
						close(client.send)
						delete(h.clients, client)
					}
				}
			}

			if strings.Contains(string(message), "masterRequest") {
				log.Printf("Client is requesting control!!!")
				if ok := resetMaster(h.clients); ok {
					broadcast.client.master = true
				}
			}
		}
	}
}

func resetMaster(clients map[*Client]bool) bool {
	for client := range clients {
		client.master = false
	}
	return true
}
