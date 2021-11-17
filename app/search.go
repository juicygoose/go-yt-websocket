package main

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
)

var (
	idRegexp    = regexp.MustCompile("watch\\?v=(?P<VideoId>.+?)\"")
	// titleRegexp = regexp.MustCompile("title=\"(?P<Title>.+?)\"")
	titleRegexp = regexp.MustCompile("\"title\":{\"runs\":\\[{\"text\":\"(?P<Title>.+?)\"")

	// SearchVideo is the handler func to perform a search on video provider
	SearchVideo = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		searchText := r.FormValue("search_query")
		maxResults := r.FormValue("max_results")
		if searchText == "" || maxResults == "" {
			log.Printf("Missing mandatory search parameters")
		}
		searchResults := search(searchText, maxResults)
		byteResults, _ := json.Marshal(searchResults)
		w.Write(byteResults)
	})
)

// SearchResult represents a video fetched from search
type SearchResult struct {
	ID    string
	Title string
}

// SearchResultList is a container of search results
type SearchResultList struct {
	Items []SearchResult
}

// AddItem Add search result to result list
func (list *SearchResultList) AddItem(item SearchResult) []SearchResult {
	list.Items = append(list.Items, item)
	return list.Items
}

func search(searchText string, maxResults string) SearchResultList {
	searchMaxResults, maxResultsConvErr := strconv.Atoi(maxResults)
	if maxResultsConvErr != nil {
		// Do something
	}
	searchText = strings.ReplaceAll(searchText, " ", "+")
	fullSearchURL := "https://www.youtube.com/results?search_query=" + searchText

	client := &http.Client{}
	searchReq, err := http.NewRequest("GET", fullSearchURL, nil)
	if err != nil {
		log.Printf("Error while creating Search request")
	}
	searchReq.Header.Add("Access-Control-Allow-Origin", "*")

	searchResp, searchErr := client.Do(searchReq)
	if searchErr != nil {
		log.Printf("Error while searching on youtube")
	}
	defer searchResp.Body.Close()

	searchResults := SearchResultList{}

	if searchResp.StatusCode == http.StatusOK {
		bodyBytes, bodyErr := ioutil.ReadAll(searchResp.Body)
		if bodyErr != nil {
			log.Printf("Error while parsing response body")
		}
		bodyString := string(bodyBytes)
		temp := strings.Split(bodyString, "WEB_PAGE_TYPE_WATCH")
		counter := 0

		for _, line := range temp {
			if counter < searchMaxResults {
				matched, _ := regexp.MatchString(`.*watch\?v`, line)
				if matched == true {
					idMatch := idRegexp.FindStringSubmatch(line)
					titleMatch := titleRegexp.FindStringSubmatch(line)
					if strings.Contains(idMatch[1], "start_radio") {
						continue
					}
					if idMatch != nil && titleMatch != nil {
						item := SearchResult{ID: idMatch[1], Title: titleMatch[1]}
						searchResults.AddItem(item)
					}

					counter++
				}
			} else {
				break
			}

		}
	}
	return searchResults
}
