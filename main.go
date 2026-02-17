package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"io/fs"
	"log"
	"math/big"
	"net/http"
	"os"
	"regexp"
	"sync"
	"time"
)

const codeChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz0123456789"

const entryTTL = 60 * time.Minute

type entry struct {
	Text      string
	CreatedAt time.Time
}

var (
	store    sync.Map
	codeRe   = regexp.MustCompile(`^[A-Za-z0-9]{1,20}$`)
	base64Re = regexp.MustCompile(`^[A-Za-z0-9+/]*=*$`)
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	go cleanupExpired()

	mux := http.NewServeMux()

	// API routes
	mux.HandleFunc("GET /api/hello", handleHello)
	mux.HandleFunc("POST /api/texts", handleCreate)
	mux.HandleFunc("PUT /api/texts/{code}", handleUpdate)
	mux.HandleFunc("GET /api/texts/{code}", handleGet)

	// Serve frontend static files
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "./frontend/out"
	}

	frontendFS := os.DirFS(staticDir)
	fileServer := http.FileServerFS(frontendFS)

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if path == "/" {
			path = "/index.html"
		}

		// Check if .html version exists first (for /view, /edit etc.)
		// This prevents directory listings and 301 redirects
		htmlPath := path[1:] + ".html"
		if _, err := fs.Stat(frontendFS, htmlPath); err == nil {
			r.URL.Path = path + ".html"
			fileServer.ServeHTTP(w, r)
			return
		}

		// Try to serve the exact file (static assets like .js, .css, .ico)
		if info, err := fs.Stat(frontendFS, path[1:]); err == nil && !info.IsDir() {
			fileServer.ServeHTTP(w, r)
			return
		}

		// Fallback to index.html for SPA routing
		r.URL.Path = "/index.html"
		fileServer.ServeHTTP(w, r)
	})

	log.Printf("Server starting on :%s", port)
	log.Printf("Serving frontend from %s", staticDir)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

func handleHello(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "hello from textcopy api",
	})
}

func handleCreate(w http.ResponseWriter, r *http.Request) {
	code := generateCode()
	store.Store(code, entry{Text: "", CreatedAt: time.Now()})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"code": code,
	})
}

func handleUpdate(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")

	if !codeRe.MatchString(code) {
		jsonError(w, "invalid code", http.StatusBadRequest)
		return
	}

	// Code must already exist
	val, ok := store.Load(code)
	if !ok {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	e := val.(entry)
	if time.Since(e.CreatedAt) > entryTTL {
		store.Delete(code)
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	var req struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid json", http.StatusBadRequest)
		return
	}

	if len(req.Text) == 0 {
		jsonError(w, "text is required", http.StatusBadRequest)
		return
	}

	if !isValidBase64(req.Text) {
		jsonError(w, "text must be valid base64", http.StatusBadRequest)
		return
	}

	store.Store(code, entry{Text: req.Text, CreatedAt: e.CreatedAt})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"code": code,
	})
}

func generateCode() string {
	b := make([]byte, 6)
	for i := range b {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(codeChars))))
		b[i] = codeChars[n.Int64()]
	}
	return string(b)
}

func handleGet(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")

	if !codeRe.MatchString(code) {
		jsonError(w, "invalid code", http.StatusBadRequest)
		return
	}

	val, ok := store.Load(code)
	if !ok {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	e := val.(entry)
	if time.Since(e.CreatedAt) > entryTTL {
		store.Delete(code)
		jsonError(w, "not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"code": code,
		"text": e.Text,
	})
}

// isValidBase64 checks that the string is non-empty, contains only base64
// characters, and actually decodes without error.
func isValidBase64(s string) bool {
	if !base64Re.MatchString(s) {
		return false
	}
	_, err := base64.StdEncoding.DecodeString(s)
	return err == nil
}

func cleanupExpired() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		now := time.Now()
		store.Range(func(key, val any) bool {
			if now.Sub(val.(entry).CreatedAt) > entryTTL {
				store.Delete(key)
				log.Printf("expired entry: %s", key)
			}
			return true
		})
	}
}

func jsonError(w http.ResponseWriter, msg string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{
		"error": msg,
	})
}
