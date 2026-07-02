package main

import "strings"

func normalizeHTTPURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return raw
	}

	lower := strings.ToLower(raw)
	if strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://") {
		return raw
	}
	if strings.HasPrefix(raw, "//") {
		return "http:" + raw
	}
	if strings.Contains(raw, "://") {
		return raw
	}
	if strings.HasPrefix(raw, "/") || strings.HasPrefix(raw, "?") || strings.HasPrefix(raw, "#") {
		return raw
	}

	return "http://" + raw
}

func resolveRequestURL(rawURL, projectBaseURL string) string {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return rawURL
	}

	if projectBaseURL != "" && isProjectRelativeURL(rawURL) {
		baseURL := strings.TrimRight(normalizeHTTPURL(projectBaseURL), "/")
		switch {
		case rawURL == "":
			return baseURL
		case strings.HasPrefix(rawURL, "?") || strings.HasPrefix(rawURL, "#"):
			return baseURL + rawURL
		default:
			return baseURL + "/" + strings.TrimLeft(rawURL, "/")
		}
	}

	return normalizeHTTPURL(rawURL)
}

func isProjectRelativeURL(raw string) bool {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return false
	}
	if strings.HasPrefix(raw, "/") {
		return !strings.HasPrefix(raw, "//")
	}
	if strings.HasPrefix(raw, "?") || strings.HasPrefix(raw, "#") {
		return true
	}

	lower := strings.ToLower(raw)
	if strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://") || strings.Contains(raw, "://") {
		return false
	}

	hostCandidate := raw
	if idx := strings.IndexAny(hostCandidate, "/?#"); idx >= 0 {
		hostCandidate = hostCandidate[:idx]
	}
	hostCandidate = strings.ToLower(hostCandidate)

	if hostCandidate == "localhost" ||
		strings.Contains(hostCandidate, ".") ||
		strings.Contains(hostCandidate, ":") {
		return false
	}

	return true
}
