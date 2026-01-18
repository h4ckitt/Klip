package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

type Config struct {
	ServerUrl    string `json:"server_url"`
	DownloadPath string `json:"download_path"`
}

type Article struct {
	FileName    string `json:"filename"`
	DownloadUrl string `json:"download_url"`
}

func main() {
	config, err := loadConfig()
	if err != nil {
		log.Println(err)
		os.Exit(1)
	}

	if _, err := os.Stat(config.DownloadPath); err != nil {
		if !os.IsNotExist(err) {
			log.Println(err)
			os.Exit(1)
		}

		os.MkdirAll(config.DownloadPath, 0755)
	}

	articles, err := fetchArticles(config.ServerUrl)
	if err != nil {
		log.Println(err)
		os.Exit(1)
	}

	if len(articles) == 0 {
		log.Println("No new articles to download")
		os.Exit(0)
	}

	var successfulDownloads []string

	for _, article := range articles {
		localPath := filepath.Join(config.DownloadPath, article.FileName)

		if _, err := os.Stat(localPath); err == nil {
			successfulDownloads = append(successfulDownloads, article.FileName)
			continue
		}

		err := downloadArticle(article.DownloadUrl, localPath)
		if err != nil {
			log.Printf("Failed to download %s: %v\n", article.FileName, err)
			continue
		}

		successfulDownloads = append(successfulDownloads, article.FileName)
	}

	if len(successfulDownloads) > 0 {
		err := batchDeleteArticlesFromServer(config.ServerUrl, successfulDownloads)
		if err != nil {
			log.Printf("Failed to batch delete downloaded articles: %v\n", err)
			os.Exit(1)
		}
	}

	os.Exit(0)
}

func loadConfig() (Config, error) {
	execPath, err := os.Executable()
	if err != nil {
		return Config{}, err
	}

	configPath := filepath.Join(filepath.Dir(execPath), "config.json")

	fileContents, err := os.ReadFile(configPath)
	if err != nil {
		return Config{}, err
	}

	var conf Config

	err = json.Unmarshal(fileContents, &conf)
	if err != nil {
		return Config{}, err
	}

	return conf, err
}

func fetchArticles(url string) ([]Article, error) {
	resp, err := http.Get(fmt.Sprintf("%s/sync", url))
	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("received non ok status code while trying to sync: %d", resp.StatusCode)
	}

	var articles []Article

	err = json.NewDecoder(resp.Body).Decode(&articles)
	if err != nil {
		return nil, err
	}

	return articles, err
}

func downloadArticle(url, path string) error {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("received %d status while trying to download to %s", resp.StatusCode, path)
	}

	file, err := os.Create(path)
	if err != nil {
		return err
	}

	_, err = io.Copy(file, resp.Body)
	return err
}

func batchDeleteArticlesFromServer(url string, articles []string) error {
	body := struct {
		Files []string `json:"filenames"`
	}{
		Files: articles,
	}

	jsonPayload, err := json.Marshal(body)
	if err != nil {
		return err
	}

	client := http.Client{Timeout: 5 * time.Second}

	resp, err := client.Post(fmt.Sprintf("%s/clips/batch-delete", url), "application/json", bytes.NewBuffer(jsonPayload))
	if err != nil {
		return err
	}

	if resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("received %d status while deleting downloaded articles", resp.StatusCode)
	}

	return nil
}
