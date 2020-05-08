package main

import (
	"log"
	"strconv"
)

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
		if client.master == true {
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

func getClientsConnectedMessage(clients map[*Client]bool) []byte {
	return []byte("{\"ClientsConnected\": " + string(strconv.Itoa(len(clients))) + "}")
}
