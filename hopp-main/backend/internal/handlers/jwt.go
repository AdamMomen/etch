package handlers

import (
	"fmt"
	"hopp-backend/internal/common"
	"time"

	"github.com/golang-jwt/jwt/v5"
	echojwt "github.com/labstack/echo-jwt/v4"
	"github.com/labstack/echo/v4"
)

type JwtAuth struct {
	common.JwtAuth
}

func NewJwtAuth(secret string) *JwtAuth {
	return &JwtAuth{
		common.JwtAuth{
			Secret: secret,
		},
	}
}

func (j JwtAuth) GenerateToken(email string) (string, error) {
	claims := common.JwtCustomClaims{
		Email: email,
		RegisteredClaims: jwt.RegisteredClaims{
			// IssuedAt:  jwt.NewNumericDate(time.Now()), // Not required
			// NotBefore: jwt.NewNumericDate(time.Now()), // Not required
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 24 * 365)), // 1 year expiration
		},
	}
	// Create token with claims
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Generate encoded token and send it as response.
	t, err := token.SignedString([]byte(j.Secret))
	if err != nil {
		return "", err
	}

	return t, nil
}

func (j JwtAuth) Middleware() echo.MiddlewareFunc {
	config := echojwt.Config{
		NewClaimsFunc: func(c echo.Context) jwt.Claims {
			return new(common.JwtCustomClaims)
		},
		TokenLookup:   "header:Authorization:Bearer ,query:token",
		SigningKey:    []byte(j.Secret),
		SigningMethod: jwt.SigningMethodHS256.Name,
	}

	return echojwt.WithConfig(config)
}

func (j JwtAuth) GetUserEmail(c echo.Context) (string, error) {
	// Get claims from context
	u, ok := c.Get("user").(*jwt.Token)
	if !ok {
		return "", fmt.Errorf("failed to get token from context")
	}

	claims, ok := u.Claims.(*common.JwtCustomClaims)
	if !ok {
		return "", fmt.Errorf("failed to parse JWT claims")
	}

	return claims.Email, nil
}
