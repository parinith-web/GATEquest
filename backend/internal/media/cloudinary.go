// Package media uploads Pulse post attachments to Cloudinary, so
// mediaUrl on a post is a real CDN URL instead of a multi-megabyte
// base64 data URI stored directly in Postgres. Implemented against
// Cloudinary's plain HTTP upload API with the standard library only
// (no SDK dependency) — it's a small enough surface (one signed POST)
// that pulling in a whole client library isn't worth the extra
// go.mod weight.
package media

import (
	"bytes"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"
)

// Cloudinary holds the credentials needed to sign and send an upload.
// Zero-value Cloudinary is "not configured" — Configured() reports that.
type Cloudinary struct {
	CloudName string
	APIKey    string
	APISecret string

	// httpClient is overridable in tests; nil means http.DefaultClient.
	httpClient *http.Client
}

func New(cloudName, apiKey, apiSecret string) *Cloudinary {
	return &Cloudinary{CloudName: cloudName, APIKey: apiKey, APISecret: apiSecret}
}

func (c *Cloudinary) Configured() bool {
	return c != nil && c.CloudName != "" && c.APIKey != "" && c.APISecret != ""
}

func (c *Cloudinary) client() *http.Client {
	if c.httpClient != nil {
		return c.httpClient
	}
	return http.DefaultClient
}

// UploadResult is the subset of Cloudinary's response we care about.
type UploadResult struct {
	SecureURL    string `json:"secure_url"`
	ResourceType string `json:"resource_type"` // "image" or "video"
	Bytes        int    `json:"bytes"`
}

// Upload signs and sends a single file to Cloudinary's "auto" endpoint,
// which detects image vs video itself rather than us having to. folder
// namespaces uploads (e.g. "pulse") so they're easy to find/manage in
// the Cloudinary dashboard separately from avatar uploads, if that's
// ever added there too.
func (c *Cloudinary) Upload(ctx context.Context, filename string, content io.Reader, folder string) (*UploadResult, error) {
	if !c.Configured() {
		return nil, fmt.Errorf("cloudinary is not configured")
	}

	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	paramsToSign := map[string]string{
		"timestamp": timestamp,
		"folder":    folder,
	}
	signature := c.sign(paramsToSign)

	body := &bytes.Buffer{}
	w := multipart.NewWriter(body)
	for k, v := range paramsToSign {
		if err := w.WriteField(k, v); err != nil {
			return nil, err
		}
	}
	if err := w.WriteField("api_key", c.APIKey); err != nil {
		return nil, err
	}
	if err := w.WriteField("signature", signature); err != nil {
		return nil, err
	}
	fw, err := w.CreateFormFile("file", filename)
	if err != nil {
		return nil, err
	}
	if _, err := io.Copy(fw, content); err != nil {
		return nil, err
	}
	if err := w.Close(); err != nil {
		return nil, err
	}

	url := fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/auto/upload", c.CloudName)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())

	resp, err := c.client().Do(req)
	if err != nil {
		return nil, fmt.Errorf("cloudinary request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		var apiErr struct {
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		_ = json.Unmarshal(respBody, &apiErr)
		if apiErr.Error.Message != "" {
			return nil, fmt.Errorf("cloudinary rejected the upload: %s", apiErr.Error.Message)
		}
		return nil, fmt.Errorf("cloudinary upload failed (status %d)", resp.StatusCode)
	}

	var result UploadResult
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("could not parse cloudinary response: %w", err)
	}
	return &result, nil
}

// sign implements Cloudinary's signing scheme: sort every parameter
// that will be sent (except file/api_key/signature/cloud_name — none
// of which are in paramsToSign here), join as "key=value&key2=value2",
// append the API secret, and SHA-1 hash the result.
func (c *Cloudinary) sign(params map[string]string) string {
	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	pairs := make([]string, 0, len(keys))
	for _, k := range keys {
		pairs = append(pairs, k+"="+params[k])
	}
	toSign := strings.Join(pairs, "&") + c.APISecret

	sum := sha1.Sum([]byte(toSign))
	return hex.EncodeToString(sum[:])
}
