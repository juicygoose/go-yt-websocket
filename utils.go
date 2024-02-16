package main

import (
	"log"
	"os"
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

func setMasterClientIfNil(clients map[*Client]bool, client *Client) bool {
	log.Printf("Entering default master setup")
	masterClient := getMasterClient(clients)
	if masterClient != nil {
		return false
	}
	log.Printf("no master found, setting one up...")
	for client := range clients {
		setClientAsMaster(client)
		return true
	}
	return false
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

func getStaticFilesPath() string {
	// If deployed, the static folders are
	isDeployed := os.Getenv("IS_DEPLOYED")
	var path string
	if isDeployed != "" {
		path = os.Getenv("HOME") + "/app"
	} else {
		path = "."
	}

	return path
}
