package main

import (
	"log"
	"strconv"
)

// GuestInfo container for guest info
// coming from the client
type GuestInfo struct {
	UID  int    `json:"uid"`
	Name string `json:"name"`
}

// Client passed in input becomes master
func setClientAsMaster(client *Client) bool {
	client.master = true
	client.send <- []byte("{\"YouAreMaster\": true}")
	return true
}

// This method resets the master to false
func resetMaster(client *Client) bool {
	client.send <- []byte("{\"YouAreNotMaster\": true}")
	client.master = false
	return true
}

// This method retrieves the master client from the list
// of all clients in the hub
// Returns nil in case no master is set
func getMasterClient(clients map[*Client]bool) *Client {
	for client := range clients {
		if client.master {
			return client
		}
	}
	return nil
}

// Loop on all clients and send them message in input
func sendMessageToAllClients(clients map[*Client]bool, message []byte) {
	for client := range clients {
		select {
		case client.send <- message:
			log.Printf("Sent same message back to the client %v", string(message))
		default:
			close(client.send)
			delete(clients, client)
		}
	}
}

func getClientsConnectedMessage(clients map[*Client]bool, client *Client, leaving bool) []byte {
	var message string
	if !leaving {
		message = "{\"ClientsConnected\": " + string(strconv.Itoa(len(clients))) + "}"
	} else {
		message = "{\"ClientsConnected\": " + string(strconv.Itoa(len(clients))) + ", \"leavingClientUid\": " + string(strconv.Itoa(client.uid)) + "}"
	}
	return []byte(message)
}
