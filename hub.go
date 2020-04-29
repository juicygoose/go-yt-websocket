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
	var clientRequestingMaster *Client
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

			masterClient := getMasterClient(h.clients)

			if broadcast.client.master {
				log.Printf("Client emitting message is master!!!")

				if strings.Contains(string(message), "masterAccepted") {
					if ok := resetMaster(broadcast.client); ok && clientRequestingMaster != nil {
						setClientAsMaster(clientRequestingMaster)
					}
				} else {
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
			} else if strings.Contains(string(message), "masterRequest") {
				clientRequestingMaster = broadcast.client
				log.Printf("Client is requesting control!!!")
				// Lets contact master to get his agreement
				if masterClient != nil {
					masterClient.send <- []byte("ClientIsRequestingMaster")
				} else {
					// No master meaning that client can safely become master
					setClientAsMaster(clientRequestingMaster)
				}
			} else if strings.Contains(string(message), "readonly") {
				if masterClient != nil {
					log.Printf("Sent readonly message to master: %v", string(message))
					masterClient.send <- message
				}
			} else if strings.Contains(string(message), "chat") {
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
		}
	}
}

func setClientAsMaster(client *Client) bool {
	client.master = true
	client.send <- []byte("YouAreMaster")
	return true
}

// This method resets the master to false
func resetMaster(client *Client) bool {
	client.send <- []byte("YouAreNotMaster")
	client.master = false
	return true
}

// This method retrieves the master client
func getMasterClient(clients map[*Client]bool) *Client {
	for client := range clients {
		if client.master == true {
			return client
		}
	}
	return nil
}
