package notifications

import (
	"bytes"
	"encoding/json"
	"fmt"
	"hopp-backend/internal/config"
	"net/http"
)

// SendTelegramNotification sends a message to the configured Telegram chat using the Bot API.
func SendTelegramNotification(message string, cfg *config.Config) error {
	if cfg.Telegram.BotToken == "" || cfg.Telegram.ChatID == "" {
		return fmt.Errorf("telegram bot token or chat ID is not configured")
	}

	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", cfg.Telegram.BotToken)

	payload := map[string]string{
		"chat_id": cfg.Telegram.ChatID,
		"text":    message,
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal telegram payload: %w", err)
	}

	resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(jsonPayload))
	if err != nil {
		return fmt.Errorf("failed to send telegram message: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Consider logging the response body here for debugging
		return fmt.Errorf("telegram API request failed with status code: %d", resp.StatusCode)
	}

	return nil
}
