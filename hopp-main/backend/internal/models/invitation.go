package models

import (
	"time"

	"gorm.io/gorm"
)

// EmailInvitation represents an email invitation sent to join a team
type EmailInvitation struct {
	gorm.Model
	TeamID int       `json:"team_id"`
	Team   Team      `gorm:"foreignKey:TeamID" json:"-"`
	Email  string    `json:"email" gorm:"index"`
	SentAt time.Time `json:"sent_at"`
	SentBy string    `json:"sent_by"` // User ID who sent the invitation
}

// CanSendInvite checks if an invite can be sent to this email
// Returns true if no invite was sent in the last 30 minutes
func CanSendInvite(db *gorm.DB, email string) bool {
	var invitation EmailInvitation

	// Look for the most recent invitation sent to this email
	result := db.Where("email = ?", email).
		Order("sent_at DESC").
		First(&invitation)

	// If no invitation found, we can send one
	if result.Error == gorm.ErrRecordNotFound {
		return true
	}

	// Check if the last invitation was sent more than 30 minutes ago
	return time.Since(invitation.SentAt) > 30*time.Minute
}
